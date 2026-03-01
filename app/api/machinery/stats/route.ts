import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);

  // Service stats
  const [serviceStats] = await sql`
    SELECT
      COUNT(*)::int as total_logs,
      COALESCE(SUM(cost), 0)::float as total_cost,
      COALESCE(AVG(cost), 0)::float as avg_cost,
      COUNT(CASE WHEN date >= NOW() - INTERVAL '30 days' THEN 1 END)::int as last_30_days
    FROM "MaintenanceLog" ml
    JOIN "Asset" a ON a.id = ml."assetId"
    WHERE a."orgId" = ${userId}
  `;

  // Schedule stats
  const [scheduleStats] = await sql`
    SELECT
      COUNT(CASE WHEN status = 'OVERDUE' THEN 1 END)::int as overdue,
      COUNT(CASE WHEN status = 'DUE_SOON' THEN 1 END)::int as due_soon,
      COUNT(CASE WHEN status = 'OK' THEN 1 END)::int as on_track,
      COUNT(*)::int as total_scheduled
    FROM "ServiceSchedule"
    WHERE "orgId" = ${userId}
  `;

  // Active downtime
  const [downtimeStats] = await sql`
    SELECT
      COUNT(CASE WHEN "endTime" IS NULL THEN 1 END)::int as active_downtime,
      COUNT(*)::int as total_incidents,
      COALESCE(SUM("costImpact"), 0)::float as total_downtime_cost
    FROM "DowntimeLog"
    WHERE "orgId" = ${userId}
  `;

  // Top cost units (this year)
  const topCostUnits = await sql`
    SELECT a.name, a.make, a.model, COALESCE(SUM(ml.cost), 0)::float as total_cost, COUNT(ml.id)::int as service_count
    FROM "MaintenanceLog" ml
    JOIN "Asset" a ON a.id = ml."assetId"
    WHERE a."orgId" = ${userId} AND ml.date >= date_trunc('year', NOW())
    GROUP BY a.id, a.name, a.make, a.model
    ORDER BY total_cost DESC
    LIMIT 5
  `;

  return NextResponse.json({
    success: true,
    stats: {
      service: serviceStats,
      schedule: scheduleStats,
      downtime: downtimeStats,
      topCostUnits,
    },
  });
}