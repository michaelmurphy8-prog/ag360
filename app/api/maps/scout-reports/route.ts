import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cropYear = req.nextUrl.searchParams.get("cropYear") || "2025";
  try {
    const reports = await sql`
      SELECT * FROM scout_reports
      WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)}
      ORDER BY scouted_at DESC
    `;
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Scout reports fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch scout reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const { field_id, field_name, latitude, longitude, report_type, severity, title, notes, photo_url, crop_year, scouted_at } = body;
    if (!latitude || !longitude || !title) {
      return NextResponse.json({ error: "Latitude, longitude, and title are required" }, { status: 400 });
    }
    const [report] = await sql`
      INSERT INTO scout_reports (user_id, field_id, field_name, latitude, longitude, report_type, severity, title, notes, photo_url, crop_year, scouted_at)
      VALUES (${userId}, ${field_id || null}, ${field_name || null}, ${latitude}, ${longitude}, ${report_type || "general"}, ${severity || "low"}, ${title}, ${notes || null}, ${photo_url || null}, ${crop_year || 2025}, ${scouted_at || new Date().toISOString()})
      RETURNING *
    `;
    return NextResponse.json(report);
  } catch (error) {
    console.error("Scout report create error:", error);
    return NextResponse.json({ error: "Failed to create scout report" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
  try {
    await sql`DELETE FROM scout_reports WHERE id = ${id}::uuid AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Scout report delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
