import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("week_of");
  const month = searchParams.get("month");

  if (month) {
    const summary = await sql`
      SELECT w.id AS worker_id, w.name, w.role, w.hourly_rate, w.daily_rate,
        COALESCE(SUM(te.hours), 0) AS total_hours,
        CASE
          WHEN w.hourly_rate IS NOT NULL THEN COALESCE(SUM(te.hours), 0) * w.hourly_rate
          WHEN w.daily_rate IS NOT NULL THEN COALESCE(COUNT(DISTINCT te.entry_date), 0) * w.daily_rate
          ELSE 0
        END AS total_cost,
        COUNT(DISTINCT te.entry_date) AS days_worked
      FROM workers w
      LEFT JOIN time_entries te ON te.worker_id = w.id
        AND to_char(te.entry_date, 'YYYY-MM') = ${month}
      WHERE w.tenant_id = ${tenantId} AND w.status = 'active'
      GROUP BY w.id, w.name, w.role, w.hourly_rate, w.daily_rate
      ORDER BY w.name
    `;
    return NextResponse.json({ summary });
  }

  let startDate: string;
  if (weekOf) {
    startDate = weekOf;
  } else {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    startDate = monday.toISOString().slice(0, 10);
  }

  const entries = await sql`
    SELECT te.*, w.name AS worker_name, w.role AS worker_role, w.hourly_rate, w.daily_rate
    FROM time_entries te
    JOIN workers w ON w.id = te.worker_id
    WHERE te.tenant_id = ${tenantId}
      AND te.entry_date >= ${startDate}::date
      AND te.entry_date < (${startDate}::date + INTERVAL '7 days')
    ORDER BY te.entry_date ASC, w.name ASC
  `;

  const workers = await sql`
    SELECT id, name, role, hourly_rate, daily_rate
    FROM workers WHERE tenant_id = ${tenantId} AND status = 'active'
    ORDER BY name
  `;

  return NextResponse.json({ entries, workers, week_of: startDate });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const body = await req.json();

  if (Array.isArray(body.entries)) {
    const results = [];
    for (const e of body.entries) {
      if (!e.worker_id || !e.entry_date) continue;
      if (Number(e.hours) === 0) {
        await sql`
          DELETE FROM time_entries
          WHERE worker_id = ${e.worker_id} AND tenant_id = ${tenantId} AND entry_date = ${e.entry_date}
        `;
        continue;
      }
      const [entry] = await sql`
        INSERT INTO time_entries (worker_id, tenant_id, entry_date, hours, description)
        VALUES (${e.worker_id}, ${tenantId}, ${e.entry_date}, ${e.hours}, ${e.description || null})
        ON CONFLICT (worker_id, entry_date) DO UPDATE SET
          hours = EXCLUDED.hours,
          description = EXCLUDED.description
        RETURNING *
      `;
      if (entry) results.push(entry);
    }
    return NextResponse.json({ entries: results }, { status: 201 });
  }

  const { worker_id, entry_date, hours, description } = body;
  if (!worker_id || !entry_date) {
    return NextResponse.json({ error: "Worker and date are required" }, { status: 400 });
  }

  const [entry] = await sql`
    INSERT INTO time_entries (worker_id, tenant_id, entry_date, hours, description)
    VALUES (${worker_id}, ${tenantId}, ${entry_date}, ${hours || 0}, ${description || null})
    ON CONFLICT (worker_id, entry_date) DO UPDATE SET
      hours = EXCLUDED.hours,
      description = EXCLUDED.description
    RETURNING *
  `;
  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Entry ID required" }, { status: 400 });

  await sql`DELETE FROM time_entries WHERE id = ${id} AND tenant_id = ${tenantId}`;
  return NextResponse.json({ success: true });
}