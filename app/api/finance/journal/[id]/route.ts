// app/api/finance/journal/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// PATCH — update payment status (mark as paid/unpaid)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { payment_status, paid_date } = body;

    const [updated] = await sql`
      UPDATE journal_entries
      SET payment_status = ${payment_status},
          paid_date = ${paid_date || null},
          updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Journal PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// PUT — full update of journal entry
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();
    const { date, description, reference, lines } = body;

    // Validate balance
    const totalDebit = lines.reduce(
      (s: number, l: any) => s + (parseFloat(l.debit) || 0),
      0
    );
    const totalCredit = lines.reduce(
      (s: number, l: any) => s + (parseFloat(l.credit) || 0),
      0
    );
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: "Entry does not balance" },
        { status: 400 }
      );
    }

    // Update header
    const [updated] = await sql`
      UPDATE journal_entries
      SET entry_date = ${date},
          description = ${description},
          memo = ${reference || null},
          updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}
      RETURNING *
    `;

    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    // Delete old lines and recreate
    await sql`DELETE FROM journal_lines WHERE journal_entry_id = ${id}::uuid`;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      await sql`
        INSERT INTO journal_lines (journal_entry_id, account_id, description, debit, credit, quantity, unit, unit_price, field_name, crop, sort_order)
        VALUES (${id}::uuid, ${line.account_id}, ${line.description || null}, ${parseFloat(line.debit) || 0}, ${parseFloat(line.credit) || 0}, ${line.quantity ? parseFloat(line.quantity) : null}, ${line.unit || null}, ${line.unit_price ? parseFloat(line.unit_price) : null}, ${line.field_name || null}, ${line.crop || null}, ${i})
      `;
    }

    return NextResponse.json({ ...updated, lines });
  } catch (error) {
    console.error("Journal PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 }
    );
  }
}

// DELETE — void a journal entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const [voided] = await sql`
      UPDATE journal_entries
      SET is_void = true,
          voided_at = NOW(),
          void_reason = 'Deleted by user',
          updated_at = NOW()
      WHERE id = ${id}::uuid AND user_id = ${userId}
      RETURNING *
    `;

    if (!voided) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Journal DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}