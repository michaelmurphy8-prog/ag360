import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  try {
    const rows = await sql`
      SELECT id, crop, contract_type, quantity_bu, price_per_bu, basis,
             elevator, delivery_date, notes, contract_number, created_at
      FROM inventory_contracts
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ success: true, contracts: rows });
  } catch (err: any) {
    console.error("Contracts GET error:", err?.message);
    return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  try {
    const body = await req.json();
    const { crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes, contract_number } = body;
    if (!crop || !quantity_bu) {
      return NextResponse.json({ error: "Crop and quantity are required" }, { status: 400 });
    }
    const rows = await sql`
      INSERT INTO inventory_contracts (
        tenant_id, crop, contract_type, quantity_bu,
        price_per_bu, basis, elevator, delivery_date, notes, contract_number
      ) VALUES (
        ${tenantId}, ${crop}, ${contract_type || null}, ${Number(quantity_bu)},
        ${Number(price_per_bu || 0)}, ${Number(basis || 0)},
        ${elevator || null}, ${delivery_date || null}, ${notes || null},
        ${contract_number || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ success: true, contract: rows[0] });
  } catch (err: any) {
    console.error("Contracts POST error:", err?.message);
    return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  try {
    const body = await req.json();
    const { id, crop, contract_type, quantity_bu, price_per_bu, basis, elevator, delivery_date, notes, contract_number } = body;
    if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    const rows = await sql`
      UPDATE inventory_contracts SET
        crop = ${crop},
        contract_type = ${contract_type || null},
        quantity_bu = ${Number(quantity_bu)},
        price_per_bu = ${Number(price_per_bu || 0)},
        basis = ${Number(basis || 0)},
        elevator = ${elevator || null},
        delivery_date = ${delivery_date || null},
        notes = ${notes || null},
        contract_number = ${contract_number || null}
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return NextResponse.json({ success: true, contract: rows[0] });
  } catch (err: any) {
    console.error("Contracts PUT error:", err?.message);
    return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Contract ID required" }, { status: 400 });
    await sql`DELETE FROM inventory_contracts WHERE id = ${id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Contracts DELETE error:", err?.message);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}