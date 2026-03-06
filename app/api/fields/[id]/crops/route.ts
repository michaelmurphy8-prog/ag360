import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const crops = await sql`
      SELECT fc.* FROM field_crops fc
      JOIN fields f ON f.id = fc.field_id
      WHERE fc.field_id = ${id}
      AND f.farm_id = ${userId}
      ORDER BY fc.crop_year DESC
    `;
    return NextResponse.json({ crops });
  } catch (error) {
    console.error("Error fetching crops:", error);
    return NextResponse.json({ error: "Failed to fetch crops" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  try {
    const body = await req.json();
    const {
      crop_year, crop_type, variety,
      seeded_acres, expected_yield_bu_ac, seeding_date, status,
    } = body;

    const result = await sql`
      INSERT INTO field_crops (
        field_id, crop_year, crop_type, variety,
        seeded_acres, expected_yield_bu_ac, seeding_date, status
      ) VALUES (
        ${id}, ${crop_year}, ${crop_type}, ${variety || null},
        ${seeded_acres || null}, ${expected_yield_bu_ac || null},
        ${seeding_date || null}, ${status || "planned"}
      )
      RETURNING *
    `;
    return NextResponse.json({ crop: result[0] });
  } catch (error) {
    console.error("Error adding crop:", error);
    return NextResponse.json({ error: "Failed to add crop" }, { status: 500 });
  }
}
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try {
    const { crop_id, status, seeding_date, seeded_acres } = await req.json();
    if (!crop_id) return NextResponse.json({ error: "crop_id required" }, { status: 400 });
    const result = await sql`
      UPDATE field_crops fc
      SET
        status = COALESCE(${status || null}, status),
        seeding_date = COALESCE(${seeding_date || null}, seeding_date),
        seeded_acres = COALESCE(${seeded_acres || null}, seeded_acres)
      FROM fields f
      WHERE fc.id = ${crop_id}
        AND fc.field_id = ${id}
        AND f.id = fc.field_id
        AND f.farm_id = ${userId}
      RETURNING fc.*
    `;
    if (result.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ crop: result[0] });
  } catch (error) {
    console.error("Error updating crop:", error);
    return NextResponse.json({ error: "Failed to update crop" }, { status: 500 });
  }
}
