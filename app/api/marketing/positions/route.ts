import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

// KG per bushel conversion factors (Canadian standard)
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
    // 1. Estimated production from Farm Profile (acres × target yield)
    const profileRows = await sql`
      SELECT profile FROM farm_profiles WHERE user_id = ${userId}
    `;
    const profile = profileRows[0]?.profile;
    const crops: Record<string, { estimated_production: number }> = {};

    if (profile?.crops && Array.isArray(profile.crops)) {
      for (const c of profile.crops) {
        const name = c.crop || c.name;
        if (!name) continue;
        const acres = Number(c.acres || c.total_acres || 0);
        const targetYield = Number(c.target_yield || c.yield || 0);
        crops[name] = { estimated_production: Math.round(acres * targetYield) };
      }
    }

    // 2. Contracted bushels from inventory_contracts
    const contracted = await sql`
      SELECT crop, COALESCE(SUM(quantity_bu), 0) as total_bu
      FROM inventory_contracts
      WHERE user_id = ${userId}
      GROUP BY crop
    `;
    for (const row of contracted) {
      if (!crops[row.crop]) crops[row.crop] = { estimated_production: 0 };
      (crops[row.crop] as any).contracted = Math.round(Number(row.total_bu));
    }

    // 3. Delivered bushels from grain_loads (convert kg to bu)
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
      if (!crops[row.crop]) crops[row.crop] = { estimated_production: 0 };
      (crops[row.crop] as any).delivered = kgToBu(Number(row.total_kg), row.crop);
    }

    // Build response array
    const positions = Object.entries(crops).map(([crop, data]) => ({
      crop,
      estimated_production: data.estimated_production || 0,
      contracted: (data as any).contracted || 0,
      delivered: (data as any).delivered || 0,
      unpriced: Math.max(0, (data.estimated_production || 0) - ((data as any).contracted || 0)),
      percent_contracted: data.estimated_production > 0
        ? Math.round(((data as any).contracted || 0) / data.estimated_production * 100)
        : 0,
      percent_delivered: data.estimated_production > 0
        ? Math.round(((data as any).delivered || 0) / data.estimated_production * 100)
        : 0,
    }));

    return NextResponse.json({
      success: true,
      cropYear,
      positions: positions.sort((a, b) => b.estimated_production - a.estimated_production),
    });
  } catch (err) {
    console.error("Marketing positions error:", err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}