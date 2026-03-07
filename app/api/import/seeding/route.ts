import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

interface SeedingImportRow {
  field_id: string;
  crop_type: string;
  variety?: string | null;
  seeded_acres?: number | null;
  seeding_date?: string | null;
  seed_rate?: number | null;
  seed_cost?: number | null;
  field_acres?: number;
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { rows, crop_year } = (await req.json()) as { rows: SeedingImportRow[]; crop_year: number };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const results = {
      cropsCreated: 0,
      cropsUpdated: 0,
      costsCreated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const existing = await sql`
          SELECT id FROM field_crops
          WHERE field_id = ${row.field_id} AND crop_year = ${crop_year} AND LOWER(crop_type) = LOWER(${row.crop_type})
          LIMIT 1
        `;

        if (existing.length > 0) {
          await sql`
            UPDATE field_crops SET
              variety = COALESCE(${row.variety || null}, variety),
              seeded_acres = COALESCE(${row.seeded_acres || null}, seeded_acres),
              seeding_date = COALESCE(${row.seeding_date || null}, seeding_date),
              seed_rate_lbs_ac = COALESCE(${row.seed_rate || null}, seed_rate_lbs_ac),
              status = 'seeded'
            WHERE id = ${existing[0].id}
          `;
          results.cropsUpdated++;
        } else {
          await sql`
            INSERT INTO field_crops (field_id, crop_year, crop_type, variety, seeded_acres, seeding_date, seed_rate_lbs_ac, status)
            VALUES (${row.field_id}, ${crop_year}, ${row.crop_type}, ${row.variety || null}, ${row.seeded_acres || row.field_acres || null}, ${row.seeding_date || null}, ${row.seed_rate || null}, 'seeded')
          `;
          results.cropsCreated++;
        }

        if (row.seed_cost && row.seed_cost > 0) {
          const seedAcres = row.seeded_acres || row.field_acres || 0;
          const totalCost = row.seed_cost * seedAcres;
          await sql`
            INSERT INTO field_costs (field_id, crop_year, category, description, actual_amount)
            VALUES (${row.field_id}, ${crop_year}, 'seed', ${`Seed cost - ${row.crop_type}${row.variety ? ` (${row.variety})` : ""}`}, ${totalCost})
          `;
          results.costsCreated++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true, ...results,
      message: `${results.cropsCreated} seeding records created, ${results.cropsUpdated} updated${results.costsCreated > 0 ? `, ${results.costsCreated} seed costs added` : ""}`,
    });
  } catch (err: any) {
    console.error("Seeding import error:", err);
    return NextResponse.json({ error: "Import failed: " + err.message }, { status: 500 });
  }
}