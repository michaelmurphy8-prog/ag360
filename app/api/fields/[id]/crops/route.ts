import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const crops = await sql`
      SELECT fc.* FROM field_crops fc
      JOIN fields f ON f.id = fc.field_id
      WHERE fc.field_id = ${params.id}
      AND f.farm_id = ${userId}
      ORDER BY fc.crop_year DESC
    `;
    return NextResponse.json({ crops });
  } catch (error) {
    console.error("Error fetching crops:", error);
    return NextResponse.json({ error: "Failed to fetch crops" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      crop_year,
      crop_type,
      variety,
      seeded_acres,
      expected_yield_bu_ac,
      seeding_date,
      status,
    } = body;

    const result = await sql`
      INSERT INTO field_crops (
        field_id, crop_year, crop_type, variety,
        seeded_acres, expected_yield_bu_ac, seeding_date, status
      ) VALUES (
        ${params.id}, ${crop_year}, ${crop_type}, ${variety || null},
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