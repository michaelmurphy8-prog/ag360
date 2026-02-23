import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      WHERE gl.farm_id = ${userId}
      ORDER BY gl.date DESC
    `;
    return NextResponse.json({ loads });
  } catch (error) {
    console.error("Error fetching loads:", error);
    return NextResponse.json({ error: "Failed to fetch loads" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      INSERT INTO grain_loads (
        farm_id, date, driver_id, truck_id, customer_id,
        contract_reference, gross_weight_kg, dockage_percent,
        dockage_kg, net_weight_kg, settlement_id, notes, "from"
      ) VALUES (
        ${userId}, ${date}, ${driver_id || null}, ${truck_id || null},
        ${customer_id || null}, ${contract_reference || null},
        ${gross_weight_kg || null}, ${dockage_percent || null},
        ${dockage_kg}, ${net_weight_kg},
        ${settlement_id || null}, ${notes || null}, ${from || null}
      )
      RETURNING *
    `;

    // Auto-deduct from holdings if a bin was selected
    if (from && net_weight_kg) {
      const KG_PER_BU = 36.744;
      const bushels_to_deduct = net_weight_kg / KG_PER_BU;

      await sql`
        UPDATE inventory_holdings
        SET quantity_bu = GREATEST(0, quantity_bu - ${bushels_to_deduct})
        WHERE user_id = ${userId}
        AND location = ${from}
        AND id = (
          SELECT id FROM inventory_holdings
          WHERE user_id = ${userId}
          AND location = ${from}
          LIMIT 1
        )
      `;
    }

    return NextResponse.json({ load: result[0] });
  } catch (error) {
    console.error("Error adding load:", error);
    return NextResponse.json({ error: "Failed to add load" }, { status: 500 });
  }
}