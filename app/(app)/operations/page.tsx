"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Upload, ArrowRight, TrendingUp, TrendingDown,
  BarChart3, DollarSign, Target, Sprout, Wrench, 
  AlertTriangle, CheckCircle, Clock, Eye, Tractor,
} from "lucide-react";

/* ───── Types ──────────────────────────────────────────── */
interface KPIs {
  totalFields: number; totalAcres: number; seededAcres: number;
  seededCount: number; unseededCount: number; totalBudgetCost: number;
  totalActualCost: number; totalBudgetRevenue: number; totalActualRevenue: number;
  costVariance: number; avgCostPerAcre: number; netMarginActual: number; netMarginBudget: number;
}
interface Field {
  id: string; field_name: string; acres: string; crop_type?: string;
  seeded_acres?: string; seeding_date?: string; crop_status?: string;
  actual_total: string; actual_revenue: string;
}
interface CropBreakdown { [crop: string]: { acres: number; count: number } }
interface MachineryStats {
  service: { total_logs: number; total_cost: number; last_30_days: number };
  schedule: { overdue: number; due_soon: number; on_track: number; total_scheduled: number };
  downtime: { active_downtime: number; total_incidents: number; total_downtime_cost: number };
}
interface ScoutEntry {
  id: string; date: string; field_name: string; crop: string;
  issue_type: string; severity: string; notes?: string;
}

const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa", Other: "#9ca3af",
};
const SEVERITY_COLORS: Record<string, string> = {
  low: "var(--ag-green)", medium: "#facc15", high: "#f97316", critical: "var(--ag-red)",
};

