import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await context.params;

    const settlement = await sql`
      SELECT * FROM settlements WHERE id = ${id} AND user_id = ${userId}
    `;
    if (settlement.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lines = await sql`
      SELECT * FROM settlement_lines
      WHERE settlement_id = ${id}
      ORDER BY line_number ASC
    `;

    return NextResponse.json({ settlement: settlement[0], lines });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}