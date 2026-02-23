import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const trucks = await sql`
      SELECT * FROM trucks
      WHERE farm_id = ${userId} AND active = TRUE
      ORDER BY truck_name ASC
    `;
    return NextResponse.json({ trucks });
  } catch (error) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json({ error: "Failed to fetch trucks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { truck_name, truck_id, license_plate, capacity_mt, notes } = body;

    const result = await sql`
      INSERT INTO trucks (farm_id, truck_name, truck_id, license_plate, capacity_mt, notes)
      VALUES (${userId}, ${truck_name}, ${truck_id || null}, ${license_plate || null}, ${capacity_mt || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json({ truck: result[0] });
  } catch (error) {
    console.error("Error adding truck:", error);
    return NextResponse.json({ error: "Failed to add truck" }, { status: 500 });
  }
}