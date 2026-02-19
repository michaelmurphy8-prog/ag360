import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_movements (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      crop TEXT NOT NULL,
      quantity_bu NUMERIC NOT NULL,
      from_location TEXT,
      to_location TEXT,
      price_per_bu NUMERIC,
      notes TEXT,
      movement_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ movements: [] });
  await ensureTable();
  const rows = await sql`
    SELECT * FROM inventory_movements WHERE user_id = ${userId} ORDER BY created_at DESC LIMIT 50
  `;
  return NextResponse.json({ movements: rows });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { item } = await req.json();

  const row = await sql`
    INSERT INTO inventory_movements (user_id, movement_type, crop, quantity_bu, from_location, to_location, price_per_bu, notes, movement_date)
    VALUES (${userId}, ${item.movement_type}, ${item.crop}, ${item.quantity_bu}, ${item.from_location || null}, ${item.to_location || null}, ${item.price_per_bu || null}, ${item.notes || null}, ${item.movement_date})
    RETURNING *
  `;
  return NextResponse.json({ movement: row[0] });
}