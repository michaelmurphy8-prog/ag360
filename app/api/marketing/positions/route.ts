import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const KG_PER_BU: Record<string, number> = {
  canola: 22.68,
  "cwrs wheat": 27.22,
  wheat: 27.22,
  durum: 27.22,
  barley: 21.77,
  oats: 15.42,
  peas: 27.22,
  lentils: 27.22,
  flax: 25.40,
  soybeans: 27.22,
  corn: 25.40,
};

function kgToBu(kg: number, crop: string): number {
  const factor = KG_PER_BU[crop.toLowerCase()] || 27.22;
  return Math.round(kg / factor);
}

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("cropYear") || String(new Date().getFullYear()));

  try {
    // 1. Estimated production from Farm Profile
    const profileRows = await sql`
      SELECT profile FROM farm_profiles WHERE user_id = ${userId}
    `;
    const profile = profileRows[0]?.profile;
    const crops: Record<string, {
      estimated_production: number;
      contracted: number;
      contracted_value: number;
      delivered: number;
      avg_price: number;
      contracts: any[];
    }> = {};

    if (profile?.crops && Array.isArray(profile.crops)) {
      for (const c of profile.crops) {
        const name = c.crop || c.name;
        if (!name) continue;
        const acres = Number(c.acres || c.total_acres || 0);
        const targetYield = Number(c.target_yield || c.yield || 0);
        crops[name] = {
          estimated_production: Math.round(acres * targetYield),
          contracted: 0,
          contracted_value: 0,
          delivered: 0,
          avg_price: 0,
          contracts: [],
        };
      }
    }

    // 2. Contracts with value data
    const contracts = await sql`
      SELECT crop, quantity_bu, price_per_bu, basis, contract_type, elevator,
             delivery_date, created_at
      FROM inventory_contracts
      WHERE user_id = ${userId}
    `;
    for (const row of contracts) {
      const crop = row.crop;
      if (!crop) continue;
      if (!crops[crop]) crops[crop] = {
        estimated_production: 0, contracted: 0, contracted_value: 0,
        delivered: 0, avg_price: 0, contracts: [],
      };
      const qty = Number(row.quantity_bu || 0);
      const price = Number(row.price_per_bu || 0);
      crops[crop].contracted += qty;
      crops[crop].contracted_value += qty * price;
      crops[crop].contracts.push({
        quantity_bu: qty,
        price_per_bu: price,
        basis: Number(row.basis || 0),
        contract_type: row.contract_type,
        elevator: row.elevator,
        delivery_date: row.delivery_date,
        created_at: row.created_at,
      });
    }

    // 3. Delivered from grain_loads
    const delivered = await sql`
      SELECT crop, COALESCE(SUM(net_weight_kg), 0) as total_kg
      FROM grain_loads
      WHERE farm_id = ${userId}
        AND crop_year = ${cropYear}
        AND crop IS NOT NULL
      GROUP BY crop
    `;
    for (const row of delivered) {
      if (!row.crop) continue;
      if (!crops[row.crop]) crops[row.crop] = {
        estimated_production: 0, contracted: 0, contracted_value: 0,
        delivered: 0, avg_price: 0, contracts: [],
      };
      crops[row.crop].delivered = kgToBu(Number(row.total_kg), row.crop);
    }

    // Calculate averages
    for (const [, data] of Object.entries(crops)) {
      if (data.contracted > 0) {
        data.avg_price = Math.round((data.contracted_value / data.contracted) * 100) / 100;
      }
    }

    // Build response
    const positions = Object.entries(crops).map(([crop, data]) => ({
      crop,
      estimated_production: data.estimated_production,
      contracted: Math.round(data.contracted),
      contracted_value: Math.round(data.contracted_value * 100) / 100,
      delivered: data.delivered,
      avg_price: data.avg_price,
      unpriced: Math.max(0, data.estimated_production - data.contracted),
      percent_contracted: data.estimated_production > 0
        ? Math.round(data.contracted / data.estimated_production * 100) : 0,
      percent_delivered: data.contracted > 0
        ? Math.round(data.delivered / data.contracted * 100) : 0,
      contracts: data.contracts,
    }));

    // Totals
    const totalProduction = positions.reduce((s, p) => s + p.estimated_production, 0);
    const totalContracted = positions.reduce((s, p) => s + p.contracted, 0);
    const totalValue = positions.reduce((s, p) => s + p.contracted_value, 0);
    const totalUnpriced = positions.reduce((s, p) => s + p.unpriced, 0);
    const totalDelivered = positions.reduce((s, p) => s + p.delivered, 0);
    const avgPrice = totalContracted > 0 ? Math.round(totalValue / totalContracted * 100) / 100 : 0;
    const pctContracted = totalProduction > 0 ? Math.round(totalContracted / totalProduction * 100) : 0;

    return NextResponse.json({
      success: true,
      cropYear,
      totals: {
        production: totalProduction,
        contracted: totalContracted,
        contracted_value: totalValue,
        unpriced: totalUnpriced,
        delivered: totalDelivered,
        avg_price: avgPrice,
        percent_contracted: pctContracted,
      },
      positions: positions.sort((a, b) => b.estimated_production - a.estimated_production),
    });
  } catch (err: any) {
    console.error("Marketing positions error:", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}