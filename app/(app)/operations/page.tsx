"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Upload, Wheat, ArrowRight, TrendingUp, TrendingDown,
  BarChart3, DollarSign, Target, Sprout,
} from "lucide-react";

/* ───── Types ──────────────────────────────────────────── */
interface KPIs {
  totalFields: number;
  totalAcres: number;
  seededAcres: number;
  seededCount: number;
  unseededCount: number;
  totalBudgetCost: number;
  totalActualCost: number;
  totalBudgetRevenue: number;
  totalActualRevenue: number;
  costVariance: number;
  avgCostPerAcre: number;
  netMarginActual: number;
  netMarginBudget: number;
}

interface CropBreakdown {
  [crop: string]: { acres: number; count: number };
}

const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa", Other: "#9ca3af",
};

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}
function fmtD(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ───── Mini Donut ─────────────────────────────────────── */
function MiniDonut({
  value, max, color, size = 56, strokeWidth = 5, showLabel = false,
}: {
  value: number; max: number; color: string;
  size?: number; strokeWidth?: number; showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold text-white">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}

/* ───── KPI Card ───────────────────────────────────────── */
function KpiCard({
  icon: Icon, iconColor, label, value, subtitle, donut,
}: {
  icon: React.ElementType; iconColor: string; label: string;
  value: React.ReactNode; subtitle?: string;
  donut?: { value: number; max: number; color: string; showLabel?: boolean };
}) {
  return (
    <div className="bg-ag-card border border-ag rounded-xl p-5 flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Icon size={14} style={{ color: iconColor }} />
          <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
            {label}
          </span>
        </div>
        <div className="text-2xl font-bold text-white leading-none">{value}</div>
        {subtitle && <p className="text-[12px] text-ag-muted mt-1.5">{subtitle}</p>}
      </div>
      {donut && (
        <MiniDonut
          value={donut.value} max={donut.max} color={donut.color}
          showLabel={donut.showLabel}
        />
      )}
    </div>
  );
}

/* ═══════ MAIN PAGE ═══════════════════════════════════════ */
export default function OperationsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<CropBreakdown>({});
  const [loading, setLoading] = useState(true);
  const cropYear = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
        const data = await res.json();
        setKpis(data.kpis || null);
        setCropBreakdown(data.cropBreakdown || {});
      } catch (err) {
        console.error("Error loading operations data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-6 text-ag-muted">Loading operations...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ag-primary">Operations</h1>
        <p className="text-ag-muted text-sm mt-1">
          Farm operations overview — {cropYear} crop year
        </p>
      </div>

      {/* ── KPI Strip ─────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <KpiCard
            icon={MapPin} iconColor="var(--ag-green)" label="Total Acres"
            value={fmt(kpis.totalAcres)}
            subtitle={`${kpis.totalFields} fields · ${kpis.seededCount} seeded`}
            donut={{ value: kpis.seededCount, max: kpis.totalFields, color: "var(--ag-green)", showLabel: true }}
          />
          <KpiCard
            icon={DollarSign} iconColor="var(--ag-yellow)" label="Total Costs"
            value={<>${fmt(kpis.totalActualCost)}</>}
            subtitle={`$${fmtD(kpis.avgCostPerAcre)}/ac avg`}
            donut={{
              value: kpis.totalActualCost,
              max: kpis.totalBudgetCost || kpis.totalActualCost,
              color: kpis.totalActualCost > kpis.totalBudgetCost ? "var(--ag-red)" : "var(--ag-green)",
              showLabel: true,
            }}
          />
          <KpiCard
            icon={Target} iconColor="var(--ag-blue)" label="Total Revenue"
            value={<>${fmt(kpis.totalActualRevenue)}</>}
            subtitle={`$${kpis.seededAcres > 0 ? fmtD(kpis.totalActualRevenue / kpis.seededAcres) : "0.00"}/ac`}
          />
          <KpiCard
            icon={kpis.netMarginActual >= 0 ? TrendingUp : TrendingDown}
            iconColor={kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)"}
            label="Net Margin"
            value={
              <span className={kpis.netMarginActual >= 0 ? "text-emerald-400" : "text-red-400"}>
                ${fmt(kpis.netMarginActual)}
              </span>
            }
            subtitle={`$${kpis.seededAcres > 0 ? fmtD(kpis.netMarginActual / kpis.seededAcres) : "0.00"}/ac`}
            donut={{
              value: Math.abs(kpis.netMarginActual),
              max: kpis.totalActualRevenue || 1,
              color: kpis.netMarginActual >= 0 ? "var(--ag-green)" : "var(--ag-red)",
            }}
          />
        </div>
      )}

      {/* ── Crop Mix + Budget vs Actual ───────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

        {/* Crop Mix */}
        <div className="bg-ag-card border border-ag rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sprout size={14} className="text-[var(--ag-green)]" />
            <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
              Crop Mix — {cropYear}
            </span>
          </div>
          {Object.keys(cropBreakdown).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(cropBreakdown)
                .sort((a, b) => b[1].acres - a[1].acres)
                .map(([crop, data]) => {
                  const pct = kpis && kpis.seededAcres > 0 ? (data.acres / kpis.seededAcres) * 100 : 0;
                  return (
                    <div key={crop}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CROP_COLORS[crop] || "#9ca3af" }} />
                          <span className="text-sm text-ag-primary font-medium">{crop}</span>
                        </div>
                        <span className="text-sm text-ag-secondary">
                          {fmt(data.acres)} ac · {data.count} field{data.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: CROP_COLORS[crop] || "#9ca3af" }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-ag-dim">No crops assigned yet</p>
          )}
        </div>

        {/* Budget vs Actual */}
        {kpis && (
          <div className="bg-ag-card border border-ag rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-[var(--ag-blue)]" />
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
                Budget vs Actual
              </span>
            </div>

            <div className="space-y-5">
              {/* Costs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ag-secondary font-medium">Costs</span>
                  <span className={`text-sm font-semibold ${kpis.costVariance > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {kpis.costVariance > 0 ? "+" : ""}${fmt(kpis.costVariance)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--ag-bg-hover)] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-ag-muted tracking-wide uppercase">Budget</p>
                    <p className="text-lg font-bold text-ag-primary">${fmt(kpis.totalBudgetCost)}</p>
                  </div>
                  <div className="bg-[var(--ag-bg-hover)] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-ag-muted tracking-wide uppercase">Actual</p>
                    <p className="text-lg font-bold text-ag-primary">${fmt(kpis.totalActualCost)}</p>
                  </div>
                </div>
              </div>

              {/* Revenue */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-ag-secondary font-medium">Revenue</span>
                  <span className={`text-sm font-semibold ${(kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {(kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "+" : ""}
                    ${fmt(kpis.totalActualRevenue - kpis.totalBudgetRevenue)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--ag-bg-hover)] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-ag-muted tracking-wide uppercase">Budget</p>
                    <p className="text-lg font-bold text-ag-primary">${fmt(kpis.totalBudgetRevenue)}</p>
                  </div>
                  <div className="bg-[var(--ag-bg-hover)] rounded-lg px-3 py-2.5">
                    <p className="text-[10px] text-ag-muted tracking-wide uppercase">Actual</p>
                    <p className="text-lg font-bold text-ag-primary">${fmt(kpis.totalActualRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Net Margin bar */}
              <div className={`rounded-xl px-4 py-3 border ${kpis.netMarginActual >= 0 ? "bg-emerald-500/[0.08] border-emerald-500/20" : "bg-red-500/[0.08] border-red-500/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {kpis.netMarginActual >= 0 ? (
                      <TrendingUp size={16} className="text-emerald-400" />
                    ) : (
                      <TrendingDown size={16} className="text-red-400" />
                    )}
                    <span className={`text-sm font-semibold ${kpis.netMarginActual >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      Net Margin
                    </span>
                  </div>
                  <span className={`text-xl font-bold ${kpis.netMarginActual >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${fmt(kpis.netMarginActual)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Quick Links ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/fields"
          className="bg-ag-card border border-ag rounded-xl p-5 hover:border-[var(--ag-accent)]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--ag-accent)]/10 flex items-center justify-center">
                <MapPin size={20} className="text-[var(--ag-green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ag-primary group-hover:text-[var(--ag-green)] transition-colors">Fields</p>
                <p className="text-xs text-ag-muted">
                  {kpis ? `${kpis.totalFields} fields · ${fmt(kpis.totalAcres)} acres` : "Manage your fields"}
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-ag-dim group-hover:text-[var(--ag-green)] transition-colors" />
          </div>
        </Link>
        <Link
          href="/imports"
          className="bg-ag-card border border-ag rounded-xl p-5 hover:border-[var(--ag-accent)]/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--ag-blue)]/10 flex items-center justify-center">
                <Upload size={20} className="text-[var(--ag-blue)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ag-primary group-hover:text-[var(--ag-green)] transition-colors">Import Data</p>
                <p className="text-xs text-ag-muted">Upload Excel files, scale tickets, and more</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-ag-dim group-hover:text-[var(--ag-green)] transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}