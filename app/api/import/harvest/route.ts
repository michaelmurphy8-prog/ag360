import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface HarvestImportRow {
  field_id: string;
  crop_type: string;
  bushels: number;
  moisture?: number | null;
  grade?: string | null;
  date?: string | null;
  destination?: string | null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows, crop_year } = (await req.json()) as { rows: HarvestImportRow[]; crop_year: number };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    // Fetch bins for destination matching
    const bins = await sql`SELECT id, LOWER(TRIM(bin_name)) as bin_name_lower, bin_name FROM bins WHERE user_id = ${userId}`;
    const binMap = new Map(bins.map((b: any) => [b.bin_name_lower, b]));

    const results = {
      loadsCreated: 0,
      binsUpdated: 0,
      cropsUpdated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Create grain load
        await sql`
          INSERT INTO grain_loads (user_id, field_id, crop_type, load_date, net_weight, moisture, grade, destination, status, crop_year)
          VALUES (${userId}, ${row.field_id}, ${row.crop_type}, ${row.date || null}, ${row.bushels}, ${row.moisture || null}, ${row.grade || null}, ${row.destination || null}, 'stored', ${crop_year})
        `;
        results.loadsCreated++;

        // Update bin if destination matches
        if (row.destination) {
          const destLower = row.destination.trim().toLowerCase();
          const matchedBin = binMap.get(destLower);
          if (matchedBin) {
            await sql`
              UPDATE bins SET
                current_bu = COALESCE(current_bu, 0) + ${row.bushels},
                commodity = ${row.crop_type},
                grade = COALESCE(${row.grade || null}, grade),
                moisture = COALESCE(${row.moisture || null}, moisture)
              WHERE id = ${matchedBin.id} AND user_id = ${userId}
            `;
            results.binsUpdated++;
          }
        }

        // Update field_crops status to harvested
        await sql`
          UPDATE field_crops SET status = 'harvested'
          WHERE field_id = ${row.field_id}
            AND crop_year = ${crop_year}
            AND LOWER(crop_type) = LOWER(${row.crop_type})
            AND status != 'harvested'
        `;
        results.cropsUpdated++;
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.loadsCreated} harvest loads created${results.binsUpdated > 0 ? `, ${results.binsUpdated} bins updated` : ""}`,
    });
  } catch (err: any) {
    console.error("Harvest import error:", err);
    return NextResponse.json({ error: "Import failed: " + err.message }, { status: 500 });
  }
}