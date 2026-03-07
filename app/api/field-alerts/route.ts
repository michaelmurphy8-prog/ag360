import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const alerts = await sql`
    SELECT * FROM field_alerts
    WHERE tenant_id = ${tenantId} AND read_at IS NULL
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ alerts });
}

export async function PATCH(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await sql`
    UPDATE field_alerts
    SET read_at = NOW()
    WHERE id = ${id} AND tenant_id = ${tenantId}
  `;
  return NextResponse.json({ success: true });
}