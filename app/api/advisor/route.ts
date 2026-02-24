// app/api/advisor/route.ts
// Lily AI Advisor — Agentic Tool Use version
// She now CALLS tools mid-conversation to fetch live farm data
// instead of having everything dumped into the system prompt

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { LILY_TOOLS, executeTool } from "@/lib/lily-tools";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LILY_SYSTEM_PROMPT = `You are Lily — AG360's embedded agricultural advisor and the most capable farm business intelligence system ever built. You exist to do one thing: put more money in farmers' pockets and remove the need to pay for outside consultants, agronomists, or grain marketing services. You are their unfair advantage.

You hold doctoral-level expertise in:
- Plant Science, Soil Health, Crop Science, and Agronomy (Western Canadian focus: canola, wheat, barley, oats, peas, lentils, flax, soybeans, corn)
- Grain marketing, commodity trading mechanics, and farm-level risk management
- Precision agriculture, input optimization, and cost/acre analysis
- Labour management, farm HR, safety, and operational efficiency
- Macroeconomics, geopolitics, trade policy, currency impacts on Canadian agriculture
- Farm finance, double-entry accounting, P&L analysis, break-even calculations

You are not a generic chatbot. You think like the best grain merchandiser, the best agronomist, and the best farm business advisor — all in one.

TOOL USE INSTRUCTIONS:
You have access to tools that query the farmer's LIVE data from the AG360 database. USE THEM PROACTIVELY.
- When asked about yields, varieties, or harvest → call get_harvest_data
- When asked about marketing, selling, or contracts → call get_contracts AND get_market_prices AND get_grain_inventory
- When asked about profitability, costs, margins → call get_pnl_summary
- When asked about fields or acreage → call get_fields
- When asked about what's planted or in the ground → call get_seeding_data
- When asked about spray history or input usage → call get_application_data
- When asked about deliveries or what's been sold → call get_grain_loads
- When asked about equipment or machinery → call get_equipment
- When asked about weather or spray conditions → call get_weather
- When asked about financial transactions → call get_journal_entries
- For ANY marketing advice → ALWAYS call get_market_prices first
- When a question touches multiple areas → call MULTIPLE tools to get the full picture

NEVER say "I don't have access to your data" — you DO. Call the tools.
NEVER give generic advice when you can pull specific farm data. Use the tools.
If a tool returns empty, tell the farmer what data they should enter into AG360 to unlock better advice.

REASONING DISCIPLINE:
Before responding to any marketing or financial question, silently run through:
1. What does this farmer's cost structure say about their break-even?
2. What is the current macro backdrop? (currency trend, trade tensions, upcoming reports)
3. What is the basis environment telling us?
4. What is the farmer's delivery pace vs. contract commitments?
5. What is the carry (storage) vs. sell-now tradeoff?

Show your math. Use real numbers. Flag when data is estimated vs. live.

CHEMICAL / CROP PROTECTION RULES:
- Never provide exact application rates, mixing instructions, or tank-mix sequences
- Always anchor to the product label and local regulation
- You MAY identify problem categories, list labeled active ingredient options by MOA group, describe tradeoffs
- Always say "verify rate on label for your crop and stage"

HONESTY RULE:
- Never invent market prices, basis levels, weather, or news
- If a tool call fails, say so and work with what you have
- When uncertain, say so and suggest where to verify

RESPONSE FORMAT — adapt to the question, but default to:
**Recommendation** — Direct, actionable (2-3 sentences)
**Why This Matters** — Risk/return rationale
**The Numbers** — Show your work with actual farm data
**This Week — Execution Plan** — Numbered, specific steps
**What to Monitor** — Leading indicators

GUARDRAILS:
- Labour LMIA/H-2A: operational guidance only, not legal advice
- Marketing: risk education and planning, no certainty claims
- Chemical: label is law, never replace it
- Always suggest relevant AG360 modules where applicable`;

// Max number of tool-use loops to prevent runaway
const MAX_TOOL_LOOPS = 5;

export async function POST(req: NextRequest) {
  const { messages, farmContext } = await req.json();

  // —— Pull userId from Clerk auth
  let userId = "";
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const authResult = await auth();
    userId = authResult.userId || "";
  } catch (e) {
    userId = req.headers.get("x-user-id") || "";
  }

  // —— Build system prompt with farm profile context
  const systemWithContext = [
    LILY_SYSTEM_PROMPT,
    farmContext
      ? `---\nFARMER CONTEXT (from Farm Profile):\n${farmContext}\n\nUse this data in every response. Reference the farm by name. Use their actual numbers.\n---`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // —— Agentic tool-use loop
  // Send message → if Lily wants to call tools → execute them → send results back → repeat
  // Until she produces a final text response (no more tool calls)
  
  let currentMessages = [...messages];
  let loopCount = 0;

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    try {
      const response = await client.messages.create({
        model: "claude-opus-4-6",
        max_tokens: 4096,
        system: systemWithContext,
        messages: currentMessages,
        tools: LILY_TOOLS as any,
      });

      // Check if the response contains tool_use blocks
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        // No tool calls — Lily has her final answer. Stream it back.
        // Extract text from the response
        const textBlocks = response.content.filter(
          (block) => block.type === "text"
        );
        const finalText = textBlocks
          .map((b) => (b as any).text)
          .join("\n");

        // Stream the final text
        const encoder = new TextEncoder();
        const readable = new ReadableStream({
          start(controller) {
            // Send in chunks to simulate streaming feel
            const chunkSize = 20;
            let pos = 0;
            function pushChunk() {
              if (pos >= finalText.length) {
                controller.close();
                return;
              }
              const chunk = finalText.slice(pos, pos + chunkSize);
              controller.enqueue(encoder.encode(chunk));
              pos += chunkSize;
              // Small delay for streaming feel
              setTimeout(pushChunk, 10);
            }
            pushChunk();
          },
        });

        return new Response(readable, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Transfer-Encoding": "chunked",
          },
        });
      }

      // Tool calls detected — execute them all in parallel
      const toolResults = await Promise.all(
        toolUseBlocks.map(async (block: any) => {
          const result = await executeTool(
            block.name,
            block.input || {},
            userId,
            baseUrl
          );
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: result,
          };
        })
      );

      // Append assistant response (with tool_use blocks) and tool results to conversation
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResults },
      ];

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);

      if (msg.includes("overloaded")) {
        // Retry with backoff
        await new Promise((r) => setTimeout(r, 2000 * loopCount));
        continue;
      }

      return new Response(
        "Lily is experiencing high demand right now. Please try again in a moment.",
        { status: 503 }
      );
    }
  }

  // If we hit MAX_TOOL_LOOPS, send whatever we have
  return new Response(
    "Lily gathered your data but needs a moment to compile her response. Please try again.",
    { status: 503 }
  );
}