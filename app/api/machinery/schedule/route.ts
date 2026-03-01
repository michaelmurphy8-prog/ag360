import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);

  const schedules = await sql`
    SELECT ss.*, a.name as asset_name, a.make, a.model, a."hoursTotal" as current_hours
    FROM "ServiceSchedule" ss
    JOIN "Asset" a ON a.id = ss."assetId"
    WHERE ss."orgId" = ${userId}
    ORDER BY
      CASE ss.status
        WHEN 'OVERDUE' THEN 1
        WHEN 'DUE_SOON' THEN 2
        WHEN 'OK' THEN 3
        ELSE 4
      END,
      ss."dueAtDate" ASC NULLS LAST,
      ss."dueAtHours" ASC NULLS LAST
  `;

  return NextResponse.json({ success: true, schedules });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();

  const { assetId, serviceType, intervalHours, intervalDays, dueAtHours, dueAtDate, priority, notes } = body;

  if (!assetId || !serviceType) {
    return NextResponse.json({ error: "assetId and serviceType required" }, { status: 400 });
  }

  const [schedule] = await sql`
    INSERT INTO "ServiceSchedule" ("orgId", "assetId", "serviceType", "intervalHours", "intervalDays", "dueAtHours", "dueAtDate", "priority", "notes")
    VALUES (${userId}, ${assetId}, ${serviceType}, ${intervalHours || null}, ${intervalDays || null}, ${dueAtHours || null}, ${dueAtDate || null}, ${priority || "normal"}, ${notes || null})
    RETURNING *
  `;

  return NextResponse.json({ success: true, schedule });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const { id, status, lastCompletedAt, lastCompletedHours, dueAtHours, dueAtDate } = body;

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await sql`
    UPDATE "ServiceSchedule"
    SET
      "status" = COALESCE(${status || null}, "status"),
      "lastCompletedAt" = COALESCE(${lastCompletedAt || null}, "lastCompletedAt"),
      "lastCompletedHours" = COALESCE(${lastCompletedHours || null}, "lastCompletedHours"),
      "dueAtHours" = COALESCE(${dueAtHours || null}, "dueAtHours"),
      "dueAtDate" = COALESCE(${dueAtDate || null}, "dueAtDate"),
      "updatedAt" = NOW()
    WHERE id = ${id} AND "orgId" = ${userId}
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await sql`DELETE FROM "ServiceSchedule" WHERE id = ${id} AND "orgId" = ${userId}`;
  return NextResponse.json({ success: true });
}