import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const fields = await sql`
      SELECT * FROM fields
      WHERE farm_id = ${userId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      field_name,
      acres,
      lld_quarter,
      lld_section,
      lld_township,
      lld_range,
      lld_meridian,
      lld_province,
      notes,
    } = body;

    const result = await sql`
      INSERT INTO fields (
        farm_id, field_name, acres,
        lld_quarter, lld_section, lld_township,
        lld_range, lld_meridian, lld_province, notes
      ) VALUES (
        ${userId}, ${field_name}, ${acres},
        ${lld_quarter}, ${lld_section}, ${lld_township},
        ${lld_range}, ${lld_meridian}, ${lld_province || "SK"}, ${notes}
      )
      RETURNING *
    `;

    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error creating field:", error);
    return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
  }
}