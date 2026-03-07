import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const customers = await sql`
      SELECT * FROM customers
      WHERE tenant_id = ${tenantId} AND active = TRUE
      ORDER BY customer_name ASC
    `;
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { customer_name, customer_id, location, contact_name, phone, email, notes } = body;

    const result = await sql`
      INSERT INTO customers (
        tenant_id, customer_name, customer_id, location,
        contact_name, phone, email, notes
      ) VALUES (
        ${tenantId}, ${customer_name}, ${customer_id || null}, ${location || null},
        ${contact_name || null}, ${phone || null}, ${email || null}, ${notes || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ customer: result[0] });
  } catch (error) {
    console.error("Error adding customer:", error);
    return NextResponse.json({ error: "Failed to add customer" }, { status: 500 });
  }
}