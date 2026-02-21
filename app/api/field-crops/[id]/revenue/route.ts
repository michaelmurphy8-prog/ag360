import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const revenue = await sql`
      SELECT fr.* FROM field_revenue fr
      JOIN field_crops fc ON fc.id = fr.field_crop_id
      JOIN fields f ON f.id = fc.field_id
      WHERE fr.field_crop_id = ${params.id}
      AND f.farm_id = ${userId}
      ORDER BY fr.created_at DESC
    `;
    return NextResponse.json({ revenue });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json({ error: "Failed to fetch revenue" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      revenue_type,
      source,
      description,
      bushels,
      price_per_bu,
      total_revenue,
      date,
    } = body;

    const result = await sql`
      INSERT INTO field_revenue (
        field_crop_id, revenue_type, source, description,
        bushels, price_per_bu, total_revenue, date
      ) VALUES (
        ${params.id}, ${revenue_type}, ${source}, ${description || null},
        ${bushels || null}, ${price_per_bu || null},
        ${total_revenue || null}, ${date || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ revenue: result[0] });
  } catch (error) {
    console.error("Error adding revenue:", error);
    return NextResponse.json({ error: "Failed to add revenue" }, { status: 500 });
  }
}