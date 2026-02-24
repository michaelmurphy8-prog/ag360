// app/api/finance/pnl/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cropYear = parseInt(req.nextUrl.searchParams.get("cropYear") || "2025");
  const view = req.nextUrl.searchParams.get("view") || "farm"; // farm | crop | field

  try {
    // Get all account balances from journal lines for this crop year
    let balances;

    if (view === "field") {
      balances = await sql`
        SELECT
          a.id as account_id, a.code, a.name, a.account_type, a.sub_type,
          a.normal_balance, a.field_allocatable,
          jl.field_name,
          jl.crop,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_lines jl ON jl.account_id = a.id
        LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
          AND je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
          AND je.is_posted = true
        WHERE a.user_id = ${userId}
          AND a.account_type IN ('revenue', 'expense')
          AND a.is_active = true
        GROUP BY a.id, a.code, a.name, a.account_type, a.sub_type, a.normal_balance, a.field_allocatable, jl.field_name, jl.crop
        ORDER BY a.sort_order ASC
      `;
    } else if (view === "crop") {
      balances = await sql`
        SELECT
          a.id as account_id, a.code, a.name, a.account_type, a.sub_type,
          a.normal_balance,
          jl.crop,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_lines jl ON jl.account_id = a.id
        LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
          AND je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
          AND je.is_posted = true
        WHERE a.user_id = ${userId}
          AND a.account_type IN ('revenue', 'expense')
          AND a.is_active = true
        GROUP BY a.id, a.code, a.name, a.account_type, a.sub_type, a.normal_balance, jl.crop
        ORDER BY a.sort_order ASC
      `;
    } else {
      // Farm-wide
      balances = await sql`
        SELECT
          a.id as account_id, a.code, a.name, a.account_type, a.sub_type,
          a.normal_balance,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM accounts a
        LEFT JOIN journal_lines jl ON jl.account_id = a.id
        LEFT JOIN journal_entries je ON jl.journal_entry_id = je.id
          AND je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
          AND je.is_posted = true
        WHERE a.user_id = ${userId}
          AND a.account_type IN ('revenue', 'expense')
          AND a.is_active = true
        GROUP BY a.id, a.code, a.name, a.account_type, a.sub_type, a.normal_balance
        HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
        ORDER BY a.sort_order ASC
      `;
    }

    // Calculate the P&L structure
    let totalRevenue = 0;
    let totalExpenses = 0;
    const revenueLines: any[] = [];
    const expenseLines: any[] = [];

    for (const b of balances) {
      const debit = parseFloat(b.total_debit) || 0;
      const credit = parseFloat(b.total_credit) || 0;
      // Revenue accounts have credit normal balance (credit - debit = balance)
      // Expense accounts have debit normal balance (debit - credit = balance)
      const balance = b.normal_balance === "credit" ? credit - debit : debit - credit;

      if (balance === 0) continue;

      const line = {
        account_id: b.account_id,
        code: b.code,
        name: b.name,
        sub_type: b.sub_type,
        balance: Math.abs(balance),
        field_name: b.field_name || null,
        crop: b.crop || null,
      };

      if (b.account_type === "revenue") {
        totalRevenue += Math.abs(balance);
        revenueLines.push(line);
      } else {
        totalExpenses += Math.abs(balance);
        expenseLines.push(line);
      }
    }

    const netIncome = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    // Group expenses by sub_type for the P&L display
    const expensesByCategory: Record<string, { label: string; total: number; lines: any[] }> = {};
    for (const e of expenseLines) {
      const cat = e.sub_type || "other";
      if (!expensesByCategory[cat]) {
        expensesByCategory[cat] = { label: formatSubType(cat), total: 0, lines: [] };
      }
      expensesByCategory[cat].total += e.balance;
      expensesByCategory[cat].lines.push(e);
    }

    return NextResponse.json({
      cropYear,
      view,
      totalRevenue,
      totalExpenses,
      netIncome,
      margin: Math.round(margin * 10) / 10,
      revenueLines,
      expensesByCategory,
      entryCount: balances.length,
    });
  } catch (error) {
    console.error("P&L fetch error:", error);
    return NextResponse.json({ error: "Failed to generate P&L" }, { status: 500 });
  }
}

function formatSubType(sub: string): string {
  const map: Record<string, string> = {
    grain_sales: "Grain Sales",
    insurance: "Insurance",
    government: "Government Payments",
    other_revenue: "Other Revenue",
    livestock: "Livestock",
    crop_input: "Crop Inputs",
    custom_work: "Custom Work",
    grain_handling: "Grain Handling",
    fuel: "Fuel & Lubricants",
    equipment: "Equipment & Repairs",
    land: "Land Costs",
    labour: "Labour",
    overhead: "Overhead & Admin",
    interest: "Interest",
    depreciation: "Depreciation",
    other: "Other Expenses",
  };
  return map[sub] || sub;
}