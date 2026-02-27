// app/api/farm/crop-plans/route.ts
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// Valid crops (must match lib/crop-colors.ts)
const VALID_CROPS = [
  "HRS Wheat",
  "Durum",
  "Canola",
  "Barley",
  "Oats",
  "Flax",
  "Large Green Lentils",
  "Small Green Lentils",
  "Small Red Lentils",
  "Peas",
  "Chickpeas",
  "Mustard",
];

// GET — fetch crop plans for a user + crop year
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("crop_year") || String(new Date().getFullYear()));

  if (isNaN(cropYear)) {
    return NextResponse.json({ error: "Invalid crop_year" }, { status: 400 });
  }

  try {
    const rows = await sql`
      SELECT 
        id,
        crop,
        acres,
        target_yield_bu,
        notes,
        crop_year,
        (acres * target_yield_bu) AS total_production_bu,
        created_at,
        updated_at
      FROM crop_plans
      WHERE user_id = ${userId}
        AND crop_year = ${cropYear}
      ORDER BY acres DESC
    `;

    // Add MT conversion (1 MT = ~36.744 bu for wheat-class, varies by crop)
    const BU_PER_MT: Record<string, number> = {
      "HRS Wheat": 36.744,
      "Durum": 36.744,
      "Canola": 44.092,
      "Barley": 45.93,
      "Oats": 64.842,
      "Flax": 39.368,
      "Lentils": 36.744,
      "Peas": 36.744,
      "Chickpeas": 36.744,
      "Mustard": 44.092,
    };

    const plans = rows.map((row: any) => ({
      ...row,
      acres: parseFloat(row.acres),
      target_yield_bu: parseFloat(row.target_yield_bu),
      total_production_bu: parseFloat(row.total_production_bu),
      total_production_mt: parseFloat(row.total_production_bu) / (BU_PER_MT[row.crop] || 36.744),
    }));

    const summary = {
      crop_year: cropYear,
      total_acres: plans.reduce((sum: number, p: any) => sum + p.acres, 0),
      total_production_bu: plans.reduce((sum: number, p: any) => sum + p.total_production_bu, 0),
      total_production_mt: plans.reduce((sum: number, p: any) => sum + p.total_production_mt, 0),
      crop_count: plans.length,
    };

    return NextResponse.json({ plans, summary });
  } catch (error) {
    console.error("Error fetching crop plans:", error);
    return NextResponse.json({ error: "Failed to fetch crop plans" }, { status: 500 });
  }
}

// POST — upsert crop plans (accepts single or array)
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const entries = Array.isArray(body) ? body : [body];

    // Validate all entries
    for (const entry of entries) {
      if (!entry.crop || !VALID_CROPS.includes(entry.crop)) {
        return NextResponse.json(
          { error: `Invalid crop: ${entry.crop}. Must be one of: ${VALID_CROPS.join(", ")}` },
          { status: 400 }
        );
      }
      if (!entry.acres || entry.acres <= 0) {
        return NextResponse.json({ error: "Acres must be greater than 0" }, { status: 400 });
      }
      if (!entry.target_yield_bu || entry.target_yield_bu <= 0) {
        return NextResponse.json({ error: "Target yield must be greater than 0" }, { status: 400 });
      }
      if (!entry.crop_year || isNaN(parseInt(entry.crop_year))) {
        return NextResponse.json({ error: "Valid crop_year is required" }, { status: 400 });
      }
    }

    // Upsert each entry
    const results = [];
    for (const entry of entries) {
      const rows = await sql`
        INSERT INTO crop_plans (user_id, crop_year, crop, acres, target_yield_bu, notes)
        VALUES (
          ${userId},
          ${parseInt(entry.crop_year)},
          ${entry.crop},
          ${entry.acres},
          ${entry.target_yield_bu},
          ${entry.notes || null}
        )
        ON CONFLICT (user_id, crop_year, crop)
        DO UPDATE SET
          acres = EXCLUDED.acres,
          target_yield_bu = EXCLUDED.target_yield_bu,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id, crop, acres, target_yield_bu, notes, crop_year,
          (acres * target_yield_bu) AS total_production_bu
      `;
      results.push(rows[0]);
    }

    return NextResponse.json({
      message: `${results.length} crop plan(s) saved`,
      plans: results,
    });
  } catch (error) {
    console.error("Error saving crop plans:", error);
    return NextResponse.json({ error: "Failed to save crop plans" }, { status: 500 });
  }
}

// DELETE — remove a crop plan row by ID
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("id");

  if (!planId) {
    return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
  }

  try {
    const rows = await sql`
      DELETE FROM crop_plans
      WHERE id = ${planId}
        AND user_id = ${userId}
      RETURNING id, crop
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Crop plan not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: `Removed ${rows[0].crop} from crop plan`,
      deleted: rows[0],
    });
  } catch (error) {
    console.error("Error deleting crop plan:", error);
    return NextResponse.json({ error: "Failed to delete crop plan" }, { status: 500 });
  }
}