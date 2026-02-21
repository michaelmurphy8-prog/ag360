import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@clerk/nextjs/server";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; costId: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await sql`
      DELETE FROM field_costs
      WHERE id = ${params.costId}
      AND field_crop_id = ${params.id}
    `;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting cost:", error);
    return NextResponse.json({ error: "Failed to delete cost" }, { status: 500 });
  }
}