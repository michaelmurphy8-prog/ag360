import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { loads } = body;

    if (!Array.isArray(loads) || loads.length === 0) {
      return NextResponse.json({ error: "No loads provided" }, { status: 400 });
    }

    const inserted = [];

    for (const load of loads) {
      const {
        date, driver_id, truck_id, customer_id,
        contract_reference, gross_weight_kg, dockage_percent,
        settlement_id, notes,
      } = load;

      const dockage_kg = gross_weight_kg && dockage_percent
        ? (gross_weight_kg * dockage_percent) / 100
        : null;

      const net_weight_kg = gross_weight_kg && dockage_kg
        ? gross_weight_kg - dockage_kg
        : gross_weight_kg || null;

      const result = await sql`
        INSERT INTO grain_loads (
          farm_id, date, driver_id, truck_id, customer_id,
          contract_reference, gross_weight_kg, dockage_percent,
          dockage_kg, net_weight_kg, settlement_id, notes
        ) VALUES (
          ${userId}, ${date}, ${driver_id || null}, ${truck_id || null},
          ${customer_id || null}, ${contract_reference || null},
          ${gross_weight_kg || null}, ${dockage_percent || null},
          ${dockage_kg}, ${net_weight_kg},
          ${settlement_id || null}, ${notes || null}
        )
        RETURNING *
      `;
      inserted.push(result[0]);
    }

    return NextResponse.json({ inserted: inserted.length, loads: inserted });
  } catch (error) {
    console.error("Error bulk uploading loads:", error);
    return NextResponse.json({ error: "Failed to bulk upload loads" }, { status: 500 });
  }
}