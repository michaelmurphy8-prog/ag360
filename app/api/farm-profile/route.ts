import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ profile: null });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS farm_profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        profile JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    const rows = await sql`
      SELECT profile FROM farm_profiles WHERE user_id = ${userId}
    `;

    return NextResponse.json({ profile: rows[0]?.profile || null });
  } catch (error) {
    console.error("Farm profile GET error:", error);
    return NextResponse.json({ profile: null });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { profile } = await req.json();

    await sql`
      CREATE TABLE IF NOT EXISTS farm_profiles (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        profile JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO farm_profiles (user_id, profile)
      VALUES (${userId}, ${JSON.stringify(profile)})
      ON CONFLICT (user_id)
      DO UPDATE SET profile = ${JSON.stringify(profile)}, updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Farm profile POST error:", error);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}