import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId, userId } = tenantAuth;

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("crop_year") || new Date().getFullYear().toString());

  try {
    const fields = await sql`
      SELECT
        f.id,
        f.field_name,
        f.acres,
        f.lld_quarter,
        f.lld_section,
        f.lld_township,
        f.lld_range,
        f.lld_meridian,
        f.lld_province,
        f.notes,
        f.latitude,
        f.longitude,
        f.boundary,
        f.boundary_acres,
        f.created_at,
        fc.id AS crop_id,
        fc.crop_year,
        fc.crop_type,
        fc.variety,
        fc.seeded_acres,
        fc.expected_yield_bu_ac,
        COALESCE(fc.seeding_date, seed_log.seeding_date) AS seeding_date,
        fc.status AS crop_status,
        COALESCE(cost_summary.budget_total, 0) AS budget_total,
        COALESCE(cost_summary.actual_total, 0) AS actual_total,
        COALESCE(rev_summary.budget_revenue, 0) AS budget_revenue,
        COALESCE(rev_summary.actual_revenue, 0) AS actual_revenue
      FROM fields f
      LEFT JOIN field_crops fc
        ON fc.field_id = f.id AND fc.crop_year = ${cropYear}
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN fco.cost_type = 'budget' THEN fco.total_amount ELSE 0 END) AS budget_total,
          SUM(CASE WHEN fco.cost_type = 'actual' THEN fco.total_amount ELSE 0 END) AS actual_total
        FROM field_costs fco
        WHERE fco.field_crop_id = fc.id
      ) cost_summary ON true
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN fr.revenue_type = 'budget' THEN fr.total_revenue ELSE 0 END) AS budget_revenue,
          SUM(CASE WHEN fr.revenue_type = 'actual' THEN fr.total_revenue ELSE 0 END) AS actual_revenue
        FROM field_revenue fr
        WHERE fr.field_crop_id = fc.id
      ) rev_summary ON true
      LEFT JOIN LATERAL (
        SELECT seeding_date
        FROM agronomy_seeding_log asl
        WHERE asl.tenant_id = ${tenantId}
          AND LOWER(asl.field_name) = LOWER(f.field_name)
        ORDER BY asl.seeding_date DESC
        LIMIT 1
      ) seed_log ON true
      WHERE f.tenant_id = ${tenantId}
      ORDER BY f.field_name ASC
    `;

    let totalAcres = 0;
    let seededAcres = 0;
    let totalBudgetCost = 0;
    let totalActualCost = 0;
    let totalBudgetRevenue = 0;
    let totalActualRevenue = 0;
    let seededCount = 0;
    let totalFields = 0;
    const cropBreakdown: Record<string, { acres: number; count: number }> = {};

    for (const row of fields) {
      totalFields++;
      totalAcres += parseFloat(row.acres) || 0;
      totalBudgetCost += parseFloat(row.budget_total) || 0;
      totalActualCost += parseFloat(row.actual_total) || 0;
      totalBudgetRevenue += parseFloat(row.budget_revenue) || 0;
      totalActualRevenue += parseFloat(row.actual_revenue) || 0;

      if (row.crop_id) {
        seededCount++;
        const sa = parseFloat(row.seeded_acres) || parseFloat(row.acres) || 0;
        seededAcres += sa;

        if (row.crop_type) {
          if (!cropBreakdown[row.crop_type]) {
            cropBreakdown[row.crop_type] = { acres: 0, count: 0 };
          }
          cropBreakdown[row.crop_type].acres += sa;
          cropBreakdown[row.crop_type].count++;
        }
      }
    }

    return NextResponse.json({
      fields,
      kpis: {
        totalFields,
        totalAcres,
        seededAcres,
        seededCount,
        unseededCount: totalFields - seededCount,
        totalBudgetCost,
        totalActualCost,
        totalBudgetRevenue,
        totalActualRevenue,
        costVariance: totalActualCost - totalBudgetCost,
        avgCostPerAcre: seededAcres > 0 ? totalActualCost / seededAcres : 0,
        netMarginActual: totalActualRevenue - totalActualCost,
        netMarginBudget: totalBudgetRevenue - totalBudgetCost,
      },
      cropBreakdown,
      cropYear,
    });
  } catch (error) {
    console.error("Error fetching fields summary:", error);
    return NextResponse.json({ error: "Failed to fetch fields summary" }, { status: 500 });
  }
}