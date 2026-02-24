// lib/lily-tools.ts
// Tool definitions and execution handlers for Lily's function calling
// Lily can query any AG360 data mid-conversation

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// ============================================================
// TOOL DEFINITIONS — Anthropic function calling format
// ============================================================
export const LILY_TOOLS = [
  {
    name: "get_harvest_data",
    description: "Get harvest records for a specific crop year. Returns yield, variety, area, moisture by field. Use this when the farmer asks about yields, variety performance, harvest results, or anything related to what was harvested.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year (e.g. 2025)" },
        crop: { type: "string", description: "Filter by crop name (optional, e.g. 'Canola', 'HRW Wheat')" },
        field_name: { type: "string", description: "Filter by specific field name (optional)" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_seeding_data",
    description: "Get seeding/planting records for a crop year. Returns crop, variety, area, seeding date, seed rate by field. Use when farmer asks about what was planted, seeding rates, or planting dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        crop: { type: "string", description: "Filter by crop (optional)" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_application_data",
    description: "Get spray/fertilizer/chemical application records. Returns product, type, rate, area, date by field. Use when farmer asks about spray history, input usage, or chemical applications.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        product_type: { type: "string", description: "Filter by type: herbicide, fungicide, insecticide, fertilizer, etc. (optional)" },
        field_name: { type: "string", description: "Filter by field (optional)" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_grain_inventory",
    description: "Get current grain inventory — what's in the bins right now. Returns crop, quantity, bin location, grade. Use when farmer asks about grain on hand, storage, or what they have left to sell.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop: { type: "string", description: "Filter by crop type (optional)" },
      },
    },
  },
  {
    name: "get_grain_loads",
    description: "Get grain delivery/load records. Returns crop, bushels, buyer, price, grade, date. Use when farmer asks about deliveries, sales history, or what they've sold.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        crop: { type: "string", description: "Filter by crop (optional)" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_contracts",
    description: "Get active grain contracts. Returns crop, type, bushels, price, buyer, delivery window, status. Use when farmer asks about contracts, commitments, delivery obligations, or marketing position.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        status: { type: "string", description: "Filter: open, delivered, cancelled (optional)" },
        crop: { type: "string", description: "Filter by crop (optional)" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_pnl_summary",
    description: "Get the farm's Profit & Loss summary. Returns total revenue, total expenses, net income, margin, and breakdown by category. Use when farmer asks about profitability, costs, margins, or financial performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        view: { type: "string", description: "View: 'farm' (whole operation), 'crop' (by crop), 'field' (by field). Default: farm" },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_fields",
    description: "Get the farm's field registry. Returns field names, acres, soil zone, current crop, legal land description. Use when farmer asks about their fields, acreage, or land base.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_equipment",
    description: "Get the farm's equipment fleet. Returns name, make, model, year, type. Use when farmer asks about their machinery or equipment.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_market_prices",
    description: "Get current commodity futures prices and Saskatchewan cash bids. Returns futures contracts and elevator cash prices with basis. Use when farmer asks about current prices, basis, or market conditions. ALWAYS call this before giving any marketing advice.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_weather",
    description: "Get current weather and forecast for the farm location. Use when farmer asks about weather, spray conditions, or field conditions.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_journal_entries",
    description: "Get recent journal/ledger entries from the accounting system. Returns transactions with accounts, debits, credits. Use when farmer asks about recent transactions, bookkeeping, or specific financial entries.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        limit: { type: "number", description: "Number of entries to return (default 20)" },
      },
      required: ["crop_year"],
    },
  },
];

