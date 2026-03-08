"use client";
// app/mobile/timecard/page.tsx
// Real punch clock — clock in/out, breaks, running timer, GPS tracking, role-based views

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Worker { id: string; name: string; worker_role: string; hourly_rate: number | null; daily_rate: number | null; }
interface Session {
  id: string; worker_id: string; clock_in: string; clock_out: string | null;
  break_minutes: number; break_started_at: string | null;
  total_hours: number | null; task: string | null; notes: string | null;
  location_lat: number | null; location_lng: number | null;
}
interface WeekRow {
  name: string; worker_id: string; total_hours: number;
  is_clocked_in: number; clocked_in_since: string | null;
  last_lat: number | null; last_lng: number | null;
}

const TASK_TYPES = [
  "Seeding", "Spraying", "Swathing", "Combining", "Hauling",
  "Field Work", "Equipment Maintenance", "Irrigation", "Fencing",
  "Livestock", "Shop Work", "General Labour", "Other",
];

function fmtElapsed(ms: number) {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function fmtHours(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export default function MobileTimecard() {
  const router = useRouter();

  const [worker, setWorker]           = useState<Worker | null>(null);
  const [session, setSession]         = useState<Session | null>(null);
  const [weekSummary, setWeekSummary] = useState<WeekRow[]>([]);
  const [role, setRole]               = useState<string>("employee");
  const [loading, setLoading]         = useState(true);
  const [noWorker, setNoWorker]       = useState(false);

  // Timer
  const [elapsed, setElapsed]           = useState(0);
  const [breakElapsed, setBreakElapsed] = useState(0);
  const timerRef                        = useRef<NodeJS.Timeout | null>(null);
  const breakTimerRef                   = useRef<NodeJS.Timeout | null>(null);

  // Form
  const [task, setTask]   = useState("");
  const [notes, setNotes] = useState("");

  // UI
  const [acting, setActing]         = useState(false);
  const [error, setError]           = useState("");
  const [showClockIn, setShowClockIn] = useState(false);

  // GPS
  const locationRef = useRef<NodeJS.Timeout | null>(null);

  const isOnBreak   = !!session?.break_started_at;
  const isClockedIn = !!session && !session.clock_out;

  // ── Fetch ────────────────────────────────────────────────────
  const fetchState = useCallback(async () => {
    try {
      const res  = await fetch("/api/mobile/time-clock");
      const data = await res.json();
      if (data.error) return;
      setWorker(data.worker || null);
      setRole(data.role || "employee");
      setWeekSummary(data.weekSummary || []);
      if (!data.worker) { setNoWorker(true); }
      setSession(data.activeSession || null);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  // ── Work timer ───────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isClockedIn && session && !isOnBreak) {
      const clockIn  = new Date(session.clock_in).getTime();
      const breakMs  = (Number(session.break_minutes) || 0) * 60000;
      const tick = () => setElapsed(Math.max(0, Date.now() - clockIn - breakMs));
      tick();
      timerRef.current = setInterval(tick, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isClockedIn, isOnBreak, session?.id, session?.break_minutes]);

  // ── Break timer ──────────────────────────────────────────────
  useEffect(() => {
    if (breakTimerRef.current) clearInterval(breakTimerRef.current);
    if (isOnBreak && session?.break_started_at) {
      const start = new Date(session.break_started_at).getTime();
      const tick  = () => setBreakElapsed(Date.now() - start);
      tick();
      breakTimerRef.current = setInterval(tick, 1000);
    }
    return () => { if (breakTimerRef.current) clearInterval(breakTimerRef.current); };
  }, [isOnBreak, session?.break_started_at]);

  // ── GPS while clocked in ─────────────────────────────────────
  useEffect(() => {
    if (isClockedIn && navigator.geolocation) {
      const update = () => {
        navigator.geolocation.getCurrentPosition(pos => {
          if (session?.id) {
            fetch("/api/mobile/time-clock", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "update_location", session_id: session.id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
            }).catch(() => {});
          }
        });
      };
      update();
      locationRef.current = setInterval(update, 5 * 60 * 1000);
    }
    return () => { if (locationRef.current) clearInterval(locationRef.current); };
  }, [isClockedIn, session?.id]);

  // ── Actions ──────────────────────────────────────────────────
  async function doAction(action: string, extra: Record<string, any> = {}) {
    setActing(true);
    setError("");
    try {
      if (action === "clock_in" && navigator.geolocation) {
        await new Promise<void>(resolve => {
          navigator.geolocation.getCurrentPosition(
            pos => { extra.lat = pos.coords.latitude; extra.lng = pos.coords.longitude; resolve(); },
            () => resolve(), { timeout: 5000 }
          );
        });
      }
      const res  = await fetch("/api/mobile/time-clock", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, session_id: session?.id, task: task || null, notes: notes || null, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      if (action === "clock_out") { setSession(null); setElapsed(0); setTask(""); setNotes(""); setShowClockIn(false); }
      else { setSession(data.session); }
      await fetchState();
    } catch (e: any) { setError(e.message || "Something went wrong"); }
    finally { setActing(false); }
  }

  const elapsedHours = elapsed / 3600000;
  const estPay = worker?.hourly_rate
    ? `$${(elapsedHours * worker.hourly_rate).toFixed(2)}`
    : worker?.daily_rate ? `$${worker.daily_rate.toFixed(2)}/day` : null;

  if (loading) return (
    <div style={{ background: "#070D18", minHeight: "100svh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "28px", height: "28px", borderRadius: "50%", border: "2px solid rgba(200,168,75,0.3)", borderTopColor: "#C8A84B", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}body{background:#070D18}
        .fl{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#4A6A8A;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
        .fi{background:#0D1726;border:1px solid #1A2940;border-radius:10px;color:#F0F4F8;font-family:'DM Sans',sans-serif;font-size:15px;padding:13px 14px;width:100%;outline:none;box-sizing:border-box;-webkit-appearance:none;transition:border-color .2s}
        .fi:focus{border-color:#C8A84B}.fi::placeholder{color:#2A3F5A}
        select.fi{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A6A8A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;padding-right:36px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .3s ease forwards}
      `}</style>

      <div style={{ background: "#070D18", minHeight: "100svh", display: "flex", flexDirection: "column", fontFamily: "'DM Sans',sans-serif" }}>

        {/* Header */}
        <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: "12px", borderBottom: "1px solid #0D1726", flexShrink: 0 }}>
          <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#4A6A8A", display: "flex" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "22px", color: "#F0F4F8", letterSpacing: "0.04em", lineHeight: 1 }}>Time Clock</div>
            <div style={{ fontSize: "12px", color: "#4A6A8A", marginTop: "2px" }}>
              {worker ? worker.name : "Not linked"} · {new Date().toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
            </div>
          </div>
          {isClockedIn && (
            <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "rgba(74,158,107,0.1)", border: "1px solid rgba(74,158,107,0.25)", borderRadius: "8px", padding: "5px 9px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4A9E6B", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#4A9E6B" }}>GPS</span>
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" as any }}>
          <div className="fu" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "32px" }}>

            {/* No worker linked warning */}
            {noWorker && (
              <div style={{ background: "rgba(232,168,56,0.08)", border: "1px solid rgba(232,168,56,0.2)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#E8A838", marginBottom: "6px" }}>Worker Profile Not Linked</div>
                <div style={{ fontSize: "13px", color: "#B0C4D8", lineHeight: 1.5 }}>Ask the farm owner to open your worker profile in Labour & HR and add your Clerk user ID to link your account.</div>
              </div>
            )}

            {/* ── CLOCKED IN ── */}
            {isClockedIn && (
              <>
                {/* Timer card */}
                <div style={{
                  background: isOnBreak ? "rgba(232,168,56,0.06)" : "rgba(74,158,107,0.06)",
                  border: `1px solid ${isOnBreak ? "rgba(232,168,56,0.25)" : "rgba(74,158,107,0.25)"}`,
                  borderRadius: "20px", padding: "28px 20px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", background: isOnBreak ? "rgba(232,168,56,0.15)" : "rgba(74,158,107,0.15)", borderRadius: "20px", padding: "4px 12px", marginBottom: "4px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: isOnBreak ? "#E8A838" : "#4A9E6B", animation: isOnBreak ? "none" : "pulse 2s infinite" }} />
                    <span style={{ fontSize: "11px", fontWeight: 700, color: isOnBreak ? "#E8A838" : "#4A9E6B", textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>
                      {isOnBreak ? "On Break" : "Clocked In"}
                    </span>
                  </div>

                  <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "56px", color: isOnBreak ? "#E8A838" : "#F0F4F8", letterSpacing: "0.06em", lineHeight: 1 }}>
                    {isOnBreak ? fmtElapsed(breakElapsed) : fmtElapsed(elapsed)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#4A6A8A" }}>
                    {isOnBreak ? "Break duration" : `Clocked in at ${fmtTime(session!.clock_in)}`}
                  </div>

                  {!isOnBreak && (
                    <div style={{ display: "flex", gap: "20px", marginTop: "8px", flexWrap: "wrap" as const, justifyContent: "center" }}>
                      {Number(session?.break_minutes) > 0 && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#4A6A8A" }}>Break</div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#E8A838" }}>{fmtElapsed(Number(session!.break_minutes) * 60000)}</div>
                        </div>
                      )}
                      {estPay && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#4A6A8A" }}>Est. Pay</div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#C8A84B" }}>{estPay}</div>
                        </div>
                      )}
                      {session?.task && (
                        <div style={{ textAlign: "center" }}>
                          <div style={{ fontSize: "11px", color: "#4A6A8A" }}>Task</div>
                          <div style={{ fontSize: "14px", fontWeight: 600, color: "#F0F4F8" }}>{session.task}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Break / Clock Out */}
                {isOnBreak ? (
                  <button onClick={() => doAction("break_end")} disabled={acting} style={{ background: "rgba(232,168,56,0.12)", border: "1px solid rgba(232,168,56,0.35)", borderRadius: "14px", padding: "16px", color: "#E8A838", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "16px", cursor: "pointer", width: "100%", WebkitTapHighlightColor: "transparent" }}>
                    {acting ? "…" : "☕  End Break — Resume Shift"}
                  </button>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button onClick={() => doAction("break_start")} disabled={acting} style={{ background: "#0D1726", border: "1px solid #1A2940", borderRadius: "14px", padding: "16px", color: "#E8A838", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "15px", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                      {acting ? "…" : "☕  Break"}
                    </button>
                    <button onClick={() => doAction("clock_out")} disabled={acting} style={{ background: "rgba(232,84,84,0.1)", border: "1px solid rgba(232,84,84,0.3)", borderRadius: "14px", padding: "16px", color: "#E85454", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "15px", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                      {acting ? "…" : "Clock Out"}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ── NOT CLOCKED IN ── */}
            {!isClockedIn && !noWorker && (
              <>
                {weekSummary.find(w => w.name === worker?.name) && (
                  <div style={{ background: "#0D1726", border: "1px solid #1A2940", borderRadius: "12px", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: "13px", color: "#4A6A8A" }}>My hours this week</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "#C8A84B" }}>
                      {fmtHours(Number(weekSummary.find(w => w.name === worker?.name)?.total_hours || 0))}
                    </div>
                  </div>
                )}

                {!showClockIn ? (
                  <button onClick={() => setShowClockIn(true)} style={{ background: "linear-gradient(135deg,#4A9E6B,#5BBF7E)", border: "none", borderRadius: "20px", padding: "36px 20px", color: "#fff", fontFamily: "'Bebas Neue',sans-serif", fontSize: "34px", letterSpacing: "0.08em", cursor: "pointer", width: "100%", WebkitTapHighlightColor: "transparent", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Clock In
                  </button>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div><div className="fl">Task (Optional)</div>
                      <select className="fi" value={task} onChange={e => setTask(e.target.value)}>
                        <option value="">Select task…</option>
                        {TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div><div className="fl">Notes (Optional)</div>
                      <input className="fi" type="text" placeholder="Field, equipment…" value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <button onClick={() => setShowClockIn(false)} style={{ background: "#0D1726", border: "1px solid #1A2940", borderRadius: "14px", padding: "15px", color: "#4A6A8A", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}>Cancel</button>
                      <button onClick={() => doAction("clock_in")} disabled={acting} style={{ background: "linear-gradient(135deg,#4A9E6B,#5BBF7E)", border: "none", borderRadius: "14px", padding: "15px", color: "#fff", fontFamily: "'DM Sans',sans-serif", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
                        {acting ? "…" : "Clock In"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div style={{ background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#F08080" }}>
                {error}
              </div>
            )}

            {/* Week summary */}
            {weekSummary.length > 0 && (
              <div>
                <div className="fl" style={{ marginBottom: "10px" }}>{role === "owner" ? "Team This Week" : "My Week"}</div>
                <div style={{ background: "#0D1726", border: "1px solid #1A2940", borderRadius: "12px", overflow: "hidden" }}>
                  {weekSummary.map((row, i) => (
                    <div key={row.worker_id} style={{ padding: "12px 14px", borderBottom: i < weekSummary.length - 1 ? "1px solid #1A2940" : "none", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0, background: Number(row.is_clocked_in) > 0 ? "#4A9E6B" : "#1A2940", animation: Number(row.is_clocked_in) > 0 ? "pulse 2s infinite" : "none" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14px", color: "#F0F4F8", fontWeight: 500 }}>{row.name}</div>
                        {Number(row.is_clocked_in) > 0 && row.clocked_in_since && (
                          <div style={{ fontSize: "11px", color: "#4A9E6B", marginTop: "1px" }}>
                            In since {fmtTime(row.clocked_in_since)}
                            {role === "owner" && row.last_lat && row.last_lng && (
                              <a href={`https://maps.google.com/?q=${row.last_lat},${row.last_lng}`} target="_blank" rel="noreferrer" style={{ color: "#C8A84B", marginLeft: "8px", textDecoration: "none" }}>📍 Map</a>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "48px", height: "3px", background: "#1A2940", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "#C8A84B", width: `${Math.min((Number(row.total_hours) / 50) * 100, 100)}%` }} />
                        </div>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#C8A84B", minWidth: "36px", textAlign: "right" as const }}>{fmtHours(Number(row.total_hours))}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}