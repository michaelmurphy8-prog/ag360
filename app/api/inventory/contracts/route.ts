import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ contracts: [] });
  const { tenantId } = tenantAuth;

  const rows = await sql`
    SELECT * FROM inventory_contracts WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
  `;
  return NextResponse.json({ contracts: rows });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { action, item } = await req.json();

  if (action === "add") {
    const row = await sql`
      INSERT INTO inventory_contracts (
        tenant_id, crop, contract_type, quantity_bu,
        price_per_bu, basis, elevator, delivery_date, notes
      ) VALUES (
        ${tenantId}, ${item.crop}, ${item.contract_type}, ${item.quantity_bu},
        ${item.price_per_bu || null}, ${item.basis || null},
        ${item.elevator || null}, ${item.delivery_date || null}, ${item.notes || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ contract: row[0] });
  }

  if (action === "delete") {
    await sql`DELETE FROM inventory_contracts WHERE id = ${item.id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}