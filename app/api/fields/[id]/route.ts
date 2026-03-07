import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  const { id } = await context.params;

  try {
    const result = await sql`
      SELECT * FROM fields
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error fetching field:", error);
    return NextResponse.json({ error: "Failed to fetch field" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  const { id } = await context.params;

  try {
    const body = await req.json();
    const {
      field_name, acres, lld_quarter, lld_section,
      lld_township, lld_range, lld_meridian, lld_province, notes,
    } = body;

    const result = await sql`
      UPDATE fields SET
        field_name = ${field_name},
        acres = ${acres},
        lld_quarter = ${lld_quarter},
        lld_section = ${lld_section},
        lld_township = ${lld_township},
        lld_range = ${lld_range},
        lld_meridian = ${lld_meridian},
        lld_province = ${lld_province},
        notes = ${notes},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return NextResponse.json({ field: result[0] });
  } catch (error) {
    console.error("Error updating field:", error);
    return NextResponse.json({ error: "Failed to update field" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  const { id } = await context.params;

  try {
    await sql`
      DELETE FROM fields
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting field:", error);
    return NextResponse.json({ error: "Failed to delete field" }, { status: 500 });
  }
}