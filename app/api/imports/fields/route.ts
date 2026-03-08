// app/api/imports/fields/route.ts
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const provider = req.nextUrl.searchParams.get("provider") || "";

  try {
    const fields = await sql`
      SELECT id, name, total_acres, legal_land_description
      FROM fields
      WHERE tenant_id = ${tenantId}
      ORDER BY name ASC
    `;

    const aliases = provider
      ? await sql`
          SELECT external_field_name, field_id
          FROM field_aliases
          WHERE tenant_id = ${tenantId} AND source_provider = ${provider}
        `
      : [];

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