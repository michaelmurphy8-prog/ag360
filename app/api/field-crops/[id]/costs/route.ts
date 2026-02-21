import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const costs = await sql`
      SELECT fc.* FROM field_costs fc
      JOIN field_crops fcrop ON fcrop.id = fc.field_crop_id
      JOIN fields f ON f.id = fcrop.field_id
      WHERE fc.field_crop_id = ${params.id}
      AND f.farm_id = ${userId}
      ORDER BY fc.created_at DESC
    `;
    return NextResponse.json({ costs });
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const {
      cost_type,
      category,
      description,
      amount_per_acre,
      total_amount,
      date_incurred,
      notes,
    } = body;

    const result = await sql`
      INSERT INTO field_costs (
        field_crop_id, cost_type, category, description,
        amount_per_acre, total_amount, date_incurred, notes
      ) VALUES (
        ${params.id}, ${cost_type}, ${category}, ${description || null},
        ${amount_per_acre || null}, ${total_amount || null},
        ${date_incurred || null}, ${notes || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ cost: result[0] });
  } catch (error) {
    console.error("Error adding cost:", error);
    return NextResponse.json({ error: "Failed to add cost" }, { status: 500 });
  }
}