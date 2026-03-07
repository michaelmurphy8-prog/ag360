import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

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
      date, driver_id, truck_id, customer_id,
      contract_reference, gross_weight_kg, dockage_percent,
      settlement_id, notes, from,
    } = body;

    const dockage_kg = gross_weight_kg && dockage_percent
      ? (gross_weight_kg * dockage_percent) / 100
      : null;
    const net_weight_kg = gross_weight_kg && dockage_kg
      ? gross_weight_kg - dockage_kg
      : gross_weight_kg || null;

    const result = await sql`
      UPDATE grain_loads SET
        date = ${date},
        driver_id = ${driver_id || null},
        truck_id = ${truck_id || null},
        customer_id = ${customer_id || null},
        contract_reference = ${contract_reference || null},
        gross_weight_kg = ${gross_weight_kg || null},
        dockage_percent = ${dockage_percent || null},
        dockage_kg = ${dockage_kg},
        net_weight_kg = ${net_weight_kg},
        settlement_id = ${settlement_id || null},
        notes = ${notes || null},
        "from" = ${from || null},
        updated_at = NOW()
      WHERE id = ${id} AND tenant_id = ${tenantId}
      RETURNING *
    `;
    return NextResponse.json({ load: result[0] });
  } catch (error) {
    console.error("Error updating load:", error);
    return NextResponse.json({ error: "Failed to update load" }, { status: 500 });
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
      DELETE FROM grain_loads
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting load:", error);
    return NextResponse.json({ error: "Failed to delete load" }, { status: 500 });
  }
}