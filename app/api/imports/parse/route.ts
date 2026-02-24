// app/api/imports/parse/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { parseCSV, autoMapColumns } from "@/lib/import-engine";
import type { BrandId, DataTypeId } from "@/lib/import-engine";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { csvText, provider, dataType } = body as {
      csvText: string;
      provider: BrandId;
      dataType: DataTypeId;
    };

    if (!csvText || !dataType) {
      return NextResponse.json({ error: "Missing csvText or dataType" }, { status: 400 });
    }

    // Parse CSV
    const { headers, rows } = parseCSV(csvText);

    if (headers.length === 0 || rows.length === 0) {
      return NextResponse.json({ error: "Could not parse CSV — check format" }, { status: 400 });
    }

    // Auto-map columns
    const columnMapping = autoMapColumns(headers, dataType, provider);

    // Extract unique field names (if field_name column is mapped)
    const fieldNameKey = Object.entries(columnMapping).find(([, v]) => v === "field_name");
    const externalFieldNames = fieldNameKey
      ? [...new Set(rows.map((r) => r[fieldNameKey[0]]).filter(Boolean))]
      : [];

    return NextResponse.json({
      headers,
      rowCount: rows.length,
      sampleRows: rows.slice(0, 5),
      columnMapping,
      externalFieldNames,
    });
  } catch (error) {
    console.error("Import parse error:", error);
    return NextResponse.json({ error: "Failed to parse file" }, { status: 500 });
  }
}