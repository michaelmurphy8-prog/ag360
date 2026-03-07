import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";
import { PRAIRIE_CHART_OF_ACCOUNTS } from "@/lib/finance-accounts";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    let accounts = await sql`
      SELECT * FROM accounts WHERE tenant_id = ${tenantId} ORDER BY sort_order ASC, code ASC
    `;

    if (accounts.length === 0) {
      for (const a of PRAIRIE_CHART_OF_ACCOUNTS) {
        await sql`
          INSERT INTO accounts (
            tenant_id, code, name, account_type, sub_type,
            normal_balance, description, field_allocatable, is_system, sort_order
          ) VALUES (
            ${tenantId}, ${a.code}, ${a.name}, ${a.account_type}, ${a.sub_type},
            ${a.normal_balance}, ${a.description}, ${a.field_allocatable}, true, ${a.sort_order}
          )
        `;
      }
      accounts = await sql`
        SELECT * FROM accounts WHERE tenant_id = ${tenantId} ORDER BY sort_order ASC, code ASC
      `;
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Accounts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { code, name, account_type, sub_type, normal_balance, description, field_allocatable } = body;

    if (!code || !name || !account_type || !normal_balance) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [account] = await sql`
      INSERT INTO accounts (
        tenant_id, code, name, account_type, sub_type,
        normal_balance, description, field_allocatable, sort_order
      ) VALUES (
        ${tenantId}, ${code}, ${name}, ${account_type}, ${sub_type || null},
        ${normal_balance}, ${description || null}, ${field_allocatable || false}, 999
      )
      RETURNING *
    `;
    return NextResponse.json({ account });
  } catch (error: any) {
    if (error.message?.includes("unique")) {
      return NextResponse.json({ error: "Account code already exists" }, { status: 409 });
    }
    console.error("Account create error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}