import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const cropYear = searchParams.get('cropYear') || new Date().getFullYear().toString();

  const sql = neon(process.env.DATABASE_URL!);

  const rows = await sql`
    SELECT
      f.id            AS field_id,
      f.field_name,
      f.acres,
      fc.id           AS field_crop_id,
      fc.crop_type,
      fc.variety,
      fc.crop_year,
      fc.seeded_acres,
      fc.expected_yield_bu_ac,
      fc.status,
      COALESCE(costs.total, 0)   AS total_costs,
      COALESCE(revenue.total, 0) AS total_revenue,
      costs.breakdown            AS cost_breakdown,
      revenue.breakdown          AS revenue_breakdown
    FROM fields f
    LEFT JOIN field_crops fc
      ON fc.field_id = f.id AND fc.crop_year = ${parseInt(cropYear)}
    LEFT JOIN (
      SELECT field_crop_id,
             SUM(total_amount) AS total,
             json_agg(json_build_object('type', cost_type, 'amount', total_amount)) AS breakdown
      FROM field_costs
      GROUP BY field_crop_id
    ) costs ON costs.field_crop_id = fc.id
    LEFT JOIN (
      SELECT field_crop_id,
             SUM(total_revenue) AS total,
             json_agg(json_build_object('type', revenue_type, 'amount', total_revenue)) AS breakdown
      FROM field_revenue
      GROUP BY field_crop_id
    ) revenue ON revenue.field_crop_id = fc.id
    WHERE f.farm_id = ${userId}
    ORDER BY (COALESCE(revenue.total, 0) - COALESCE(costs.total, 0)) DESC
  `;

  const totalRevenue = rows.reduce((s, r) => s + Number(r.total_revenue), 0);
  const totalCosts   = rows.reduce((s, r) => s + Number(r.total_costs), 0);
  const totalAcres   = rows.reduce((s, r) => s + Number(r.acres || 0), 0);

  return NextResponse.json({
    fields: rows,
    summary: { totalRevenue, totalCosts, totalAcres, fieldCount: rows.length },
    cropYear,
  });
}