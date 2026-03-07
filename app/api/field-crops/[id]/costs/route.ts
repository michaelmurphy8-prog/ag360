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
    const costs = await sql`
      SELECT fc.* FROM field_costs fc
      JOIN field_crops fcrop ON fcrop.id = fc.field_crop_id
      JOIN fields f ON f.id = fcrop.field_id
      WHERE fc.field_crop_id = ${id}
      AND f.tenant_id = ${tenantId}
      ORDER BY fc.created_at DESC
    `;
    return NextResponse.json({ costs });
  } catch (error) {
    console.error("Error fetching costs:", error);
    return NextResponse.json({ error: "Failed to fetch costs" }, { status: 500 });
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
      cost_type, category, description,
      amount_per_acre, total_amount, date_incurred, notes,
    } = body;

    const result = await sql`
      INSERT INTO field_costs (
        field_crop_id, cost_type, category, description,
        amount_per_acre, total_amount, date_incurred, notes
      ) VALUES (
        ${id}, ${cost_type}, ${category}, ${description || null},
        ${amount_per_acre || null}, ${total_amount || null},
        ${date_incurred || null}, ${notes || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ cost: result[0] });
  } catch (error) {
    console.error("Error adding cost:", error);
    return NextResponse.json({ error: "Failed to add cost" }, { status: 500 });
  }
}