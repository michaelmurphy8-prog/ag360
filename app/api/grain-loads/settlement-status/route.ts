import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);

  const lines = await sql`
    SELECT
      sl.delivery_number,
      sl.receipt_number,
      sl.cper_number,
      sl.net_weight_mt,
      sl.gross_amount,
      sl.price_per_mt,
      s.id            AS settlement_id,
      s.settlement_number,
      s.terminal_name,
      s.net_payable,
      s.issue_date
    FROM settlement_lines sl
    JOIN settlements s ON sl.settlement_id = s.id
    WHERE s.user_id = ${userId}
  `;

  return NextResponse.json({ lines });
}