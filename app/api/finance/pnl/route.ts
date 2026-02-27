import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  console.log("P&L hit — userId:", req.headers.get("x-user-id"), "url:", req.url);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("cropYear") || String(new Date().getFullYear()));
  const view = searchParams.get("view") || "farm"; // farm | crop | field

  try {
    // ── Real ledger data from journal entries ──
    let ledgerData;

    if (view === "crop") {
      ledgerData = await sql`
        SELECT
          jl.crop as group_key,
          jl.crop as group_label,
          a.account_type,
          a.sub_type,
          a.name as account_name,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM journal_entries je
        JOIN journal_lines jl ON jl.journal_entry_id = je.id
        JOIN accounts a ON a.id = jl.account_id AND a.user_id = ${userId}
        WHERE je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
        GROUP BY jl.crop, a.account_type, a.sub_type, a.name
        ORDER BY jl.crop, a.account_type, a.name
      `;
    } else if (view === "field") {
      ledgerData = await sql`
        SELECT
          jl.field_name as group_key,
          jl.field_name as group_label,
          a.account_type,
          a.sub_type,
          a.name as account_name,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM journal_entries je
        JOIN journal_lines jl ON jl.journal_entry_id = je.id
        JOIN accounts a ON a.id = jl.account_id AND a.user_id = ${userId}
        WHERE je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
        GROUP BY jl.field_name, a.account_type, a.sub_type, a.name
        ORDER BY jl.field_name, a.account_type, a.name
      `;
    } else {
      ledgerData = await sql`
        SELECT
          'farm' as group_key,
          'Whole Farm' as group_label,
          a.account_type,
          a.sub_type,
          a.name as account_name,
          COALESCE(SUM(jl.debit), 0) as total_debit,
          COALESCE(SUM(jl.credit), 0) as total_credit
        FROM journal_entries je
        JOIN journal_lines jl ON jl.journal_entry_id = je.id
        JOIN accounts a ON a.id = jl.account_id AND a.user_id = ${userId}
        WHERE je.user_id = ${userId}
          AND je.crop_year = ${cropYear}
          AND je.is_void = false
        GROUP BY a.account_type, a.sub_type, a.name
        ORDER BY a.account_type, a.name
      `;
    }

    // ── Farm Profile estimates as fallback ──
    const profileRows = await sql`
      SELECT profile FROM farm_profiles WHERE user_id = ${userId}
    `;
    const profile = profileRows[0]?.profile;
    const estimates: Record<string, { revenue: number; costs: number; acres: number }> = {};

    if (profile?.crops && Array.isArray(profile.crops)) {
      for (const c of profile.crops) {
        const name = c.crop || c.name;
        if (!name) continue;
        const acres = Number(c.acres || c.total_acres || 0);
        const targetYield = Number(c.target_yield || c.yield || 0);
        const targetPrice = Number(c.target_price || c.price || 0);
        const costPerAcre = Number(c.cost_per_acre || c.costs || 0);

        estimates[name] = {
          revenue: Math.round(acres * targetYield * targetPrice),
          costs: Math.round(acres * costPerAcre),
          acres,
        };
      }
    }

    // ── Merge real + estimated ──
    const groups: Record<string, {
      label: string;
      revenue: number;
      expenses: number;
      categories: Record<string, { type: string; amount: number }>;
      hasRealData: boolean;
    }> = {};

    for (const row of ledgerData) {
      const key = row.group_key || "farm";
      if (!groups[key]) {
        groups[key] = {
          label: row.group_label || key,
          revenue: 0,
          expenses: 0,
          categories: {},
          hasRealData: true,
        };
      }

      const amount = Number(row.total_credit) - Number(row.total_debit);

      if (row.account_type === "revenue") {
        groups[key].revenue += Math.abs(amount);
        groups[key].categories[row.account_name] = { type: "revenue", amount: Math.abs(amount) };
      } else if (row.account_type === "expense") {
        const expAmount = Number(row.total_debit) - Number(row.total_credit);
        groups[key].expenses += Math.abs(expAmount);
        groups[key].categories[row.account_name] = { type: "expense", amount: Math.abs(expAmount) };
      }
    }

    // Fill in Farm Profile estimates for crops with no real data
    if (view === "crop" || view === "farm") {
      for (const [cropName, est] of Object.entries(estimates)) {
        const key = view === "crop" ? cropName : "farm";
        if (!groups[key]) {
          groups[key] = {
            label: view === "crop" ? cropName : "Whole Farm",
            revenue: est.revenue,
            expenses: est.costs,
            categories: {
              "Estimated Revenue": { type: "revenue", amount: est.revenue },
              "Estimated Costs": { type: "expense", amount: est.costs },
            },
            hasRealData: false,
          };
        } else if (view === "farm" && groups[key].revenue === 0 && groups[key].expenses === 0) {
          // Farm view: add estimates if ledger is empty
          groups[key].revenue += est.revenue;
          groups[key].expenses += est.costs;
          groups[key].hasRealData = false;
        }
      }
    }

    // Build response
    const result = Object.entries(groups).map(([key, g]) => ({
      key,
      label: g.label,
      revenue: g.revenue,
      expenses: g.expenses,
      netIncome: g.revenue - g.expenses,
      margin: g.revenue > 0 ? Math.round((g.revenue - g.expenses) / g.revenue * 100) : 0,
      categories: Object.entries(g.categories).map(([name, c]) => ({
        name,
        type: c.type,
        amount: c.amount,
      })),
      hasRealData: g.hasRealData,
    }));

    // Farm-level totals
    const totals = {
      revenue: result.reduce((s, r) => s + r.revenue, 0),
      expenses: result.reduce((s, r) => s + r.expenses, 0),
      netIncome: result.reduce((s, r) => s + r.netIncome, 0),
    };

    const availableYears = await sql`
      SELECT DISTINCT crop_year FROM journal_entries
      WHERE user_id = ${userId} AND is_void = false
      ORDER BY crop_year DESC
    `;

    return NextResponse.json({
      success: true,
      cropYear,
      view,
      totals,
      groups: result.sort((a, b) => b.revenue - a.revenue),
      availableYears: availableYears.map(y => y.crop_year),
      hasEstimates: result.some(r => !r.hasRealData),
    });
  } catch (err: any) {
    console.error("P&L GET error:", err?.message || err, err?.stack);
    return NextResponse.json({ error: "Failed to fetch P&L" }, { status: 500 });
  }
}