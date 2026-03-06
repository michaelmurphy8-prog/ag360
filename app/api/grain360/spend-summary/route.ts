import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year") ?? new Date().getFullYear().toString();

  try {
    // Monthly expense totals
    const expenses = await sql`
      SELECT 
        EXTRACT(MONTH FROM je.entry_date)::int AS month,
        SUM(jl.debit) AS total
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.user_id = ${userId}
        AND EXTRACT(YEAR FROM je.entry_date) = ${parseInt(year)}
        AND a.account_type = 'expense'
        AND jl.debit > 0
        AND je.is_void = false
      GROUP BY EXTRACT(MONTH FROM je.entry_date)
      ORDER BY month
    `;

    // Monthly income totals
    const income = await sql`
      SELECT 
        EXTRACT(MONTH FROM je.entry_date)::int AS month,
        SUM(jl.credit) AS total
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.user_id = ${userId}
        AND EXTRACT(YEAR FROM je.entry_date) = ${parseInt(year)}
        AND a.account_type = 'revenue'
        AND jl.credit > 0
        AND je.is_void = false
      GROUP BY EXTRACT(MONTH FROM je.entry_date)
      ORDER BY month
    `;

    // Line items per month for drill-down
    const items = await sql`
      SELECT 
        EXTRACT(MONTH FROM je.entry_date)::int AS month,
        je.entry_date,
        je.description,
        je.vendor,
        a.name AS account_name,
        a.account_type,
        SUM(CASE WHEN a.account_type = 'expense' THEN jl.debit ELSE 0 END) AS expense_amount,
        SUM(CASE WHEN a.account_type = 'revenue' THEN jl.credit ELSE 0 END) AS income_amount
      FROM journal_entries je
      JOIN journal_lines jl ON jl.journal_entry_id = je.id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.user_id = ${userId}
        AND EXTRACT(YEAR FROM je.entry_date) = ${parseInt(year)}
        AND a.account_type IN ('expense', 'revenue')
        AND je.is_void = false
      GROUP BY 
        EXTRACT(MONTH FROM je.entry_date),
        je.entry_date,
        je.description,
        je.vendor,
        a.name,
        a.account_type
      HAVING SUM(jl.debit) > 0 OR SUM(jl.credit) > 0
      ORDER BY je.entry_date, a.account_type
    `;

    // Build 12-month array
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const result = MONTHS.map((month, i) => {
      const monthNum = i + 1;
      const exp = expenses.find((e: any) => e.month === monthNum);
      const inc = income.find((e: any) => e.month === monthNum);
      const monthItems = items.filter((item: any) => item.month === monthNum);
      return {
        month,
        monthIndex: i,
        expenses: exp ? parseFloat(exp.total) : 0,
        income: inc ? parseFloat(inc.total) : 0,
        items: monthItems.map((item: any) => ({
          date: item.entry_date,
          description: item.description,
          vendor: item.vendor,
          account: item.account_name,
          type: item.account_type,
          amount: item.account_type === 'expense' 
            ? parseFloat(item.expense_amount) 
            : parseFloat(item.income_amount),
        })).filter((item: any) => item.amount > 0),
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Spend summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}