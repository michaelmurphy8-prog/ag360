import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS inventory_contracts (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      crop TEXT NOT NULL,
      contract_type TEXT NOT NULL,
      quantity_bu NUMERIC NOT NULL,
      price_per_bu NUMERIC,
      basis NUMERIC,
      elevator TEXT,
      delivery_date TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ contracts: [] });
  await ensureTable();
  const rows = await sql`
    SELECT * FROM inventory_contracts WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return NextResponse.json({ contracts: rows });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { action, item } = await req.json();

  if (action === "add") {
    const row = await sql`
      INSERT INTO inventory_contracts (user_id, crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes)
      VALUES (${userId}, ${item.crop}, ${item.contract_type}, ${item.quantity_bu}, ${item.price_per_bu || null}, ${item.basis || null}, ${item.elevator || null}, ${item.delivery_date || null}, ${item.notes || null})
      RETURNING *
    `;
    return NextResponse.json({ contract: row[0] });
  }

  if (action === "delete") {
    await sql`DELETE FROM inventory_contracts WHERE id = ${item.id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}