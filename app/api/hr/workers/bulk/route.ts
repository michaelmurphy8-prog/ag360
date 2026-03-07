import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const { workers } = await req.json();
    if (!Array.isArray(workers) || workers.length === 0) {
      return NextResponse.json({ error: "No workers provided" }, { status: 400 });
    }
    if (workers.length > 200) {
      return NextResponse.json({ error: "Maximum 200 workers per upload" }, { status: 400 });
    }

    const results = { inserted: 0, errors: [] as { row: number; error: string }[] };

    for (let i = 0; i < workers.length; i++) {
      const w = workers[i];

      if (!w.name || !w.name.trim()) {
        results.errors.push({ row: i + 1, error: "Name is required" });
        continue;
      }

      const validTypes = ["full_time", "seasonal", "contractor", "family"];
      const workerType = w.worker_type?.toLowerCase().replace(/[\s-]/g, "_") || "full_time";
      const mappedType = validTypes.includes(workerType) ? workerType :
        workerType === "full" || workerType === "fulltime" ? "full_time" :
        validTypes.find(t => t.startsWith(workerType)) || "full_time";

      const status = (w.status?.toLowerCase() === "inactive") ? "inactive" : "active";
      const hourlyRate = w.hourly_rate ? parseFloat(String(w.hourly_rate).replace(/[$,]/g, "")) : null;
      const dailyRate = w.daily_rate ? parseFloat(String(w.daily_rate).replace(/[$,]/g, "")) : null;
      const startDate = w.start_date ? parseDate(w.start_date) : null;
      const endDate = w.end_date ? parseDate(w.end_date) : null;

      try {
        await sql`
          INSERT INTO workers (
            tenant_id, name, role, worker_type, status, phone, email,
            emergency_contact, emergency_phone, hourly_rate, daily_rate,
            start_date, end_date, notes
          ) VALUES (
            ${tenantId}, ${w.name.trim()}, ${w.role?.trim() || null}, ${mappedType}, ${status},
            ${w.phone?.trim() || null}, ${w.email?.trim() || null},
            ${w.emergency_contact?.trim() || null}, ${w.emergency_phone?.trim() || null},
            ${hourlyRate}, ${dailyRate}, ${startDate}, ${endDate}, ${w.notes?.trim() || null}
          )
        `;
        results.inserted++;
      } catch (err: any) {
        results.errors.push({ row: i + 1, error: err.message?.slice(0, 100) || "Insert failed" });
      }
    }

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function parseDate(val: any): string | null {
  if (!val) return null;
  if (typeof val === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + val * 86400000);
    return date.toISOString().slice(0, 10);
  }
  const str = String(val).trim();
  if (!str) return null;
  const iso = new Date(str);
  if (!isNaN(iso.getTime()) && str.includes("-")) return iso.toISOString().slice(0, 10);
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(Number);
    if (c > 1900) return `${c}-${String(a).padStart(2, "0")}-${String(b).padStart(2, "0")}`;
    if (a > 1900) return `${a}-${String(b).padStart(2, "0")}-${String(c).padStart(2, "0")}`;
  }
  return null;
}