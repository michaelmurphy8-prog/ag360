import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const alerts = await sql`
    SELECT * FROM field_alerts
    WHERE user_id = ${userId} AND read_at IS NULL
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ alerts });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await sql`
    UPDATE field_alerts
    SET read_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
  return NextResponse.json({ success: true });
}