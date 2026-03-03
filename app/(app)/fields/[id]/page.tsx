"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Plus, Trash2, DollarSign, TrendingUp, TrendingDown,
  BarChart3, Wheat, Target, Sprout, Package, FileText, Bug,
  Calendar, MapPin,
} from "lucide-react";
import AddCostModal from "@/components/fields/AddCostModal";
import AddRevenueModal from "@/components/fields/AddRevenueModal";

/* ───── Types ──────────────────────────────────────────── */
interface Cost {
  id: string; cost_type: string; category: string; description: string;
  amount_per_acre: number; total_amount: number; date_incurred: string; notes: string;
}
interface Revenue {
  id: string; revenue_type: string; source: string; description: string;
  bushels: number; price_per_bu: number; total_revenue: number; date: string;
}
interface Crop {
  id: string; crop_year: number; crop_type: string; variety: string;
  seeded_acres: number; expected_yield_bu_ac: number; seeding_date: string; status: string;
}
interface Field {
  id: string; field_name: string; acres: number;
  lld_quarter: string; lld_section: number; lld_township: number;
  lld_range: number; lld_meridian: number; lld_province: string; notes: string;
}

/* ───── Design Tokens ──────────────────────────────────── */
const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa", Other: "#9ca3af",
};

const CATEGORY_ORDER = [
  "Seed", "Fertilizer", "Chemical", "Fuel",
  "Labour", "Land Rent", "Custom Work", "Crop Insurance", "Other",
];

const CATEGORY_COLORS: Record<string, string> = {
  Seed: "var(--ag-green)", Fertilizer: "var(--ag-blue)", Chemical: "var(--ag-yellow)",
  Fuel: "var(--ag-red)", Labour: "#8B5CF6", "Land Rent": "#EC4899",
  "Custom Work": "#14B8A6", "Crop Insurance": "#F97316", Other: "#6B7280",
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-[#334155] text-ag-secondary",
  seeded: "bg-[#1E3A5F] text-[var(--ag-blue)]",
  growing: "bg-[#14532D] text-[#4ADE80]",
  harvested: "bg-[#78350F] text-[var(--ag-yellow)]",
};

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}
function fmtD(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ───── Mini Donut ─────────────────────────────────────── */
function MiniDonut({
  value, max, color, size = 48, strokeWidth = 4, showLabel = false,
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
          <span className="text-[10px] font-bold text-white">{Math.round(pct)}%</span>
        </div>
      )}
    </div>
  );
}

