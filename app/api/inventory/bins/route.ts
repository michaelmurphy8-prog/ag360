// app/api/inventory/bins/route.ts
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

import { CANONICAL_CROPS } from "@/lib/crop-colors";

const BIN_TYPES = ["hopper", "flat_bottom", "temporary", "shed"];

// Sync bins → inventory_holdings (bins are source of truth)

// GET — all bins for user, optionally filtered by yard
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yardId = searchParams.get("yard_id");

  try {
    let bins;
    if (yardId) {
      bins = await sql`
        SELECT b.*, y.yard_name
        FROM bins b
        JOIN bin_yards y ON y.id = b.yard_id
        WHERE b.user_id = ${userId} AND b.yard_id = ${yardId}
        ORDER BY b.bin_name ASC
      `;
    } else {
      bins = await sql`
        SELECT b.*, y.yard_name
        FROM bins b
        JOIN bin_yards y ON y.id = b.yard_id
        WHERE b.user_id = ${userId}
        ORDER BY y.sort_order ASC, b.bin_name ASC
      `;
    }

    // Parse decimals
    const parsed = bins.map((b: any) => ({
      ...b,
      capacity_bu: parseFloat(b.capacity_bu),
      current_bu: parseFloat(b.current_bu),
      moisture_pct: b.moisture_pct ? parseFloat(b.moisture_pct) : null,
      pos_x: parseFloat(b.pos_x),
      pos_y: parseFloat(b.pos_y),
      fill_pct: parseFloat(b.capacity_bu) > 0
        ? Math.round((parseFloat(b.current_bu) / parseFloat(b.capacity_bu)) * 100)
        : 0,
    }));

    // Summary
    const totalCapacity = parsed.reduce((s: number, b: any) => s + b.capacity_bu, 0);
    const totalStored = parsed.reduce((s: number, b: any) => s + b.current_bu, 0);
    const cropBreakdown: Record<string, number> = {};
    for (const b of parsed) {
      if (b.crop && b.current_bu > 0) {
        cropBreakdown[b.crop] = (cropBreakdown[b.crop] || 0) + b.current_bu;
      }
    }

    return NextResponse.json({
      bins: parsed,
      summary: {
        total_bins: parsed.length,
        total_capacity_bu: totalCapacity,
        total_stored_bu: totalStored,
        utilization_pct: totalCapacity > 0 ? Math.round((totalStored / totalCapacity) * 100) : 0,
        crop_breakdown: cropBreakdown,
      },
    });
  } catch (error) {
    console.error("Error fetching bins:", error);
    return NextResponse.json({ error: "Failed to fetch bins" }, { status: 500 });
  }
}

// POST — create a bin
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (!body.yard_id) return NextResponse.json({ error: "Yard ID is required" }, { status: 400 });
    if (!body.bin_name?.trim()) return NextResponse.json({ error: "Bin name is required" }, { status: 400 });
    if (!body.capacity_bu || body.capacity_bu <= 0) return NextResponse.json({ error: "Capacity must be > 0" }, { status: 400 });
    if (body.current_bu && body.current_bu > body.capacity_bu) return NextResponse.json({ error: "Current bushels cannot exceed capacity" }, { status: 400 });
    if (body.bin_type && !BIN_TYPES.includes(body.bin_type)) return NextResponse.json({ error: `Invalid bin type. Must be: ${BIN_TYPES.join(", ")}` }, { status: 400 });
    if (body.crop && !CANONICAL_CROPS.includes(body.crop)) return NextResponse.json({ error: `Invalid crop. Must be one of: ${CANONICAL_CROPS.join(", ")}` }, { status: 400 });

    const rows = await sql`
      INSERT INTO bins (user_id, yard_id, bin_name, bin_type, capacity_bu, current_bu, crop, grade, moisture_pct, has_aeration, has_monitoring, notes, pos_x, pos_y, latitude, longitude)
      VALUES (
        ${userId}, ${body.yard_id}, ${body.bin_name.trim()},
        ${body.bin_type || "hopper"}, ${body.capacity_bu}, ${body.current_bu || 0},
        ${body.crop || null}, ${body.grade || null}, ${body.moisture_pct || null},
        ${body.has_aeration || false}, ${body.has_monitoring || false},
        ${body.notes || null}, ${body.pos_x || 0}, ${body.pos_y || 0},
        ${body.latitude || null}, ${body.longitude || null}
      )
      RETURNING *
    `;

    return NextResponse.json({ bin: rows[0] });
  } catch (error: any) {
    if (error.message?.includes("unique")) {
      return NextResponse.json({ error: "A bin with that name already exists in this yard" }, { status: 409 });
    }
    console.error("Error creating bin:", error);
    return NextResponse.json({ error: "Failed to create bin" }, { status: 500 });
  }
}

