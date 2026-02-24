// app/api/imports/fields/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = req.nextUrl.searchParams.get("provider") || "";

  try {
    // Get user's fields from the fields table
    // Adjust this query to match your actual fields table structure
    const fields = await sql`
      SELECT id, name, total_acres, legal_land_description
      FROM fields
      WHERE user_id = ${userId}
      ORDER BY name ASC
    `;

    // Get saved field aliases for this provider
    const aliases = provider
      ? await sql`
          SELECT external_field_name, field_id
          FROM field_aliases
          WHERE user_id = ${userId} AND source_provider = ${provider}
        `
      : [];

    // Build alias lookup
    const aliasMap: Record<string, string> = {};
    for (const a of aliases) {
      aliasMap[a.external_field_name] = a.field_id;
    }

    return NextResponse.json({ fields, aliasMap });
  } catch (error) {
    console.error("Fields fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch fields" }, { status: 500 });
  }
}