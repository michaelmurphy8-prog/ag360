import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";
import Anthropic from "@anthropic-ai/sdk";

const sql = neon(process.env.DATABASE_URL!);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const memories = await sql`
    SELECT id, content, category, crop_year, created_at
    FROM lily_memories
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at DESC
    LIMIT 30
  `;
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { userMessage, assistantMessage, cropYear } = await req.json();
  if (!userMessage || !assistantMessage) return NextResponse.json({ saved: 0 });

  const extractionPrompt = `You are extracting memorable facts from a farm advisor conversation.

USER SAID: "${userMessage}"
ADVISOR RESPONDED: "${assistantMessage.slice(0, 1000)}"

Extract 0-3 specific, reusable facts worth remembering about this farmer's operation, decisions, or preferences. Only extract genuinely useful facts — skip generic advice.

Categories: decision | problem | preference | plan | fact | agronomic

Respond ONLY with valid JSON array (empty array if nothing worth saving):
[{"content": "Farmer decided to hold canola until March, targeting $15/bu", "category": "decision"},
 {"content": "Farmer prefers flat price contracts over basis contracts", "category": "preference"}]`;

  try {
    const extraction = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      messages: [{ role: "user", content: extractionPrompt }],
    });

    const raw = (extraction.content[0] as any).text.trim();
    const clean = raw.replace(/```json|```/g, "").trim();

    let facts: { content: string; category: string }[] = [];
    try { facts = JSON.parse(clean); } catch { return NextResponse.json({ saved: 0 }); }

    if (!Array.isArray(facts) || facts.length === 0) return NextResponse.json({ saved: 0 });

    const recent = await sql`
      SELECT content FROM lily_memories
      WHERE tenant_id = ${tenantId}
      AND created_at > NOW() - INTERVAL '7 days'
    `;
    const recentTexts = recent.map((r: any) => r.content.toLowerCase());

    let saved = 0;
    for (const fact of facts.slice(0, 3)) {
      if (!fact.content || !fact.category) continue;
      const words = fact.content.toLowerCase().split(" ");
      const isDuplicate = recentTexts.some((text: string) => {
        const matches = words.filter((w: string) => w.length > 4 && text.includes(w));
        return matches.length / words.length > 0.6;
      });
      if (isDuplicate) continue;

      await sql`
        INSERT INTO lily_memories (tenant_id, content, category, crop_year, source_summary)
        VALUES (
          ${tenantId}, ${fact.content}, ${fact.category},
          ${cropYear ? parseInt(cropYear) : null},
          ${userMessage.slice(0, 100)}
        )
      `;
      saved++;
    }

    return NextResponse.json({ saved });
  } catch (err) {
    console.error("Memory extraction error:", err);
    return NextResponse.json({ saved: 0 });
  }
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await sql`DELETE FROM lily_memories WHERE id = ${id} AND tenant_id = ${tenantId}`;
  } else {
    await sql`DELETE FROM lily_memories WHERE tenant_id = ${tenantId}`;
  }

  return NextResponse.json({ success: true });
}