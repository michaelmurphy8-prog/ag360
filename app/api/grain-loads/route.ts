import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const loads = await sql`
      SELECT 
        gl.*,
        d.driver_name,
        t.truck_name,
        c.customer_name
      FROM grain_loads gl
      LEFT JOIN drivers d ON d.id = gl.driver_id
      LEFT JOIN trucks t ON t.id = gl.truck_id
      LEFT JOIN customers c ON c.id = gl.customer_id
      WHERE gl.tenant_id = ${tenantId}
      ORDER BY gl.date DESC
    `;
    return NextResponse.json({ loads });
  } catch (error) {
    console.error("Error fetching loads:", error);
    return NextResponse.json({ error: "Failed to fetch loads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const {
      date, driver_id, truck_id, customer_id,
      contract_reference, gross_weight_kg, dockage_percent,
      settlement_id, notes, from, crop, price_per_bushel,
      ticket_number, crop_year,
    } = body;

    const dockage_kg = gross_weight_kg && dockage_percent
      ? (gross_weight_kg * dockage_percent) / 100
      : null;
    const net_weight_kg = gross_weight_kg && dockage_kg
      ? gross_weight_kg - dockage_kg
      : gross_weight_kg || null;

    const result = await sql`
      INSERT INTO grain_loads (
        tenant_id, date, driver_id, truck_id, customer_id,
        contract_reference, gross_weight_kg, dockage_percent,
        dockage_kg, net_weight_kg, settlement_id, notes, "from",
        crop, price_per_bushel, ticket_number, crop_year
      ) VALUES (
        ${tenantId}, ${date}, ${driver_id || null}, ${truck_id || null},
        ${customer_id || null}, ${contract_reference || null},
        ${gross_weight_kg || null}, ${dockage_percent || null},
        ${dockage_kg}, ${net_weight_kg},
        ${settlement_id || null}, ${notes || null}, ${from || null},
        ${crop || null}, ${price_per_bushel || null},
        ${ticket_number || null}, ${crop_year || 2025}
      )
      RETURNING *
    `;

    return NextResponse.json({ load: result[0] });
  } catch (error) {
    console.error("Error adding load:", error);
    return NextResponse.json({ error: "Failed to add load" }, { status: 500 });
  }
}