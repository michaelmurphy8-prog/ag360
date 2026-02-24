// app/api/finance/accounts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import { PRAIRIE_CHART_OF_ACCOUNTS } from "@/lib/finance-accounts";

const sql = neon(process.env.DATABASE_URL!);

// GET — fetch all accounts, auto-seed if empty
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let accounts = await sql`
      SELECT * FROM accounts WHERE user_id = ${userId} ORDER BY sort_order ASC, code ASC
    `;

    // Auto-seed chart of accounts on first use
    if (accounts.length === 0) {
      for (const a of PRAIRIE_CHART_OF_ACCOUNTS) {
        await sql`
          INSERT INTO accounts (user_id, code, name, account_type, sub_type, normal_balance, description, field_allocatable, is_system, sort_order)
          VALUES (${userId}, ${a.code}, ${a.name}, ${a.account_type}, ${a.sub_type}, ${a.normal_balance}, ${a.description}, ${a.field_allocatable}, true, ${a.sort_order})
        `;
      }
      accounts = await sql`
        SELECT * FROM accounts WHERE user_id = ${userId} ORDER BY sort_order ASC, code ASC
      `;
    }

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Accounts fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}

// POST — create new account
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { code, name, account_type, sub_type, normal_balance, description, field_allocatable } = body;

    if (!code || !name || !account_type || !normal_balance) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const [account] = await sql`
      INSERT INTO accounts (user_id, code, name, account_type, sub_type, normal_balance, description, field_allocatable, sort_order)
      VALUES (${userId}, ${code}, ${name}, ${account_type}, ${sub_type || null}, ${normal_balance}, ${description || null}, ${field_allocatable || false}, 999)
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