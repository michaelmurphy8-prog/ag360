// app/api/finance/scan-document/route.ts
// AI-powered document scanner for invoices, receipts, statements
// Uses Claude vision to extract line items and map to Chart of Accounts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file)
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Determine media type
    const mediaType = file.type || "image/jpeg";
    const supportedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    if (!supportedTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPEG, PNG, GIF, WebP, or PDF." },
        { status: 400 }
      );
    }

    // Fetch user's Chart of Accounts for mapping
    const accounts = await sql`
      SELECT id, code, name, account_type, sub_type 
      FROM accounts 
      WHERE user_id = ${userId} AND is_active = true 
      ORDER BY code
    `;

    const coaList = accounts
      .map(
        (a: any) =>
          `${a.code} — ${a.name} (${a.account_type}/${a.sub_type}) [id:${a.id}]`
      )
      .join("\n");

    // Build the content block based on file type
    const documentContent: any =
      mediaType === "application/pdf"
        ? {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          }
        : {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64,
            },
          };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            documentContent,
            {
              type: "text",
              text: `You are an expert agricultural accountant. Analyze this financial document (receipt, invoice, statement, or quote) and extract all information for bookkeeping.

CHART OF ACCOUNTS (use these exact account IDs for mapping):
${coaList}

EXTRACTION RULES:
1. Extract vendor/payee name, document date, document/invoice number
2. Identify document type: "receipt" (paid at POS), "invoice" (bill to pay), "statement" (account summary), "quote" (estimate only)
3. Determine payment status and terms:
   - Receipt / credit card / debit card = "paid"
   - "Net 30", "Net 60", "Due on receipt" etc. = "unpaid" with appropriate terms
   - If unclear, default to "paid" for receipts, "unpaid" for invoices
4. Extract EVERY line item with description, quantity, unit price, and total
5. Extract tax separately (GST at 5% in Saskatchewan, PST if applicable)
6. Map each line item to the BEST matching account from the Chart of Accounts above
7. For the CREDIT side: if paid → use "1000 — Cash — Operating". If unpaid → use "2000 — Accounts Payable"
8. Calculate due_date from document date + payment terms (Net 30 = +30 days, etc.)

COMMON FARM EXPENSE MAPPINGS:
- Diesel/fuel → 6000 Fuel — Diesel
- Gasoline → 6010 Fuel — Gasoline  
- Oil, grease, filters → 6020 Oil, Grease & Filters
- Equipment parts/repairs → 6100 Equipment Repairs
- Truck/vehicle repairs → 6110 Truck & Vehicle Repairs
- Herbicide products → 5200 Herbicide
- Fungicide products → 5210 Fungicide
- Insecticide products → 5220 Insecticide
- Adjuvants/surfactants → 5230 Adjuvants & Surfactants
- Seed → 5000 Seed
- Nitrogen fertilizer → 5100 Fertilizer — Nitrogen
- Phosphorus fertilizer → 5110 Fertilizer — Phosphorus
- Custom spraying → 5300 Custom Spraying
- Insurance → 6420 Farm Insurance — General
- Crop insurance → 5400 Crop Insurance Premiums
- Utilities → 6400 Utilities
- Phone/internet → 6410 Communications
- Accounting/legal → 6430 Professional Fees
- Office supplies → 6440 Office & Admin
- Wages → 6300 Wages & Salaries
- Land rent → 6200 Land Rent / Lease
- Property tax → 6210 Property Taxes
- Building/bin repairs → 6120 Building & Bin Repairs
- Grain drying → 5500 Grain Drying

Respond with ONLY valid JSON (no markdown, no backticks, no preamble):
{
  "vendor": "string",
  "date": "YYYY-MM-DD",
  "document_number": "string or null",
  "document_type": "receipt|invoice|statement|quote",
  "payment_status": "paid|unpaid",
  "payment_terms": "paid|due_on_receipt|net_15|net_30|net_60|custom",
  "payment_method": "cash|debit|credit_card|cheque|etransfer|account|null",
  "due_date": "YYYY-MM-DD or null",
  "description": "Short summary for journal entry description (e.g. 'Fuel purchase — Shell Rosetown')",
  "line_items": [
    {
      "description": "Line item description",
      "account_id": "UUID from chart of accounts",
      "account_code": "4-digit code",
      "account_name": "Account name",
      "quantity": 0,
      "unit_price": 0.00,
      "debit": 0.00,
      "credit": 0.00
    }
  ],
  "tax_gst": 0.00,
  "tax_pst": 0.00,
  "subtotal": 0.00,
  "total": 0.00,
  "confidence": "high|medium|low",
  "notes": "Any uncertainty or notes about the extraction"
}

IMPORTANT:
- Expense line items get DEBIT amounts
- Revenue line items get CREDIT amounts  
- The balancing entry (cash or AP) goes on the opposite side
- GST goes to account 2500 (GST/HST Payable) as a DEBIT (input tax credit for farmer)
- Total debits MUST equal total credits
- Include the cash/AP balancing line in line_items
- Include the GST line in line_items if tax is present`,
            },
          ],
        },
      ],
    });

    // Parse the response
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "AI returned no text response" },
        { status: 500 }
      );
    }

    // Clean and parse JSON
    let jsonText = textBlock.text.trim();
    // Strip markdown fences if present
    jsonText = jsonText.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error:", jsonText);
      return NextResponse.json(
        {
          error: "Could not parse AI response",
          raw: jsonText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Validate debits = credits
    const totalDebit = parsed.line_items.reduce(
      (s: number, l: any) => s + (parseFloat(l.debit) || 0),
      0
    );
    const totalCredit = parsed.line_items.reduce(
      (s: number, l: any) => s + (parseFloat(l.credit) || 0),
      0
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      parsed.notes =
        (parsed.notes || "") +
        ` | WARNING: Entry does not balance. Debits: $${totalDebit.toFixed(2)}, Credits: $${totalCredit.toFixed(2)}. Please adjust.`;
      parsed.confidence = "low";
    }

    return NextResponse.json({
      success: true,
      data: parsed,
      file_name: file.name,
      file_type: mediaType,
    });
  } catch (error: any) {
    console.error("Scan document error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to scan document" },
      { status: 500 }
    );
  }
}