import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const drivers = await sql`
      SELECT * FROM drivers
      WHERE tenant_id = ${tenantId} AND active = TRUE
      ORDER BY driver_name ASC
    `;
    return NextResponse.json({ drivers });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { driver_name, driver_id, phone, notes } = body;

    const result = await sql`
      INSERT INTO drivers (tenant_id, driver_name, driver_id, phone, notes)
      VALUES (${tenantId}, ${driver_name}, ${driver_id || null}, ${phone || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json({ driver: result[0] });
  } catch (error) {
    console.error("Error adding driver:", error);
    return NextResponse.json({ error: "Failed to add driver" }, { status: 500 });
  }
}