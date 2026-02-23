import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const drivers = await sql`
      SELECT * FROM drivers
      WHERE farm_id = ${userId} AND active = TRUE
      ORDER BY driver_name ASC
    `;
    return NextResponse.json({ drivers });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { driver_name, driver_id, phone, notes } = body;

    const result = await sql`
      INSERT INTO drivers (farm_id, driver_name, driver_id, phone, notes)
      VALUES (${userId}, ${driver_name}, ${driver_id || null}, ${phone || null}, ${notes || null})
      RETURNING *
    `;
    return NextResponse.json({ driver: result[0] });
  } catch (error) {
    console.error("Error adding driver:", error);
    return NextResponse.json({ error: "Failed to add driver" }, { status: 500 });
  }
}