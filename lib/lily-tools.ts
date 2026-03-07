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
    name: "get_marketing_positions",
    description:
      "Get the farmer's full marketing position — production estimates (forecast and actual), contracted bushels, deliveries, unpriced exposure, and percent contracted by crop. This is the PRIMARY tool for any marketing, selling, contracting, or risk management question. ALWAYS call this before giving marketing advice.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: {
          type: "number",
          description: "Crop year (e.g. 2025)",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_harvest_data",
    description:
      "Get harvest records for a specific crop year. Returns yield, variety, area, moisture by field. Use this when the farmer asks about yields, variety performance, harvest results, or anything related to what was harvested.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: {
          type: "number",
          description: "Crop year (e.g. 2025)",
        },
        crop: {
          type: "string",
          description:
            "Filter by crop name (optional, e.g. 'Canola', 'HRW Wheat')",
        },
        field_name: {
          type: "string",
          description: "Filter by specific field name (optional)",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_seeding_data",
    description:
      "Get seeding/planting records for a crop year. Returns crop, variety, area, seeding date, seed rate by field. Use when farmer asks about what was planted, seeding rates, or planting dates.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        crop: {
          type: "string",
          description: "Filter by crop (optional)",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_application_data",
    description:
      "Get spray/fertilizer/chemical application records. Returns product, type, rate, area, date by field. Use when farmer asks about spray history, input usage, or chemical applications.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        product_type: {
          type: "string",
          description:
            "Filter by type: herbicide, fungicide, insecticide, fertilizer, etc. (optional)",
        },
        field_name: {
          type: "string",
          description: "Filter by field (optional)",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_grain_inventory",
    description:
      "Get current grain inventory — what's in the bins right now. Returns crop, quantity, bin location, grade. Use when farmer asks about grain on hand, storage, or what they have left to sell.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop: {
          type: "string",
          description: "Filter by crop type (optional)",
        },
      },
    },
  },
  {
    name: "get_grain_loads",
    description:
      "Get grain delivery/load records. Returns crop, weight, buyer, date. Use when farmer asks about deliveries, sales history, or what they've sold.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        crop: {
          type: "string",
          description: "Filter by crop (optional)",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_contracts",
    description:
      "Get active grain contracts from inventory_contracts. Returns crop, type, bushels, price, buyer, delivery date. Use when farmer asks about contracts, commitments, delivery obligations.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop: {
          type: "string",
          description: "Filter by crop (optional)",
        },
      },
    },
  },
  {
    name: "get_pnl_summary",
    description:
      "Get the farm's Profit & Loss summary. Returns total revenue, total expenses, net income, margin, and breakdown by category. Use when farmer asks about profitability, costs, margins, or financial performance.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        view: {
          type: "string",
          description:
            "View: 'farm' (whole operation), 'crop' (by crop), 'field' (by field). Default: farm",
        },
      },
      required: ["crop_year"],
    },
  },
  {
    name: "get_fields",
    description:
      "Get the farm's field registry. Returns field names, acres, soil zone, current crop, legal land description. Use when farmer asks about their fields, acreage, or land base.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_equipment",
    description:
      "Get the farm's full equipment fleet with service status. Returns name, make, model, year, class, hours, km, status, warranty info, and last service. ALWAYS call this before giving any maintenance, repair, parts, or machinery advice.",
    input_schema: {
      type: "object" as const,
      properties: {
        asset_name: { type: "string", description: "Filter by asset name or model (optional)" },
      },
    },
  },
  {
    name: "get_service_history",
    description:
      "Get detailed service and maintenance history for farm equipment. Returns service logs with dates, types, costs, parts used, hours/km at service. Use when farmer asks about service history, maintenance records, or repair costs.",
    input_schema: {
      type: "object" as const,
      properties: {
        asset_name: { type: "string", description: "Filter by asset name (optional)" },
      },
    },
  },
  {
    name: "get_service_schedules",
    description:
      "Get upcoming and overdue service schedules. Returns scheduled maintenance with due dates, hours, status (OK/DUE_SOON/OVERDUE), and priority. Use when farmer asks about upcoming maintenance or what's overdue.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_market_prices",
    description:
      "Get current commodity futures prices and Saskatchewan cash bids. Returns futures contracts and elevator cash prices with basis. Use when farmer asks about current prices, basis, or market conditions.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_weather",
    description:
      "Get current weather and forecast for the farm location. Use when farmer asks about weather, spray conditions, or field conditions.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_journal_entries",
    description:
      "Get recent journal/ledger entries from the accounting system. Returns transactions with accounts, debits, credits. Use when farmer asks about recent transactions, bookkeeping, or specific financial entries.",
    input_schema: {
      type: "object" as const,
      properties: {
        crop_year: { type: "number", description: "Crop year" },
        limit: {
          type: "number",
          description: "Number of entries to return (default 20)",
        },
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
  tenantId: string,
  baseUrl: string
): Promise<string> {
  try {
    switch (toolName) {
      // ─── NEW: Marketing Positions ───────────────────────
      case "get_marketing_positions": {
        const cropYear = input.crop_year || new Date().getFullYear();

        // 1. Crop plans (production estimates)
        const plans = await sql`
          SELECT crop, acres, target_yield_bu, actual_yield_bu,
                 (acres * target_yield_bu) AS forecast_bu,
                 CASE WHEN actual_yield_bu IS NOT NULL
                      THEN (acres * actual_yield_bu)
                      ELSE NULL
                 END AS actual_bu
          FROM crop_plans
          WHERE tenant_id = ${tenantId} AND crop_year = ${cropYear}
          ORDER BY (acres * target_yield_bu) DESC
        `;

        if (plans.length === 0) {
          return `No crop plan found for ${cropYear}. The farmer needs to enter their crop plan in Farm Profile (crops, acres, target yields) so I can calculate their marketing position.`;
        }

        // 2. Contracts
        const contracts = await sql`
          SELECT crop, quantity_bu, price_per_bu, basis, contract_type, elevator, delivery_date
          FROM inventory_contracts
          WHERE tenant_id = ${tenantId}
        `;

        // 3. Deliveries
        const deliveries = await sql`
          SELECT crop, COALESCE(SUM(net_weight_kg), 0) as total_kg
          FROM grain_loads
          WHERE tenant_id = ${tenantId} AND crop_year = ${cropYear} AND crop IS NOT NULL
          GROUP BY crop
        `;

        // Build per-crop summary
        const KG_PER_BU: Record<string, number> = {
          "hrs wheat": 27.22, durum: 27.22, canola: 22.68, barley: 21.77,
          oats: 15.42, flax: 25.4, "large green lentils": 27.22,
          "small green lentils": 27.22, "small red lentils": 27.22,
          peas: 27.22, chickpeas: 27.22, mustard: 22.68, lentils: 27.22,
        };

        const cropData: Record<string, any> = {};

        for (const p of plans) {
          const forecastBu = Math.round(parseFloat(p.forecast_bu));
          const actualBu = p.actual_bu != null ? Math.round(parseFloat(p.actual_bu)) : null;
          cropData[p.crop] = {
            acres: parseFloat(p.acres),
            target_yield: parseFloat(p.target_yield_bu),
            actual_yield: p.actual_yield_bu ? parseFloat(p.actual_yield_bu) : null,
            forecast_production: forecastBu,
            actual_production: actualBu,
            contracted_bu: 0,
            contracted_value: 0,
            delivered_bu: 0,
            contracts: [] as any[],
          };
        }

        for (const c of contracts) {
          if (!c.crop || !cropData[c.crop]) continue;
          const qty = Number(c.quantity_bu || 0);
          const price = Number(c.price_per_bu || 0);
          cropData[c.crop].contracted_bu += qty;
          cropData[c.crop].contracted_value += qty * price;
          cropData[c.crop].contracts.push({
            type: c.contract_type,
            bu: qty,
            price: price,
            basis: Number(c.basis || 0),
            elevator: c.elevator,
            delivery: c.delivery_date,
          });
        }

        for (const d of deliveries) {
          if (!d.crop || !cropData[d.crop]) continue;
          const factor = KG_PER_BU[d.crop.toLowerCase()] || 27.22;
          cropData[d.crop].delivered_bu = Math.round(Number(d.total_kg) / factor);
        }

        // Format response
        let totalForecast = 0;
        let totalContracted = 0;
        let totalValue = 0;
        let totalDelivered = 0;
        const lines: string[] = [];

        for (const [crop, d] of Object.entries(cropData)) {
          const production = d.actual_production || d.forecast_production;
          const unpriced = Math.max(0, production - d.contracted_bu);
          const pctContracted = production > 0 ? Math.round((d.contracted_bu / production) * 100) : 0;
          const pctDelivered = d.contracted_bu > 0 ? Math.round((d.delivered_bu / d.contracted_bu) * 100) : 0;
          const avgPrice = d.contracted_bu > 0 ? (d.contracted_value / d.contracted_bu).toFixed(2) : "N/A";

          totalForecast += production;
          totalContracted += d.contracted_bu;
          totalValue += d.contracted_value;
          totalDelivered += d.delivered_bu;

          let line = `${crop}: ${d.acres} ac × ${d.target_yield} bu/ac = ${d.forecast_production.toLocaleString()} bu forecast`;
          if (d.actual_production) {
            line += ` | ACTUAL: ${d.actual_production.toLocaleString()} bu (${d.actual_yield} bu/ac)`;
          }
          line += ` | Contracted: ${d.contracted_bu.toLocaleString()} bu (${pctContracted}%) @ avg $${avgPrice}/bu`;
          line += ` | Delivered: ${d.delivered_bu.toLocaleString()} bu (${pctDelivered}% of contracted)`;
          line += ` | UNPRICED: ${unpriced.toLocaleString()} bu`;

          if (d.contracts.length > 0) {
            line += "\n    Contracts:";
            for (const c of d.contracts) {
              line += `\n      ${c.type || "Cash"}: ${c.bu.toLocaleString()} bu @ $${c.price.toFixed(2)}/bu${c.basis ? ` (basis: ${c.basis})` : ""} → ${c.elevator || "?"} by ${c.delivery || "?"}`;
            }
          }

          lines.push(line);
        }

        const totalUnpriced = Math.max(0, totalForecast - totalContracted);
        const overallPct = totalForecast > 0 ? Math.round((totalContracted / totalForecast) * 100) : 0;
        const overallAvg = totalContracted > 0 ? (totalValue / totalContracted).toFixed(2) : "N/A";

        return `MARKETING POSITION — ${cropYear}:
TOTALS: ${totalForecast.toLocaleString()} bu production | ${totalContracted.toLocaleString()} bu contracted (${overallPct}%) | ${totalUnpriced.toLocaleString()} bu UNPRICED | ${totalDelivered.toLocaleString()} bu delivered | Avg price: $${overallAvg}/bu | Contracted value: $${Math.round(totalValue).toLocaleString()}

BY CROP:
${lines.join("\n\n")}`;
      }

      case "get_harvest_data": {
        const query = sql`
          SELECT crop, variety, external_field_name as field_name,
                 area_harvested_ac, dry_yield_bu_per_ac, total_dry_yield_bu,
                 moisture_pct, protein_pct, test_weight_lbs_per_bu
          FROM harvest_records
          WHERE tenant_id = ${tenantId} AND crop_year = ${input.crop_year}
          ORDER BY dry_yield_bu_per_ac DESC
        `;
        const records = await query;

        let filtered = records;
        if (input.crop)
          filtered = filtered.filter((r: any) =>
            r.crop?.toLowerCase().includes(input.crop.toLowerCase())
          );
        if (input.field_name)
          filtered = filtered.filter((r: any) =>
            r.field_name
              ?.toLowerCase()
              .includes(input.field_name.toLowerCase())
          );

        if (filtered.length === 0)
          return `No harvest records found for crop year ${input.crop_year}${input.crop ? ` and crop "${input.crop}"` : ""}.`;

        const totalAcres = filtered.reduce(
          (s: number, r: any) => s + (parseFloat(r.area_harvested_ac) || 0),
          0
        );
        const totalBu = filtered.reduce(
          (s: number, r: any) => s + (parseFloat(r.total_dry_yield_bu) || 0),
          0
        );
        const avgYield =
          totalAcres > 0 ? (totalBu / totalAcres).toFixed(1) : "N/A";

        const lines = filtered
          .map(
            (r: any) =>
              `${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.dry_yield_bu_per_ac} bu/ac, ${r.area_harvested_ac} ac, ${r.total_dry_yield_bu} total bu, ${r.moisture_pct}% moisture${r.protein_pct ? `, ${r.protein_pct}% protein` : ""}`
          )
          .join("\n");

        return `Harvest Data — ${input.crop_year}${input.crop ? ` (${input.crop})` : ""}:\nTotal: ${Math.round(totalAcres)} acres, ${Math.round(totalBu).toLocaleString()} bushels, ${avgYield} bu/ac average\n\n${lines}`;
      }

      case "get_seeding_data": {
        const records = await sql`
          SELECT crop, variety, external_field_name as field_name,
                 area_seeded_ac, seeding_date, seed_rate, seed_rate_unit
          FROM seeding_records
          WHERE tenant_id = ${tenantId} AND crop_year = ${input.crop_year}
          ORDER BY seeding_date ASC
        `;

        let filtered = records;
        if (input.crop)
          filtered = filtered.filter((r: any) =>
            r.crop?.toLowerCase().includes(input.crop.toLowerCase())
          );

        if (filtered.length === 0)
          return `No seeding records for ${input.crop_year}.`;

        const lines = filtered
          .map(
            (r: any) =>
              `${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.area_seeded_ac} ac, seeded ${r.seeding_date || "N/A"}${r.seed_rate ? `, rate: ${r.seed_rate} ${r.seed_rate_unit || ""}` : ""}`
          )
          .join("\n");

        return `Seeding Data — ${input.crop_year}:\n${lines}`;
      }

      case "get_application_data": {
        const records = await sql`
          SELECT product_name, product_type, external_field_name as field_name,
                 area_applied_ac, application_date, rate, rate_unit, total_applied
          FROM application_records
          WHERE tenant_id = ${tenantId} AND crop_year = ${input.crop_year}
          ORDER BY application_date ASC
        `;

        let filtered = records;
        if (input.product_type)
          filtered = filtered.filter(
            (r: any) =>
              r.product_type?.toLowerCase() ===
              input.product_type.toLowerCase()
          );
        if (input.field_name)
          filtered = filtered.filter((r: any) =>
            r.field_name
              ?.toLowerCase()
              .includes(input.field_name.toLowerCase())
          );

        if (filtered.length === 0)
          return `No application records for ${input.crop_year}.`;

        const lines = filtered
          .map(
            (r: any) =>
              `${r.field_name}: ${r.product_name} (${r.product_type}) — ${r.area_applied_ac} ac, ${r.application_date || "N/A"}${r.rate ? `, rate: ${r.rate} ${r.rate_unit || ""}` : ""}`
          )
          .join("\n");

        return `Application Records — ${input.crop_year}:\n${lines}`;
      }

      case "get_grain_inventory": {
        const records = await sql`
          SELECT crop_type, quantity, unit, bin_location, grade, notes
          FROM inventory_items
          WHERE tenant_id = ${tenantId} AND quantity > 0
          ORDER BY crop_type ASC
        `;

        let filtered = records;
        if (input.crop)
          filtered = filtered.filter((r: any) =>
            r.crop_type?.toLowerCase().includes(input.crop.toLowerCase())
          );

        if (filtered.length === 0) return "No grain inventory on hand.";

        const lines = filtered
          .map(
            (r: any) =>
              `${r.crop_type}: ${parseFloat(r.quantity).toLocaleString()} ${r.unit || "bu"}${r.bin_location ? ` in ${r.bin_location}` : ""}${r.grade ? ` (${r.grade})` : ""}`
          )
          .join("\n");

        return `Grain Inventory — On Hand:\n${lines}`;
      }

      case "get_grain_loads": {
        const records = await sql`
          SELECT crop, net_weight_kg, gross_weight_kg, grade, destination, delivery_date, ticket_number
          FROM grain_loads
          WHERE tenant_id = ${tenantId} AND crop_year = ${input.crop_year}
          ORDER BY delivery_date DESC
        `;

        let filtered = records;
        if (input.crop)
          filtered = filtered.filter((r: any) =>
            r.crop?.toLowerCase().includes(input.crop.toLowerCase())
          );

        if (filtered.length === 0)
          return `No grain deliveries for ${input.crop_year}.`;

        const totalKg = filtered.reduce(
          (s: number, r: any) => s + (parseFloat(r.net_weight_kg) || 0),
          0
        );
        const lines = filtered
          .slice(0, 20)
          .map(
            (r: any) =>
              `${r.delivery_date || "?"}: ${r.crop} — ${parseFloat(r.net_weight_kg).toLocaleString()} kg to ${r.destination || "?"}${r.grade ? ` (${r.grade})` : ""}${r.ticket_number ? ` #${r.ticket_number}` : ""}`
          )
          .join("\n");

        return `Grain Deliveries — ${input.crop_year} (${Math.round(totalKg).toLocaleString()} kg total):\n${lines}`;
      }

      case "get_contracts": {
        const records = await sql`
          SELECT crop, contract_type, quantity_bu, price_per_bu, basis,
                 elevator, delivery_date, notes, created_at
          FROM inventory_contracts
          WHERE tenant_id = ${tenantId}
          ORDER BY created_at DESC
        `;

        let filtered = records;
        if (input.crop)
          filtered = filtered.filter((r: any) =>
            r.crop?.toLowerCase().includes(input.crop.toLowerCase())
          );

        if (filtered.length === 0) return "No contracts found.";

        const totalBu = filtered.reduce(
          (s: number, r: any) => s + (parseFloat(r.quantity_bu) || 0),
          0
        );
        const lines = filtered
          .map(
            (r: any) =>
              `${r.crop} ${r.contract_type || "cash"}: ${parseFloat(r.quantity_bu).toLocaleString()} bu @ $${r.price_per_bu}/bu${r.basis ? ` (basis: ${r.basis})` : ""} → ${r.elevator || "?"} by ${r.delivery_date || "?"}`
          )
          .join("\n");

        return `Contracts (${Math.round(totalBu).toLocaleString()} bu committed):\n${lines}`;
      }

      case "get_pnl_summary": {
        try {
          const res = await fetch(
            `${baseUrl}/api/finance/pnl?cropYear=${input.crop_year}&view=${input.view || "farm"}`
          );
          const data = await res.json();

          if (!data.totalRevenue && !data.totalExpenses)
            return `No P&L data for ${input.crop_year}.`;

          let result = `P&L Summary — ${input.crop_year} (${input.view || "farm"} view):\nRevenue: $${data.totalRevenue.toLocaleString()}\nExpenses: $${data.totalExpenses.toLocaleString()}\nNet Income: $${data.netIncome.toLocaleString()}\nMargin: ${data.margin}%`;

          if (data.revenueLines?.length > 0) {
            result += "\n\nRevenue Breakdown:";
            for (const l of data.revenueLines) {
              result += `\n  ${l.code} ${l.name}: $${l.balance.toLocaleString()}`;
            }
          }

          if (data.expensesByCategory) {
            result += "\n\nExpense Breakdown:";
            for (const [, cat] of Object.entries(
              data.expensesByCategory
            ) as any) {
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
          FROM fields WHERE tenant_id = ${tenantId} ORDER BY name ASC
        `;
        if (records.length === 0) return "No fields registered in AG360.";

        const totalAcres = records.reduce(
          (s: number, r: any) => s + (parseFloat(r.total_acres) || 0),
          0
        );
        const lines = records
          .map(
            (r: any) =>
              `${r.name}: ${r.total_acres || "?"} ac${r.soil_zone ? ` (${r.soil_zone})` : ""}${r.crop_type ? ` — ${r.crop_type}` : ""}${r.legal_land_description ? ` [${r.legal_land_description}]` : ""}`
          )
          .join("\n");

        return `Field Registry (${records.length} fields, ${Math.round(totalAcres).toLocaleString()} total acres):\n${lines}`;
      }

      case "get_equipment": {
        const nameFilter = input.asset_name;
        const records = nameFilter
          ? await sql`
              SELECT id, name, make, model, year, "assetClass", "assetType", status,
                     "hoursTotal", "kmTotal", "currentValue", "serialNumber",
                     "warrantyExpiry", "warrantyNotes", "dealerName", "dealerPhone", "nextService"
              FROM "Asset" WHERE "orgId" = ${tenantId}
                AND (LOWER(name) LIKE ${'%' + nameFilter.toLowerCase() + '%'} OR LOWER(make) LIKE ${'%' + nameFilter.toLowerCase() + '%'} OR LOWER(model) LIKE ${'%' + nameFilter.toLowerCase() + '%'})
              ORDER BY "assetClass" ASC
            `
          : await sql`
              SELECT id, name, make, model, year, "assetClass", "assetType", status,
                     "hoursTotal", "kmTotal", "currentValue", "serialNumber",
                     "warrantyExpiry", "warrantyNotes", "dealerName", "dealerPhone", "nextService"
              FROM "Asset" WHERE "orgId" = ${tenantId} ORDER BY "assetClass" ASC
            `;
        if (records.length === 0) return "No equipment registered in AG360. Add assets in the Machinery module.";

        const lastServices = await sql`
          SELECT DISTINCT ON ("assetId") "assetId", date, type, cost, "hoursAtService", "kmAtService"
          FROM "MaintenanceLog" WHERE "orgId" = ${tenantId}
          ORDER BY "assetId", date DESC
        `;
        const lastServiceMap = new Map(lastServices.map((s: any) => [s.assetId, s]));

        const lines = records.map((r: any) => {
          const ls = lastServiceMap.get(r.id);
          let line = `${r.name} — ${r.make} ${r.model} (${r.year}) | Class: ${r.assetClass} | Status: ${r.status}`;
          if (r.hoursTotal) line += ` | Hours: ${Number(r.hoursTotal).toLocaleString()}`;
          if (r.kmTotal) line += ` | KM: ${Number(r.kmTotal).toLocaleString()}`;
          if (r.currentValue) line += ` | Value: $${Math.round(Number(r.currentValue)).toLocaleString()}`;
          if (r.serialNumber) line += ` | S/N: ${r.serialNumber}`;
          if (r.warrantyExpiry) line += ` | Warranty: expires ${new Date(r.warrantyExpiry).toLocaleDateString('en-CA')}`;
          if (r.dealerName) line += ` | Dealer: ${r.dealerName}${r.dealerPhone ? ' (' + r.dealerPhone + ')' : ''}`;
          if (ls) line += ` | Last service: ${ls.type} on ${new Date(ls.date).toLocaleDateString('en-CA')}${ls.hoursAtService ? ' @ ' + ls.hoursAtService + 'hrs' : ''}${ls.cost ? ' ($' + Number(ls.cost).toLocaleString() + ')' : ''}`;
          return line;
        }).join("\n");

        return `Equipment Fleet (${records.length} units):\n${lines}`;
      }

      case "get_service_history": {
        const nameFilter = input.asset_name;
        const records = nameFilter
          ? await sql`
              SELECT ml.date, ml.type, ml."serviceCategory", ml.cost, ml."hoursAtService", ml."kmAtService",
                     ml."partsUsed", ml."laborHours", ml.vendor, ml."performedBy", ml.notes,
                     a.name as asset_name, a.make, a.model
              FROM "MaintenanceLog" ml JOIN "Asset" a ON a.id = ml."assetId"
              WHERE a."orgId" = ${tenantId} AND (LOWER(a.name) LIKE ${'%' + nameFilter.toLowerCase() + '%'} OR LOWER(a.make) LIKE ${'%' + nameFilter.toLowerCase() + '%'} OR LOWER(a.model) LIKE ${'%' + nameFilter.toLowerCase() + '%'})
              ORDER BY ml.date DESC LIMIT 50
            `
          : await sql`
              SELECT ml.date, ml.type, ml."serviceCategory", ml.cost, ml."hoursAtService", ml."kmAtService",
                     ml."partsUsed", ml."laborHours", ml.vendor, ml."performedBy", ml.notes,
                     a.name as asset_name, a.make, a.model
              FROM "MaintenanceLog" ml JOIN "Asset" a ON a.id = ml."assetId"
              WHERE a."orgId" = ${tenantId}
              ORDER BY ml.date DESC LIMIT 50
            `;
        if (records.length === 0) return "No service history recorded yet. Log services in Machinery > Service & Maintenance.";

        const lines = records.map((r: any) => {
          let line = `${new Date(r.date).toLocaleDateString('en-CA')} | ${r.asset_name} (${r.make} ${r.model}) | ${r.type} [${r.serviceCategory}]`;
          if (r.cost) line += ` | Cost: $${Number(r.cost).toLocaleString()}`;
          if (r.hoursAtService) line += ` | @ ${r.hoursAtService} hrs`;
          if (r.kmAtService) line += ` | @ ${r.kmAtService} km`;
          if (r.partsUsed) line += ` | Parts: ${r.partsUsed}`;
          if (r.vendor) line += ` | Vendor: ${r.vendor}`;
          if (r.performedBy) line += ` | By: ${r.performedBy}`;
          return line;
        }).join("\n");

        return `Service History (${records.length} records):\n${lines}`;
      }

      case "get_service_schedules": {
        const records = await sql`
          SELECT ss.*, a.name as asset_name, a.make, a.model, a."hoursTotal"
          FROM "ServiceSchedule" ss JOIN "Asset" a ON a.id = ss."assetId"
          WHERE ss."orgId" = ${tenantId}
          ORDER BY CASE ss.status WHEN 'OVERDUE' THEN 1 WHEN 'DUE_SOON' THEN 2 ELSE 3 END
        `;
        if (records.length === 0) return "No service schedules set up. Add them in Machinery > Service & Maintenance.";

        const lines = records.map((r: any) => {
          let line = `${r.asset_name} (${r.make} ${r.model}) | ${r.serviceType} | Status: ${r.status} | Priority: ${r.priority}`;
          if (r.dueAtHours && r.hoursTotal) line += ` | Due at ${r.dueAtHours} hrs (current: ${r.hoursTotal}, ${Number(r.dueAtHours) - Number(r.hoursTotal)} hrs remaining)`;
          if (r.dueAtDate) line += ` | Due: ${new Date(r.dueAtDate).toLocaleDateString('en-CA')}`;
          return line;
        }).join("\n");

        return `Service Schedules (${records.length}):\n${lines}`;
      }

      case "get_market_prices": {
        try {
          const res = await fetch(`${baseUrl}/api/grain360/prices`);
          const data = await res.json();

          if (!data.success) return "Could not fetch market prices.";

          const futuresLines =
            data.futures
              ?.map(
                (f: any) =>
                  `${f.name} (${f.symbol}): ${f.lastPrice} ${f.unitCode} | Change: ${f.priceChange > 0 ? "+" : ""}${f.priceChange} (${f.percentChange}%)`
              )
              .join("\n") || "No futures data";

          const cashLines =
            data.cashBids
              ?.map(
                (b: any) =>
                  `${b.location} | ${b.commodity}: $${b.cashPrice.toFixed(2)}/bu | Basis: ${b.basis.toFixed(2)} | Delivery: ${b.deliveryStart} to ${b.deliveryEnd}`
              )
              .join("\n") || "No cash bids";

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
          WHERE je.tenant_id = ${tenantId} AND je.crop_year = ${input.crop_year} AND je.is_void = false
          ORDER BY je.entry_date DESC, je.entry_number DESC
          LIMIT ${limit * 4}
        `;
        if (records.length === 0)
          return `No journal entries for ${input.crop_year}.`;

        const lines = records
          .map(
            (r: any) =>
              `${r.entry_date} | ${r.description} | ${r.code} ${r.account_name} | Dr: $${parseFloat(r.debit).toFixed(2)} | Cr: $${parseFloat(r.credit).toFixed(2)}${r.field_name ? ` | Field: ${r.field_name}` : ""}`
          )
          .join("\n");

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
