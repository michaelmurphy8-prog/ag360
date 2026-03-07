import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

const KG_PER_BU: Record<string, number> = {
  "hrs wheat": 27.22, "durum": 27.22, "canola": 22.68, "barley": 21.77,
  "oats": 15.42, "flax": 25.40, "large green lentils": 27.22,
  "small green lentils": 27.22, "small red lentils": 27.22,
  "lentils": 27.22, "peas": 27.22, "chickpeas": 27.22, "mustard": 22.68,
  "cwrs wheat": 27.22, "wheat": 27.22, "soybeans": 27.22, "corn": 25.40,
};

function kgToBu(kg: number, crop: string): number {
  const factor = KG_PER_BU[crop.toLowerCase()] || 27.22;
  return Math.round(kg / factor);
}

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { searchParams } = new URL(req.url);
  const cropYear = parseInt(searchParams.get("cropYear") || String(new Date().getFullYear()));

  try {
    const cropPlanRows = await sql`
      SELECT crop, acres, target_yield_bu,
             (acres * target_yield_bu) AS total_production_bu
      FROM crop_plans
      WHERE tenant_id = ${tenantId}
        AND crop_year = ${cropYear}
    `;

    const crops: Record<string, {
      estimated_production: number;
      contracted: number;
      contracted_value: number;
      delivered: number;
      avg_price: number;
      contracts: any[];
    }> = {};

    for (const row of cropPlanRows) {
      const name = row.crop;
      if (!name) continue;
      crops[name] = {
        estimated_production: Math.round(parseFloat(row.total_production_bu)),
        contracted: 0, contracted_value: 0,
        delivered: 0, avg_price: 0, contracts: [],
      };
    }

    const contracts = await sql`
      SELECT crop, quantity_bu, price_per_bu, basis, contract_type, elevator,
             delivery_date, created_at
      FROM inventory_contracts
      WHERE tenant_id = ${tenantId}
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
        quantity_bu: qty, price_per_bu: price,
        basis: Number(row.basis || 0),
        contract_type: row.contract_type, elevator: row.elevator,
        delivery_date: row.delivery_date, created_at: row.created_at,
      });
    }

    const delivered = await sql`
      SELECT crop, COALESCE(SUM(net_weight_kg), 0) as total_kg
      FROM grain_loads
      WHERE tenant_id = ${tenantId}
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

    for (const [, data] of Object.entries(crops)) {
      if (data.contracted > 0) {
        data.avg_price = Math.round((data.contracted_value / data.contracted) * 100) / 100;
      }
    }

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
        production: totalProduction, contracted: totalContracted,
        contracted_value: totalValue, unpriced: totalUnpriced,
        delivered: totalDelivered, avg_price: avgPrice,
        percent_contracted: pctContracted,
      },
      positions: positions.sort((a, b) => b.estimated_production - a.estimated_production),
    });
  } catch (err: any) {
    console.error("Marketing positions error:", err?.message || err);
    return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
  }
}