"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus, Pencil, Sprout, DollarSign, LayoutGrid, List,
  ArrowUpDown, Filter, MapPin, Wheat, TrendingUp,
  TrendingDown, BarChart3, Target,
} from "lucide-react";
import AddFieldModal from "@/components/fields/AddFieldModal";
import EditFieldModal from "@/components/fields/EditFieldModal";
import AddCropModal from "@/components/fields/AddCropModal";
import AddCostModal from "@/components/fields/AddCostModal";
import { useRouter } from "next/navigation";

/* ───── Types ──────────────────────────────────────────── */
interface FieldRow {
  id: string;
  field_name: string;
  acres: number;
  lld_quarter: string;
  lld_section: number;
  lld_township: number;
  lld_range: number;
  lld_meridian: number;
  lld_province: string;
  notes: string;
  crop_id: string | null;
  crop_year: number | null;
  crop_type: string | null;
  variety: string | null;
  seeded_acres: number | null;
  expected_yield_bu_ac: number | null;
  seeding_date: string | null;
  crop_status: string | null;
  budget_total: number;
  actual_total: number;
  budget_revenue: number;
  actual_revenue: number;
}

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

/* ───── Design Tokens ──────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
  planned: "bg-[#334155] text-ag-secondary",
  seeded: "bg-[#1E3A5F] text-[#60A5FA]",
  growing: "bg-[#14532D] text-[#4ADE80]",
  harvested: "bg-[#78350F] text-[#FBBF24]",
};

const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa", Other: "#9ca3af",
};

type SortKey = "name" | "acres" | "crop" | "variance" | "costPerAcre";

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}
function fmtD(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ───── Mini Donut Chart ───────────────────────────────── */
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
export default function FieldsPage() {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<Record<string, { acres: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldRow | null>(null);
  const [addingCropToField, setAddingCropToField] = useState<FieldRow | null>(null);
  const [addingCostToCrop, setAddingCostToCrop] = useState<{
    fieldCropId: string; fieldName: string; cropType: string;
  } | null>(null);
  const router = useRouter();

  async function fetchFields() {
    try {
      const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
      const data = await res.json();
      setFields(data.fields || []);
      setKpis(data.kpis || null);
      setCropBreakdown(data.cropBreakdown || {});
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchFields();
  }, [cropYear]);

  const cropTypes = useMemo(() => {
    const types = new Set<string>();
    fields.forEach((f) => { if (f.crop_type) types.add(f.crop_type); });
    return Array.from(types).sort();
  }, [fields]);

  const displayFields = useMemo(() => {
    let filtered = [...fields];
    if (filterCrop !== "all") filtered = filtered.filter((f) => f.crop_type === filterCrop);
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "name": return a.field_name.localeCompare(b.field_name);
        case "acres": return (b.acres || 0) - (a.acres || 0);
        case "crop": return (a.crop_type || "zzz").localeCompare(b.crop_type || "zzz");
        case "variance": {
          const va = (parseFloat(String(a.actual_total)) || 0) - (parseFloat(String(a.budget_total)) || 0);
          const vb = (parseFloat(String(b.actual_total)) || 0) - (parseFloat(String(b.budget_total)) || 0);
          return va - vb;
        }
        case "costPerAcre": {
          const ca = a.acres > 0 ? (parseFloat(String(a.actual_total)) || 0) / a.acres : 0;
          const cb = b.acres > 0 ? (parseFloat(String(b.actual_total)) || 0) / b.acres : 0;
          return cb - ca;
        }
        default: return 0;
      }
    });
    return filtered;
  }, [fields, filterCrop, sortKey]);

  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 3; y--) yearOptions.push(y);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ag-primary">Fields</h1>
          <p className="text-ag-muted text-sm mt-1">
            Field management &amp; profitability tracking — crop year {cropYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={cropYear}
            onChange={(e) => setCropYear(parseInt(e.target.value))}
            className="bg-ag-card border border-ag rounded-lg px-3 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-[#34D399]"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#34D399] hover:bg-[#2CC48D] text-[#0F1629] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} />
            Add Field
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─────────────────────────────────── */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <KpiCard
            icon={MapPin} iconColor="#34D399" label="Total Fields"
            value={kpis.totalFields}
            subtitle={`${kpis.seededCount} seeded · ${kpis.unseededCount} unassigned`}
            donut={{ value: kpis.seededCount, max: kpis.totalFields, color: "#34D399", showLabel: true }}
          />
          <KpiCard
            icon={Wheat} iconColor="#60A5FA" label="Total Acres"
            value={fmt(kpis.totalAcres)}
            subtitle={`${fmt(kpis.seededAcres)} seeded`}
            donut={{ value: kpis.seededAcres, max: kpis.totalAcres, color: "#60A5FA", showLabel: true }}
          />
          <KpiCard
            icon={Target} iconColor="#FBBF24" label="Budget Cost"
            value={<>${fmt(kpis.totalBudgetCost)}</>}
            subtitle={`$${kpis.seededAcres > 0 ? fmtD(kpis.totalBudgetCost / kpis.seededAcres) : "0.00"}/ac`}
          />
          <KpiCard
            icon={DollarSign} iconColor="#34D399" label="Actual Cost"
            value={<>${fmt(kpis.totalActualCost)}</>}
            subtitle={`$${fmtD(kpis.avgCostPerAcre)}/ac`}
            donut={{
              value: kpis.totalActualCost,
              max: kpis.totalBudgetCost || kpis.totalActualCost,
              color: kpis.totalActualCost > kpis.totalBudgetCost ? "#EF4444" : "#34D399",
              showLabel: true,
            }}
          />
          <KpiCard
            icon={kpis.costVariance > 0 ? TrendingUp : TrendingDown}
            iconColor={kpis.costVariance > 0 ? "#EF4444" : "#34D399"}
            label="Cost Variance"
            value={
              <span className={kpis.costVariance > 0 ? "text-red-400" : "text-emerald-400"}>
                {kpis.costVariance > 0 ? "+" : ""}${fmt(kpis.costVariance)}
              </span>
            }
            subtitle={kpis.costVariance > 0 ? "Over budget" : "Under budget"}
          />
          <KpiCard
            icon={BarChart3}
            iconColor={kpis.netMarginActual >= 0 ? "#34D399" : "#EF4444"}
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
              color: kpis.netMarginActual >= 0 ? "#34D399" : "#EF4444",
            }}
          />
        </div>
      )}

      {/* ── Crop Mix Bar ──────────────────────────────── */}
      {Object.keys(cropBreakdown).length > 0 && kpis && kpis.seededAcres > 0 && (
        <div className="bg-ag-card border border-ag rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sprout size={14} className="text-[#34D399]" />
            <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
              Crop Mix — {cropYear}
            </span>
          </div>
          <div className="flex rounded-lg overflow-hidden h-3 mb-3">
            {Object.entries(cropBreakdown)
              .sort((a, b) => b[1].acres - a[1].acres)
              .map(([crop, data]) => (
                <div
                  key={crop}
                  className="transition-all"
                  style={{
                    width: `${(data.acres / kpis.seededAcres) * 100}%`,
                    backgroundColor: CROP_COLORS[crop] || "#9ca3af",
                  }}
                  title={`${crop}: ${fmt(data.acres)} ac`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {Object.entries(cropBreakdown)
              .sort((a, b) => b[1].acres - a[1].acres)
              .map(([crop, data]) => (
                <div key={crop} className="flex items-center gap-1.5 text-xs text-ag-secondary">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CROP_COLORS[crop] || "#9ca3af" }} />
                  {crop}: {fmt(data.acres)} ac ({data.count})
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Toolbar ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-ag-muted" />
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="bg-ag-card border border-ag rounded-lg px-2 py-1.5 text-xs text-ag-secondary focus:outline-none focus:ring-2 focus:ring-[#34D399]"
            >
              <option value="all">All Crops</option>
              {cropTypes.map((ct) => (<option key={ct} value={ct}>{ct}</option>))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={14} className="text-ag-muted" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-ag-card border border-ag rounded-lg px-2 py-1.5 text-xs text-ag-secondary focus:outline-none focus:ring-2 focus:ring-[#34D399]"
            >
              <option value="name">Name</option>
              <option value="acres">Acres</option>
              <option value="crop">Crop</option>
              <option value="variance">Variance</option>
              <option value="costPerAcre">Cost/Acre</option>
            </select>
          </div>
        </div>
        <div className="flex rounded-lg border border-ag overflow-hidden">
          <button
            onClick={() => setViewMode("card")}
            className={`px-3 py-1.5 transition-colors ${viewMode === "card" ? "bg-[#34D399] text-[#0F1629]" : "bg-ag-card text-ag-muted hover:text-ag-secondary"}`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 transition-colors ${viewMode === "table" ? "bg-[#34D399] text-[#0F1629]" : "bg-ag-card text-ag-muted hover:text-ag-secondary"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────── */}
      {loading ? (
        <p className="text-ag-muted">Loading fields...</p>
      ) : fields.length === 0 ? (
        <div className="border border-dashed border-ag rounded-xl p-12 text-center">
          <p className="text-ag-secondary text-lg">No fields yet</p>
          <p className="text-ag-muted text-sm mt-2">Click &quot;Add Field&quot; to get started</p>
        </div>
      ) : viewMode === "card" ? (
        /* ═══ CARD VIEW ═══ */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayFields.map((field) => {
            const cropColor = field.crop_type ? CROP_COLORS[field.crop_type] || "#9ca3af" : null;
            const budget = parseFloat(String(field.budget_total)) || 0;
            const actual = parseFloat(String(field.actual_total)) || 0;
            const variance = actual - budget;
            const actualRev = parseFloat(String(field.actual_revenue)) || 0;
            const margin = actualRev - actual;
            const expectedProd = (parseFloat(String(field.expected_yield_bu_ac)) || 0) *
              (parseFloat(String(field.seeded_acres)) || parseFloat(String(field.acres)) || 0);
            const budgetPct = budget > 0 ? Math.min((actual / budget) * 100, 100) : 0;

            return (
              <div
                key={field.id}
                onClick={() => router.push(`/fields/${field.id}`)}
                className="bg-ag-card border border-ag rounded-xl overflow-hidden cursor-pointer hover:border-[#34D399]/40 transition-all group"
              >
                {/* Crop colour bar */}
                <div className="h-1 w-full" style={{ backgroundColor: cropColor || "#1E293B" }} />

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-ag-primary font-semibold text-base group-hover:text-[#34D399] transition-colors">
                        {field.field_name}
                      </h3>
                      <p className="text-ag-muted text-sm mt-0.5">{field.acres} acres</p>
                      {field.lld_quarter && (
                        <p className="text-ag-dim text-xs mt-0.5">
                          {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingField(field); }}
                      className="text-ag-dim hover:text-[#34D399] transition-colors p-1"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>

                  {field.crop_type ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cropColor! }} />
                          <span className="text-sm text-ag-primary font-medium">{field.crop_type}</span>
                          {field.variety && <span className="text-xs text-ag-muted">{field.variety}</span>}
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[field.crop_status || "planned"]}`}>
                          {(field.crop_status || "planned").charAt(0).toUpperCase() + (field.crop_status || "planned").slice(1)}
                        </span>
                      </div>

                      {field.expected_yield_bu_ac && (
                        <p className="text-xs text-ag-muted mt-2">
                          Est. {fmt(expectedProd)} bu ({field.expected_yield_bu_ac} bu/ac)
                        </p>
                      )}

                      {/* Budget utilization bar */}
                      {budget > 0 && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-[11px] text-ag-muted mb-1">
                            <span>Budget utilization</span>
                            <span className={budgetPct > 100 ? "text-red-400" : "text-ag-secondary"}>
                              {budgetPct.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(budgetPct, 100)}%`,
                                backgroundColor: budgetPct > 100 ? "#EF4444" : budgetPct > 85 ? "#FBBF24" : "#34D399",
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Financials grid */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ag-muted">Budget</p>
                          <p className="text-sm font-semibold text-ag-primary">${fmtD(budget)}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ag-muted">Actual</p>
                          <p className="text-sm font-semibold text-ag-primary">${fmtD(actual)}</p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ag-muted">Variance</p>
                          <p className={`text-sm font-semibold ${variance > 0 ? "text-red-400" : "text-emerald-400"}`}>
                            {variance > 0 ? "+" : ""}${fmtD(variance)}
                          </p>
                        </div>
                        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ag-muted">Net Margin</p>
                          <p className={`text-sm font-semibold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${fmtD(margin)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingCostToCrop({
                            fieldCropId: field.crop_id!, fieldName: field.field_name, cropType: field.crop_type!,
                          });
                        }}
                        className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-[#34D399] font-semibold border border-[#34D399]/30 hover:bg-[#34D399]/10 rounded-lg py-2 transition-colors"
                      >
                        <DollarSign size={12} />
                        Add Cost
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setAddingCropToField(field); }}
                      className="mt-4 flex items-center gap-1.5 text-xs text-[#34D399] font-semibold hover:text-[#2CC48D]"
                    >
                      <Sprout size={13} />
                      Assign {cropYear} Crop
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ═══ TABLE VIEW ═══ */
        <div className="bg-ag-card border border-ag rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ag">
                  {["Field", "Acres", "Crop", "Status", "Budget", "Actual", "Variance", "$/Acre"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-[11px] font-semibold tracking-[1px] uppercase text-ag-muted ${i === 0 || i === 2 ? "text-left" : i === 3 ? "text-center" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]/60">
                {displayFields.map((field) => {
                  const budget = parseFloat(String(field.budget_total)) || 0;
                  const actual = parseFloat(String(field.actual_total)) || 0;
                  const variance = actual - budget;
                  const cpa = field.acres > 0 ? actual / field.acres : 0;

                  return (
                    <tr
                      key={field.id}
                      onClick={() => router.push(`/fields/${field.id}`)}
                      className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ag-primary">{field.field_name}</p>
                        {field.lld_quarter && (
                          <p className="text-[11px] text-ag-dim">
                            {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-ag-secondary">{field.acres}</td>
                      <td className="px-4 py-3">
                        {field.crop_type ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CROP_COLORS[field.crop_type] || "#9ca3af" }} />
                            <span className="text-ag-primary">{field.crop_type}</span>
                          </div>
                        ) : (
                          <span className="text-ag-dim">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {field.crop_status ? (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[field.crop_status]}`}>
                            {field.crop_status.charAt(0).toUpperCase() + field.crop_status.slice(1)}
                          </span>
                        ) : <span className="text-ag-dim">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-ag-secondary">{budget > 0 ? `$${fmtD(budget)}` : "—"}</td>
                      <td className="px-4 py-3 text-right text-ag-secondary">{actual > 0 ? `$${fmtD(actual)}` : "—"}</td>
                      <td className={`px-4 py-3 text-right font-medium ${variance > 0 ? "text-red-400" : variance < 0 ? "text-emerald-400" : "text-ag-dim"}`}>
                        {budget > 0 || actual > 0 ? `${variance > 0 ? "+" : ""}$${fmtD(variance)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-ag-secondary">{actual > 0 ? `$${fmtD(cpa)}` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modals ────────────────────────────────────── */}
      {showAddModal && <AddFieldModal onClose={() => setShowAddModal(false)} onFieldAdded={fetchFields} />}
      {editingField && <EditFieldModal field={editingField} onClose={() => setEditingField(null)} onFieldUpdated={fetchFields} />}
      {addingCropToField && <AddCropModal fieldId={addingCropToField.id} fieldName={addingCropToField.field_name} onClose={() => setAddingCropToField(null)} onCropAdded={fetchFields} />}
      {addingCostToCrop && <AddCostModal fieldCropId={addingCostToCrop.fieldCropId} fieldName={addingCostToCrop.fieldName} cropType={addingCostToCrop.cropType} onClose={() => setAddingCostToCrop(null)} onCostAdded={fetchFields} />}
    </div>
  );
}