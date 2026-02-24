import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ============================================================
// KG → BUSHEL CONVERSION FACTORS (per crop)
// ============================================================
const KG_PER_BUSHEL: Record<string, number> = {
  "HRW Wheat": 27.22, "HRS Wheat": 27.22, "Wheat": 27.22, "Durum": 27.22,
  "Canola": 22.68, "Barley": 21.77, "Oats": 15.42,
  "Peas": 27.22, "Lentils": 27.22, "Flax": 25.40,
  "Soybeans": 27.22, "Corn": 25.40,
};

function kgToBushels(kg: number, crop: string): number {
  const factor = KG_PER_BUSHEL[crop] || 27.22; // default to wheat if unknown
  return Math.round(kg / factor);
}

// ============================================================
// ACCOUNT LOOKUP
// ============================================================
async function getAccountId(userId: string, code: string): Promise<string | null> {
  const result = await sql`
    SELECT id FROM accounts WHERE user_id = ${userId} AND code = ${code} LIMIT 1
  `;
  return result.length > 0 ? result[0].id : null;
}

// ============================================================
// NEXT ENTRY NUMBER
// ============================================================
async function getNextEntryNumber(userId: string, cropYear: number): Promise<number> {
  const result = await sql`
    SELECT COALESCE(MAX(entry_number), 0) + 1 as next_num
    FROM journal_entries
    WHERE user_id = ${userId} AND crop_year = ${cropYear}
  `;
  return result[0].next_num;
}

// ============================================================
// DUPLICATE CHECK
// ============================================================
async function entryExists(userId: string, source: string, sourceId: string): Promise<boolean> {
  const result = await sql`
    SELECT id FROM journal_entries
    WHERE user_id = ${userId} AND source = ${source} AND source_id = ${sourceId} AND is_void = false
    LIMIT 1
  `;
  return result.length > 0;
}

// ============================================================
// AUTO-POST: SINGLE GRAIN SALE
// ============================================================
async function autoPostGrainSale(params: {
  userId: string;
  grainLoadId: string;
  crop: string;
  bushels: number;
  pricePerBushel: number;
  buyer: string;
  deliveryDate: string;
  fieldName?: string;
  cropYear: number;
  ticketNumber?: string;
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const { userId, grainLoadId, crop, bushels, pricePerBushel, buyer, deliveryDate, fieldName, cropYear, ticketNumber } = params;

    if (await entryExists(userId, "grain_sale", grainLoadId)) {
      return { success: true, error: "Entry already exists for this grain load" };
    }

    const totalAmount = Math.round(bushels * pricePerBushel * 100) / 100;
    if (totalAmount <= 0) {
      return { success: false, error: "Invalid amount — need bushels and price" };
    }

    const cropAccountMap: Record<string, string> = {
      "HRW Wheat": "4000", "HRS Wheat": "4000", "Wheat": "4000", "Durum": "4000",
      "Canola": "4010", "Barley": "4020", "Oats": "4030",
      "Peas": "4040", "Lentils": "4050", "Flax": "4060",
      "Soybeans": "4070",
    };

    const revenueCode = cropAccountMap[crop] || "4080";
    const cashCode = "1000";

    const cashAccountId = await getAccountId(userId, cashCode);
    const revenueAccountId = await getAccountId(userId, revenueCode);

    if (!cashAccountId || !revenueAccountId) {
      return { success: false, error: "Chart of accounts not seeded. Open the Ledger page first." };
    }

    const entryNumber = await getNextEntryNumber(userId, cropYear);
    const description = `${crop} sale to ${buyer || "Buyer"}${ticketNumber ? ` — Ticket #${ticketNumber}` : ""}${fieldName ? ` — ${fieldName}` : ""}`;

    const entry = await sql`
      INSERT INTO journal_entries (
        user_id, entry_number, entry_date, description, memo,
        source, source_id, crop_year, field_name, crop, is_posted
      )
      VALUES (
        ${userId}, ${entryNumber}, ${deliveryDate || new Date().toISOString().split("T")[0]},
        ${description},
        ${`${bushels.toLocaleString()} bu × $${pricePerBushel.toFixed(2)}/bu = $${totalAmount.toLocaleString()}`},
        'grain_sale', ${grainLoadId}, ${cropYear},
        ${fieldName || null}, ${crop}, true
      )
      RETURNING id
    `;

    const entryId = entry[0].id;

    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        quantity, unit, unit_price, field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${cashAccountId}, ${`Cash from ${crop} sale`},
        ${totalAmount}, 0, ${bushels}, 'bu', ${pricePerBushel},
        ${fieldName || null}, ${crop}, 1
      )
    `;

    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        quantity, unit, unit_price, field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${revenueAccountId}, ${`${crop} — ${bushels.toLocaleString()} bu @ $${pricePerBushel.toFixed(2)}`},
        0, ${totalAmount}, ${bushels}, 'bu', ${pricePerBushel},
        ${fieldName || null}, ${crop}, 2
      )
    `;

    return { success: true, entryId };
  } catch (error: any) {
    console.error("Auto-post grain sale error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// BULK AUTO-POST — all unposted grain loads for a crop year
// Maps real grain_loads columns → engine params
// ============================================================
async function autoPostAllGrainLoads(userId: string, cropYear: number): Promise<{
  posted: number;
  skipped: number;
  errors: string[];
}> {
  const loads = await sql`
    SELECT
      gl.id,
      gl.crop,
      gl.net_weight_kg,
      gl.gross_weight_kg,
      gl.price_per_bushel,
      gl.date,
      gl.field_name,
      gl.ticket_number,
      gl.crop_year,
      c.customer_name
    FROM grain_loads gl
    LEFT JOIN customers c ON gl.customer_id = c.id
    WHERE gl.farm_id = ${userId}
      AND COALESCE(gl.crop_year, ${cropYear}) = ${cropYear}
    ORDER BY gl.date ASC
  `;

  let posted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const load of loads) {
    // Skip loads missing crop or price
    if (!load.crop || !load.price_per_bushel || parseFloat(load.price_per_bushel) <= 0) {
      errors.push(`Load ${load.id}: Missing crop or price — skipped`);
      continue;
    }

    const netKg = parseFloat(load.net_weight_kg) || parseFloat(load.gross_weight_kg) || 0;
    if (netKg <= 0) {
      errors.push(`Load ${load.id}: No weight data — skipped`);
      continue;
    }

    const bushels = kgToBushels(netKg, load.crop);

    const result = await autoPostGrainSale({
      userId,
      grainLoadId: load.id,
      crop: load.crop,
      bushels,
      pricePerBushel: parseFloat(load.price_per_bushel),
      buyer: load.customer_name || "Unknown",
      deliveryDate: load.date || new Date().toISOString().split("T")[0],
      fieldName: load.field_name,
      cropYear: parseInt(load.crop_year) || cropYear,
      ticketNumber: load.ticket_number,
    });

    if (result.success && result.entryId) {
      posted++;
    } else if (result.error?.includes("already exists")) {
      skipped++;
    } else {
      errors.push(`Load ${load.id}: ${result.error}`);
    }
  }

  return { posted, skipped, errors };
}

// ============================================================
// HTTP HANDLER — POST /api/finance/auto-post
// ============================================================
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { action, cropYear = 2025 } = body;

    if (action === "bulk_grain_loads") {
      const result = await autoPostAllGrainLoads(userId, cropYear);
      return NextResponse.json({
        success: true,
        ...result,
        message: `Posted ${result.posted}, skipped ${result.skipped} (already synced)${result.errors.length > 0 ? `, ${result.errors.length} errors` : ""}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Auto-post error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}