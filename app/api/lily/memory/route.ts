import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";
import Anthropic from "@anthropic-ai/sdk";

const sql = neon(process.env.DATABASE_URL!);
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// GET — fetch memories for injection into system prompt
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memories = await sql`
    SELECT id, content, category, crop_year, created_at
    FROM lily_memories
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT 30
  `;

  return NextResponse.json({ memories });
}

// POST — extract and save memories from a completed exchange
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userMessage, assistantMessage, cropYear } = await req.json();
  if (!userMessage || !assistantMessage) {
    return NextResponse.json({ saved: 0 });
  }

  // Use Haiku for cheap extraction — not Sonnet
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
    // Strip markdown fences if present
    const clean = raw.replace(/```json|```/g, "").trim();
    
    let facts: { content: string; category: string }[] = [];
    try { facts = JSON.parse(clean); } catch { return NextResponse.json({ saved: 0 }); }

    if (!Array.isArray(facts) || facts.length === 0) {
      return NextResponse.json({ saved: 0 });
    }

    // Deduplicate — don't save if very similar content exists in last 7 days
    const recent = await sql`
      SELECT content FROM lily_memories
      WHERE user_id = ${userId}
      AND created_at > NOW() - INTERVAL '7 days'
    `;
    const recentTexts = recent.map((r: any) => r.content.toLowerCase());

    let saved = 0;
    for (const fact of facts.slice(0, 3)) {
      if (!fact.content || !fact.category) continue;
      // Simple similarity check — skip if 60%+ of words match a recent memory
      const words = fact.content.toLowerCase().split(" ");
      const isDuplicate = recentTexts.some((text: string) => {
        const matches = words.filter(w => w.length > 4 && text.includes(w));
        return matches.length / words.length > 0.6;
      });
      if (isDuplicate) continue;

      await sql`
        INSERT INTO lily_memories (user_id, content, category, crop_year, source_summary)
        VALUES (
          ${userId}, ${fact.content}, ${fact.category},
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

// DELETE — remove a specific memory
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (id) {
    await sql`DELETE FROM lily_memories WHERE id = ${id} AND user_id = ${userId}`;
  } else {
    // Clear all
    await sql`DELETE FROM lily_memories WHERE user_id = ${userId}`;
  }

  return NextResponse.json({ success: true });
}