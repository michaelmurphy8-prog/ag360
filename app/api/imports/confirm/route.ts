// app/api/imports/confirm/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import {
  parseCSV,
  buildInsertRecords,
  getTableName,
  normalizeValue,
  TARGET_FIELDS,
} from "@/lib/import-engine";
import type { BrandId, DataTypeId } from "@/lib/import-engine";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      csvText,
      provider,
      dataType,
      cropYear,
      columnMapping,
      fieldMapping,
      fileName,
    } = body as {
      csvText: string;
      provider: BrandId;
      dataType: DataTypeId;
      cropYear: number;
      columnMapping: Record<string, string>;
      fieldMapping: Record<string, string>;
      fileName: string;
    };

    // Parse the CSV again server-side (don't trust client data)
    const { rows } = parseCSV(csvText);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No data rows found" }, { status: 400 });
    }

    // 1. Create data_source record
    const [source] = await sql`
      INSERT INTO data_sources (user_id, source_type, provider, file_name, record_count, crop_year)
      VALUES (${userId}, 'csv', ${provider}, ${fileName}, ${rows.length}, ${cropYear})
      RETURNING id
    `;
    const sourceId = source.id;

    // 2. Save field aliases for future auto-matching
    const fieldNameCol = Object.entries(columnMapping).find(([, v]) => v === "field_name");
    if (fieldNameCol) {
      const externalNames = [...new Set(rows.map((r) => r[fieldNameCol[0]]).filter(Boolean))];
      for (const extName of externalNames) {
        const fieldId = fieldMapping[extName];
        if (fieldId && fieldId !== "_new") {
          await sql`
            INSERT INTO field_aliases (field_id, user_id, source_provider, external_field_name, confirmed_by_user)
            VALUES (${fieldId}, ${userId}, ${provider}, ${extName}, true)
            ON CONFLICT (user_id, source_provider, external_field_name)
            DO UPDATE SET field_id = ${fieldId}, confirmed_by_user = true
          `;
        }
      }
    }

    // 3. Save column mapping template for next import
    await sql`
      INSERT INTO column_mapping_templates (user_id, provider, data_type, mapping)
      VALUES (${userId}, ${provider}, ${dataType}, ${JSON.stringify(columnMapping)})
      ON CONFLICT (user_id, provider, data_type)
      DO UPDATE SET mapping = ${JSON.stringify(columnMapping)},
                    times_used = column_mapping_templates.times_used + 1,
                    last_used_at = NOW()
    `;

    // 4. Insert records based on data type
    const tableName = getTableName(dataType);
    const targetFields = TARGET_FIELDS[dataType] || [];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        // Build the record from column mapping
        const record: Record<string, unknown> = {
          user_id: userId,
          source_id: sourceId,
          crop_year: cropYear,
        };

        for (const [sourceCol, targetKey] of Object.entries(columnMapping)) {
          const rawValue = row[sourceCol];
          const normalized = normalizeValue(rawValue || "", targetKey);
          const targetField = targetFields.find((f) => f.key === targetKey);
          const dbCol = targetField?.dbColumn || targetKey;
          record[dbCol] = normalized;
        }

        // Resolve field_id
        if (fieldNameCol) {
          const extName = row[fieldNameCol[0]];
          const fId = fieldMapping[extName];
          record.field_id = fId && fId !== "_new" ? fId : null;
          record.external_field_name = extName;
        }

        // Store raw data
        record.raw_data = JSON.stringify(row);

        // Dynamic INSERT based on data type
        if (dataType === "harvest") {
          await sql`
            INSERT INTO harvest_records (
              user_id, source_id, crop_year, crop, variety,
              area_harvested_ac, dry_yield_bu_per_ac, total_dry_yield_bu,
              moisture_pct, harvest_start_date, productivity_ac_per_hr,
              test_weight_lbs_per_bu, protein_pct,
              field_id, external_field_name, raw_data
            ) VALUES (
              ${record.user_id}, ${record.source_id}, ${record.crop_year},
              ${record.crop || "Unknown"}, ${record.variety || null},
              ${record.area_harvested_ac || null}, ${record.dry_yield_bu_per_ac || null},
              ${record.total_dry_yield_bu || null}, ${record.moisture_pct || null},
              ${record.harvest_start_date || null}, ${record.productivity_ac_per_hr || null},
              ${record.test_weight_lbs_per_bu || null}, ${record.protein_pct || null},
              ${record.field_id || null}, ${record.external_field_name || null},
              ${record.raw_data}
            )
          `;
        } else if (dataType === "seeding") {
          await sql`
            INSERT INTO seeding_records (
              user_id, source_id, crop_year, crop, variety,
              area_seeded_ac, seeding_date, seed_rate, total_applied,
              target_depth_in, productivity_ac_per_hr,
              field_id, external_field_name, raw_data
            ) VALUES (
              ${record.user_id}, ${record.source_id}, ${record.crop_year},
              ${record.crop || "Unknown"}, ${record.variety || null},
              ${record.area_seeded_ac || null}, ${record.seeding_date || null},
              ${record.seed_rate || null}, ${record.total_applied || null},
              ${record.target_depth_in || null}, ${record.productivity_ac_per_hr || null},
              ${record.field_id || null}, ${record.external_field_name || null},
              ${record.raw_data}
            )
          `;
        } else if (dataType === "application") {
          await sql`
            INSERT INTO application_records (
              user_id, source_id, crop_year, product_name, product_type,
              area_applied_ac, application_date, rate, total_applied,
              productivity_ac_per_hr,
              field_id, external_field_name, raw_data
            ) VALUES (
              ${record.user_id}, ${record.source_id}, ${record.crop_year},
              ${record.product_name || "Unknown"}, ${record.product_type || "other"},
              ${record.area_applied_ac || null}, ${record.application_date || null},
              ${record.rate || null}, ${record.total_applied || null},
              ${record.productivity_ac_per_hr || null},
              ${record.field_id || null}, ${record.external_field_name || null},
              ${record.raw_data}
            )
          `;
        } else if (dataType === "tillage") {
          await sql`
            INSERT INTO tillage_records (
              user_id, source_id, crop_year, operation_type,
              area_ac, tillage_date, target_depth_in, actual_depth_in,
              productivity_ac_per_hr, speed_mph,
              field_id, external_field_name, raw_data
            ) VALUES (
              ${record.user_id}, ${record.source_id}, ${record.crop_year},
              ${record.operation_type || null},
              ${record.area_ac || null}, ${record.tillage_date || null},
              ${record.target_depth_in || null}, ${record.actual_depth_in || null},
              ${record.productivity_ac_per_hr || null}, ${record.speed_mph || null},
              ${record.field_id || null}, ${record.external_field_name || null},
              ${record.raw_data}
            )
          `;
        } else if (dataType === "forage") {
          await sql`
            INSERT INTO forage_records (
              user_id, source_id, crop_year, operation_type, crop,
              cutting_number, area_ac, operation_date,
              bale_count, bale_weight_lbs, moisture_pct, total_tonnage,
              productivity_ac_per_hr,
              field_id, external_field_name, raw_data
            ) VALUES (
              ${record.user_id}, ${record.source_id}, ${record.crop_year},
              ${record.operation_type || "other"}, ${record.crop || null},
              ${record.cutting_number || null}, ${record.area_ac || null},
              ${record.operation_date || null},
              ${record.bale_count || null}, ${record.bale_weight_lbs || null},
              ${record.moisture_pct || null}, ${record.total_tonnage || null},
              ${record.productivity_ac_per_hr || null},
              ${record.field_id || null}, ${record.external_field_name || null},
              ${record.raw_data}
            )
          `;
        }

        inserted++;
      } catch (rowError) {
        console.error("Row insert error:", rowError);
        skipped++;
      }
    }

    // 5. Update source with final count
    await sql`
      UPDATE data_sources SET record_count = ${inserted}, updated_at = NOW()
      WHERE id = ${sourceId}
    `;

    return NextResponse.json({
      success: true,
      sourceId,
      inserted,
      skipped,
      total: rows.length,
    });
  } catch (error) {
    console.error("Import confirm error:", error);
    return NextResponse.json({ error: "Failed to import data" }, { status: 500 });
  }
}