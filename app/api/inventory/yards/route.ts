// app/api/inventory/yards/route.ts
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

// GET — all yards for user
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const yards = await sql`
      SELECT y.*,
        COUNT(b.id)::int AS bin_count,
        COALESCE(SUM(b.capacity_bu), 0) AS total_capacity_bu,
        COALESCE(SUM(b.current_bu), 0) AS total_stored_bu
      FROM bin_yards y
      LEFT JOIN bins b ON b.yard_id = y.id AND b.user_id = ${userId}
      WHERE y.user_id = ${userId}
      GROUP BY y.id
      ORDER BY y.sort_order ASC, y.created_at ASC
    `;

    return NextResponse.json({ yards });
  } catch (error) {
    console.error("Error fetching yards:", error);
    return NextResponse.json({ error: "Failed to fetch yards" }, { status: 500 });
  }
}

// POST — create a yard
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.yard_name?.trim()) {
      return NextResponse.json({ error: "Yard name is required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO bin_yards (user_id, yard_name, location, notes, sort_order)
      VALUES (${userId}, ${body.yard_name.trim()}, ${body.location || null}, ${body.notes || null}, ${body.sort_order || 0})
      ON CONFLICT (user_id, yard_name) DO UPDATE SET
        location = EXCLUDED.location,
        notes = EXCLUDED.notes,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW()
      RETURNING *
    `;

    return NextResponse.json({ yard: rows[0] });
  } catch (error) {
    console.error("Error creating yard:", error);
    return NextResponse.json({ error: "Failed to create yard" }, { status: 500 });
  }
}

// PUT — update a yard
export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "Yard ID required" }, { status: 400 });

    const rows = await sql`
      UPDATE bin_yards SET
        yard_name = COALESCE(${body.yard_name || null}, yard_name),
        location = ${body.location ?? null},
        notes = ${body.notes ?? null},
        sort_order = COALESCE(${body.sort_order ?? null}, sort_order),
        updated_at = NOW()
      WHERE id = ${body.id} AND user_id = ${userId}
      RETURNING *
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Yard not found" }, { status: 404 });
    return NextResponse.json({ yard: rows[0] });
  } catch (error) {
    console.error("Error updating yard:", error);
    return NextResponse.json({ error: "Failed to update yard" }, { status: 500 });
  }
}

// DELETE — remove a yard (cascades to bins)
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const yardId = searchParams.get("id");
  if (!yardId) return NextResponse.json({ error: "Yard ID required" }, { status: 400 });

  try {
    const rows = await sql`
      DELETE FROM bin_yards WHERE id = ${yardId} AND user_id = ${userId}
      RETURNING id, yard_name
    `;

    if (rows.length === 0) return NextResponse.json({ error: "Yard not found" }, { status: 404 });
    return NextResponse.json({ message: `Deleted yard "${rows[0].yard_name}" and all its bins`, deleted: rows[0] });
  } catch (error) {
    console.error("Error deleting yard:", error);
    return NextResponse.json({ error: "Failed to delete yard" }, { status: 500 });
  }
}