// ============================================================
// TOOL EXECUTION — runs the actual DB queries
// ============================================================
export async function executeTool(
  toolName: string,
  input: Record<string, any>,
  userId: string,
  baseUrl: string
): Promise<string> {
  try {
    switch (toolName) {
      case "get_harvest_data": {
        let query = sql`
          SELECT crop, variety, external_field_name as field_name,
                 area_harvested_ac, dry_yield_bu_per_ac, total_dry_yield_bu,
                 moisture_pct, protein_pct, test_weight_lbs_per_bu
          FROM harvest_records
          WHERE user_id = ${userId} AND crop_year = ${input.crop_year}
          ORDER BY dry_yield_bu_per_ac DESC
        `;
        const records = await query;

        let filtered = records;
        if (input.crop) filtered = filtered.filter((r: any) => r.crop?.toLowerCase().includes(input.crop.toLowerCase()));
        if (input.field_name) filtered = filtered.filter((r: any) => r.field_name?.toLowerCase().includes(input.field_name.toLowerCase()));

        if (filtered.length === 0) return `No harvest records found for crop year ${input.crop_year}${input.crop ? ` and crop "${input.crop}"` : ""}.`;

        const totalAcres = filtered.reduce((s: number, r: any) => s + (parseFloat(r.area_harvested_ac) || 0), 0);
        const totalBu = filtered.reduce((s: number, r: any) => s + (parseFloat(r.total_dry_yield_bu) || 0), 0);
        const avgYield = totalAcres > 0 ? (totalBu / totalAcres).toFixed(1) : "N/A";

        const lines = filtered.map((r: any) =>
          `${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.dry_yield_bu_per_ac} bu/ac, ${r.area_harvested_ac} ac, ${r.total_dry_yield_bu} total bu, ${r.moisture_pct}% moisture${r.protein_pct ? `, ${r.protein_pct}% protein` : ""}`
        ).join("\n");

        return `Harvest Data — ${input.crop_year}${input.crop ? ` (${input.crop})` : ""}:\nTotal: ${Math.round(totalAcres)} acres, ${Math.round(totalBu).toLocaleString()} bushels, ${avgYield} bu/ac average\n\n${lines}`;
      }

      case "get_seeding_data": {
        const records = await sql`
          SELECT crop, variety, external_field_name as field_name,
                 area_seeded_ac, seeding_date, seed_rate, seed_rate_unit
          FROM seeding_records
          WHERE user_id = ${userId} AND crop_year = ${input.crop_year}
          ORDER BY seeding_date ASC
        `;

        let filtered = records;
        if (input.crop) filtered = filtered.filter((r: any) => r.crop?.toLowerCase().includes(input.crop.toLowerCase()));

        if (filtered.length === 0) return `No seeding records for ${input.crop_year}.`;

        const lines = filtered.map((r: any) =>
          `${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.area_seeded_ac} ac, seeded ${r.seeding_date || "N/A"}${r.seed_rate ? `, rate: ${r.seed_rate} ${r.seed_rate_unit || ""}` : ""}`
        ).join("\n");

        return `Seeding Data — ${input.crop_year}:\n${lines}`;
      }

      case "get_application_data": {
        const records = await sql`
          SELECT product_name, product_type, external_field_name as field_name,
                 area_applied_ac, application_date, rate, rate_unit, total_applied
          FROM application_records
          WHERE user_id = ${userId} AND crop_year = ${input.crop_year}
          ORDER BY application_date ASC
        `;

        let filtered = records;
        if (input.product_type) filtered = filtered.filter((r: any) => r.product_type?.toLowerCase() === input.product_type.toLowerCase());
        if (input.field_name) filtered = filtered.filter((r: any) => r.field_name?.toLowerCase().includes(input.field_name.toLowerCase()));

        if (filtered.length === 0) return `No application records for ${input.crop_year}.`;

        const lines = filtered.map((r: any) =>
          `${r.field_name}: ${r.product_name} (${r.product_type}) — ${r.area_applied_ac} ac, ${r.application_date || "N/A"}${r.rate ? `, rate: ${r.rate} ${r.rate_unit || ""}` : ""}`
        ).join("\n");

        return `Application Records — ${input.crop_year}:\n${lines}`;
      }

      case "get_grain_inventory": {
        const records = await sql`
          SELECT crop_type, quantity, unit, bin_location, grade, notes
          FROM grain_inventory
          WHERE user_id = ${userId} AND quantity > 0
          ORDER BY crop_type ASC
        `;

        let filtered = records;
        if (input.crop) filtered = filtered.filter((r: any) => r.crop_type?.toLowerCase().includes(input.crop.toLowerCase()));

        if (filtered.length === 0) return "No grain inventory on hand.";

        const lines = filtered.map((r: any) =>
          `${r.crop_type}: ${parseFloat(r.quantity).toLocaleString()} ${r.unit || "bu"}${r.bin_location ? ` in ${r.bin_location}` : ""}${r.grade ? ` (${r.grade})` : ""}`
        ).join("\n");

        return `Grain Inventory — On Hand:\n${lines}`;
      }

      case "get_grain_loads": {
        const records = await sql`
          SELECT crop, bushels, grade, buyer, price_per_bushel, delivery_date, ticket_number
          FROM grain_loads
          WHERE user_id = ${userId} AND crop_year = ${input.crop_year}
          ORDER BY delivery_date DESC
        `;

        let filtered = records;
        if (input.crop) filtered = filtered.filter((r: any) => r.crop?.toLowerCase().includes(input.crop.toLowerCase()));

        if (filtered.length === 0) return `No grain deliveries for ${input.crop_year}.`;

        const totalBu = filtered.reduce((s: number, r: any) => s + (parseFloat(r.bushels) || 0), 0);
        const lines = filtered.slice(0, 20).map((r: any) =>
          `${r.delivery_date || "?"}: ${r.crop} — ${parseFloat(r.bushels).toLocaleString()} bu to ${r.buyer || "?"}${r.price_per_bushel ? ` @ $${r.price_per_bushel}/bu` : ""}${r.grade ? ` (${r.grade})` : ""}`
        ).join("\n");

        return `Grain Deliveries — ${input.crop_year} (${Math.round(totalBu).toLocaleString()} bu total):\n${lines}`;
      }

      case "get_contracts": {
        const records = await sql`
          SELECT crop, contract_type, bushels, price_per_bushel, buyer,
                 delivery_start, delivery_end, status
          FROM contracts
          WHERE user_id = ${userId} AND crop_year = ${input.crop_year}
          ORDER BY delivery_start ASC
        `;

        let filtered = records;
        if (input.status) filtered = filtered.filter((r: any) => r.status?.toLowerCase() === input.status.toLowerCase());
        if (input.crop) filtered = filtered.filter((r: any) => r.crop?.toLowerCase().includes(input.crop.toLowerCase()));

        if (filtered.length === 0) return `No contracts for ${input.crop_year}${input.status ? ` with status "${input.status}"` : ""}.`;

        const totalBu = filtered.reduce((s: number, r: any) => s + (parseFloat(r.bushels) || 0), 0);
        const lines = filtered.map((r: any) =>
          `${r.crop} ${r.contract_type || "cash"}: ${parseFloat(r.bushels).toLocaleString()} bu @ $${r.price_per_bushel}/bu to ${r.buyer || "?"} | ${r.delivery_start || "?"} to ${r.delivery_end || "?"} | ${r.status || "open"}`
        ).join("\n");

        return `Contracts — ${input.crop_year} (${Math.round(totalBu).toLocaleString()} bu committed):\n${lines}`;
      }

      case "get_pnl_summary": {
        try {
          const res = await fetch(`${baseUrl}/api/finance/pnl?cropYear=${input.crop_year}&view=${input.view || "farm"}`);
          const data = await res.json();

          if (!data.totalRevenue && !data.totalExpenses) return `No P&L data for ${input.crop_year}.`;

          let result = `P&L Summary — ${input.crop_year} (${input.view || "farm"} view):\nRevenue: $${data.totalRevenue.toLocaleString()}\nExpenses: $${data.totalExpenses.toLocaleString()}\nNet Income: $${data.netIncome.toLocaleString()}\nMargin: ${data.margin}%`;

          if (data.revenueLines?.length > 0) {
            result += "\n\nRevenue Breakdown:";
            for (const l of data.revenueLines) {
              result += `\n  ${l.code} ${l.name}: $${l.balance.toLocaleString()}`;
            }
          }

          if (data.expensesByCategory) {
            result += "\n\nExpense Breakdown:";
            for (const [, cat] of Object.entries(data.expensesByCategory) as any) {
              result += `\n  ${cat.label}: $${cat.total.toLocaleString()}`;
            }
          }

          return result;
        } catch {
          return "Could not fetch P&L data.";
        }
      }

      case "get_fields": {
        const records = await sql`
          SELECT name, total_acres, legal_land_description, soil_zone, crop_type
          FROM fields WHERE user_id = ${userId} ORDER BY name ASC
        `;
        if (records.length === 0) return "No fields registered in AG360.";

        const totalAcres = records.reduce((s: number, r: any) => s + (parseFloat(r.total_acres) || 0), 0);
        const lines = records.map((r: any) =>
          `${r.name}: ${r.total_acres || "?"} ac${r.soil_zone ? ` (${r.soil_zone})` : ""}${r.crop_type ? ` — ${r.crop_type}` : ""}${r.legal_land_description ? ` [${r.legal_land_description}]` : ""}`
        ).join("\n");

        return `Field Registry (${records.length} fields, ${Math.round(totalAcres).toLocaleString()} total acres):\n${lines}`;
      }

      case "get_equipment": {
        const records = await sql`
          SELECT name, make, model, year, equipment_type
          FROM equipment WHERE user_id = ${userId} AND is_active = true ORDER BY equipment_type ASC
        `;
        if (records.length === 0) return "No equipment registered.";

        const lines = records.map((r: any) =>
          `${r.name || `${r.make} ${r.model}`}${r.year ? ` (${r.year})` : ""} — ${r.equipment_type}`
        ).join("\n");

        return `Equipment Fleet (${records.length} units):\n${lines}`;
      }

      case "get_market_prices": {
        try {
          const res = await fetch(`${baseUrl}/api/grain360/prices`);
          const data = await res.json();

          if (!data.success) return "Could not fetch market prices.";

          const futuresLines = data.futures?.map((f: any) =>
            `${f.name} (${f.symbol}): ${f.lastPrice} ${f.unitCode} | Change: ${f.priceChange > 0 ? "+" : ""}${f.priceChange} (${f.percentChange}%)`
          ).join("\n") || "No futures data";

          const cashLines = data.cashBids?.map((b: any) =>
            `${b.location} | ${b.commodity}: $${b.cashPrice.toFixed(2)}/bu | Basis: ${b.basis.toFixed(2)} | Delivery: ${b.deliveryStart} to ${b.deliveryEnd}`
          ).join("\n") || "No cash bids";

          return `Market Prices (${data.source === "mock" ? "DEMO DATA" : "LIVE"} — ${new Date(data.lastUpdated).toLocaleString("en-CA")}):\n\nFutures:\n${futuresLines}\n\nSaskatchewan Cash Bids:\n${cashLines}`;
        } catch {
          return "Could not fetch market prices.";
        }
      }

      case "get_weather": {
        try {
          const res = await fetch(`${baseUrl}/api/weather`);
          const data = await res.json();
          return `Current Weather:\n${JSON.stringify(data, null, 2)}`;
        } catch {
          return "Could not fetch weather data.";
        }
      }

      case "get_journal_entries": {
        const limit = input.limit || 20;
        const records = await sql`
          SELECT je.entry_date, je.description, je.source, je.field_name, je.crop,
                 jl.debit, jl.credit, a.code, a.name as account_name
          FROM journal_entries je
          JOIN journal_lines jl ON jl.journal_entry_id = je.id
          JOIN accounts a ON jl.account_id = a.id
          WHERE je.user_id = ${userId} AND je.crop_year = ${input.crop_year} AND je.is_void = false
          ORDER BY je.entry_date DESC, je.entry_number DESC
          LIMIT ${limit * 4}
        `;
        if (records.length === 0) return `No journal entries for ${input.crop_year}.`;

        const lines = records.map((r: any) =>
          `${r.entry_date} | ${r.description} | ${r.code} ${r.account_name} | Dr: $${parseFloat(r.debit).toFixed(2)} | Cr: $${parseFloat(r.credit).toFixed(2)}${r.field_name ? ` | Field: ${r.field_name}` : ""}`
        ).join("\n");

        return `Recent Journal Entries — ${input.crop_year}:\n${lines}`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error: any) {
    console.error(`Tool execution error (${toolName}):`, error);
    return `Error executing ${toolName}: ${error.message || "Unknown error"}. The data table may not exist yet.`;
  }
}