function fmt(n: number) { return n.toLocaleString("en-CA", { maximumFractionDigits: 0 }); }
function fmtD(n: number) { return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function MiniDonut({ value, max, color, size = 56, strokeWidth = 5, showLabel = false }:
  { value: number; max: number; color: string; size?: number; strokeWidth?: number; showLabel?: boolean }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size/2} cy={size/2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold" style={{ color: "var(--ag-text-primary)" }}>{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, iconColor, label, value, subtitle, donut }: {
  icon: React.ElementType; iconColor: string; label: string;
  value: React.ReactNode; subtitle?: string;
  donut?: { value: number; max: number; color: string; showLabel?: boolean };
}) {
  return (
    <div className="rounded-xl p-5 flex items-center justify-between" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${iconColor}18` }}>
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase" style={{ color: "var(--ag-text-muted)" }}>{label}</p>
          <p className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>{value}</p>
          {subtitle && <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>{subtitle}</p>}
        </div>
      </div>
      {donut && <MiniDonut {...donut} showLabel={donut.showLabel ?? false} />}
    </div>
  );
}

export default function OperationsPage() {
  const cropYear = new Date().getFullYear();
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [cropBreakdown, setCropBreakdown] = useState<CropBreakdown>({});
  const [machinery, setMachinery] = useState<MachineryStats | null>(null);
  const [scoutEntries, setScoutEntries] = useState<ScoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, machineryRes, scoutRes] = await Promise.all([
          fetch(`/api/fields/summary?crop_year=${cropYear}`),
          fetch("/api/machinery/stats"),
          fetch("/api/scout/entries"),
        ]);
        const summary = await summaryRes.json();
        setKpis(summary.kpis);
        setFields(summary.fields || []);
        setCropBreakdown(summary.cropBreakdown || {});
        if (machineryRes.ok) {
  const m = await machineryRes.json();
  setMachinery(m.stats);
}
        if (scoutRes.ok) {
          const s = await scoutRes.json();
          setScoutEntries((s.entries || []).slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [cropYear]);

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Operations</h1>
        <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Farm operations overview — {cropYear} crop year</p>
      </div>

      {/* ── KPI Row ── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard icon={MapPin} iconColor="var(--ag-green)" label="Total Acres"
            value={fmt(kpis.totalAcres)}
            subtitle={`${kpis.totalFields} fields · ${kpis.seededCount} seeded`}
            donut={{ value: kpis.seededCount, max: kpis.totalFields, color: "var(--ag-green)", showLabel: true }} />
          <KpiCard icon={DollarSign} iconColor="var(--ag-yellow)" label="Total Costs"
            value={`$${fmt(kpis.totalActualCost)}`}
            subtitle={`$${fmtD(kpis.avgCostPerAcre)}/ac avg`}
            donut={{ value: kpis.totalActualCost, max: kpis.totalBudgetCost || kpis.totalActualCost,
              color: kpis.totalActualCost > kpis.totalBudgetCost ? "var(--ag-red)" : "var(--ag-green)", showLabel: true }} />
          <KpiCard icon={Target} iconColor="var(--ag-blue)" label="Total Revenue"
            value={`$${fmt(kpis.totalActualRevenue)}`}
            subtitle={`$${kpis.seededAcres > 0 ? fmtD(kpis.totalActualRevenue / kpis.seededAcres) : "0.00"}/ac`} />
          <KpiCard icon={kpis.netMarginActual >= 0 ? TrendingUp : TrendingDown}
            iconColor={kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)"}
            label="Net Margin"
            value={<span style={{ color: kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)" }}>${fmt(kpis.netMarginActual)}</span>}
            subtitle={`$${kpis.seededAcres > 0 ? fmtD(kpis.netMarginActual / kpis.seededAcres) : "0.00"}/ac`}
            donut={{ value: Math.abs(kpis.netMarginActual), max: kpis.totalActualRevenue || 1,
              color: kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)" }} />
        </div>
      )}

      {/* ── Row 2: Field Status + Machinery Pulse ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

        {/* Field Status — 2/3 width */}
        <div className="md:col-span-2 rounded-xl p-5" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sprout size={14} style={{ color: "var(--ag-green)" }} />
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase" style={{ color: "var(--ag-text-muted)" }}>
                Field Status — {cropYear}
              </span>
            </div>
            <Link href="/fields" className="text-xs font-semibold" style={{ color: "var(--ag-accent)" }}>View All →</Link>
          </div>
          {fields.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ag-border)" }}>
                    {["Field", "Crop", "Acres", "Seeded", "Cost", "Revenue"].map(h => (
                      <th key={h} className="text-left pb-2 text-[10px] font-semibold tracking-wide uppercase"
                        style={{ color: "var(--ag-text-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((f, i) => (
                    <tr key={f.id} style={{ borderBottom: i < fields.length - 1 ? "1px solid var(--ag-border)" : "none" }}>
                      <td className="py-2.5 font-medium" style={{ color: "var(--ag-text-primary)" }}>{f.field_name}</td>
                      <td className="py-2.5">
                        {f.crop_type ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CROP_COLORS[f.crop_type] || "#9ca3af" }} />
                            <span style={{ color: "var(--ag-text-secondary)" }}>{f.crop_type}</span>
                          </div>
                        ) : <span style={{ color: "var(--ag-text-muted)" }}>—</span>}
                      </td>
                      <td className="py-2.5" style={{ color: "var(--ag-text-secondary)" }}>{fmt(parseFloat(f.acres))} ac</td>
                      <td className="py-2.5" style={{ color: "var(--ag-text-secondary)" }}>
                        {f.seeding_date ? new Date(f.seeding_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "—"}
                      </td>
                      <td className="py-2.5" style={{ color: "var(--ag-text-secondary)" }}>
                        {parseFloat(f.actual_total) > 0 ? `$${fmt(parseFloat(f.actual_total))}` : "—"}
                      </td>
                      <td className="py-2.5" style={{ color: parseFloat(f.actual_revenue) > 0 ? "var(--ag-green)" : "var(--ag-text-muted)" }}>
                        {parseFloat(f.actual_revenue) > 0 ? `$${fmt(parseFloat(f.actual_revenue))}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>No fields added yet.</p>
          )}
        </div>

        {/* Machinery Pulse — 1/3 width */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Tractor size={14} style={{ color: "var(--ag-blue)" }} />
            <span className="text-[11px] font-semibold tracking-[1.5px] uppercase" style={{ color: "var(--ag-text-muted)" }}>
              Machinery Pulse
            </span>
          </div>
          {machinery ? (
            <div className="space-y-4">
              {/* Service Schedule */}
              <div>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--ag-text-secondary)" }}>Service Schedule</p>
                <div className="space-y-2">
                  {machinery.schedule.overdue > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={13} style={{ color: "var(--ag-red)" }} />
                        <span className="text-xs" style={{ color: "var(--ag-red)" }}>Overdue</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "var(--ag-red)" }}>{machinery.schedule.overdue}</span>
                    </div>
                  )}
                  {machinery.schedule.due_soon > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
                      <div className="flex items-center gap-2">
                        <Clock size={13} style={{ color: "#f97316" }} />
                        <span className="text-xs" style={{ color: "#f97316" }}>Due Soon</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "#f97316" }}>{machinery.schedule.due_soon}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={13} style={{ color: "var(--ag-green)" }} />
                      <span className="text-xs" style={{ color: "var(--ag-green)" }}>On Track</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--ag-green)" }}>{machinery.schedule.on_track}</span>
                  </div>
                </div>
              </div>
              {/* Downtime */}
              <div style={{ borderTop: "1px solid var(--ag-border)", paddingTop: "1rem" }}>
                <p className="text-xs font-semibold mb-2" style={{ color: "var(--ag-text-secondary)" }}>Downtime</p>
                <div className="flex justify-between">
                  <div>
                    <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Active</p>
                    <p className="text-lg font-bold" style={{ color: machinery.downtime.active_downtime > 0 ? "var(--ag-red)" : "var(--ag-green)" }}>
                      {machinery.downtime.active_downtime}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Total Incidents</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>{machinery.downtime.total_incidents}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Cost Impact</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(machinery.downtime.total_downtime_cost)}</p>
                  </div>
                </div>
              </div>
              {/* Maintenance */}
              <div style={{ borderTop: "1px solid var(--ag-border)", paddingTop: "1rem" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--ag-text-secondary)" }}>Maintenance YTD</p>
                <p className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(machinery.service.total_cost)}</p>
