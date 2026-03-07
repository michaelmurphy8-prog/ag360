import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

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
    WHERE s.tenant_id = ${tenantId}
  `;

  return NextResponse.json({ lines });
}