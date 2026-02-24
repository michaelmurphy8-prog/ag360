// lib/auto-post.ts
// Automatic journal entry creation from business events
// Grain sale → Revenue entry | Input purchase → Expense entry | etc.
// Each auto-post is idempotent — checks for existing entry before creating

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ============================================================
// ACCOUNT LOOKUP — finds account by code for the user
// ============================================================
async function getAccountId(userId: string, code: string): Promise<string | null> {
  const result = await sql`
    SELECT id FROM accounts WHERE user_id = ${userId} AND code = ${code} LIMIT 1
  `;
  return result.length > 0 ? result[0].id : null;
}

// ============================================================
// NEXT ENTRY NUMBER — sequential for user + crop_year
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
// CHECK DUPLICATE — prevent double-posting from same source
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
// AUTO-POST: GRAIN SALE (from grain_loads table)
// ============================================================
// Creates: Debit Cash/AR → Credit Grain Sales — [Crop]
export async function autoPostGrainSale(params: {
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

    // Idempotency check
    if (await entryExists(userId, "grain_sale", grainLoadId)) {
      return { success: true, error: "Entry already exists for this grain load" };
    }

    const totalAmount = Math.round(bushels * pricePerBushel * 100) / 100;
    if (totalAmount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    // Map crop to revenue account code
    const cropAccountMap: Record<string, string> = {
      "HRW Wheat": "4000", "HRS Wheat": "4000", "Wheat": "4000", "Durum": "4000",
      "Canola": "4010", "Barley": "4020", "Oats": "4030",
      "Peas": "4040", "Lentils": "4050", "Flax": "4060",
      "Soybeans": "4070",
    };

    const revenueCode = cropAccountMap[crop] || "4080"; // 4080 = Other Grain Revenue
    const cashCode = "1000"; // Cash — Operating

    const cashAccountId = await getAccountId(userId, cashCode);
    const revenueAccountId = await getAccountId(userId, revenueCode);

    if (!cashAccountId || !revenueAccountId) {
      // Accounts not seeded yet — seed them first
      return { success: false, error: "Chart of accounts not seeded. Open the Ledger page first." };
    }

    const entryNumber = await getNextEntryNumber(userId, cropYear);

    const description = `${crop} sale to ${buyer || "Buyer"}${ticketNumber ? ` — Ticket #${ticketNumber}` : ""}${fieldName ? ` — ${fieldName}` : ""}`;

    // Create journal entry + lines in transaction
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

    // Line 1: Debit Cash
    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        quantity, unit, unit_price, field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${cashAccountId}, ${`Cash from ${crop} sale`},
        ${totalAmount}, 0,
        ${bushels}, 'bu', ${pricePerBushel},
        ${fieldName || null}, ${crop}, 1
      )
    `;

    // Line 2: Credit Revenue
    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        quantity, unit, unit_price, field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${revenueAccountId}, ${`${crop} — ${bushels.toLocaleString()} bu @ $${pricePerBushel.toFixed(2)}`},
        0, ${totalAmount},
        ${bushels}, 'bu', ${pricePerBushel},
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
// AUTO-POST: INPUT PURCHASE (seed, chemical, fertilizer)
// ============================================================
// Creates: Debit Expense Account → Credit Cash/AP
export async function autoPostInputPurchase(params: {
  userId: string;
  sourceId: string;
  expenseCode: string;  // e.g. "5000" for Seed, "5200" for Herbicide
  amount: number;
  description: string;
  date: string;
  fieldName?: string;
  crop?: string;
  cropYear: number;
  vendor?: string;
  paymentMethod?: "cash" | "credit" | "ap";  // default cash
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  try {
    const { userId, sourceId, expenseCode, amount, description, date, fieldName, crop, cropYear, vendor, paymentMethod = "cash" } = params;

    if (await entryExists(userId, "input_purchase", sourceId)) {
      return { success: true, error: "Entry already exists" };
    }

    if (amount <= 0) {
      return { success: false, error: "Invalid amount" };
    }

    const expenseAccountId = await getAccountId(userId, expenseCode);

    // Payment goes to: Cash (1000), Credit Card (2010), or Accounts Payable (2000)
    const paymentCodeMap: Record<string, string> = {
      cash: "1000",
      credit: "2010",
      ap: "2000",
    };
    const paymentAccountId = await getAccountId(userId, paymentCodeMap[paymentMethod] || "1000");

    if (!expenseAccountId || !paymentAccountId) {
      return { success: false, error: "Accounts not found. Open the Ledger page first." };
    }

    const entryNumber = await getNextEntryNumber(userId, cropYear);

    const entry = await sql`
      INSERT INTO journal_entries (
        user_id, entry_number, entry_date, description, memo,
        source, source_id, crop_year, field_name, crop, is_posted
      )
      VALUES (
        ${userId}, ${entryNumber}, ${date},
        ${`${description}${vendor ? ` — ${vendor}` : ""}`},
        ${null}, 'input_purchase', ${sourceId}, ${cropYear},
        ${fieldName || null}, ${crop || null}, true
      )
      RETURNING id
    `;

    const entryId = entry[0].id;

    // Debit Expense
    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${expenseAccountId}, ${description},
        ${amount}, 0,
        ${fieldName || null}, ${crop || null}, 1
      )
    `;

    // Credit Cash/AP
    await sql`
      INSERT INTO journal_lines (
        journal_entry_id, account_id, description, debit, credit,
        field_name, crop, sort_order
      )
      VALUES (
        ${entryId}, ${paymentAccountId}, ${`Payment — ${description}`},
        0, ${amount},
        ${fieldName || null}, ${crop || null}, 2
      )
    `;

    return { success: true, entryId };
  } catch (error: any) {
    console.error("Auto-post input purchase error:", error);
    return { success: false, error: error.message };
  }
}

// ============================================================
// AUTO-POST: FUEL PURCHASE
// ============================================================
export async function autoPostFuelPurchase(params: {
  userId: string;
  sourceId: string;
  fuelType: "diesel" | "gasoline";
  amount: number;
  litres?: number;
  date: string;
  cropYear: number;
  vendor?: string;
}): Promise<{ success: boolean; entryId?: string; error?: string }> {
  const fuelCode = params.fuelType === "diesel" ? "5700" : "5710";
  return autoPostInputPurchase({
    userId: params.userId,
    sourceId: params.sourceId,
    expenseCode: fuelCode,
    amount: params.amount,
    description: `${params.fuelType === "diesel" ? "Diesel" : "Gasoline"}${params.litres ? ` — ${params.litres}L` : ""}${params.vendor ? ` from ${params.vendor}` : ""}`,
    date: params.date,
    cropYear: params.cropYear,
    vendor: params.vendor,
  });
}

// ============================================================
// BULK AUTO-POST — process all unposted grain loads
// ============================================================
export async function autoPostAllGrainLoads(userId: string, cropYear: number): Promise<{
  posted: number;
  skipped: number;
  errors: string[];
}> {
  const loads = await sql`
    SELECT id, crop, bushels, price_per_bushel, buyer, delivery_date,
           field_name, ticket_number, crop_year
    FROM grain_loads
    WHERE user_id = ${userId} AND crop_year = ${cropYear}
    ORDER BY delivery_date ASC
  `;

  let posted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const load of loads) {
    const result = await autoPostGrainSale({
      userId,
      grainLoadId: load.id,
      crop: load.crop,
      bushels: parseFloat(load.bushels) || 0,
      pricePerBushel: parseFloat(load.price_per_bushel) || 0,
      buyer: load.buyer || "Unknown",
      deliveryDate: load.delivery_date || new Date().toISOString().split("T")[0],
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