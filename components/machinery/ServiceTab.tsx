"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wrench, Calendar, AlertTriangle, Clock, DollarSign, TrendingUp, CheckCircle, Plus, ScanLine } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import AddServiceLogModal from "./AddServiceLogModal";
import ScheduleServiceModal from "./ScheduleServiceModal";
import DowntimeModal from "./DowntimeModal";

interface Asset {
  id: string; name: string; make: string; model: string;
  year: number; hoursTotal: number | null; kmTotal?: number | null; assetClass?: string | null; status: string;
}

interface ServiceLog {
  id: string; assetId: string; date: string; type: string; notes: string | null;
  cost: number | null; hoursAtService: number | null; serviceCategory: string;
  partsUsed: string | null; laborHours: number | null; vendor: string | null;
  performedBy: string | null; asset_name: string; make: string; model: string;
}

interface Schedule {
  id: string; assetId: string; serviceType: string; intervalHours: number | null;
  intervalDays: number | null; dueAtHours: number | null; dueAtDate: string | null;
  lastCompletedAt: string | null; lastCompletedHours: number | null;
  status: string; priority: string; notes: string | null;
  asset_name: string; make: string; model: string; current_hours: number | null;
}

interface DowntimeEntry {
  id: string; assetId: string; startTime: string; endTime: string | null;
  reason: string | null; notes: string | null; costImpact: number | null;
  asset_name: string; make: string; model: string;
}

interface Stats {
  service: { total_logs: number; total_cost: number; avg_cost: number; last_30_days: number };
  schedule: { overdue: number; due_soon: number; on_track: number; total_scheduled: number };
  downtime: { active_downtime: number; total_incidents: number; total_downtime_cost: number };
  topCostUnits: { name: string; make: string; model: string; total_cost: number; service_count: number }[];
}

function statusBadge(status: string) {
  if (status === "OVERDUE") return "bg-[var(--ag-red)]/10 text-[var(--ag-red)] border-[var(--ag-red)]/20";
  if (status === "DUE_SOON") return "bg-[#F59E0B]/10 text-[var(--ag-yellow)] border-[var(--ag-yellow)/0.2]";
  return "bg-[var(--ag-accent)]/10 text-[var(--ag-green)] border-[var(--ag-accent-border)]";
}

function priorityColor(p: string) {
  if (p === "critical") return "text-[var(--ag-red)]";
  if (p === "high") return "text-[var(--ag-yellow)]";
  if (p === "normal") return "text-[var(--ag-blue)]";
  return "text-ag-muted";
}

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    preventive: "bg-[var(--ag-accent)]/10 text-[var(--ag-green)]", repair: "bg-[#F59E0B]/10 text-[var(--ag-yellow)]",
    inspection: "bg-[var(--ag-blue)]/10 text-[var(--ag-blue)]", warranty: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    general: "bg-[var(--ag-bg-hover)] text-ag-secondary",
  };
  return colors[cat] || colors.general;
}

