// app/api/imports/records/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dataType = req.nextUrl.searchParams.get("type") || "harvest";
  const cropYear = req.nextUrl.searchParams.get("year") || "2025";

  try {
    let records;

    if (dataType === "harvest") {
      records = await sql`
        SELECT
          h.id, h.crop, h.variety, h.external_field_name as field_name,
          h.area_harvested_ac, h.dry_yield_bu_per_ac, h.total_dry_yield_bu,
          h.moisture_pct, h.harvest_start_date, h.productivity_ac_per_hr,
          h.test_weight_lbs_per_bu, h.protein_pct,
          d.provider, d.file_name, h.created_at
        FROM harvest_records h
        LEFT JOIN data_sources d ON h.source_id = d.id
        WHERE h.user_id = ${userId} AND h.crop_year = ${parseInt(cropYear)}
        ORDER BY h.dry_yield_bu_per_ac DESC
      `;
    } else if (dataType === "seeding") {
      records = await sql`
        SELECT
          s.id, s.crop, s.variety, s.external_field_name as field_name,
          s.area_seeded_ac, s.seeding_date, s.seed_rate, s.seed_rate_unit,
          s.total_applied, s.target_depth_in, s.productivity_ac_per_hr,
          d.provider, d.file_name, s.created_at
        FROM seeding_records s
        LEFT JOIN data_sources d ON s.source_id = d.id
        WHERE s.user_id = ${userId} AND s.crop_year = ${parseInt(cropYear)}
        ORDER BY s.seeding_date ASC
      `;
    } else if (dataType === "application") {
      records = await sql`
        SELECT
          a.id, a.product_name, a.product_type, a.external_field_name as field_name,
          a.area_applied_ac, a.application_date, a.rate, a.rate_unit,
          a.total_applied, a.productivity_ac_per_hr,
          d.provider, d.file_name, a.created_at
        FROM application_records a
        LEFT JOIN data_sources d ON a.source_id = d.id
        WHERE a.user_id = ${userId} AND a.crop_year = ${parseInt(cropYear)}
        ORDER BY a.application_date ASC
      `;
    }

    // Summary stats
    let summary = {};
    if (dataType === "harvest" && records && records.length > 0) {
      const totalAcres = records.reduce((s: number, r: any) => s + (parseFloat(r.area_harvested_ac) || 0), 0);
      const totalBushels = records.reduce((s: number, r: any) => s + (parseFloat(r.total_dry_yield_bu) || 0), 0);
      const avgYield = totalAcres > 0 ? totalBushels / totalAcres : 0;
      const avgMoisture = records.reduce((s: number, r: any) => s + (parseFloat(r.moisture_pct) || 0), 0) / records.length;
      const varieties = [...new Set(records.map((r: any) => r.variety).filter(Boolean))];
      const crops = [...new Set(records.map((r: any) => r.crop).filter(Boolean))];

      summary = {
        totalAcres: Math.round(totalAcres),
        totalBushels: Math.round(totalBushels),
        avgYield: Math.round(avgYield * 10) / 10,
        avgMoisture: Math.round(avgMoisture * 10) / 10,
        fieldCount: new Set(records.map((r: any) => r.field_name)).size,
        varietyCount: varieties.length,
        cropCount: crops.length,
        topVariety: records[0]?.variety || "—",
        topYield: parseFloat(records[0]?.dry_yield_bu_per_ac) || 0,
      };
    }

    return NextResponse.json({ records: records || [], summary });
  } catch (error) {
    console.error("Records fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch records" }, { status: 500 });
  }
}