// app/api/mobile/time-clock/route.ts
// v2 — resilient clock_out: time_entries write is best-effort (won't abort clock_out)
//      handles already-clocked-out retry gracefully

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId, userId, role } = tenantAuth;

  try {
    const workers = await sql`
      SELECT id, name, role AS worker_role, hourly_rate, daily_rate
      FROM workers
      WHERE tenant_id = ${tenantId} AND clerk_user_id = ${userId}
      LIMIT 1
    `;
    const worker = workers[0] || null;

    const sessions = worker ? await sql`
      SELECT * FROM time_clock_sessions
      WHERE tenant_id = ${tenantId} AND worker_id = ${worker.id} AND clock_out IS NULL
      ORDER BY clock_in DESC LIMIT 1
    ` : [];
    const activeSession = sessions[0] || null;

    let weekSummary: any[] = [];
    if (role === "owner") {
      weekSummary = await sql`
        SELECT w.name, w.id AS worker_id,
          COALESCE(SUM(CASE WHEN tcs.clock_out IS NOT NULL THEN tcs.total_hours ELSE 0 END), 0) AS total_hours,
          COUNT(CASE WHEN tcs.clock_out IS NULL THEN 1 END) AS is_clocked_in,
          MAX(CASE WHEN tcs.clock_out IS NULL THEN tcs.clock_in END) AS clocked_in_since,
          MAX(CASE WHEN tcs.clock_out IS NULL THEN tcs.location_lat END) AS last_lat,
          MAX(CASE WHEN tcs.clock_out IS NULL THEN tcs.location_lng END) AS last_lng
        FROM workers w
        LEFT JOIN time_clock_sessions tcs ON tcs.worker_id = w.id
          AND tcs.clock_in >= date_trunc('week', now())
        WHERE w.tenant_id = ${tenantId} AND w.status = 'active'
        GROUP BY w.id, w.name
        ORDER BY w.name
      `;
    } else if (worker) {
      weekSummary = await sql`
        SELECT ${worker.name} AS name, ${worker.id} AS worker_id,
          COALESCE(SUM(CASE WHEN tcs.clock_out IS NOT NULL THEN tcs.total_hours ELSE 0 END), 0) AS total_hours,
          0 AS is_clocked_in
        FROM time_clock_sessions tcs
        WHERE tcs.worker_id = ${worker.id}
          AND tcs.clock_in >= date_trunc('week', now())
      `;
    }

    return NextResponse.json({ worker, activeSession, weekSummary, role });
  } catch (e: any) {
    console.error("Time clock GET error:", e);
    return NextResponse.json({ error: "Failed to fetch time clock data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId, userId, role } = tenantAuth;

  try {
    const body = await req.json();
    const { action, task, notes, lat, lng, session_id } = body;

    const workers = await sql`
      SELECT id, name, hourly_rate, daily_rate
      FROM workers
      WHERE tenant_id = ${tenantId} AND clerk_user_id = ${userId}
      LIMIT 1
    `;
    const worker = workers[0];
    if (!worker) {
      return NextResponse.json({
        error: "No worker profile linked to your account. Ask the farm owner to link your Clerk user ID in Labour & HR.",
      }, { status: 404 });
    }

    // ── CLOCK IN ────────────────────────────────────────────────
    if (action === "clock_in") {
      const existing = await sql`
        SELECT id FROM time_clock_sessions
        WHERE worker_id = ${worker.id} AND clock_out IS NULL LIMIT 1
      `;
      if (existing.length > 0) return NextResponse.json({ error: "Already clocked in" }, { status: 400 });

      const [session] = await sql`
        INSERT INTO time_clock_sessions (
          tenant_id, worker_id, clerk_user_id, clock_in, task, notes, location_lat, location_lng
        ) VALUES (
          ${tenantId}, ${worker.id}, ${userId}, now(),
          ${task || null}, ${notes || null}, ${lat || null}, ${lng || null}
        ) RETURNING *
      `;
      return NextResponse.json({ success: true, session });
    }

    // ── CLOCK OUT ────────────────────────────────────────────────
    if (action === "clock_out") {
      if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });

      // Fetch session regardless of clock_out status (handle retries)
      const sessions = await sql`
        SELECT * FROM time_clock_sessions
        WHERE id = ${session_id} AND worker_id = ${worker.id} LIMIT 1
      `;
      if (sessions.length === 0) return NextResponse.json({ error: "Session not found" }, { status: 404 });
      const session = sessions[0];

      // Retry scenario: already clocked out — return success
      if (session.clock_out) {
        return NextResponse.json({ success: true, session, totalHours: session.total_hours, alreadyClocked: true });
      }

      const clockIn       = new Date(session.clock_in);
      const clockOut      = new Date();
      const totalMinutes  = (clockOut.getTime() - clockIn.getTime()) / 60000;
      const breakMins     = Number(session.break_minutes || 0);
      const workedMinutes = Math.max(0, totalMinutes - breakMins);
      const totalHours    = Math.round((workedMinutes / 60) * 100) / 100;

      // Primary: update session — this must not fail
      const [updated] = await sql`
        UPDATE time_clock_sessions SET
          clock_out = now(),
          total_hours = ${totalHours},
          notes = ${notes || session.notes || null},
          task  = ${task  || session.task  || null}
        WHERE id = ${session_id}
        RETURNING *
      `;

      // Secondary: sync to time_entries — best-effort, never block clock_out
      const entryDate   = clockOut.toISOString().slice(0, 10);
      const description = [task || session.task, notes || session.notes].filter(Boolean).join(" — ") || null;
      try {
        // Works if UNIQUE (worker_id, entry_date) constraint exists
        await sql`
          INSERT INTO time_entries (worker_id, tenant_id, user_id, entry_date, hours, description)
          VALUES (${worker.id}, ${tenantId}, ${userId}, ${entryDate}, ${totalHours}, ${description})
          ON CONFLICT (worker_id, entry_date) DO UPDATE SET
            hours       = time_entries.hours + ${totalHours},
            description = EXCLUDED.description
        `;
      } catch {
        // Constraint not yet added — manual upsert fallback
        try {
          const rows = await sql`
            SELECT id, hours FROM time_entries
            WHERE worker_id = ${worker.id} AND entry_date = ${entryDate} LIMIT 1
          `;
          if (rows.length > 0) {
            await sql`
              UPDATE time_entries SET hours = ${Number(rows[0].hours) + totalHours}, description = ${description}
              WHERE id = ${rows[0].id}
            `;
          } else {
            await sql`
              INSERT INTO time_entries (worker_id, tenant_id, user_id, entry_date, hours, description)
              VALUES (${worker.id}, ${tenantId}, ${userId}, ${entryDate}, ${totalHours}, ${description})
            `;
          }
        } catch (fallbackErr) {
          console.error("time_entries write failed (non-fatal):", fallbackErr);
        }
      }

      return NextResponse.json({ success: true, session: updated, totalHours });
    }

    // ── BREAK START ──────────────────────────────────────────────
    if (action === "break_start") {
      if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });
      const [updated] = await sql`
        UPDATE time_clock_sessions SET break_started_at = now()
        WHERE id = ${session_id} AND worker_id = ${worker.id}
          AND clock_out IS NULL AND break_started_at IS NULL
        RETURNING *
      `;
      if (!updated) return NextResponse.json({ error: "Cannot start break" }, { status: 400 });
      return NextResponse.json({ success: true, session: updated });
    }

    // ── BREAK END ────────────────────────────────────────────────
    if (action === "break_end") {
      if (!session_id) return NextResponse.json({ error: "session_id required" }, { status: 400 });
      const rows = await sql`
        SELECT * FROM time_clock_sessions
        WHERE id = ${session_id} AND worker_id = ${worker.id} AND break_started_at IS NOT NULL
      `;
      if (rows.length === 0) return NextResponse.json({ error: "No active break" }, { status: 404 });
      const s = rows[0];
      const addedMins = Math.round((Date.now() - new Date(s.break_started_at).getTime()) / 60000);
      const [updated] = await sql`
        UPDATE time_clock_sessions SET
          break_minutes    = ${Number(s.break_minutes || 0) + addedMins},
          break_started_at = NULL
        WHERE id = ${session_id}
        RETURNING *
      `;
      return NextResponse.json({ success: true, session: updated, breakMinutes: addedMins });
    }

    // ── UPDATE LOCATION ──────────────────────────────────────────
    if (action === "update_location") {
      if (!session_id || !lat || !lng) return NextResponse.json({ error: "session_id, lat, lng required" }, { status: 400 });
      await sql`
        UPDATE time_clock_sessions SET location_lat = ${lat}, location_lng = ${lng}
        WHERE id = ${session_id} AND worker_id = ${worker.id} AND clock_out IS NULL
      `;
      return NextResponse.json({ success: true });
    }

    // ── OWNER: EDIT HOURS ────────────────────────────────────────
    if (action === "edit_hours" && role === "owner") {
      const { target_session_id, override_hours } = body;
      if (!target_session_id || override_hours == null) {
        return NextResponse.json({ error: "target_session_id and override_hours required" }, { status: 400 });
      }
      const [updated] = await sql`
        UPDATE time_clock_sessions SET total_hours = ${override_hours}
        WHERE id = ${target_session_id} AND tenant_id = ${tenantId}
        RETURNING *
      `;
      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("Time clock POST error:", e);
    return NextResponse.json({ error: "Time clock action failed", detail: e.message }, { status: 500 });
  }
}