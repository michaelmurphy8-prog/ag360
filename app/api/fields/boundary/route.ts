import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

// PATCH — save/update field boundary
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { field_id, boundary, boundary_acres } = body;

    if (!field_id) return NextResponse.json({ error: "field_id required" }, { status: 400 });

    // Verify ownership
    const check = await sql`SELECT id FROM fields WHERE id = ${field_id} AND farm_id = ${userId}`;
    if (check.length === 0) return NextResponse.json({ error: "Field not found" }, { status: 404 });

    const result = await sql`
      UPDATE fields
      SET boundary = ${boundary ? JSON.stringify(boundary) : null}::jsonb,
          boundary_acres = ${boundary_acres || null}
      WHERE id = ${field_id} AND farm_id = ${userId}
      RETURNING id, field_name, boundary, boundary_acres
    `;

    return NextResponse.json({ success: true, field: result[0] });
  } catch (error) {
    console.error("Error saving boundary:", error);
    return NextResponse.json({ error: "Failed to save boundary" }, { status: 500 });
  }
}

// DELETE — remove field boundary
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const field_id = searchParams.get("field_id");
    if (!field_id) return NextResponse.json({ error: "field_id required" }, { status: 400 });

    await sql`
      UPDATE fields
      SET boundary = NULL, boundary_acres = NULL
      WHERE id = ${field_id} AND farm_id = ${userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting boundary:", error);
    return NextResponse.json({ error: "Failed to delete boundary" }, { status: 500 });
  }
}