<p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>{machinery.service.total_logs} service logs · {machinery.service.last_30_days} last 30 days</p>
              </div>
              <Link href="/machinery" className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-semibold transition-colors"
                style={{ backgroundColor: "var(--ag-bg-hover)", color: "var(--ag-text-secondary)" }}>
                <Wrench size={12} /> View Machinery
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: "var(--ag-bg-hover)" }} />)}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Scout Reports + Budget vs Actual ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Recent Scout Reports */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye size={14} style={{ color: "#8b5cf6" }} />
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase" style={{ color: "var(--ag-text-muted)" }}>
                Recent Scout Reports
              </span>
            </div>
            <Link href="/agronomy" className="text-xs font-semibold" style={{ color: "var(--ag-accent)" }}>View All →</Link>
          </div>
          {scoutEntries.length > 0 ? (
            <div className="space-y-2">
              {scoutEntries.map((entry, i) => (
                <div key={entry.id} className="flex items-start justify-between p-3 rounded-lg"
                  style={{ backgroundColor: "var(--ag-bg-hover)", borderBottom: i < scoutEntries.length - 1 ? "none" : "none" }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--ag-text-primary)" }}>{entry.field_name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold capitalize shrink-0"
                        style={{ backgroundColor: `${SEVERITY_COLORS[entry.severity] || "#9ca3af"}20`, color: SEVERITY_COLORS[entry.severity] || "#9ca3af" }}>
                        {entry.severity}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>{entry.issue_type} · {entry.crop}</p>
                  </div>
                  <p className="text-xs shrink-0 ml-3" style={{ color: "var(--ag-text-muted)" }}>
                    {new Date(entry.date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Eye size={24} className="mx-auto mb-2" style={{ color: "var(--ag-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>No scout reports yet.</p>
              <Link href="/agronomy" className="text-xs font-semibold mt-1 inline-block" style={{ color: "var(--ag-accent)" }}>Start scouting →</Link>
            </div>
          )}
        </div>

        {/* Budget vs Actual */}
        {kpis && (
          <div className="rounded-xl p-5" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} style={{ color: "var(--ag-blue)" }} />
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase" style={{ color: "var(--ag-text-muted)" }}>
                Budget vs Actual
              </span>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: "var(--ag-text-secondary)" }}>Costs</span>
                  <span className="text-sm font-semibold" style={{ color: kpis.costVariance > 0 ? "var(--ag-red)" : "var(--ag-green)" }}>
                    {kpis.costVariance > 0 ? "+" : ""}${fmt(kpis.costVariance)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--ag-bg-hover)" }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ag-text-muted)" }}>Budget</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(kpis.totalBudgetCost)}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--ag-bg-hover)" }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ag-text-muted)" }}>Actual</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(kpis.totalActualCost)}</p>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: "var(--ag-text-secondary)" }}>Revenue</span>
                  <span className="text-sm font-semibold" style={{ color: (kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "var(--ag-green)" : "var(--ag-red)" }}>
                    {(kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "+" : ""}${fmt(kpis.totalActualRevenue - kpis.totalBudgetRevenue)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--ag-bg-hover)" }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ag-text-muted)" }}>Budget</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(kpis.totalBudgetRevenue)}</p>
                  </div>
                  <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--ag-bg-hover)" }}>
                    <p className="text-[10px] uppercase tracking-wide" style={{ color: "var(--ag-text-muted)" }}>Actual</p>
                    <p className="text-lg font-bold" style={{ color: "var(--ag-text-primary)" }}>${fmt(kpis.totalActualRevenue)}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl px-4 py-3" style={{
                backgroundColor: kpis.netMarginActual >= 0 ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${kpis.netMarginActual >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {kpis.netMarginActual >= 0 ? <TrendingUp size={16} style={{ color: "var(--ag-green)" }} /> : <TrendingDown size={16} style={{ color: "var(--ag-red)" }} />}
                    <span className="text-sm font-semibold" style={{ color: kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)" }}>Net Margin</span>
                  </div>
                  <span className="text-xl font-bold" style={{ color: kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)" }}>${fmt(kpis.netMarginActual)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Links ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/fields", icon: MapPin, color: "var(--ag-green)", label: "Fields", desc: kpis ? `${kpis.totalFields} fields · ${fmt(kpis.totalAcres)} acres` : "Manage your fields" },
          { href: "/maps", icon: MapPin, color: "var(--ag-blue)", label: "Maps", desc: "Scout reports & field maps" },
          { href: "/agronomy", icon: Sprout, color: "#8b5cf6", label: "Agronomy", desc: "Crop plans & spray calendar" },
          { href: "/operations/import-data", icon: Upload, color: "var(--ag-yellow)", label: "Import Data", desc: "Upload Excel files & scale tickets" },
        ].map(({ href, icon: Icon, color, label, desc }) => (
          <Link key={href} href={href}
            className="rounded-xl p-4 flex items-center justify-between group transition-all"
            style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                <Icon size={18} style={{ color }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--ag-text-primary)" }}>{label}</p>
                <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>{desc}</p>
              </div>
            </div>
            <ArrowRight size={15} style={{ color: "var(--ag-text-muted)" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}