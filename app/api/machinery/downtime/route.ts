import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);

  const logs = await sql`
    SELECT dl.*, a.name as asset_name, a.make, a.model
    FROM "DowntimeLog" dl
    JOIN "Asset" a ON a.id = dl."assetId"
    WHERE dl."orgId" = ${userId}
    ORDER BY dl."startTime" DESC
  `;

  return NextResponse.json({ success: true, logs });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();

  const { assetId, reason, notes, costImpact } = body;
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  // Start downtime + set asset to DOWN
  const [log] = await sql`
    INSERT INTO "DowntimeLog" ("orgId", "assetId", "reason", "notes", "costImpact")
    VALUES (${userId}, ${assetId}, ${reason || null}, ${notes || null}, ${costImpact || null})
    RETURNING *
  `;

  await sql`UPDATE "Asset" SET status = 'DOWN', "updatedAt" = NOW() WHERE id = ${assetId} AND "orgId" = ${userId}`;

  return NextResponse.json({ success: true, log });
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();

  const { id, endTime, notes, costImpact, restoreStatus } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const [log] = await sql`
    UPDATE "DowntimeLog"
    SET "endTime" = COALESCE(${endTime || null}, NOW()),
        "notes" = COALESCE(${notes || null}, "notes"),
        "costImpact" = COALESCE(${costImpact || null}, "costImpact")
    WHERE id = ${id} AND "orgId" = ${userId}
    RETURNING "assetId"
  `;

  // Restore asset status
  if (log && restoreStatus) {
    await sql`UPDATE "Asset" SET status = ${restoreStatus}, "updatedAt" = NOW() WHERE id = ${log.assetId} AND "orgId" = ${userId}`;
  }

  return NextResponse.json({ success: true });
}