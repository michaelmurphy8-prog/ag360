// app/api/finance/journal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// GET — fetch journal entries with lines
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cropYear = req.nextUrl.searchParams.get("cropYear") || "2025";
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");

  try {
    const entries = await sql`
      SELECT
        je.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', jl.id,
              'account_id', jl.account_id,
              'account_code', a.code,
              'account_name', a.name,
              'description', jl.description,
              'debit', jl.debit,
              'credit', jl.credit,
              'quantity', jl.quantity,
              'unit', jl.unit,
              'unit_price', jl.unit_price,
              'field_name', jl.field_name,
              'crop', jl.crop
            ) ORDER BY jl.sort_order
          ) FILTER (WHERE jl.id IS NOT NULL),
          '[]'
        ) as lines
      FROM journal_entries je
      LEFT JOIN journal_lines jl ON jl.journal_entry_id = je.id
      LEFT JOIN accounts a ON jl.account_id = a.id
      WHERE je.user_id = ${userId}
        AND je.crop_year = ${parseInt(cropYear)}
        AND je.is_void = false
      GROUP BY je.id
      ORDER BY je.entry_date DESC, je.entry_number DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    // Get total count
    const [{ count }] = await sql`
      SELECT COUNT(*) as count FROM journal_entries
      WHERE user_id = ${userId} AND crop_year = ${parseInt(cropYear)} AND is_void = false
    `;

    return NextResponse.json({ entries, total: parseInt(count) });
  } catch (error) {
    console.error("Journal fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch journal entries" }, { status: 500 });
  }
}

// POST — create a new journal entry with lines
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { entry_date, description, memo, source, crop_year, field_name, crop, lines, vendor, document_number, document_type, payment_status, payment_terms, due_date, ai_scanned, paid_date } = body;

    if (!entry_date || !description || !lines || lines.length < 2) {
      return NextResponse.json({ error: "Entry needs a date, description, and at least 2 lines" }, { status: 400 });
    }

    // Validate debits = credits
    const totalDebit = lines.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0);
    const totalCredit = lines.reduce((s: number, l: any) => s + (parseFloat(l.credit) || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json({
        error: `Entry does not balance. Debits: $${totalDebit.toFixed(2)}, Credits: $${totalCredit.toFixed(2)}`,
      }, { status: 400 });
    }

    // Create the journal entry
    const [entry] = await sql`
      INSERT INTO journal_entries (user_id, entry_date, description, memo, source, crop_year, field_name, crop, vendor, document_number, document_type, payment_status, payment_terms, due_date, ai_scanned, paid_date)
      VALUES (${userId}, ${entry_date}, ${description}, ${memo || null}, ${source || "manual"}, ${crop_year || 2025}, ${field_name || null}, ${crop || null}, ${vendor || null}, ${document_number || null}, ${document_type || "manual"}, ${payment_status || "paid"}, ${payment_terms || null}, ${due_date || null}, ${ai_scanned || false}, ${paid_date || null})
      RETURNING *
    `;

    // Create the lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await sql`
        INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit, quantity, unit, unit_price, field_name, crop, sort_order)
        VALUES (${entry.id}, ${line.account_id}, ${line.description || null}, ${parseFloat(line.debit) || 0}, ${parseFloat(line.credit) || 0}, ${line.quantity ? parseFloat(line.quantity) : null}, ${line.unit || null}, ${line.unit_price ? parseFloat(line.unit_price) : null}, ${line.field_name || field_name || null}, ${line.crop || crop || null}, ${i})
      `;
    }

    return NextResponse.json({ entry, balanced: true });
  } catch (error) {
    console.error("Journal create error:", error);
    return NextResponse.json({ error: "Failed to create journal entry" }, { status: 500 });
  }
}