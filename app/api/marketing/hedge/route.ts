import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const positions = await sql`
    SELECT * FROM hedge_positions
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ positions });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const body = await req.json();
  const {
    crop, exchange, contract_month, contracts, contract_size_mt,
    direction, entry_price, current_price, opened_date, notes
  } = body;

  const result = await sql`
    INSERT INTO hedge_positions (
      tenant_id, crop, exchange, contract_month, contracts,
      contract_size_mt, direction, entry_price, current_price,
      opened_date, notes
    ) VALUES (
      ${tenantId}, ${crop}, ${exchange}, ${contract_month}, ${contracts},
      ${contract_size_mt || 20}, ${direction || "short"}, ${entry_price},
      ${current_price || null}, ${opened_date || null}, ${notes || null}
    )
    RETURNING *
  `;
  return NextResponse.json({ position: result[0] });
}

export async function PUT(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const body = await req.json();
  const {
    id, crop, exchange, contract_month, contracts, contract_size_mt,
    direction, entry_price, current_price, status, opened_date, notes
  } = body;

  const result = await sql`
    UPDATE hedge_positions SET
      crop = ${crop}, exchange = ${exchange},
      contract_month = ${contract_month}, contracts = ${contracts},
      contract_size_mt = ${contract_size_mt || 20}, direction = ${direction || "short"},
      entry_price = ${entry_price}, current_price = ${current_price || null},
      status = ${status || "open"}, opened_date = ${opened_date || null},
      notes = ${notes || null}, updated_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenantId}
    RETURNING *
  `;
  return NextResponse.json({ position: result[0] });
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await sql`DELETE FROM hedge_positions WHERE id = ${id} AND tenant_id = ${tenantId}`;
  return NextResponse.json({ success: true });
}