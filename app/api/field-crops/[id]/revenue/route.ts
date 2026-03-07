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
    const revenue = await sql`
      SELECT fr.* FROM field_revenue fr
      JOIN field_crops fc ON fc.id = fr.field_crop_id
      JOIN fields f ON f.id = fc.field_id
      WHERE fr.field_crop_id = ${id}
      AND f.tenant_id = ${tenantId}
      ORDER BY fr.created_at DESC
    `;
    return NextResponse.json({ revenue });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    return NextResponse.json({ error: "Failed to fetch revenue" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;
  const { id } = await context.params;

  try {
    // Verify field belongs to this tenant
    const check = await sql`
      SELECT f.id FROM fields f
      JOIN field_crops fc ON fc.field_id = f.id
      WHERE fc.id = ${id} AND f.tenant_id = ${tenantId}
    `;
    if (check.length === 0) return NextResponse.json({ error: "Field not found" }, { status: 404 });

    const body = await req.json();
    const {
      revenue_type, source, description,
      bushels, price_per_bu, total_revenue, date,
    } = body;

    const result = await sql`
      INSERT INTO field_revenue (
        field_crop_id, revenue_type, source, description,
        bushels, price_per_bu, total_revenue, date
      ) VALUES (
        ${id}, ${revenue_type}, ${source}, ${description || null},
        ${bushels || null}, ${price_per_bu || null},
        ${total_revenue || null}, ${date || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ revenue: result[0] });
  } catch (error) {
    console.error("Error adding revenue:", error);
    return NextResponse.json({ error: "Failed to add revenue" }, { status: 500 });
  }
}