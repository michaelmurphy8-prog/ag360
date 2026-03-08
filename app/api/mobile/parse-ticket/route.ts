// app/api/mobile/parse-ticket/route.ts
// Server-side AI grain ticket parser — keeps Anthropic API key off the client

import { NextRequest, NextResponse } from "next/server";
import { getTenantAuth } from "@/lib/tenant-auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { imageBase64, mediaType } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "imageBase64 and mediaType are required" }, { status: 400 });
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(mediaType)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `This is a grain elevator ticket or scale ticket from a Canadian prairie grain elevator.
Extract the following fields and return ONLY valid JSON, no markdown, no backticks, nothing else:
{
  "ticket_number": "string or null",
  "crop": "string or null — use one of: HRS Wheat, Durum, Canola, Barley, Oats, Flax, Large Green Lentils, Small Green Lentils, Small Red Lentils, Peas, Chickpeas, Mustard — match closest crop name on the ticket",
  "gross_weight_kg": "number or null — if in lbs divide by 2.20462, if in tonnes multiply by 1000",
  "tare_weight_kg": "number or null — same conversion",
  "net_weight_kg": "number or null — same conversion",
  "dockage_percent": "number or null",
  "destination": "elevator company name or buyer name or null",
  "date": "YYYY-MM-DD or null",
  "grade": "grain grade string or null",
  "notes": "any other relevant info such as moisture, protein, or special conditions, or null"
}
Be precise with numbers. If a value is not visible or legible, use null.`,
            },
          ],
        },
      ],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";

    // Strip any accidental markdown fences
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(clean);
    } catch {
      return NextResponse.json(
        { error: "Could not parse ticket — please fill in manually.", raw: text },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (e: any) {
    console.error("parse-ticket error:", e);
    return NextResponse.json(
      { error: "Ticket parsing failed. Please fill in manually." },
      { status: 500 }
    );
  }
}