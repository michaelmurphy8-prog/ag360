import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const trucks = await sql`
      SELECT * FROM trucks
      WHERE tenant_id = ${tenantId} AND active = TRUE
      ORDER BY truck_name ASC
    `;
    return NextResponse.json({ trucks });
  } catch (error) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json({ error: "Failed to fetch trucks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { truck_name, truck_id, license_plate, capacity_mt, notes } = body;

    const result = await sql`
      INSERT INTO trucks (tenant_id, truck_name, truck_id, license_plate, capacity_mt, notes)
      VALUES (
        ${tenantId}, ${truck_name}, ${truck_id || null},
        ${license_plate || null}, ${capacity_mt || null}, ${notes || null}
      )
      RETURNING *
    `;
    return NextResponse.json({ truck: result[0] });
  } catch (error) {
    console.error("Error adding truck:", error);
    return NextResponse.json({ error: "Failed to add truck" }, { status: 500 });
  }
}