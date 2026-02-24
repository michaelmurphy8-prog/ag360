// lib/lily-context.ts
// Builds a comprehensive farm context block for Lily from ALL AG360 data
// Called server-side on every Lily session

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function buildFullFarmContext(userId: string, cropYear: number = 2025): Promise<string> {
  const blocks: string[] = [];

  // ── 1. HARVEST RECORDS — Yield performance by field and variety
  try {
    const harvest = await sql`
      SELECT crop, variety, external_field_name as field_name,
             area_harvested_ac, dry_yield_bu_per_ac, total_dry_yield_bu,
             moisture_pct, protein_pct, test_weight_lbs_per_bu
      FROM harvest_records
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY dry_yield_bu_per_ac DESC
    `;

    if (harvest.length > 0) {
      const totalAcres = harvest.reduce((s: number, r: any) => s + (parseFloat(r.area_harvested_ac) || 0), 0);
      const totalBu = harvest.reduce((s: number, r: any) => s + (parseFloat(r.total_dry_yield_bu) || 0), 0);
      const avgYield = totalAcres > 0 ? (totalBu / totalAcres).toFixed(1) : "N/A";

      // Variety performance summary
      const byVariety: Record<string, { acres: number; bu: number; count: number; crop: string }> = {};
      for (const r of harvest) {
        const v = r.variety || "Unknown";
        if (!byVariety[v]) byVariety[v] = { acres: 0, bu: 0, count: 0, crop: r.crop };
        byVariety[v].acres += parseFloat(r.area_harvested_ac) || 0;
        byVariety[v].bu += parseFloat(r.total_dry_yield_bu) || 0;
        byVariety[v].count += 1;
      }

      const varietyLines = Object.entries(byVariety)
        .sort(([, a], [, b]) => (b.acres > 0 ? b.bu / b.acres : 0) - (a.acres > 0 ? a.bu / a.acres : 0))
        .map(([v, d]) => `  - ${v} (${d.crop}): ${d.acres > 0 ? (d.bu / d.acres).toFixed(1) : "?"} bu/ac avg across ${d.count} field(s), ${Math.round(d.acres)} ac total`)
        .join("\n");

      const fieldLines = harvest
        .map((r: any) => `  - ${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.dry_yield_bu_per_ac} bu/ac, ${r.moisture_pct}% moisture${r.protein_pct ? `, ${r.protein_pct}% protein` : ""}`)
        .join("\n");

      blocks.push(`HARVEST RESULTS — ${cropYear} CROP YEAR:
Total: ${Math.round(totalAcres)} acres harvested, ${Math.round(totalBu).toLocaleString()} total bushels, ${avgYield} bu/ac farm average

Variety Performance (ranked by yield):
${varietyLines}

Field-by-Field (sorted by yield, high to low):
${fieldLines}

Use these numbers when advising on variety selection, marketing targets, and break-even analysis. Flag underperforming varieties and fields.`);
    }
  } catch (e) {
    // Table may not exist yet — skip silently
  }

  // ── 2. SEEDING RECORDS (from imports)
  try {
    const seeding = await sql`
      SELECT crop, variety, external_field_name as field_name,
             area_seeded_ac, seeding_date, seed_rate, seed_rate_unit,
             productivity_ac_per_hr
      FROM seeding_records
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY seeding_date ASC
    `;

    if (seeding.length > 0) {
      const lines = seeding.map((r: any) =>
        `  - ${r.field_name}: ${r.crop} ${r.variety || ""} — ${r.area_seeded_ac} ac${r.seeding_date ? `, seeded ${r.seeding_date}` : ""}${r.seed_rate ? `, rate: ${r.seed_rate} ${r.seed_rate_unit || ""}` : ""}${r.productivity_ac_per_hr ? `, ${r.productivity_ac_per_hr} ac/hr` : ""}`
      ).join("\n");

      blocks.push(`SEEDING LOG — ${cropYear}:
${lines}`);
    }
  } catch (e) {}

  // ── 3. APPLICATION RECORDS (spray, fertilizer)
  try {
    const apps = await sql`
      SELECT product_name, product_type, external_field_name as field_name,
             area_applied_ac, application_date, rate, rate_unit, total_applied
      FROM application_records
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY application_date ASC
    `;

    if (apps.length > 0) {
      const lines = apps.map((r: any) =>
        `  - ${r.field_name}: ${r.product_name} (${r.product_type}) — ${r.area_applied_ac} ac${r.application_date ? `, applied ${r.application_date}` : ""}${r.rate ? `, rate: ${r.rate} ${r.rate_unit || ""}` : ""}`
      ).join("\n");

      blocks.push(`APPLICATION RECORDS — ${cropYear}:
${lines}

Reference these when advising on input costs, spray timing decisions, and product efficacy.`);
    }
  } catch (e) {}

  // ── 4. AGRONOMY SEEDING LOG (live in-season tracking)
  try {
    const seedLog = await sql`
      SELECT crop, seeding_date, acres, field_name
      FROM agronomy_seeding_log
      WHERE clerk_user_id = ${userId}
      ORDER BY seeding_date DESC
    `;

    if (seedLog.length > 0) {
      const today = new Date();
      const lines = seedLog.map((r: any) => {
        const seeded = new Date(r.seeding_date);
        const daysIn = Math.floor((today.getTime() - seeded.getTime()) / (1000 * 60 * 60 * 24));
        let window = "Planning stage";
        if (daysIn >= 0 && daysIn <= 7) window = "Pre-seed / just seeded";
        else if (daysIn <= 21) window = "Early scout — check emergence, cutworms, flea beetles";
        else if (daysIn <= 42) window = "In-crop herbicide window open";
        else if (daysIn <= 70) window = "Fungicide timing window — critical";
        else if (daysIn <= 100) window = "Pre-harvest — check maturity";
        else if (daysIn <= 120) window = "Harvest approaching";
        else window = "Post-harvest";
        return `  - ${r.crop}${r.field_name ? ` (${r.field_name})` : ""}${r.acres ? ` · ${r.acres} ac` : ""} · Seeded ${seeded.toLocaleDateString("en-CA", { month: "short", day: "numeric" })} · Day ${daysIn} · ${window}`;
      }).join("\n");

      blocks.push(`ACTIVE CROPS IN GROUND RIGHT NOW:
${lines}

Be proactive — if a spray/scout window is open, tell the farmer what to do NOW.`);
    }
  } catch (e) {}

  // ── 5. INVENTORY (grain on hand)
  try {
    const inventory = await sql`
      SELECT crop_type, quantity, unit, bin_location, grade, notes
      FROM grain_inventory
      WHERE user_id = ${userId} AND quantity > 0
      ORDER BY crop_type ASC
    `;

    if (inventory.length > 0) {
      const lines = inventory.map((r: any) =>
        `  - ${r.crop_type}: ${parseFloat(r.quantity).toLocaleString()} ${r.unit || "bu"}${r.bin_location ? ` in ${r.bin_location}` : ""}${r.grade ? ` (${r.grade})` : ""}`
      ).join("\n");

      blocks.push(`GRAIN INVENTORY — ON HAND:
${lines}

Use this when advising on marketing decisions — the farmer needs to know what they have left to sell.`);
    }
  } catch (e) {}

  // ── 6. GRAIN LOADS / DELIVERIES
  try {
    const loads = await sql`
      SELECT crop, bushels, grade, buyer, price_per_bushel, delivery_date, ticket_number
      FROM grain_loads
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY delivery_date DESC
      LIMIT 20
    `;

    if (loads.length > 0) {
      const totalDelivered = loads.reduce((s: number, r: any) => s + (parseFloat(r.bushels) || 0), 0);
      const lines = loads.slice(0, 10).map((r: any) =>
        `  - ${r.delivery_date || "?"}: ${r.crop} — ${parseFloat(r.bushels).toLocaleString()} bu to ${r.buyer || "?"}${r.price_per_bushel ? ` @ $${r.price_per_bushel}/bu` : ""}${r.grade ? ` (${r.grade})` : ""}`
      ).join("\n");

      blocks.push(`GRAIN DELIVERIES — ${cropYear} (${Math.round(totalDelivered).toLocaleString()} bu total delivered):
${lines}${loads.length > 10 ? `\n  ... and ${loads.length - 10} more deliveries` : ""}

Use this to calculate % sold, remaining bushels vs inventory, and delivery pace.`);
    }
  } catch (e) {}

  // ── 7. CONTRACTS
  try {
    const contracts = await sql`
      SELECT crop, contract_type, bushels, price_per_bushel, buyer,
             delivery_start, delivery_end, status
      FROM contracts
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY delivery_start ASC
    `;

    if (contracts.length > 0) {
      const totalContracted = contracts.reduce((s: number, r: any) => s + (parseFloat(r.bushels) || 0), 0);
      const lines = contracts.map((r: any) =>
        `  - ${r.crop} ${r.contract_type || "flat price"}: ${parseFloat(r.bushels).toLocaleString()} bu @ $${r.price_per_bushel}/bu to ${r.buyer || "?"} | Delivery: ${r.delivery_start || "?"} to ${r.delivery_end || "?"} | Status: ${r.status || "open"}`
      ).join("\n");

      blocks.push(`ACTIVE CONTRACTS — ${cropYear} (${Math.round(totalContracted).toLocaleString()} bu committed):
${lines}

Reference these when building sell plans — these are commitments the farmer must fill.`);
    }
  } catch (e) {}

  // ── 8. FIELDS
  try {
    const fields = await sql`
      SELECT name, total_acres, legal_land_description, soil_zone, crop_type
      FROM fields
      WHERE user_id = ${userId}
      ORDER BY name ASC
    `;

    if (fields.length > 0) {
      const totalAcres = fields.reduce((s: number, r: any) => s + (parseFloat(r.total_acres) || 0), 0);
      const lines = fields.map((r: any) =>
        `  - ${r.name}: ${r.total_acres || "?"} ac${r.soil_zone ? ` (${r.soil_zone})` : ""}${r.crop_type ? ` — ${r.crop_type}` : ""}${r.legal_land_description ? ` [${r.legal_land_description}]` : ""}`
      ).join("\n");

      blocks.push(`FIELD REGISTRY — ${fields.length} fields, ${Math.round(totalAcres).toLocaleString()} total acres:
${lines}`);
    }
  } catch (e) {}

  // ── 9. EQUIPMENT
  try {
    const equipment = await sql`
      SELECT name, make, model, year, equipment_type
      FROM equipment
      WHERE user_id = ${userId} AND is_active = true
      ORDER BY equipment_type ASC
    `;

    if (equipment.length > 0) {
      const lines = equipment.map((r: any) =>
        `  - ${r.name || `${r.make} ${r.model}`}${r.year ? ` (${r.year})` : ""} — ${r.equipment_type}`
      ).join("\n");

      blocks.push(`EQUIPMENT FLEET:
${lines}`);
    }
  } catch (e) {}

  // ── 10. FIELD-LEVEL P&L (if exists)
  try {
    const pnl = await sql`
      SELECT field_name, crop, revenue_per_acre, cost_per_acre, margin_per_acre, total_acres
      FROM field_pnl
      WHERE user_id = ${userId} AND crop_year = ${cropYear}
      ORDER BY margin_per_acre DESC
    `;

    if (pnl.length > 0) {
      const lines = pnl.map((r: any) =>
        `  - ${r.field_name} (${r.crop}): Revenue $${r.revenue_per_acre}/ac, Cost $${r.cost_per_acre}/ac, Margin $${r.margin_per_acre}/ac on ${r.total_acres} ac`
      ).join("\n");

      blocks.push(`FIELD-LEVEL PROFITABILITY — ${cropYear}:
${lines}

Flag low-margin fields and suggest improvements. Compare against farm average.`);
    }
  } catch (e) {}

  // ── Combine all blocks
  if (blocks.length === 0) {
    return "";
  }

  return `---
LIVE FARM DATA — PULLED FROM AG360 DATABASE (${new Date().toLocaleDateString("en-CA")}):

${blocks.join("\n\n")}

IMPORTANT: This is real farm data. Use specific numbers from above in every response. Reference fields by name, varieties by name, and actual yields/bushels. Generic advice when you have specific data is a failure state.
---`;
}