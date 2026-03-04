import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import * as XLSX from "xlsx";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("cropYear") || String(new Date().getFullYear()));
  const dateFrom = searchParams.get("from") || `${cropYear}-01-01`;
  const dateTo = searchParams.get("to") || `${cropYear}-12-31`;

  try {
    // ── 1. Journal Entries ────────────────────────────────────
    const journalRows = await sql`
      SELECT
        je.entry_date::text        AS "Date",
        je.entry_number            AS "Entry #",
        je.description             AS "Description",
        je.source                  AS "Source",
        je.vendor                  AS "Vendor",
        je.document_number         AS "Doc #",
        je.document_type           AS "Doc Type",
        je.payment_status          AS "Payment Status",
        a.code                     AS "Account Code",
        a.name                     AS "Account Name",
        a.account_type             AS "Account Type",
        a.sub_type                 AS "Sub Type",
        jl.debit                   AS "Debit",
        jl.credit                  AS "Credit",
        jl.field_name              AS "Field",
        jl.crop                    AS "Crop",
        jl.description             AS "Line Note"
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      LEFT JOIN accounts a ON a.id = jl.account_id
      WHERE je.user_id = ${userId}
        AND je.crop_year = ${cropYear}
        AND je.is_void = false
        AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY je.entry_date, je.entry_number, jl.sort_order
    `;

    // ── 2. Grain Income (Settlements) ─────────────────────────
    const grainRows = await sql`
      SELECT
        s.issue_date::text          AS "Settlement Date",
        s.settlement_number         AS "Settlement #",
        s.terminal_name             AS "Terminal / Elevator",
        sl.commodity                AS "Commodity",
        sl.grade                    AS "Grade",
        sl.delivery_number          AS "Delivery #",
        sl.contract_reference       AS "Contract #",
        sl.net_weight_mt            AS "Net Weight (MT)",
        sl.price_per_mt             AS "Price / MT",
        sl.gross_amount             AS "Gross Amount",
        sl.deductions               AS "Deductions",
        sl.net_amount               AS "Net Amount",
        s.net_payable               AS "Settlement Net Payable",
        s.crop_year                 AS "Crop Year",
        s.payment_status            AS "Payment Status"
      FROM settlements s
      LEFT JOIN settlement_lines sl ON sl.settlement_id = s.id
      WHERE s.user_id = ${userId}
        AND s.crop_year = ${cropYear}
      ORDER BY s.issue_date, s.settlement_number
    `;

    // ── 3. Input Expenses (from journal entries, expense accounts) ──
    const expenseRows = await sql`
      SELECT
        je.entry_date::text         AS "Date",
        je.description              AS "Description",
        je.vendor                   AS "Vendor",
        je.document_number          AS "Invoice #",
        a.code                      AS "Account Code",
        a.name                      AS "Expense Category",
        a.sub_type                  AS "Sub Type",
        jl.debit                    AS "Amount",
        jl.field_name               AS "Field",
        jl.crop                     AS "Crop",
        jl.quantity                 AS "Quantity",
        jl.unit                     AS "Unit",
        jl.unit_price               AS "Unit Price",
        jl.description              AS "Notes",
        je.payment_status           AS "Payment Status"
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.user_id = ${userId}
        AND je.crop_year = ${cropYear}
        AND je.is_void = false
        AND a.account_type = 'expense'
        AND jl.debit > 0
        AND je.entry_date BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY a.sub_type, je.entry_date
    `;

    // ── 4. Labour Costs ───────────────────────────────────────
    const labourRows = await sql`
      SELECT
        t.entry_date::text          AS "Date",
        w.name                      AS "Worker Name",
        w.role                      AS "Role",
        w.worker_type               AS "Type",
        t.hours                     AS "Hours",
        t.task                      AS "Task",
        t.field_name                AS "Field",
        COALESCE(w.hourly_rate, 0)  AS "Hourly Rate",
        ROUND(t.hours * COALESCE(w.hourly_rate, 0), 2) AS "Cost",
        t.notes                     AS "Notes"
      FROM time_entries t
      JOIN workers w ON w.id = t.worker_id
      WHERE w.user_id = ${userId}
        AND t.entry_date BETWEEN ${dateFrom} AND ${dateTo}
      ORDER BY t.entry_date, w.name
    `;

    // ── 5. Equipment / Depreciation ───────────────────────────
    const equipRows = await sql`
      SELECT
        m.year                      AS "Year",
        m.make                      AS "Make",
        m.model                     AS "Model",
        m.serial_number             AS "Serial #",
        m.asset_type                AS "Type",
        m.purchase_price            AS "Purchase Price",
        m.purchase_date::text       AS "Purchase Date",
        m.current_value             AS "Current Value",
        m.hours_current             AS "Current Hours",
        CASE
          WHEN m.purchase_price > 0 AND m.purchase_date IS NOT NULL
          THEN ROUND(m.purchase_price * 0.15, 2)
          ELSE 0
        END                         AS "Est. Annual Depreciation (15%)",
        m.notes                     AS "Notes"
      FROM machinery m
      WHERE m.user_id = ${userId}
      ORDER BY m.asset_type, m.year DESC, m.make
    `;

    // ── Build Excel workbook ──────────────────────────────────
    const wb = XLSX.utils.book_new();

    // Cover sheet
    const coverData = [
      ["AG360 — Accountant Export Package"],
      [`Farm: ${userId}`],
      [`Crop Year: ${cropYear}`],
      [`Date Range: ${dateFrom} to ${dateTo}`],
      [`Generated: ${new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}`],
      [],
      ["Sheet", "Description", "Rows"],
      ["Journal Entries", "Complete double-entry general ledger", journalRows.length],
      ["Grain Income", "Settlement statements by delivery", grainRows.length],
      ["Input Expenses", "All expense transactions by category", expenseRows.length],
      ["Labour Costs", "Time entries and labour cost by worker", labourRows.length],
      ["Equipment", "Asset register with depreciation estimate", equipRows.length],
    ];
    const coverWs = XLSX.utils.aoa_to_sheet(coverData);
    coverWs["!cols"] = [{ wch: 28 }, { wch: 42 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

    // Helper — adds a sheet with auto column widths
    const addSheet = (name: string, rows: any[]) => {
      if (rows.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([[`No ${name} data for ${cropYear}`]]);
        XLSX.utils.book_append_sheet(wb, ws, name);
        return;
      }
      const ws = XLSX.utils.json_to_sheet(rows);
      // Auto column widths based on header length
      const headers = Object.keys(rows[0]);
      ws["!cols"] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet("Journal Entries", journalRows);
    addSheet("Grain Income", grainRows);
    addSheet("Input Expenses", expenseRows);
    addSheet("Labour Costs", labourRows);
    addSheet("Equipment", equipRows);

    // ── Stream as .xlsx ───────────────────────────────────────
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `AG360_AccountantExport_${cropYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}