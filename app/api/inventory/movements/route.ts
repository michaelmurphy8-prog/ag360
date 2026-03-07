import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ movements: [] });
  const { tenantId } = tenantAuth;

  const rows = await sql`
    SELECT * FROM inventory_movements
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC LIMIT 50
  `;
  return NextResponse.json({ movements: rows });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { item } = await req.json();

  const row = await sql`
    INSERT INTO inventory_movements (
      tenant_id, movement_type, crop, quantity_bu,
      from_location, to_location, price_per_bu, notes, movement_date
    ) VALUES (
      ${tenantId}, ${item.movement_type}, ${item.crop}, ${item.quantity_bu},
      ${item.from_location || null}, ${item.to_location || null},
      ${item.price_per_bu || null}, ${item.notes || null}, ${item.movement_date}
    )
    RETURNING *
  `;
  return NextResponse.json({ movement: row[0] });
}