import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const incidents = await sql`
      SELECT s.*, w.name as worker_name, w.role as worker_role
      FROM safety_incidents s
      LEFT JOIN workers w ON s.worker_id = w.id
      WHERE s.user_id = ${userId}
      ORDER BY s.incident_date DESC, s.created_at DESC
    `;
    return NextResponse.json({ incidents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { worker_id, incident_date, incident_type, severity, field, description, corrective_action } = body;

    if (!incident_type) return NextResponse.json({ error: "Incident type is required" }, { status: 400 });

    const result = await sql`
      INSERT INTO safety_incidents (user_id, worker_id, incident_date, incident_type, severity, field, description, corrective_action)
      VALUES (${userId}, ${worker_id || null}, ${incident_date || new Date().toISOString().slice(0, 10)}, ${incident_type}, ${severity || 'low'}, ${field || null}, ${description || null}, ${corrective_action || null})
      RETURNING *
    `;
    return NextResponse.json({ incident: result[0] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, worker_id, incident_date, incident_type, severity, field, description, corrective_action } = body;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await sql`
      UPDATE safety_incidents SET
        worker_id = ${worker_id || null},
        incident_date = ${incident_date},
        incident_type = ${incident_type},
        severity = ${severity},
        field = ${field || null},
        description = ${description || null},
        corrective_action = ${corrective_action || null}
      WHERE id = ${id} AND user_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });
    await sql`DELETE FROM safety_incidents WHERE id = ${id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}