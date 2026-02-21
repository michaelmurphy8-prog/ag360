import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sql`
      SELECT * FROM fields
      WHERE id = ${params.id} AND farm_id = ${userId}
    `;
    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error fetching field:", error);
    return NextResponse.json({ error: "Failed to fetch field" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      field_name, acres, lld_quarter, lld_section,
      lld_township, lld_range, lld_meridian, lld_province, notes,
    } = body;

    const result = await sql`
      UPDATE fields SET
        field_name = ${field_name},
        acres = ${acres},
        lld_quarter = ${lld_quarter},
        lld_section = ${lld_section},
        lld_township = ${lld_township},
        lld_range = ${lld_range},
        lld_meridian = ${lld_meridian},
        lld_province = ${lld_province},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${params.id} AND farm_id = ${userId}
      RETURNING *
    `;

    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error updating field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await sql`
      DELETE FROM fields
      WHERE id = ${params.id} AND farm_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting field:", error);
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}