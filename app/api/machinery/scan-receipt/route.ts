import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { neon } from "@neondatabase/serverless";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // Get fleet list for matching
  const assets = await sql`
    SELECT id, name, make, model, year, "assetClass", "hoursTotal", "kmTotal"
    FROM "Asset" WHERE "orgId" = ${userId} ORDER BY name ASC
  `;

  const fleetList = assets.map((a: any) => `ID:${a.id} | ${a.name} | ${a.make} ${a.model} (${a.year}) | Class: ${a.assetClass} | Hours: ${a.hoursTotal || 'N/A'} | KM: ${a.kmTotal || 'N/A'}`).join("\n");

  // Convert file to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type === "application/pdf" ? "application/pdf" : (file.type.startsWith("image/") ? file.type : "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";

  const contentBlock = mediaType === "application/pdf"
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } };

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: [
        contentBlock,
        {
          type: "text",
          text: `You are an agricultural equipment service document parser. Extract service/maintenance information from this document (invoice, receipt, work order, or service sheet).

FLEET LIST — match the unit to one of these:
${fleetList}

Return ONLY valid JSON (no markdown, no backticks):
{
  "matched_asset_id": "the ID from the fleet list that best matches, or null if no match",
  "matched_asset_name": "name of matched unit, or null",
  "confidence": "high/medium/low",
  "date": "YYYY-MM-DD or null",
  "service_type": "Oil Change|Filter Replacement|Greasing|Belt Replacement|Tire Service|Hydraulic Service|Electrical Repair|Engine Repair|Transmission Service|Bearing Replacement|Annual Inspection|Winterization|Pre-Season Check|Calibration|Warranty Work|Other",
  "category": "preventive|repair|inspection|warranty|general",
  "cost": number or null,
  "hours_at_service": number or null,
  "km_at_service": number or null,
  "labor_hours": number or null,
  "parts_used": "string description or null",
  "vendor": "vendor/shop name or null",
  "performed_by": "technician name or null",
  "notes": "any additional relevant info",
  "raw_unit_description": "how the document describes the unit (for verification)"
}`
        }
      ]
    }],
  });

  const text = response.content.find(b => b.type === "text")?.text || "";
  
  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json({ success: true, extracted: parsed });
  } catch {
    return NextResponse.json({ success: false, error: "Could not parse document", raw: text }, { status: 422 });
  }
}