function timeAgo(dateStr: string) {
  const h = (Date.now() - new Date(dateStr).getTime()) / 3600000;
  if (h < 1) return `${Math.round(h * 60)}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export default function ServiceTab({ assets }: { assets: Asset[] }) {
  const [logs, setLogs] = useState<ServiceLog[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [downtimeLogs, setDowntimeLogs] = useState<DowntimeEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [costChartData, setCostChartData] = useState<{ month: string; cost: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"logs" | "schedule" | "downtime">("schedule");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const scanFileRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, schedRes, downRes, statsRes] = await Promise.all([
        fetch("/api/machinery/service"), fetch("/api/machinery/schedule"),
        fetch("/api/machinery/downtime"), fetch("/api/machinery/stats"),
      ]);
      const [logsData, schedData, downData, statsData] = await Promise.all([
        logsRes.json(), schedRes.json(), downRes.json(), statsRes.json(),
      ]);
      if (logsData.success) setLogs(logsData.logs);
      if (schedData.success) setSchedules(schedData.schedules);
      if (downData.success) setDowntimeLogs(downData.logs);
      if (statsData.success) setStats(statsData.stats);

      // Build cost chart
      if (logsData.success && logsData.logs.length > 0) {
        const monthly = new Map<string, number>();
        logsData.logs.forEach((l: any) => {
          if (l.cost) {
            const m = new Date(l.date).toISOString().slice(0, 7);
            monthly.set(m, (monthly.get(m) || 0) + Number(l.cost));
          }
        });
        const sorted = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        setCostChartData(sorted.map(([month, cost]) => ({
          month: new Date(month + "-01").toLocaleDateString("en-CA", { month: "short", year: "2-digit" }),
          cost: Math.round(cost),
        })));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleResolveDowntime = async (id: string) => {
    await fetch("/api/machinery/downtime", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, restoreStatus: "ACTIVE" }),
    });
    fetchAll();
  };

  const handleMarkComplete = async (sched: Schedule) => {
    await fetch("/api/machinery/service", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: sched.assetId, date: new Date().toISOString(),
        type: sched.serviceType, serviceCategory: "preventive",
        hoursAtService: sched.current_hours,
        notes: `Completed scheduled service: ${sched.serviceType}`,
      }),
    });
    const newDueHours = sched.intervalHours && sched.current_hours ? sched.current_hours + sched.intervalHours : null;
    const newDueDate = sched.intervalDays ? new Date(Date.now() + sched.intervalDays * 86400000).toISOString() : null;
    await fetch("/api/machinery/schedule", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sched.id, status: "OK", lastCompletedAt: new Date().toISOString(),
        lastCompletedHours: sched.current_hours, dueAtHours: newDueHours, dueAtDate: newDueDate,
      }),
    });
    fetchAll();
  };

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/machinery/scan-receipt", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.extracted) {
        setScanResult(data.extracted);
        setShowLogModal(true);
      } else {
        alert("Could not extract service data from this document. Try a clearer image or PDF.");
      }
    } catch (err) { console.error(err); alert("Scan failed"); }
    finally {
      setScanning(false);
      if (scanFileRef.current) scanFileRef.current.value = "";
    }
  };

  const activeDowntime = downtimeLogs.filter(d => !d.endTime);

  const kpis = stats ? [
    { label: "Overdue", value: String(stats.schedule.overdue), color: stats.schedule.overdue > 0 ? "text-[var(--ag-red)]" : "text-[var(--ag-green)]", icon: AlertTriangle },
    { label: "Due Soon", value: String(stats.schedule.due_soon), color: "text-[var(--ag-yellow)]", icon: Clock },
    { label: "Service Spend (YTD)", value: `$${Math.round(stats.service.total_cost).toLocaleString()}`, color: "text-ag-primary", icon: DollarSign },
    { label: "Services (30d)", value: String(stats.service.last_30_days), color: "text-[var(--ag-blue)]", icon: Wrench },
    { label: "Active Downtime", value: String(stats.downtime.active_downtime), color: stats.downtime.active_downtime > 0 ? "text-[var(--ag-red)]" : "text-[var(--ag-green)]", icon: TrendingUp },
  ] : [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <k.icon size={12} className={k.color} />
                <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">{k.label}</p>
              </div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active Downtime Banner */}
      {activeDowntime.length > 0 && (
        <div className="bg-[var(--ag-red)]/[0.06] border border-[var(--ag-red)]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[var(--ag-red)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Units Currently Down
          </p>
          {activeDowntime.map(d => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-[var(--ag-red)]/10 last:border-0">
              <div>
                <p className="text-sm font-semibold text-ag-primary">{d.asset_name}</p>
                <p className="text-xs text-ag-muted">{d.reason || "No reason"} · Down {timeAgo(d.startTime)}</p>
              </div>
              <button onClick={() => handleResolveDowntime(d.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ag-green)] border border-[var(--ag-accent)]/30 px-3 py-1.5 rounded-full hover:bg-[var(--ag-accent)]/10 transition-colors">
                <CheckCircle size={12} /> Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs + Actions */}
      <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] overflow-hidden">
        <div className="px-6 py-3 border-b border-[var(--ag-border)] flex items-center justify-between">
          <div className="flex gap-1">
            {([
              { key: "schedule" as const, label: "Upcoming", count: schedules.length },
              { key: "logs" as const, label: "History", count: logs.length },
              { key: "downtime" as const, label: "Downtime", count: downtimeLogs.length },
            ]).map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === t.key ? "bg-[var(--ag-bg-active)] text-ag-primary" : "text-ag-muted hover:text-[var(--ag-text-secondary)]"
                }`}>
                {t.label} {t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input ref={scanFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleScanDocument} />
            <button onClick={() => scanFileRef.current?.click()} disabled={scanning}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#8B5CF6] border border-[#8B5CF6]/30 px-3 py-1.5 rounded-full hover:bg-[#8B5CF6]/10 transition-colors disabled:opacity-50">
              <ScanLine size={11} /> {scanning ? "Scanning..." : "Scan Document"}
            </button>
            <button onClick={() => setShowDowntimeModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ag-red)] border border-[var(--ag-red)]/30 px-3 py-1.5 rounded-full hover:bg-[var(--ag-red)]/10 transition-colors">
              <AlertTriangle size={11} /> Report Down
            </button>
            <button onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ag-blue)] border border-[#60A5FA]/30 px-3 py-1.5 rounded-full hover:bg-[var(--ag-blue)]/10 transition-colors">
              <Calendar size={11} /> Schedule
            </button>
            <button onClick={() => { setScanResult(null); setShowLogModal(true); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ag-accent-text)] bg-[var(--ag-accent)] px-3 py-1.5 rounded-full hover:bg-[var(--ag-accent-hover)] transition-colors">
              <Plus size={11} /> Log Service
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-ag-muted">Loading service data...</div>
        ) : (
          <>
            {/* SCHEDULE TAB */}
            {subTab === "schedule" && (
              <div className="divide-y divide-[var(--ag-border)]">
                {schedules.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-ag-muted">No scheduled services yet. Click &quot;Schedule&quot; to add one.</div>
                ) : schedules.map(s => {
                  const hoursUntil = s.dueAtHours && s.current_hours ? s.dueAtHours - s.current_hours : null;
                  return (
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge(s.status)}`}>{s.status.replace("_", " ")}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ag-primary">{s.serviceType}</p>
                          <p className="text-xs text-ag-muted">{s.asset_name} — {s.make} {s.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {hoursUntil !== null && (
                          <div className="text-right">
                            <p className="text-xs text-ag-muted">Hours Until Due</p>
                            <p className={`text-sm font-semibold ${hoursUntil <= 0 ? "text-[var(--ag-red)]" : hoursUntil <= 50 ? "text-[var(--ag-yellow)]" : "text-ag-primary"}`}>
                              {hoursUntil <= 0 ? `${Math.abs(hoursUntil)} OVERDUE` : hoursUntil.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {s.dueAtDate && (
                          <div className="text-right">
                            <p className="text-xs text-ag-muted">Due Date</p>
                            <p className="text-sm font-semibold text-ag-primary">{new Date(s.dueAtDate).toLocaleDateString("en-CA")}</p>
                          </div>
                        )}
                        <span className={`text-[10px] font-bold uppercase ${priorityColor(s.priority)}`}>{s.priority}</span>
                        <button onClick={() => handleMarkComplete(s)}
                          className="flex items-center gap-1 text-xs font-semibold text-[var(--ag-green)] hover:text-[var(--ag-green)] transition-colors">
                          <CheckCircle size={14} /> Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* LOGS TAB */}
            {subTab === "logs" && (
              <div className="divide-y divide-[var(--ag-border)]">
                {logs.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-ag-muted">No service history yet. Click &quot;Log Service&quot; to record one.</div>
                ) : logs.map(l => (
                  <div key={l.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${categoryBadge(l.serviceCategory)}`}>
                        {l.serviceCategory}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ag-primary">{l.type}</p>
                        <p className="text-xs text-ag-muted">{l.asset_name} — {l.make} {l.model}</p>
                        {l.partsUsed && <p className="text-[10px] text-ag-dim mt-0.5">Parts: {l.partsUsed}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-ag-muted">Date</p>
                        <p className="text-sm font-semibold text-ag-primary">{new Date(l.date).toLocaleDateString("en-CA")}</p>
                      </div>
                      {l.hoursAtService && (
                        <div className="text-right">
                          <p className="text-xs text-ag-muted">At Hours</p>
                          <p className="text-sm font-semibold text-ag-primary">{l.hoursAtService.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-ag-muted">Cost</p>
                        <p className="text-sm font-semibold text-ag-primary">{l.cost ? `$${Number(l.cost).toLocaleString()}` : "—"}</p>
                      </div>
                      {l.performedBy && (
                        <div className="text-right">
                          <p className="text-xs text-ag-muted">By</p>
                          <p className="text-sm text-ag-secondary">{l.performedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DOWNTIME TAB */}
            {subTab === "downtime" && (
              <div className="divide-y divide-[var(--ag-border)]">
                {downtimeLogs.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-ag-muted">No downtime incidents recorded.</div>
                ) : downtimeLogs.map(d => {
                  const isActive = !d.endTime;
                  const duration = d.endTime
                    ? ((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 3600000).toFixed(1)
                    : ((Date.now() - new Date(d.startTime).getTime()) / 3600000).toFixed(1);
                  return (
                    <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isActive ? "bg-[var(--ag-red)]/10 text-[var(--ag-red)] border-[var(--ag-red)]/20" : "bg-[var(--ag-bg-hover)] text-ag-muted border-[var(--ag-border)]"
                        }`}>
                          {isActive ? "ACTIVE" : "RESOLVED"}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-ag-primary">{d.asset_name}</p>
                          <p className="text-xs text-ag-muted">{d.reason || "No reason"}</p>
                          {d.notes && <p className="text-[10px] text-ag-dim mt-0.5">{d.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-ag-muted">Started</p>
                          <p className="text-sm text-ag-primary">{new Date(d.startTime).toLocaleDateString("en-CA")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-ag-muted">Duration</p>
                          <p className={`text-sm font-semibold ${isActive ? "text-[var(--ag-red)]" : "text-ag-primary"}`}>{duration}h</p>
                        </div>
                        {d.costImpact && (
                          <div className="text-right">
                            <p className="text-xs text-ag-muted">Cost</p>
                            <p className="text-sm font-semibold text-ag-primary">${Number(d.costImpact).toLocaleString()}</p>
                          </div>
                        )}
                        {isActive && (
                          <button onClick={() => handleResolveDowntime(d.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-[var(--ag-green)] hover:text-[var(--ag-green)] transition-colors">
                            <CheckCircle size={14} /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Service Cost Trend */}
      {costChartData.length > 1 && (
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px] mb-4">Service Cost Trend</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--ag-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--ag-text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${v.toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ background: "var(--ag-border-solid)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--ag-text-secondary)" }}
                  formatter={(value: any) => [`$${Number(value).toLocaleString()}`, "Cost"]}
                />
                <Line type="monotone" dataKey="cost" stroke="var(--ag-yellow)" strokeWidth={2} dot={{ r: 3, fill: "var(--ag-yellow)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Top Cost Units */}
      {stats && stats.topCostUnits.length > 0 && (
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px] mb-3">Top Cost Units (YTD)</p>
          <div className="space-y-2">
            {stats.topCostUnits.map((u, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-ag-dim w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-ag-primary">{u.name}</p>
                    <p className="text-[10px] text-ag-muted">{u.service_count} services</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-[var(--ag-yellow)]">${Math.round(u.total_cost).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showLogModal && (
        <AddServiceLogModal
          assets={assets}
          scanData={scanResult}
          onClose={() => { setShowLogModal(false); setScanResult(null); }}
          onSuccess={() => { setShowLogModal(false); setScanResult(null); fetchAll(); }}
        />
      )}
      {showScheduleModal && <ScheduleServiceModal assets={assets} onClose={() => setShowScheduleModal(false)} onSuccess={() => { setShowScheduleModal(false); fetchAll(); }} />}
      {showDowntimeModal && <DowntimeModal assets={assets} onClose={() => setShowDowntimeModal(false)} onSuccess={() => { setShowDowntimeModal(false); fetchAll(); }} />}
    </div>
  );
}