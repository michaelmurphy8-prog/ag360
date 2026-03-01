"use client";

import { useState, useEffect, useCallback } from "react";
import { Wrench, Calendar, AlertTriangle, Clock, DollarSign, TrendingUp, ChevronRight, CheckCircle, Plus } from "lucide-react";
import AddServiceLogModal from "./AddServiceLogModal";
import ScheduleServiceModal from "./ScheduleServiceModal";
import DowntimeModal from "./DowntimeModal";

interface Asset {
  id: string; name: string; make: string; model: string;
  year: number; hoursTotal: number | null; status: string;
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
  if (status === "OVERDUE") return "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20";
  if (status === "DUE_SOON") return "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20";
  return "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20";
}

function priorityColor(p: string) {
  if (p === "critical") return "text-[#EF4444]";
  if (p === "high") return "text-[#F59E0B]";
  if (p === "normal") return "text-[#60A5FA]";
  return "text-[#64748B]";
}

function categoryBadge(cat: string) {
  const colors: Record<string, string> = {
    preventive: "bg-[#34D399]/10 text-[#34D399]",
    repair: "bg-[#F59E0B]/10 text-[#F59E0B]",
    inspection: "bg-[#60A5FA]/10 text-[#60A5FA]",
    warranty: "bg-[#8B5CF6]/10 text-[#8B5CF6]",
    general: "bg-white/[0.04] text-[#94A3B8]",
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
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"logs" | "schedule" | "downtime">("schedule");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDowntimeModal, setShowDowntimeModal] = useState(false);

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleResolveDowntime = async (id: string) => {
    await fetch("/api/machinery/downtime", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, restoreStatus: "ACTIVE" }),
    });
    fetchAll();
  };

  const handleMarkComplete = async (sched: Schedule) => {
    // Log the service
    await fetch("/api/machinery/service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: sched.assetId,
        date: new Date().toISOString(),
        type: sched.serviceType,
        serviceCategory: "preventive",
        hoursAtService: sched.current_hours,
        notes: `Completed scheduled service: ${sched.serviceType}`,
      }),
    });
    // Update schedule
    const newDueHours = sched.intervalHours && sched.current_hours ? sched.current_hours + sched.intervalHours : null;
    const newDueDate = sched.intervalDays ? new Date(Date.now() + sched.intervalDays * 86400000).toISOString() : null;
    await fetch("/api/machinery/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: sched.id, status: "OK",
        lastCompletedAt: new Date().toISOString(),
        lastCompletedHours: sched.current_hours,
        dueAtHours: newDueHours, dueAtDate: newDueDate,
      }),
    });
    fetchAll();
  };

  const activeDowntime = downtimeLogs.filter(d => !d.endTime);

  const kpis = stats ? [
    { label: "Overdue", value: String(stats.schedule.overdue), color: stats.schedule.overdue > 0 ? "text-[#EF4444]" : "text-[#34D399]", icon: AlertTriangle },
    { label: "Due Soon", value: String(stats.schedule.due_soon), color: "text-[#F59E0B]", icon: Clock },
    { label: "Service Spend (YTD)", value: `$${Math.round(stats.service.total_cost).toLocaleString()}`, color: "text-[#F1F5F9]", icon: DollarSign },
    { label: "Services (30d)", value: String(stats.service.last_30_days), color: "text-[#60A5FA]", icon: Wrench },
    { label: "Active Downtime", value: String(stats.downtime.active_downtime), color: stats.downtime.active_downtime > 0 ? "text-[#EF4444]" : "text-[#34D399]", icon: TrendingUp },
  ] : [];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {kpis.map(k => (
            <div key={k.label} className="bg-[#111827] rounded-xl border border-white/[0.06] p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <k.icon size={12} className={k.color} />
                <p className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px]">{k.label}</p>
              </div>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active Downtime Banner */}
      {activeDowntime.length > 0 && (
        <div className="bg-[#EF4444]/[0.06] border border-[#EF4444]/20 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#EF4444] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Units Currently Down
          </p>
          {activeDowntime.map(d => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-[#EF4444]/10 last:border-0">
              <div>
                <p className="text-sm font-semibold text-[#F1F5F9]">{d.asset_name}</p>
                <p className="text-xs text-[#64748B]">{d.reason || "No reason"} · Down {timeAgo(d.startTime)}</p>
              </div>
              <button onClick={() => handleResolveDowntime(d.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#34D399] border border-[#34D399]/30 px-3 py-1.5 rounded-full hover:bg-[#34D399]/10 transition-colors">
                <CheckCircle size={12} /> Resolve
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs + Actions */}
      <div className="bg-[#111827] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex gap-1">
            {([
              { key: "schedule" as const, label: "Upcoming", count: schedules.length },
              { key: "logs" as const, label: "History", count: logs.length },
              { key: "downtime" as const, label: "Downtime", count: downtimeLogs.length },
            ]).map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  subTab === t.key ? "bg-white/[0.06] text-[#F1F5F9]" : "text-[#64748B] hover:text-[#94A3B8]"
                }`}>
                {t.label} {t.count > 0 && <span className="ml-1 text-[10px] opacity-60">({t.count})</span>}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDowntimeModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#EF4444] border border-[#EF4444]/30 px-3 py-1.5 rounded-full hover:bg-[#EF4444]/10 transition-colors">
              <AlertTriangle size={11} /> Report Down
            </button>
            <button onClick={() => setShowScheduleModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] border border-[#60A5FA]/30 px-3 py-1.5 rounded-full hover:bg-[#60A5FA]/10 transition-colors">
              <Calendar size={11} /> Schedule
            </button>
            <button onClick={() => setShowLogModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#080C15] bg-[#34D399] px-3 py-1.5 rounded-full hover:bg-[#6EE7B7] transition-colors">
              <Plus size={11} /> Log Service
            </button>
          </div>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-[#64748B]">Loading service data...</div>
        ) : (
          <>
            {/* SCHEDULE TAB */}
            {subTab === "schedule" && (
              <div className="divide-y divide-white/[0.04]">
                {schedules.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-[#64748B]">No scheduled services yet. Click "Schedule" to add one.</div>
                ) : schedules.map(s => {
                  const hoursUntil = s.dueAtHours && s.current_hours ? s.dueAtHours - s.current_hours : null;
                  return (
                    <div key={s.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadge(s.status)}`}>{s.status.replace("_", " ")}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#F1F5F9]">{s.serviceType}</p>
                          <p className="text-xs text-[#64748B]">{s.asset_name} — {s.make} {s.model}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {hoursUntil !== null && (
                          <div className="text-right">
                            <p className="text-xs text-[#64748B]">Hours Until Due</p>
                            <p className={`text-sm font-semibold ${hoursUntil <= 0 ? "text-[#EF4444]" : hoursUntil <= 50 ? "text-[#F59E0B]" : "text-[#F1F5F9]"}`}>
                              {hoursUntil <= 0 ? `${Math.abs(hoursUntil)} OVERDUE` : hoursUntil.toLocaleString()}
                            </p>
                          </div>
                        )}
                        {s.dueAtDate && (
                          <div className="text-right">
                            <p className="text-xs text-[#64748B]">Due Date</p>
                            <p className="text-sm font-semibold text-[#F1F5F9]">{new Date(s.dueAtDate).toLocaleDateString("en-CA")}</p>
                          </div>
                        )}
                        <span className={`text-[10px] font-bold uppercase ${priorityColor(s.priority)}`}>{s.priority}</span>
                        <button onClick={() => handleMarkComplete(s)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#34D399] hover:text-[#6EE7B7] transition-colors">
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
              <div className="divide-y divide-white/[0.04]">
                {logs.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-[#64748B]">No service history yet. Click "Log Service" to record one.</div>
                ) : logs.map(l => (
                  <div key={l.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${categoryBadge(l.serviceCategory)}`}>
                        {l.serviceCategory}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#F1F5F9]">{l.type}</p>
                        <p className="text-xs text-[#64748B]">{l.asset_name} — {l.make} {l.model}</p>
                        {l.partsUsed && <p className="text-[10px] text-[#475569] mt-0.5">Parts: {l.partsUsed}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-[#64748B]">Date</p>
                        <p className="text-sm font-semibold text-[#F1F5F9]">{new Date(l.date).toLocaleDateString("en-CA")}</p>
                      </div>
                      {l.hoursAtService && (
                        <div className="text-right">
                          <p className="text-xs text-[#64748B]">At Hours</p>
                          <p className="text-sm font-semibold text-[#F1F5F9]">{l.hoursAtService.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="text-right">
                        <p className="text-xs text-[#64748B]">Cost</p>
                        <p className="text-sm font-semibold text-[#F1F5F9]">{l.cost ? `$${Number(l.cost).toLocaleString()}` : "—"}</p>
                      </div>
                      {l.performedBy && (
                        <div className="text-right">
                          <p className="text-xs text-[#64748B]">By</p>
                          <p className="text-sm text-[#94A3B8]">{l.performedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* DOWNTIME TAB */}
            {subTab === "downtime" && (
              <div className="divide-y divide-white/[0.04]">
                {downtimeLogs.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-[#64748B]">No downtime incidents recorded.</div>
                ) : downtimeLogs.map(d => {
                  const isActive = !d.endTime;
                  const duration = d.endTime
                    ? ((new Date(d.endTime).getTime() - new Date(d.startTime).getTime()) / 3600000).toFixed(1)
                    : ((Date.now() - new Date(d.startTime).getTime()) / 3600000).toFixed(1);
                  return (
                    <div key={d.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          isActive ? "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" : "bg-white/[0.04] text-[#64748B] border-white/[0.08]"
                        }`}>
                          {isActive ? "ACTIVE" : "RESOLVED"}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#F1F5F9]">{d.asset_name}</p>
                          <p className="text-xs text-[#64748B]">{d.reason || "No reason"}</p>
                          {d.notes && <p className="text-[10px] text-[#475569] mt-0.5">{d.notes}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-[#64748B]">Started</p>
                          <p className="text-sm text-[#F1F5F9]">{new Date(d.startTime).toLocaleDateString("en-CA")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#64748B]">Duration</p>
                          <p className={`text-sm font-semibold ${isActive ? "text-[#EF4444]" : "text-[#F1F5F9]"}`}>{duration}h</p>
                        </div>
                        {d.costImpact && (
                          <div className="text-right">
                            <p className="text-xs text-[#64748B]">Cost</p>
                            <p className="text-sm font-semibold text-[#F1F5F9]">${Number(d.costImpact).toLocaleString()}</p>
                          </div>
                        )}
                        {isActive && (
                          <button onClick={() => handleResolveDowntime(d.id)}
                            className="flex items-center gap-1 text-xs font-semibold text-[#34D399] hover:text-[#6EE7B7] transition-colors">
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

      {/* Top Cost Units */}
      {stats && stats.topCostUnits.length > 0 && (
        <div className="bg-[#111827] rounded-xl border border-white/[0.06] p-5">
          <p className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] mb-3">Top Cost Units (YTD)</p>
          <div className="space-y-2">
            {stats.topCostUnits.map((u, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#475569] w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-[#F1F5F9]">{u.name}</p>
                    <p className="text-[10px] text-[#64748B]">{u.service_count} services</p>
                  </div>
                </div>
                <p className="text-sm font-semibold text-[#F59E0B]">${Math.round(u.total_cost).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showLogModal && <AddServiceLogModal assets={assets} onClose={() => setShowLogModal(false)} onSuccess={() => { setShowLogModal(false); fetchAll(); }} />}
      {showScheduleModal && <ScheduleServiceModal assets={assets} onClose={() => setShowScheduleModal(false)} onSuccess={() => { setShowScheduleModal(false); fetchAll(); }} />}
      {showDowntimeModal && <DowntimeModal assets={assets} onClose={() => setShowDowntimeModal(false)} onSuccess={() => { setShowDowntimeModal(false); fetchAll(); }} />}
    </div>
  );
}