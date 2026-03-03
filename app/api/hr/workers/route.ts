import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workers = await sql`
    SELECT w.*,
      (SELECT COUNT(*) FROM certifications c WHERE c.worker_id = w.id) AS cert_count,
      (SELECT COUNT(*) FROM certifications c WHERE c.worker_id = w.id AND c.expiry_date < NOW()) AS expired_certs,
      (SELECT COALESCE(SUM(te.hours), 0) FROM time_entries te WHERE te.worker_id = w.id
        AND te.entry_date >= date_trunc('month', CURRENT_DATE)) AS monthly_hours
    FROM workers w
    WHERE w.user_id = ${userId}
    ORDER BY w.status = 'active' DESC, w.name ASC
  `;
  return NextResponse.json({ workers });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, role, worker_type, status, phone, email, emergency_contact, emergency_phone,
          hourly_rate, daily_rate, start_date, end_date, notes } = body;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [worker] = await sql`
    INSERT INTO workers (user_id, name, role, worker_type, status, phone, email,
      emergency_contact, emergency_phone, hourly_rate, daily_rate, start_date, end_date, notes)
    VALUES (${userId}, ${name}, ${role || "General Labourer"}, ${worker_type || "full_time"},
      ${status || "active"}, ${phone || null}, ${email || null},
      ${emergency_contact || null}, ${emergency_phone || null},
      ${hourly_rate || null}, ${daily_rate || null},
      ${start_date || null}, ${end_date || null}, ${notes || null})
    RETURNING *
  `;
  return NextResponse.json({ worker }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, name, role, worker_type, status, phone, email, emergency_contact, emergency_phone,
          hourly_rate, daily_rate, start_date, end_date, notes } = body;

  if (!id) return NextResponse.json({ error: "Worker ID required" }, { status: 400 });

  const [worker] = await sql`
    UPDATE workers SET
      name = ${name}, role = ${role}, worker_type = ${worker_type}, status = ${status},
      phone = ${phone || null}, email = ${email || null},
      emergency_contact = ${emergency_contact || null}, emergency_phone = ${emergency_phone || null},
      hourly_rate = ${hourly_rate || null}, daily_rate = ${daily_rate || null},
      start_date = ${start_date || null}, end_date = ${end_date || null}, notes = ${notes || null}
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  if (!worker) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ worker });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Worker ID required" }, { status: 400 });

  await sql`DELETE FROM workers WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ success: true });
}