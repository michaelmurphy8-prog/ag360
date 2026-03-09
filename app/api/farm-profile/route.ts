import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ profile: null });
  const { tenantId } = tenantAuth;

  try {
    const rows = await sql`
      SELECT profile FROM farm_profiles WHERE tenant_id = ${tenantId}
    `;
    return NextResponse.json({ profile: rows[0]?.profile || null });
  } catch (error) {
    console.error("Farm profile GET error:", error);
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { profile } = await req.json();

    await sql`
      INSERT INTO farm_profiles (tenant_id, profile)
      VALUES (${tenantId}, ${JSON.stringify(profile)})
      ON CONFLICT (tenant_id)
      DO UPDATE SET profile = ${JSON.stringify(profile)}, updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Farm profile POST error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
export async function PATCH(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  try {
    const updates = await req.json();
    const rows = await sql`
      SELECT profile FROM farm_profiles WHERE tenant_id = ${tenantId}
    `;
    const existing = rows[0]?.profile || {};
    const merged = { ...existing, ...updates };
    await sql`
      INSERT INTO farm_profiles (tenant_id, profile)
      VALUES (${tenantId}, ${JSON.stringify(merged)})
      ON CONFLICT (tenant_id)
      DO UPDATE SET profile = ${JSON.stringify(merged)}, updated_at = NOW()
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Farm profile PATCH error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}