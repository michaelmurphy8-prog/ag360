import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = tenantAuth;

  const sql = neon(process.env.DATABASE_URL!);
  const assetId = req.nextUrl.searchParams.get("asset_id");

  const logs = assetId
    ? await sql`
        SELECT ml.*, a.name as asset_name, a.make, a.model
        FROM "MaintenanceLog" ml
        JOIN "Asset" a ON a.id = ml."assetId"
        WHERE a."orgId" = ${tenantId} AND ml."assetId" = ${assetId}
        ORDER BY ml.date DESC
      `
    : await sql`
        SELECT ml.*, a.name as asset_name, a.make, a.model
        FROM "MaintenanceLog" ml
        JOIN "Asset" a ON a.id = ml."assetId"
        WHERE a."orgId" = ${tenantId}
        ORDER BY ml.date DESC
      `;

  return NextResponse.json({ success: true, logs });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = tenantAuth;

  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();
  const {
    assetId, date, type, notes, cost, hoursAtService, kmAtService,
    serviceCategory, partsUsed, laborHours, vendor, performedBy, attachments
  } = body;

  if (!assetId || !date || !type) {
    return NextResponse.json({ error: "assetId, date, and type are required" }, { status: 400 });
  }

  const [log] = await sql`
    INSERT INTO "MaintenanceLog" (
      "id", "assetId", "date", "type", "notes", "cost",
      "hoursAtService", "kmAtService", "serviceCategory", "partsUsed",
      "laborHours", "vendor", "performedBy", "orgId", "attachments"
    ) VALUES (
      gen_random_uuid()::text, ${assetId}, ${date}, ${type},
      ${notes || null}, ${cost || null},
      ${hoursAtService || null}, ${kmAtService || null},
      ${serviceCategory || "general"}, ${partsUsed || null},
      ${laborHours || null}, ${vendor || null}, ${performedBy || null},
      ${tenantId}, ${attachments || null}
    )
    RETURNING *
  `;

  if (hoursAtService) {
    await sql`
      UPDATE "Asset" SET "hoursTotal" = ${hoursAtService}, "updatedAt" = NOW()
      WHERE id = ${assetId} AND "orgId" = ${tenantId}
    `;
  }
  if (kmAtService) {
    await sql`
      UPDATE "Asset" SET "kmTotal" = ${kmAtService}, "updatedAt" = NOW()
      WHERE id = ${assetId} AND "orgId" = ${tenantId}
    `;
  }

  return NextResponse.json({ success: true, log });
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tenantId } = tenantAuth;

  const sql = neon(process.env.DATABASE_URL!);
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await sql`
    DELETE FROM "MaintenanceLog" ml
    USING "Asset" a
    WHERE ml.id = ${id} AND ml."assetId" = a.id AND a."orgId" = ${tenantId}
  `;
  return NextResponse.json({ success: true });
}