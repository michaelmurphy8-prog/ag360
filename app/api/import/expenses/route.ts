import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

interface ExpenseImportRow {
  field_id: string;
  category: string;
  description?: string | null;
  amount: number;
  date?: string | null;
  vendor?: string | null;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { rows, crop_year } = (await req.json()) as { rows: ExpenseImportRow[]; crop_year: number };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    const results = {
      costsCreated: 0,
      totalAmount: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const desc = [row.description, row.vendor].filter(Boolean).join(" — ") || null;

        await sql`
          INSERT INTO field_costs (field_id, crop_year, category, description, actual_amount)
          VALUES (${row.field_id}, ${crop_year}, ${row.category}, ${desc}, ${row.amount})
        `;
        results.costsCreated++;
        results.totalAmount += row.amount;
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message || "Unknown error" });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.costsCreated} expenses imported ($${results.totalAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })})`,
    });
  } catch (err: any) {
    console.error("Expenses import error:", err);
    return NextResponse.json({ error: "Import failed: " + err.message }, { status: 500 });
  }
}