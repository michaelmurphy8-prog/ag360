import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const positions = await sql`
    SELECT * FROM hedge_positions
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return NextResponse.json({ positions });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { crop, exchange, contract_month, contracts, contract_size_mt, direction, entry_price, current_price, opened_date, notes } = body;

  const result = await sql`
    INSERT INTO hedge_positions (
      user_id, crop, exchange, contract_month, contracts,
      contract_size_mt, direction, entry_price, current_price,
      opened_date, notes
    ) VALUES (
      ${userId}, ${crop}, ${exchange}, ${contract_month}, ${contracts},
      ${contract_size_mt || 20}, ${direction || "short"}, ${entry_price},
      ${current_price || null}, ${opened_date || null}, ${notes || null}
    )
    RETURNING *
  `;
  return NextResponse.json({ position: result[0] });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, crop, exchange, contract_month, contracts, contract_size_mt, direction, entry_price, current_price, status, opened_date, notes } = body;

  const result = await sql`
    UPDATE hedge_positions SET
      crop = ${crop}, exchange = ${exchange},
      contract_month = ${contract_month}, contracts = ${contracts},
      contract_size_mt = ${contract_size_mt || 20}, direction = ${direction || "short"},
      entry_price = ${entry_price}, current_price = ${current_price || null},
      status = ${status || "open"}, opened_date = ${opened_date || null},
      notes = ${notes || null}, updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `;
  return NextResponse.json({ position: result[0] });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await sql`DELETE FROM hedge_positions WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ success: true });
}