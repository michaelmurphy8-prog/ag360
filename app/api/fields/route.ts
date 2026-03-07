import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const fields = await sql`
      SELECT * FROM fields
      WHERE tenant_id = ${tenantId}
      ORDER BY created_at DESC
    `;
    return NextResponse.json({ fields });
  } catch (error) {
    console.error("Error fetching fields:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const {
      field_name, acres,
      lld_quarter, lld_section, lld_township,
      lld_range, lld_meridian, lld_province,
      latitude, longitude, notes,
    } = body;

    const result = await sql`
      INSERT INTO fields (
        tenant_id, field_name, acres,
        lld_quarter, lld_section, lld_township,
        lld_range, lld_meridian, lld_province,
        latitude, longitude, notes
      ) VALUES (
        ${tenantId}, ${field_name}, ${acres},
        ${lld_quarter}, ${lld_section}, ${lld_township},
        ${lld_range}, ${lld_meridian}, ${lld_province || "SK"},
        ${latitude || null}, ${longitude || null}, ${notes}
      )
      RETURNING *
    `;
    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error creating field:", error);
    return NextResponse.json({ error: "Failed to create field" }, { status: 500 });
  }
}