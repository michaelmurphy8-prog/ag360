import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Support both { image, mimeType } (existing page) and { file, mediaType } (future)
    const body = await req.json();
    const base64 = body.image || body.file;
    const mediaType = body.mimeType || body.mediaType || "image/jpeg";

    if (!base64) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const isImage = mediaType.startsWith("image/");

    const contentBlock = isImage
      ? { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/webp", data: base64 } }
      : { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: `You are parsing a Canadian grain scale ticket. Extract the data and return ONLY valid JSON — no markdown, no backticks, no explanation.

Return this exact structure:
{
  "ticket_number": "string or null",
  "date": "YYYY-MM-DD or null",
  "crop": "map to: Canola, Wheat, Durum, Barley, Oats, Peas, Lentils, Flax, Soybeans, Corn or null",
  "grade": "string or null",
  "field_name": "field or farm name if shown, or null",
  "from": "source farm/location if shown, or null",
  "shipper_name": "shipper name if shown, or null",
  "elevator_name": "buyer/elevator company name or null",
  "station_name": "elevator location/station or null",
  "contract_reference": "contract number if shown, or null",
  "delivery_number": "delivery number if shown, or null",
  "receipt_number": "receipt number if shown, or null",
  "gross_weight_kg": number (convert to kg: if lbs multiply by 0.453592, if MT multiply by 1000),
  "dockage_percent": number or null,
  "dockage_kg": number or null,
  "net_weight_kg": number,
  "net_bushels": number or null,
  "moisture_percent": number or null,
  "protein_percent": number or null,
  "price_per_bushel": number or null,
  "crop_year": number or null,
  "remarks": "any other notes on ticket or null",
  "confidence": "high | medium | low",
  "uncertain_fields": ["list of field names you are uncertain about"]
}

RULES:
- All weights in kilograms. Convert if needed.
- net_weight_kg = gross_weight_kg - dockage_kg if not explicitly shown.
- If dockage_kg not shown but dockage_percent and gross_weight_kg known, calculate it.
- Return null for any field not on the ticket.
- Set confidence based on image clarity and completeness.
- List any fields you are guessing or uncertain about in uncertain_fields.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Scale ticket parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse ticket" }, { status: 500 });
  }
}