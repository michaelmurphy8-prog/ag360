import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET — list all contracts
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const rows = await sql`
      SELECT id, crop, contract_type, quantity_bu, price_per_bu, basis,
             elevator, delivery_date, notes, created_at
      FROM inventory_contracts
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ success: true, contracts: rows });
  } catch (err: any) {
    console.error("Contracts GET error:", err?.message);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

// POST — create new contract
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes } = body;

    if (!crop || !quantity_bu) {
      return NextResponse.json({ error: "Crop and quantity are required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO inventory_contracts (user_id, crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes)
      VALUES (${userId}, ${crop}, ${contract_type || null}, ${Number(quantity_bu)}, ${Number(price_per_bu || 0)}, ${Number(basis || 0)}, ${elevator || null}, ${delivery_date || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json({ success: true, contract: rows[0] });
  } catch (err: any) {
    console.error("Contracts POST error:", err?.message);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}

// PUT — update contract
export async function PUT(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes } = body;

    if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });

    const rows = await sql`
      UPDATE inventory_contracts
      SET crop = ${crop},
          contract_type = ${contract_type || null},
          quantity_bu = ${Number(quantity_bu)},
          price_per_bu = ${Number(price_per_bu || 0)},
          basis = ${Number(basis || 0)},
          elevator = ${elevator || null},
          delivery_date = ${delivery_date || null},
          notes = ${notes || null}
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING *
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, contract: rows[0] });
  } catch (err: any) {
    console.error("Contracts PUT error:", err?.message);
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
  }
}

// DELETE — remove contract
export async function DELETE(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });

    await sql`
      DELETE FROM inventory_contracts WHERE id = ${id} AND user_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contracts DELETE error:", err?.message);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}