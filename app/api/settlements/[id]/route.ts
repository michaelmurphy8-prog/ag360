import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { id } = await context.params;

    const settlement = await sql`
      SELECT * FROM settlements WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    if (settlement.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lines = await sql`
      SELECT * FROM settlement_lines WHERE settlement_id = ${id} ORDER BY line_number
    `;

    return NextResponse.json({ settlement: settlement[0], lines });
  } catch (error: any) {
    console.error("Settlement detail error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const { action } = body;

    if (action === "post_to_ledger") {
      const settlement = await sql`
        SELECT * FROM settlements WHERE id = ${id} AND tenant_id = ${tenantId}
      `;
      if (settlement.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const s = settlement[0];

      if (s.status === "posted") {
        return NextResponse.json({ error: "Already posted to ledger" }, { status: 400 });
      }

      const accounts = await sql`
        SELECT code, id FROM accounts WHERE tenant_id = ${tenantId}
      `;
      const acctMap: Record<string, string> = {};
      accounts.forEach((a: any) => { acctMap[a.code] = a.id; });

      const cropAccountMap: Record<string, string> = {
        "HRW Wheat": "4000", "HRS Wheat": "4000", "Wheat": "4000", "Durum": "4000",
        "Canola": "4010", "Barley": "4020", "Oats": "4030",
        "Peas": "4040", "Lentils": "4050", "Flax": "4060", "Soybeans": "4070",
      };

      const revenueCode = cropAccountMap[s.crop] || "4080";
      const cashCode = "1000";

      if (!acctMap[cashCode] || !acctMap[revenueCode]) {
        return NextResponse.json({
          error: `Missing accounts in chart of accounts. Need: ${cashCode} (Cash) and ${revenueCode} (${s.crop} Sales). Open the Ledger page first to seed accounts.`
        }, { status: 400 });
      }

      const existing = await sql`
        SELECT id FROM journal_entries
        WHERE tenant_id = ${tenantId} AND source = 'settlement' AND source_id = ${id} AND is_void = false
        LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({ error: "Journal entry already exists for this settlement" }, { status: 400 });
      }

      const cropYear = s.issue_date ? new Date(s.issue_date).getFullYear() : new Date().getFullYear();
      const entryNumResult = await sql`
        SELECT COALESCE(MAX(entry_number), 0) + 1 as next_num
        FROM journal_entries
        WHERE tenant_id = ${tenantId} AND crop_year = ${cropYear}
      `;
      const entryNumber = entryNumResult[0].next_num;

      const grossPayable = parseFloat(s.gross_payable) || 0;
      const totalAdjustments = parseFloat(s.total_adjustments) || 0;
      const netPayable = parseFloat(s.net_payable) || 0;
      const totalBushels = parseInt(s.total_bushels) || 0;
      const pricePerMT = parseFloat(s.price_per_mt) || 0;

      const description = `${s.crop} settlement — ${s.terminal_name} ${s.terminal_location || ""} — #${s.settlement_number || "N/A"} — ${s.total_loads} loads`;

      const entry = await sql`
        INSERT INTO journal_entries (
          tenant_id, entry_number, entry_date, description, memo,
          source, source_id, crop_year, crop, is_posted
        ) VALUES (
          ${tenantId}, ${entryNumber}, ${s.payment_date || s.issue_date || new Date().toISOString().split("T")[0]},
          ${description},
          ${`${s.total_loads} loads, ${Number(s.total_net_weight_mt).toLocaleString()} MT net (${totalBushels.toLocaleString()} bu), $${pricePerMT}/MT, Gross $${grossPayable.toLocaleString()}, Adjustments $${totalAdjustments.toLocaleString()}, Net $${netPayable.toLocaleString()}`},
          'settlement', ${id}, ${cropYear}, ${s.crop}, true
        )
        RETURNING id
      `;
      const entryId = entry[0].id;

      let sortOrder = 1;

      await sql`
        INSERT INTO journal_lines (
          journal_entry_id, account_id, description, debit, credit,
          quantity, unit, unit_price, crop, sort_order
        ) VALUES (
          ${entryId}, ${acctMap[cashCode]}, ${`Cash from ${s.crop} settlement #${s.settlement_number || "N/A"}`},
          ${netPayable}, 0, ${totalBushels}, 'bu', ${pricePerMT},
          ${s.crop}, ${sortOrder++}
        )
      `;

      if (totalAdjustments < 0) {
        const expenseCode = "5090";
        if (acctMap[expenseCode]) {
          await sql`
            INSERT INTO journal_lines (
              journal_entry_id, account_id, description, debit, credit,
              crop, sort_order
            ) VALUES (
              ${entryId}, ${acctMap[expenseCode]},
              ${`Settlement deductions: check-off, handling, levies`},
              ${Math.abs(totalAdjustments)}, 0, ${s.crop}, ${sortOrder++}
            )
          `;
        } else {
          await sql`
            INSERT INTO journal_lines (
              journal_entry_id, account_id, description, debit, credit,
              crop, sort_order
            ) VALUES (
              ${entryId}, ${acctMap[revenueCode]},
              ${`Settlement deductions (check-off, handling, levies)`},
              ${Math.abs(totalAdjustments)}, 0, ${s.crop}, ${sortOrder++}
            )
          `;
        }
      }

      await sql`
        INSERT INTO journal_lines (
          journal_entry_id, account_id, description, debit, credit,
          quantity, unit, unit_price, crop, sort_order
        ) VALUES (
          ${entryId}, ${acctMap[revenueCode]},
          ${`${s.crop} sales — ${s.total_loads} loads, ${totalBushels.toLocaleString()} bu @ $${pricePerMT}/MT`},
          0, ${grossPayable}, ${totalBushels}, 'bu', ${pricePerMT},
          ${s.crop}, ${sortOrder++}
        )
      `;

      await sql`
        UPDATE settlements SET status = 'posted' WHERE id = ${id}
      `;

      return NextResponse.json({
        success: true,
        entryId,
        message: `Posted to ledger: Entry #${entryNumber} — Debit Cash $${netPayable.toLocaleString()}, Credit ${s.crop} Sales $${grossPayable.toLocaleString()}${totalAdjustments < 0 ? `, Deductions $${Math.abs(totalAdjustments).toLocaleString()}` : ""}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Settlement action error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}