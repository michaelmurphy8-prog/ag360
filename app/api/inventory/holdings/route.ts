import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_holdings (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'Main Bin',
      quantity_bu NUMERIC NOT NULL DEFAULT 0,
      grade TEXT,
      moisture NUMERIC,
      estimated_price NUMERIC DEFAULT 0,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ holdings: [] });
  await ensureTable();
  const rows = await sql`
    SELECT * FROM inventory_holdings WHERE user_id = ${userId} ORDER BY crop, location
  `;
  return NextResponse.json({ holdings: rows });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { action, item } = await req.json();

  if (action === "add") {
    const row = await sql`
      INSERT INTO inventory_holdings (user_id, crop, location, quantity_bu, grade, moisture, estimated_price, notes)
      VALUES (${userId}, ${item.crop}, ${item.location}, ${item.quantity_bu}, ${item.grade || null}, ${item.moisture || null}, ${item.estimated_price || 0}, ${item.notes || null})
      RETURNING *
    `;
    return NextResponse.json({ holding: row[0] });
  }

  if (action === "update") {
    await sql`
      UPDATE inventory_holdings
      SET crop = ${item.crop}, location = ${item.location}, quantity_bu = ${item.quantity_bu},
          grade = ${item.grade || null}, moisture = ${item.moisture || null},
          estimated_price = ${item.estimated_price || 0}, notes = ${item.notes || null},
          updated_at = NOW()
      WHERE id = ${item.id} AND user_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    await sql`DELETE FROM inventory_holdings WHERE id = ${item.id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}