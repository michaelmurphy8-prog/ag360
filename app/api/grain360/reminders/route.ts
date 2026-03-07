import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ reminders: [] });
  const { tenantId } = tenantAuth;

  const rows = await sql`
    SELECT * FROM grain360_reminders
    WHERE tenant_id = ${tenantId}
    ORDER BY completed ASC, due_date ASC, created_at DESC
    LIMIT 20
  `;
  return NextResponse.json({ reminders: rows });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { action, item } = await req.json();

  if (action === "add") {
    const row = await sql`
      INSERT INTO grain360_reminders (tenant_id, title, due_date, priority)
      VALUES (${tenantId}, ${item.title}, ${item.due_date || null}, ${item.priority || "medium"})
      RETURNING *
    `;
    return NextResponse.json({ reminder: row[0] });
  }

  if (action === "toggle") {
    await sql`
      UPDATE grain360_reminders
      SET completed = NOT completed
      WHERE id = ${item.id} AND tenant_id = ${tenantId}
    `;
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    await sql`DELETE FROM grain360_reminders WHERE id = ${item.id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}