import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

interface FieldImportRow {
  field_name: string;
  acres: number;
  crop_type?: string | null;
  variety?: string | null;
  seeded_acres?: number | null;
  quarter?: string | null;
  section?: number | null;
  township?: number | null;
  range?: number | null;
  meridian?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  province?: string | null;
  notes?: string | null;
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { rows, crop_year } = (await req.json()) as { rows: FieldImportRow[]; crop_year: number };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const existingFields = await sql`
      SELECT id, LOWER(TRIM(field_name)) as field_name_lower, field_name
      FROM fields WHERE tenant_id = ${tenantId}
    `;
    const existingMap = new Map(existingFields.map((f: any) => [f.field_name_lower, f]));

    const results = {
      created: 0,
      updated: 0,
      cropsCreated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nameLower = row.field_name.trim().toLowerCase();
        const existing = existingMap.get(nameLower);

        let fieldId: string;

        if (existing) {
          await sql`
            UPDATE fields SET
              acres = COALESCE(${row.acres}, acres),
              lld_quarter = COALESCE(${row.quarter?.toUpperCase() || null}, lld_quarter),
              lld_section = COALESCE(${row.section || null}, lld_section),
              lld_township = COALESCE(${row.township || null}, lld_township),
              lld_range = COALESCE(${row.range || null}, lld_range),
              lld_meridian = COALESCE(${row.meridian || null}, lld_meridian),
              latitude = COALESCE(${row.latitude || null}, latitude),
              longitude = COALESCE(${row.longitude || null}, longitude),
              lld_province = COALESCE(${row.province || null}, lld_province),
              notes = COALESCE(${row.notes || null}, notes)
            WHERE id = ${existing.id} AND tenant_id = ${tenantId}
          `;
          fieldId = existing.id;
          results.updated++;
        } else {
          const inserted = await sql`
            INSERT INTO fields (
              tenant_id, field_name, acres, lld_quarter, lld_section,
              lld_township, lld_range, lld_meridian, latitude, longitude,
              lld_province, notes
            ) VALUES (
              ${tenantId}, ${row.field_name.trim()}, ${row.acres},
              ${row.quarter?.toUpperCase() || null}, ${row.section || null},
              ${row.township || null}, ${row.range || null}, ${row.meridian || null},
              ${row.latitude || null}, ${row.longitude || null},
              ${row.province || "SK"}, ${row.notes || null}
            )
            RETURNING id
          `;
          fieldId = inserted[0].id;
          results.created++;
        }

        if (row.crop_type) {
          const existingCrop = await sql`
            SELECT id FROM field_crops
            WHERE field_id = ${fieldId} AND crop_year = ${crop_year}
            LIMIT 1
          `;

          if (existingCrop.length > 0) {
            await sql`
              UPDATE field_crops SET
                crop_type = ${row.crop_type},
                variety = COALESCE(${row.variety || null}, variety),
                seeded_acres = COALESCE(${row.seeded_acres || null}, seeded_acres),
                status = 'planned'
              WHERE id = ${existingCrop[0].id}
            `;
          } else {
            await sql`
              INSERT INTO field_crops (field_id, crop_year, crop_type, variety, seeded_acres, status)
              VALUES (
                ${fieldId}, ${crop_year}, ${row.crop_type},
                ${row.variety || null}, ${row.seeded_acres || row.acres}, 'planned'
              )
            `;
          }
          results.cropsCreated++;
        }
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.created} fields created, ${results.updated} updated${results.cropsCreated > 0 ? `, ${results.cropsCreated} crop assignments added` : ""}`,
    });
  } catch (err: any) {
    console.error("Fields import error:", err);
    return NextResponse.json({ error: "Import failed: " + err.message }, { status: 500 });
  }
}