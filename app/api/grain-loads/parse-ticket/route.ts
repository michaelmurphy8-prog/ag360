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
              text: `You are parsing a Canadian grain elevator scale ticket. These come in many formats — Bunge Combined Primary Elevator Receipts, Cargill Truck Grain Receipts, Louis Dreyfus (LDC) thermal receipts, Viterra/Richardson tickets, and others. The image may be rotated, photographed at an angle, or thermal-printed. Extract data carefully.

CRITICAL WEIGHT RULES:
- For Cargill tickets: "Gross Weight" is the VEHICLE full weight. Use "Unloaded Gross Weight" as the accountable gross_weight_kg. Net Weight = Unloaded Gross - Dockage.
- For Bunge tickets: Use "Accountable Gross" or "Gross Weight" (after waste loss) as gross_weight_kg.
- For LDC/thermal receipts: "UNLOADWT" or "UNLOAD WT" is the accountable gross. "GROSS WT" is vehicle full weight.
- For all tickets: gross_weight_kg should be the GRAIN weight (after tare/vehicle deduction), NOT the vehicle full weight. If both are shown, use the smaller number that represents grain only.

CROP MAPPING:
- "Amber Durum" or "CWAD" → "Durum"
- "Generic Canola" or "CANOLA" or "Can" → "Canola"  
- "CWRS" or "Hard Red Spring" → "HRS Wheat"
- "CWRW" → "HRW Wheat"
- Map all grains to one of: Canola, HRS Wheat, HRW Wheat, Durum, Barley, Oats, Peas, Lentils, Flax, Soybeans

Return ONLY valid JSON — no markdown, no backticks, no explanation:

{
  "date": "YYYY-MM-DD format (convert M/D/YYYY or DD/Mon/YYYY to this format)",
  "receipt_number": "Receipt No, Grain receipt number, Job #, or Ticket Number",
  "delivery_number": "Delivery No if shown, or null",
  "ticket_number": "use receipt_number as ticket_number",
  "elevator_name": "company name (Bunge, Cargill, Louis Dreyfus, Viterra, Richardson, etc.)",
  "station_name": "station/location name (e.g. Swift Current, Clavet, Moose Jaw, Yorkton)",
  "shipper_name": "the producer/customer/shipper name",
  "crop": "mapped crop name from list above",
  "grade": "e.g. 3 CWAD, 1 Canada, No. 1 Can",
  "vehicle_full_weight_kg": "number — the total vehicle weight before unloading",
  "vehicle_empty_weight_kg": "number — tare weight",
  "gross_weight_kg": "number — the GRAIN weight after tare (Unloaded Gross, Accountable Gross, or UNLOADWT). NOT the vehicle full weight.",
  "dockage_percent": "number (just the number, not the % sign)",
  "dockage_kg": "number or null",
  "net_weight_kg": "number — after dockage",
  "net_bushels": "number if shown (Net Imperial Bushels), or null",
  "moisture_percent": "number or null (MST, MOIS, or Moisture field)",
  "protein_percent": "number or null (PROT field)",
  "oil_percent": "number or null (OIL field, common on canola tickets)",
  "shipment_number": "Shipment # if shown, or null",
  "vehicle_id": "Vehicle Id, Trailer ID if shown, or null",
  "contract_reference": "Purchase Contract #, Contract #, or null",
  "remarks": "full remarks/comments section text, or null",
  "confidence": "high if text is clear and all key fields found, medium if some fields uncertain, low if image quality is poor or significant data unclear"
}

If a field is not visible or not applicable, use null. Parse all numbers without commas.`,
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