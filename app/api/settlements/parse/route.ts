import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// KG per bushel conversion
const KG_PER_BUSHEL: Record<string, number> = {
  "Canola": 22.68, "HRS Wheat": 27.22, "HRW Wheat": 27.22, "Wheat": 27.22,
  "Durum": 27.22, "Barley": 21.77, "Oats": 15.42, "Peas": 27.22,
  "Lentils": 27.22, "Flax": 25.40, "Soybeans": 27.22, "Corn": 25.40,
};

function mtToBushels(mt: number, crop: string): number {
  const kg = mt * 1000;
  const factor = KG_PER_BUSHEL[crop] || 27.22;
  return Math.round(kg / factor);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { pdf, filename } = await req.json();
    if (!pdf) return NextResponse.json({ error: "No PDF provided" }, { status: 400 });

    // Send PDF to Claude Opus for extraction
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: pdf },
            },
            {
              type: "text",
              text: `You are parsing a Canadian grain elevator settlement document. Extract ALL data and return ONLY valid JSON — no markdown, no backticks, no explanation.

Return this exact structure:
{
  "header": {
    "settlement_number": "string — look for Settlement #, SETTLEMENT # in header, or the number next to CPER # if no explicit settlement number exists",
    "terminal_name": "company name (Bunge, Cargill, Viterra, MFSeeds, etc.)",
    "terminal_location": "city/station",
    "issue_date": "YYYY-MM-DD",
    "payment_date": "YYYY-MM-DD or null",
    "payment_method": "Cheque, EFT, etc. or null",
    "crop": "map to: Canola, HRS Wheat, HRW Wheat, Durum, Barley, Oats, Peas, Lentils, Flax, Soybeans. For '1 Canada' canola use 'Canola'. For 'LGL' (Large Green Lentils) use 'Lentils'.",
    "grade": "e.g. 1 Canada, MID2, etc.",
    "contract_number": "string or null",
    "price_per_mt": number (the consistent $/MT across loads),
    "gross_payable": number (total before adjustments),
    "total_adjustments": number (negative = deductions, e.g. -1222.82),
    "net_payable": number (final payment amount),
    "adjustment_details": [
      { "name": "description", "amount": number }
    ]
  },
  "lines": [
    {
      "line_number": 1,
      "delivery_number": "string or null",
      "receipt_number": "string or null", 
      "cper_number": "string or null (CPER # if present)",
      "delivery_date": "YYYY-MM-DD",
      "contract_number": "string or null",
      "shipment_number": "string or null",
      "commodity": "same crop mapping as header",
      "grade": "string or null",
      "unload_weight_mt": number (Unload Weight in metric tonnes),
      "dockage_pct": number (Dockage % e.g. 3.40),
      "dockage_mt": number (Dockage in MT),
      "dry_loss_pct": number or null,
      "dry_loss_mt": number or null,
      "net_weight_mt": number,
      "moisture_pct": number or null (MST value if shown),
      "price_per_mt": number,
      "gross_amount": number,
      "handling": number or null,
      "gst": number or null,
      "levy": number or null,
      "dkg_value": number or null (DKG $ column),
      "other_deductions": number or null,
      "net_payable_line": number or null (per-line net if shown)
    }
  ]
}

IMPORTANT RULES:
- Extract EVERY load line, not just a sample. Count them carefully.
- For Bunge: "Unload Weight" is the column header. Dockage is in both % and MT. Net Weight is after dockage. Moisture is in "Properties: MST X.XXX %".
- For MFSeeds/other: "Sum of GRAIN UNLOAD" is the grain weight. "Sum of DOCKAGE" is dockage MT. Use column headers exactly as shown.
- All weights in metric tonnes. All amounts in CAD.
- Parse numbers without commas. Negative adjustments should be negative numbers.
- If a field doesn't exist on this format, use null.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = text.replace(/```json\s?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    const { header, lines } = parsed;

    // Calculate stats
    const totalLoads = lines.length;
    const totalUnloadMT = lines.reduce((s: number, l: any) => s + (l.unload_weight_mt || 0), 0);
    const totalDockageMT = lines.reduce((s: number, l: any) => s + (l.dockage_mt || 0), 0);
    const totalNetMT = lines.reduce((s: number, l: any) => s + (l.net_weight_mt || 0), 0);
    const avgDockage = totalLoads > 0
      ? lines.reduce((s: number, l: any) => s + (l.dockage_pct || 0), 0) / totalLoads
      : 0;
    const avgMoisture = lines.filter((l: any) => l.moisture_pct).length > 0
      ? lines.filter((l: any) => l.moisture_pct).reduce((s: number, l: any) => s + l.moisture_pct, 0) / lines.filter((l: any) => l.moisture_pct).length
      : null;
    const totalBushels = mtToBushels(totalNetMT, header.crop || "Wheat");

    // Flag analysis
    const dockageValues = lines.map((l: any) => l.dockage_pct || 0).filter((d: number) => d > 0);
    const avgDockagePct = dockageValues.length > 0 ? dockageValues.reduce((a: number, b: number) => a + b, 0) / dockageValues.length : 0;
    const settlementFlags: any = { dockage_outliers: 0, price_mismatches: 0, math_errors: 0, partial_loads: 0 };

    const flaggedLines = lines.map((line: any, idx: number) => {
      const flags: any = {};

      // Dockage outlier
      if (line.dockage_pct && avgDockagePct > 0) {
        if (line.dockage_pct > avgDockagePct * 2) {
          flags.dockage_outlier = "red";
          settlementFlags.dockage_outliers++;
        } else if (line.dockage_pct > avgDockagePct * 1.5) {
          flags.dockage_high = "amber";
          settlementFlags.dockage_outliers++;
        }
      }

      // Price mismatch
      if (line.price_per_mt && header.price_per_mt && line.price_per_mt !== header.price_per_mt) {
        flags.price_mismatch = true;
        settlementFlags.price_mismatches++;
      }

      // Math verification: try net_weight × price first, then unload_weight × price
      if (line.price_per_mt && line.gross_amount) {
        let mathOk = false;
        if (line.net_weight_mt) {
          const expectedNet = Math.round(line.net_weight_mt * line.price_per_mt * 100) / 100;
          if (Math.abs(expectedNet - line.gross_amount) <= 1.00) mathOk = true;
        }
        if (!mathOk && line.unload_weight_mt) {
          const expectedUnload = Math.round(line.unload_weight_mt * line.price_per_mt * 100) / 100;
          if (Math.abs(expectedUnload - line.gross_amount) <= 1.00) mathOk = true;
        }
        if (!mathOk && line.net_weight_mt) {
          const expected = Math.round(line.net_weight_mt * line.price_per_mt * 100) / 100;
          flags.math_error = { expected, actual: line.gross_amount, diff: Math.round((expected - line.gross_amount) * 100) / 100 };
          settlementFlags.math_errors++;
        }
      }

      // Partial load (net weight < 50% of average)
      const avgNetMT = totalNetMT / totalLoads;
      if (line.net_weight_mt && line.net_weight_mt < avgNetMT * 0.5) {
        flags.partial_load = true;
        settlementFlags.partial_loads++;
      }

      return { ...line, flags, line_number: idx + 1 };
    });

    // Insert settlement header
    const settlement = await sql`
      INSERT INTO settlements (
        user_id, settlement_number, terminal_name, terminal_location,
        issue_date, payment_date, payment_method, crop, grade, contract_number,
        total_loads, price_per_mt, total_unload_weight_mt, total_dockage_mt,
        total_net_weight_mt, total_bushels, gross_payable, total_adjustments,
        net_payable, avg_dockage_pct, avg_moisture_pct, status, pdf_filename, flags
      ) VALUES (
        ${userId}, ${header.settlement_number}, ${header.terminal_name},
        ${header.terminal_location}, ${header.issue_date}, ${header.payment_date || null},
        ${header.payment_method || null}, ${header.crop}, ${header.grade || null},
        ${header.contract_number || null}, ${totalLoads}, ${header.price_per_mt},
        ${totalUnloadMT}, ${totalDockageMT}, ${totalNetMT}, ${totalBushels},
        ${header.gross_payable}, ${header.total_adjustments || 0}, ${header.net_payable},
        ${avgDockage}, ${avgMoisture}, 'parsed', ${filename || 'settlement.pdf'},
        ${JSON.stringify(settlementFlags)}
      )
      RETURNING *
    `;

    const settlementId = settlement[0].id;

    // Insert all lines
    for (const line of flaggedLines) {
      await sql`
        INSERT INTO settlement_lines (
          settlement_id, line_number, delivery_number, receipt_number, cper_number,
          delivery_date, contract_number, shipment_number, commodity, grade,
          unload_weight_mt, dockage_pct, dockage_mt, dry_loss_pct, dry_loss_mt,
          net_weight_mt, net_bushels, moisture_pct, price_per_mt, gross_amount,
          handling, gst, levy, dkg_value, other_deductions, net_payable_line, flags
        ) VALUES (
          ${settlementId}, ${line.line_number}, ${line.delivery_number || null},
          ${line.receipt_number || null}, ${line.cper_number || null},
          ${line.delivery_date || null}, ${line.contract_number || null},
          ${line.shipment_number || null}, ${line.commodity || header.crop},
          ${line.grade || null}, ${line.unload_weight_mt || null},
          ${line.dockage_pct || null}, ${line.dockage_mt || null},
          ${line.dry_loss_pct || null}, ${line.dry_loss_mt || null},
          ${line.net_weight_mt || null},
          ${line.net_weight_mt ? mtToBushels(line.net_weight_mt, header.crop || "Wheat") : null},
          ${line.moisture_pct || null}, ${line.price_per_mt || null},
          ${line.gross_amount || null}, ${line.handling || null},
          ${line.gst || null}, ${line.levy || null}, ${line.dkg_value || null},
          ${line.other_deductions || null}, ${line.net_payable_line || null},
          ${JSON.stringify(line.flags)}
        )
      `;
    }

    return NextResponse.json({
      success: true,
      settlement: settlement[0],
      lines: flaggedLines,
      analysis: {
        total_loads: totalLoads,
        total_net_mt: totalNetMT,
        total_bushels: totalBushels,
        avg_dockage_pct: Math.round(avgDockage * 1000) / 1000,
        avg_moisture_pct: avgMoisture ? Math.round(avgMoisture * 1000) / 1000 : null,
        gross_payable: header.gross_payable,
        adjustments: header.total_adjustments,
        net_payable: header.net_payable,
        flags: settlementFlags,
        adjustment_details: header.adjustment_details || [],
      },
    });
  } catch (error: any) {
    console.error("Settlement parse error:", error);
    return NextResponse.json({ error: error.message || "Failed to parse settlement" }, { status: 500 });
  }
}
