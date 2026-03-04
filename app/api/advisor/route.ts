// app/api/advisor/route.ts
// Lily AI Advisor — Agentic Tool Use version
// She now CALLS tools mid-conversation to fetch live farm data
// instead of having everything dumped into the system prompt

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { LILY_TOOLS, executeTool } from "@/lib/lily-tools";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL!);

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
- When asked about service history, maintenance records → call get_service_history
- When asked about upcoming service, what's due, overdue → call get_service_schedules
- For ANY machinery maintenance, repair, or parts question → call get_equipment AND get_service_history first
- You are also an expert agricultural mechanic and technician. You know service intervals, common failure points, part numbers, torque specs, fluid capacities, diagnostic procedures, and troubleshooting for all major ag brands (John Deere, Case IH, CNH/New Holland, AGCO/Challenger, Bourgault, Seedmaster, Westfield, Brandt, MacDon, Honey Bee, Buhler/Versatile). When advising on maintenance, ALWAYS reference the specific unit's make, model, year, and current hours/km from the fleet data.
- When asked about weather or spray conditions → call get_weather
- When asked about financial transactions → call get_journal_entries
- For ANY marketing advice → ALWAYS call get_marketing_positions AND get_market_prices first
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

  // —— Fetch HR data for Lily context
  let hrContext = '';
  try {
    if (userId) {
      const hrWorkers = await sql`
        SELECT w.name, w.role, w.worker_type, w.status, w.hourly_rate, w.daily_rate,
               w.start_date, w.emergency_contact, w.emergency_phone
        FROM workers w WHERE w.user_id = ${userId} ORDER BY w.name
      `;
      const hrCerts = await sql`
        SELECT c.cert_type, c.expiry_date, c.cert_number, w.name as worker_name
        FROM certifications c JOIN workers w ON c.worker_id = w.id
        WHERE w.user_id = ${userId} ORDER BY c.expiry_date ASC
      `;
      const now = new Date();
      const monthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
      const hrTime = await sql`
        SELECT w.name, SUM(t.hours) as total_hours, COUNT(DISTINCT t.entry_date) as days_worked,
               COALESCE(w.hourly_rate, 0) as hourly_rate
        FROM time_entries t JOIN workers w ON t.worker_id = w.id
        WHERE w.user_id = ${userId} AND to_char(t.entry_date, 'YYYY-MM') = ${monthKey}
        GROUP BY w.name, w.hourly_rate
      `;
      if (hrWorkers.length > 0) {
        const wLines = hrWorkers.map((w: any) =>
          `  - ${w.name} | ${w.role || 'No role'} | ${w.worker_type} | ${w.status} | Rate: ${w.hourly_rate ? '$' + w.hourly_rate + '/hr' : w.daily_rate ? '$' + w.daily_rate + '/day' : 'N/A'}${w.start_date ? ' | Started: ' + String(w.start_date).slice(0, 10) : ''}${w.emergency_contact ? ' | Emergency: ' + w.emergency_contact + (w.emergency_phone ? ' ' + w.emergency_phone : '') : ''}`
        ).join('\n');
        const cLines = hrCerts.length > 0 ? hrCerts.map((c: any) => {
          const exp = c.expiry_date ? String(c.expiry_date).slice(0, 10) : 'No expiry';
          const diff = c.expiry_date ? (new Date(String(c.expiry_date).slice(0, 10)).getTime() - Date.now()) / (1000 * 60 * 60 * 24) : Infinity;
          const flag = diff < 0 ? ' EXPIRED' : diff < 30 ? ' EXPIRING SOON' : '';
          return `  - ${c.worker_name}: ${c.cert_type}${c.cert_number ? ' #' + c.cert_number : ''} | Exp: ${exp}${flag}`;
        }).join('\n') : '  None tracked';
        const tLines = hrTime.length > 0 ? hrTime.map((t: any) => {
          const hrs = Number(t.total_hours); const cost = hrs * Number(t.hourly_rate);
          return `  - ${t.name}: ${hrs.toFixed(1)} hrs / ${t.days_worked} days${cost > 0 ? ' | Cost: $' + cost.toFixed(2) : ''}`;
        }).join('\n') : '  No time entries this month';
        const totalCost = hrTime.reduce((s: number, t: any) => s + Number(t.total_hours) * Number(t.hourly_rate), 0);
        hrContext = `---\nLABOUR & HR DATA:\n\nTEAM (${hrWorkers.length} workers, ${hrWorkers.filter((w: any) => w.status === 'active').length} active):\n${wLines}\n\nCERTIFICATIONS:\n${cLines}\n\nTHIS MONTH (${monthKey}):\n${tLines}\nTotal Monthly Labour Cost: $${totalCost.toFixed(2)}\n\nYou can answer questions about workers, certs, expiry alerts, labour costs, and time tracking.\n---`;
      }
    }
  } catch (err) {
    console.error('Failed to fetch HR data for Lily:', err);
  }

  // —— Build system prompt with farm profile + HR context
  const systemWithContext = [
    LILY_SYSTEM_PROMPT,
    hrContext,
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
        model: "claude-sonnet-4-5-20250929",
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