import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS grain360_reminders (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      completed BOOLEAN DEFAULT FALSE,
      priority TEXT DEFAULT 'medium',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ reminders: [] });
  await ensureTable();
  const rows = await sql`
    SELECT * FROM grain360_reminders 
    WHERE user_id = ${userId} 
    ORDER BY completed ASC, due_date ASC, created_at DESC
    LIMIT 20
  `;
  return NextResponse.json({ reminders: rows });
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureTable();
  const { action, item } = await req.json();

  if (action === "add") {
    const row = await sql`
      INSERT INTO grain360_reminders (user_id, title, due_date, priority)
      VALUES (${userId}, ${item.title}, ${item.due_date || null}, ${item.priority || "medium"})
      RETURNING *
    `;
    return NextResponse.json({ reminder: row[0] });
  }

  if (action === "toggle") {
    await sql`
      UPDATE grain360_reminders 
      SET completed = NOT completed 
      WHERE id = ${item.id} AND user_id = ${userId}
    `;
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    await sql`DELETE FROM grain360_reminders WHERE id = ${item.id} AND user_id = ${userId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}