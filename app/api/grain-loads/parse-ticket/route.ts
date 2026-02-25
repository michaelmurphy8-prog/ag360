import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { image, mimeType } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType || "image/jpeg",
                data: image,
              },
            },
            {
              type: "text",
              text: `You are parsing a Canadian grain elevator scale ticket / primary elevator receipt. Extract the following fields and return ONLY valid JSON — no markdown, no backticks, no explanation.

{
  "date": "YYYY-MM-DD format",
  "receipt_number": "the Receipt No.",
  "delivery_number": "the Delivery No.",
  "ticket_number": "use Receipt No. as ticket number",
  "elevator_name": "company name (e.g. Bunge, Viterra, Richardson)",
  "station_name": "station/location name",
  "shipper_name": "the 'Received from' or 'Name' field",
  "crop": "grain type — map to one of: Canola, HRS Wheat, HRW Wheat, Durum, Barley, Oats, Peas, Lentils, Flax, Soybeans. For 'Amber Durum' use 'Durum'.",
  "grade": "e.g. 3 CWAD, 1 CWRS",
  "vehicle_full_weight_kg": number,
  "vehicle_empty_weight_kg": number,
  "gross_weight_kg": number (the Gross Weight or Accountable Gross),
  "dockage_percent": number,
  "dockage_kg": number,
  "net_weight_kg": number,
  "net_bushels": number (Net Imperial Bushels if shown),
  "moisture_percent": number or null (from Receipt Properties MST value),
  "protein_percent": number or null (from Receipt Properties PROT value),
  "shipment_number": "Shipment # if shown",
  "vehicle_id": "Vehicle Id if shown",
  "contract_reference": "Purchase Contract # if shown, or null",
  "remarks": "full remarks section text",
  "confidence": "high" or "medium" or "low"
}

If a field is not visible or not applicable, use null. Parse numbers without commas. For dockage_percent, return just the number (e.g. 1.80 not 1.80%).`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    
    // Clean and parse the JSON response
    const cleaned = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return NextResponse.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error("Scale ticket parse error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse scale ticket" },
      { status: 500 }
    );
  }
}