// PUT — update a bin (details or position)
export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Bin ID required" }, { status: 400 });

    // Position-only update (from drag)
    if (body.pos_x !== undefined && body.pos_y !== undefined && Object.keys(body).length <= 3) {
      const rows = await sql`
        UPDATE bins SET pos_x = ${body.pos_x}, pos_y = ${body.pos_y}, updated_at = NOW()
        WHERE id = ${body.id} AND user_id = ${userId}
        RETURNING *
      `;
      if (rows.length === 0) return NextResponse.json({ error: "Bin not found" }, { status: 404 });
      return NextResponse.json({ bin: rows[0] });
    }

    // Full update
    if (body.current_bu !== undefined && body.capacity_bu !== undefined && body.current_bu > body.capacity_bu) {
      return NextResponse.json({ error: "Current bushels cannot exceed capacity" }, { status: 400 });
    }

    const rows = await sql`
      UPDATE bins SET
        bin_name = COALESCE(${body.bin_name || null}, bin_name),
        bin_type = COALESCE(${body.bin_type || null}, bin_type),
        capacity_bu = COALESCE(${body.capacity_bu ?? null}, capacity_bu),
        current_bu = COALESCE(${body.current_bu ?? null}, current_bu),
        crop = ${body.crop ?? null},
        grade = ${body.grade ?? null},
        moisture_pct = ${body.moisture_pct ?? null},
        has_aeration = COALESCE(${body.has_aeration ?? null}, has_aeration),
        has_monitoring = COALESCE(${body.has_monitoring ?? null}, has_monitoring),
        notes = ${body.notes ?? null},
        yard_id = COALESCE(${body.yard_id || null}, yard_id),
        pos_x = COALESCE(${body.pos_x ?? null}, pos_x),
        pos_y = COALESCE(${body.pos_y ?? null}, pos_y),
        latitude = COALESCE(${body.latitude ?? null}, latitude),
        longitude = COALESCE(${body.longitude ?? null}, longitude),
        updated_at = NOW()
      WHERE id = ${body.id} AND user_id = ${userId}
      RETURNING *
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Bin not found" }, { status: 404 });
    return NextResponse.json({ bin: rows[0] });
  } catch (error) {
    console.error("Error updating bin:", error);
    return NextResponse.json({ error: "Failed to update bin" }, { status: 500 });
  }
}

// DELETE — remove a bin
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const binId = searchParams.get("id");
  if (!binId) return NextResponse.json({ error: "Bin ID required" }, { status: 400 });

  try {
    const rows = await sql`
      DELETE FROM bins WHERE id = ${binId} AND user_id = ${userId}
      RETURNING id, bin_name
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Bin not found" }, { status: 404 });
    return NextResponse.json({ message: `Deleted bin "${rows[0].bin_name}"`, deleted: rows[0] });
  } catch (error) {
    console.error("Error deleting bin:", error);
    return NextResponse.json({ error: "Failed to delete bin" }, { status: 500 });
  }
}

// PATCH — batch position update (for saving drag layout)
export async function PATCH(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!Array.isArray(body.positions)) {
      return NextResponse.json({ error: "positions array required" }, { status: 400 });
    }

    for (const pos of body.positions) {
      await sql`
        UPDATE bins SET pos_x = ${pos.pos_x}, pos_y = ${pos.pos_y}, updated_at = NOW()
        WHERE id = ${pos.id} AND user_id = ${userId}
      `;
    }

    return NextResponse.json({ message: `Updated ${body.positions.length} bin positions` });
  } catch (error) {
    console.error("Error batch updating positions:", error);
    return NextResponse.json({ error: "Failed to update positions" }, { status: 500 });
  }
}