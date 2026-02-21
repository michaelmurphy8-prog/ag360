import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string; revenueId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revenueId } = await context.params;

  try {
    await sql`
      DELETE FROM field_revenue
      WHERE id = ${revenueId}
      AND field_crop_id = ${id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting revenue:", error);
    return NextResponse.json({ error: "Failed to delete revenue" }, { status: 500 });
  }
}