/* ═══════ MAIN PAGE ═══════════════════════════════════════ */
export default function FieldDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [field, setField] = useState<Field | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [costView, setCostView] = useState<"budget" | "actual">("actual");
  const [activeTab, setActiveTab] = useState<"costs" | "revenue">("costs");
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);

  async function fetchData() {
    try {
      const fieldRes = await fetch(`/api/fields/${id}`);
      const fieldData = await fieldRes.json();
      setField(fieldData.field);

      const cropRes = await fetch(`/api/fields/${id}/crops`);
      const cropData = await cropRes.json();
      const currentCrop = cropData.crops?.find(
        (c: Crop) => c.crop_year === new Date().getFullYear()
      );
      setCrop(currentCrop || null);

      if (currentCrop) {
        const costRes = await fetch(`/api/field-crops/${currentCrop.id}/costs`);
        const costData = await costRes.json();
        setCosts(costData.costs || []);

        const revRes = await fetch(`/api/field-crops/${currentCrop.id}/revenue`);
        const revData = await revRes.json();
        setRevenue(revData.revenue || []);
      }
    } catch (error) {
      console.error("Error fetching field data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (id) fetchData(); }, [id]);

  if (loading) return <div className="p-6 text-ag-muted">Loading field...</div>;
  if (!field) return <div className="p-6 text-ag-muted">Field not found.</div>;

  /* ── Computed values ────────────────────────────── */
  const filteredCosts = costs.filter((c) => c.cost_type === costView);
  const filteredRevenue = revenue.filter((r) => r.revenue_type === costView);

  const totalCost = filteredCosts.reduce((s, c) => s + (parseFloat(String(c.total_amount)) || 0), 0);
  const totalRevenue_ = filteredRevenue.reduce((s, r) => s + (parseFloat(String(r.total_revenue)) || 0), 0);
  const netMargin = totalRevenue_ - totalCost;
  const costPerAcre = field.acres > 0 ? totalCost / field.acres : 0;
  const revenuePerAcre = field.acres > 0 ? totalRevenue_ / field.acres : 0;

  const budgetCostTotal = costs.filter((c) => c.cost_type === "budget").reduce((s, c) => s + (parseFloat(String(c.total_amount)) || 0), 0);
  const actualCostTotal = costs.filter((c) => c.cost_type === "actual").reduce((s, c) => s + (parseFloat(String(c.total_amount)) || 0), 0);
  const variance = actualCostTotal - budgetCostTotal;
  const budgetPct = budgetCostTotal > 0 ? Math.min((actualCostTotal / budgetCostTotal) * 100, 150) : 0;

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filteredCosts.filter((c) => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Cost[]>);

  const cropColor = crop ? CROP_COLORS[crop.crop_type] || "#9ca3af" : "var(--ag-border-solid)";
  const expectedProd = crop ? (parseFloat(String(crop.expected_yield_bu_ac)) || 0) * (parseFloat(String(crop.seeded_acres)) || field.acres) : 0;

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Back ──────────────────────────────────────── */}
      <button
        onClick={() => router.push("/fields")}
        className="flex items-center gap-2 text-ag-muted hover:text-ag-primary text-sm mb-6 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Fields
      </button>

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-10 rounded-full" style={{ backgroundColor: cropColor }} />
            <div>
              <h1 className="text-2xl font-bold text-ag-primary">{field.field_name}</h1>
              <p className="text-ag-muted text-sm">{field.acres} acres</p>
            </div>
          </div>
          {field.lld_quarter && (
            <p className="text-ag-dim text-xs mt-2 ml-5">
              <MapPin size={11} className="inline mr-1" />
              {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
            </p>
          )}
          {crop && (
            <div className="flex items-center gap-3 mt-3 ml-5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cropColor }} />
                <span className="text-sm font-medium text-ag-primary">{crop.crop_type}</span>
                {crop.variety && <span className="text-sm text-ag-muted">{crop.variety}</span>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[crop.status || "planned"]}`}>
                {(crop.status || "planned").charAt(0).toUpperCase() + (crop.status || "planned").slice(1)}
              </span>
              {crop.seeding_date && (
                <span className="text-xs text-ag-dim flex items-center gap-1">
                  <Calendar size={11} /> Seeded {new Date(crop.seeding_date).toLocaleDateString("en-CA")}
                </span>
              )}
            </div>
          )}
        </div>
        {crop && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddRevenue(true)}
              className="flex items-center gap-2 border border-[var(--ag-accent)]/40 text-[var(--ag-green)] hover:bg-[var(--ag-accent)]/10 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Revenue
            </button>
            <button
              onClick={() => setShowAddCost(true)}
              className="flex items-center gap-2 bg-[var(--ag-accent)] hover:bg-[var(--ag-accent-hover)] text-[var(--ag-accent-text)] px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={16} />
              Cost
            </button>
          </div>
        )}
      </div>

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-ag-card border border-ag rounded-xl p-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={13} className="text-[var(--ag-green)]" />
              <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Revenue</span>
            </div>
            <p className="text-xl font-bold text-white">${fmt(totalRevenue_)}</p>
            <p className="text-[11px] text-ag-muted mt-1">${fmtD(revenuePerAcre)}/ac</p>
          </div>
        </div>

        <div className="bg-ag-card border border-ag rounded-xl p-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={13} className="text-[var(--ag-yellow)]" />
              <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Costs</span>
            </div>
            <p className="text-xl font-bold text-white">${fmt(totalCost)}</p>
            <p className="text-[11px] text-ag-muted mt-1">${fmtD(costPerAcre)}/ac</p>
          </div>
          {budgetCostTotal > 0 && (
            <MiniDonut
              value={actualCostTotal} max={budgetCostTotal}
              color={actualCostTotal > budgetCostTotal ? "var(--ag-red)" : "var(--ag-green)"}
              showLabel
            />
          )}
        </div>

        <div className="bg-ag-card border border-ag rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={13} className={netMargin >= 0 ? "text-[var(--ag-green)]" : "text-[var(--ag-red)]"} />
            <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Net Margin</span>
          </div>
          <p className={`text-xl font-bold ${netMargin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${fmt(netMargin)}
          </p>
          <p className="text-[11px] text-ag-muted mt-1">
            ${field.acres > 0 ? fmtD(netMargin / field.acres) : "0.00"}/ac
          </p>
        </div>

        <div className="bg-ag-card border border-ag rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={13} className={variance > 0 ? "text-[var(--ag-red)]" : "text-[var(--ag-green)]"} />
            <span className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Variance</span>
          </div>
          <p className={`text-xl font-bold ${variance > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {variance > 0 ? "+" : ""}${fmt(variance)}
          </p>
          <p className="text-[11px] text-ag-muted mt-1">{variance > 0 ? "Over budget" : "Under budget"}</p>
        </div>
      </div>

      {/* ── Budget Utilization Bar ─────────────────────── */}
      {budgetCostTotal > 0 && (
        <div className="bg-ag-card border border-ag rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
              Budget Utilization
            </span>
            <div className="flex items-center gap-4 text-xs text-ag-secondary">
              <span>Budget: ${fmt(budgetCostTotal)}</span>
              <span>Actual: ${fmt(actualCostTotal)}</span>
              <span className={`font-semibold ${budgetPct > 100 ? "text-red-400" : "text-emerald-400"}`}>
                {budgetPct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="w-full h-3 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(budgetPct, 100)}%`,
                backgroundColor: budgetPct > 100 ? "var(--ag-red)" : budgetPct > 85 ? "var(--ag-yellow)" : "var(--ag-green)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Cost Breakdown Visual (when actual tab) ──── */}
      {activeTab === "costs" && Object.keys(grouped).length > 0 && (
        <div className="bg-ag-card border border-ag rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} className="text-[var(--ag-yellow)]" />
            <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
              Cost Breakdown — {costView}
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(grouped).map(([category, items]) => {
              const catTotal = items.reduce((s, c) => s + (parseFloat(String(c.total_amount)) || 0), 0);
              const pct = totalCost > 0 ? (catTotal / totalCost) * 100 : 0;
              return (
                <div key={category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || "#6B7280" }} />
                      <span className="text-sm text-ag-primary font-medium">{category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ag-muted">{pct.toFixed(0)}%</span>
                      <span className="text-sm text-ag-secondary font-medium">${fmtD(catTotal)}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[category] || "#6B7280" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Expected Production ────────────────────────── */}
      {crop && crop.expected_yield_bu_ac && (
        <div className="bg-ag-card border border-ag rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wheat size={16} className="text-[var(--ag-yellow)]" />
            <div>
              <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Expected Production</span>
              <p className="text-lg font-bold text-white">{fmt(expectedProd)} bu</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-ag-secondary">{crop.expected_yield_bu_ac} bu/ac × {crop.seeded_acres || field.acres} ac</p>
            {totalRevenue_ > 0 && expectedProd > 0 && (
              <p className="text-xs text-ag-muted mt-0.5">Avg ${fmtD(totalRevenue_ / expectedProd)}/bu realized</p>
            )}
          </div>
        </div>
      )}

      {/* ── Toggle Bar ────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex rounded-lg border border-ag overflow-hidden">
          <button
            onClick={() => setActiveTab("costs")}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "costs" ? "bg-[var(--ag-accent)] text-[var(--ag-accent-text)]" : "bg-ag-card text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            Costs
          </button>
          <button
            onClick={() => setActiveTab("revenue")}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              activeTab === "revenue" ? "bg-[var(--ag-accent)] text-[var(--ag-accent-text)]" : "bg-ag-card text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            Revenue
          </button>
        </div>
        <div className="flex rounded-lg border border-ag overflow-hidden">
          <button
            onClick={() => setCostView("budget")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              costView === "budget" ? "bg-[var(--ag-blue)] text-[var(--ag-accent-text)]" : "bg-ag-card text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            Budget
          </button>
          <button
            onClick={() => setCostView("actual")}
            className={`px-4 py-2 text-sm font-semibold transition-colors ${
              costView === "actual" ? "bg-[var(--ag-blue)] text-[var(--ag-accent-text)]" : "bg-ag-card text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            Actual
          </button>
        </div>
      </div>

      {/* ── Costs Tab ─────────────────────────────────── */}
      {activeTab === "costs" && (
        <>
          {filteredCosts.length === 0 ? (
            <div className="border border-dashed border-ag rounded-xl p-10 text-center">
              <p className="text-ag-secondary">No {costView} costs entered yet</p>
              <p className="text-ag-dim text-sm mt-1">Click &quot;Cost&quot; to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(grouped).map(([category, items]) => {
                const categoryTotal = items.reduce((s, c) => s + (parseFloat(String(c.total_amount)) || 0), 0);
                return (
                  <div key={category} className="bg-ag-card border border-ag rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-ag">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || "#6B7280" }} />
                        <span className="text-sm font-semibold text-ag-primary">{category}</span>
                      </div>
                      <span className="text-sm font-semibold text-ag-primary">${fmtD(categoryTotal)}</span>
                    </div>
                    <div className="divide-y divide-[var(--ag-border-solid)]/60">
                      {items.map((cost) => (
                        <div key={cost.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex-1">
                            <p className="text-sm text-ag-primary">{cost.description || category}</p>
                            {cost.amount_per_acre > 0 && (
                              <p className="text-xs text-ag-dim mt-0.5">${parseFloat(String(cost.amount_per_acre)).toFixed(2)}/ac</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-ag-secondary">${fmtD(parseFloat(String(cost.total_amount)))}</p>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this cost entry?")) return;
                                await fetch(`/api/field-crops/${crop?.id}/costs/${cost.id}`, { method: "DELETE" });
                                fetchData();
                              }}
                              className="text-ag-dim hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Total bar */}
              <div className="bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-[var(--ag-green)] font-semibold">
                  Total {costView === "budget" ? "Budget" : "Actual"} Cost
                </span>
                <div className="text-right">
                  <p className="text-[var(--ag-green)] font-bold text-lg">${fmtD(totalCost)}</p>
                  <p className="text-[var(--ag-green)]/60 text-xs">${fmtD(costPerAcre)}/ac</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Revenue Tab ───────────────────────────────── */}
      {activeTab === "revenue" && (
        <>
          {filteredRevenue.length === 0 ? (
            <div className="border border-dashed border-ag rounded-xl p-10 text-center">
              <p className="text-ag-secondary">No {costView} revenue entered yet</p>
              <p className="text-ag-dim text-sm mt-1">Click &quot;Revenue&quot; to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-ag-card border border-ag rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-ag">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[var(--ag-green)]" />
                    <span className="text-sm font-semibold text-ag-primary">Revenue Entries</span>
                  </div>
                  <span className="text-sm font-semibold text-ag-primary">${fmtD(totalRevenue_)}</span>
                </div>
                <div className="divide-y divide-[var(--ag-border-solid)]/60">
                  {filteredRevenue.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm text-ag-primary">{rev.description || rev.source.replace("_", " ")}</p>
                        <p className="text-xs text-ag-dim mt-0.5">
                          {rev.bushels > 0 && `${parseFloat(String(rev.bushels)).toLocaleString()} bu`}
                          {rev.bushels > 0 && rev.price_per_bu > 0 && " @ "}
                          {rev.price_per_bu > 0 && `$${parseFloat(String(rev.price_per_bu)).toFixed(2)}/bu`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-emerald-400">${fmtD(parseFloat(String(rev.total_revenue)))}</p>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this revenue entry?")) return;
                            await fetch(`/api/field-crops/${crop?.id}/revenue/${rev.id}`, { method: "DELETE" });
                            fetchData();
                          }}
                          className="text-ag-dim hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Total bar */}
              <div className="bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-[var(--ag-green)] font-semibold">
                  Total {costView === "budget" ? "Budget" : "Actual"} Revenue
                </span>
                <div className="text-right">
                  <p className="text-[var(--ag-green)] font-bold text-lg">${fmtD(totalRevenue_)}</p>
                  <p className="text-[var(--ag-green)]/60 text-xs">${fmtD(revenuePerAcre)}/ac</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Cross-Module Links ────────────────────────── */}
      <div className="mt-8 mb-2">
        <span className="text-[11px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
          Linked Data
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <button
          onClick={() => window.location.href = crop ? `/marketing?crop=${encodeURIComponent(crop.crop_type)}` : "/marketing"}
          className="bg-ag-card border border-ag rounded-xl p-4 hover:border-[var(--ag-accent)]/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                <FileText size={18} className="text-[var(--ag-yellow)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ag-primary group-hover:text-[var(--ag-green)] transition-colors">Contracts</p>
                <p className="text-xs text-ag-muted">
                  {crop ? `View ${crop.crop_type} contracts` : "No crop assigned"}
                </p>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => window.location.href = crop ? `/inventory?crop=${encodeURIComponent(crop.crop_type)}` : "/inventory"}
          className="bg-ag-card border border-ag rounded-xl p-4 hover:border-[var(--ag-accent)]/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--ag-blue)]/10 flex items-center justify-center">
                <Package size={18} className="text-[var(--ag-blue)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ag-primary group-hover:text-[var(--ag-green)] transition-colors">Inventory Bins</p>
                <p className="text-xs text-ag-muted">{crop ? `View ${crop.crop_type} storage` : "View linked storage"}</p>
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => window.location.href = "/agronomy?tab=spray"}
          className="bg-ag-card border border-ag rounded-xl p-4 hover:border-[var(--ag-accent)]/40 transition-all text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--ag-accent)]/10 flex items-center justify-center">
                <Bug size={18} className="text-[var(--ag-green)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ag-primary group-hover:text-[var(--ag-green)] transition-colors">Spray Records</p>
                <p className="text-xs text-ag-muted">View spray calendar</p>
              </div>
            </div>
          </div>
        </button>

      </div>

      {/* ── Modals ────────────────────────────────────── */}
      {showAddCost && crop && (
        <AddCostModal fieldCropId={crop.id} fieldName={field.field_name} cropType={crop.crop_type}
          onClose={() => setShowAddCost(false)} onCostAdded={fetchData} />
      )}
      {showAddRevenue && crop && (
        <AddRevenueModal fieldCropId={crop.id} fieldName={field.field_name} cropType={crop.crop_type}
          onClose={() => setShowAddRevenue(false)} onRevenueAdded={fetchData} />
      )}
    </div>
  );
}