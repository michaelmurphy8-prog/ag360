import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("cropYear") || String(new Date().getFullYear()));
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  try {
    const entries = await sql`
      SELECT
        je.id,
        je.entry_number,
        je.entry_date,
        je.description,
        je.memo,
        je.source,
        je.crop_year,
        je.crop,
        je.field_name,
        je.is_posted,
        je.is_reconciled,
        je.is_void,
        je.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', jl.id,
              'account_name', a.name,
              'account_code', a.code,
              'account_type', a.account_type,
              'sub_type', a.sub_type,
              'description', jl.description,
              'debit', jl.debit,
              'credit', jl.credit,
              'quantity', jl.quantity,
              'unit', jl.unit,
              'unit_price', jl.unit_price,
              'crop', jl.crop,
              'field_name', jl.field_name
            ) ORDER BY jl.sort_order
          ) FILTER (WHERE jl.id IS NOT NULL),
          '[]'
        ) AS lines
      FROM journal_entries je
      LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
      LEFT JOIN accounts a ON a.id = jl.account_id AND a.user_id = ${userId}
      WHERE je.user_id = ${userId}
        AND je.crop_year = ${cropYear}
        AND je.is_void = false
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.entry_number DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const summary = await sql`
      SELECT
        COUNT(DISTINCT je.id) as entry_count,
        COALESCE(SUM(jl.debit), 0) as total_debits,
        COALESCE(SUM(jl.credit), 0) as total_credits,
        COALESCE(SUM(CASE WHEN a.account_type = 'revenue' THEN jl.credit - jl.debit ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN a.account_type = 'expense' THEN jl.debit - jl.credit ELSE 0 END), 0) as total_expenses
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id AND a.user_id = ${userId}
      WHERE je.user_id = ${userId}
        AND je.crop_year = ${cropYear}
        AND je.is_void = false
    `;

    const availableYears = await sql`
      SELECT DISTINCT crop_year FROM journal_entries
      WHERE user_id = ${userId} AND is_void = false
      ORDER BY crop_year DESC
    `;

    return NextResponse.json({
      success: true,
      entries,
      summary: {
        ...summary[0],
        net_income: Number(summary[0]?.total_revenue || 0) - Number(summary[0]?.total_expenses || 0)
      },
      availableYears: availableYears.map(y => y.crop_year),
      pagination: { page, limit, total: Number(summary[0]?.entry_count || 0) }
    });
  } catch (err) {
    console.error("Ledger GET error:", err);
    return NextResponse.json({ error: "Failed to fetch ledger" }, { status: 500 });
  }
}