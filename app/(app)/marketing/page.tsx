"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, X, Edit2, Trash2, CheckCircle, Clock, AlertTriangle,
  Loader2, Package, DollarSign, Filter, RotateCcw, ChevronDown,
  Wheat, TrendingUp, BarChart3, Target, Truck, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Sector,
} from "recharts";

// ─── Design Tokens ───────────────────────────────────────────
const T = {
  bg: "#080C15",
  card: "#0F1729",
  cardAlt: "#111827",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text1: "#F1F5F9",
  text2: "#94A3B8",
  text3: "#64748B",
  text4: "#475569",
  green: "#34D399",
  greenDim: "rgba(52,211,153,0.12)",
  red: "#F87171",
  redDim: "rgba(248,113,113,0.12)",
  amber: "#FBBF24",
  amberDim: "rgba(251,191,36,0.12)",
  sky: "#38BDF8",
  skyDim: "rgba(56,189,248,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
  gridLine: "rgba(255,255,255,0.04)",
  tooltipBg: "#1E293B",
  tooltipBorder: "rgba(255,255,255,0.10)",
};

const CROP_COLORS: Record<string, string> = {
  "HRW Wheat": "#D4A843", "HRS Wheat": "#C49B3D", "Durum": "#E8C547",
  Canola: "#E8B931", Barley: "#9B8B6E", Oats: "#BFB599",
  Peas: "#7BAE6E", Lentils: "#A67B5B", Flax: "#6B8FA3",
  Soybeans: "#8FA86E", Corn: "#D4A843", Mustard: "#E8D547",
  Canaryseed: "#8B9DC3",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  open: { color: T.sky, bg: T.skyDim, label: "Open" },
  partial: { color: T.amber, bg: T.amberDim, label: "Partial" },
  delivered: { color: T.green, bg: T.greenDim, label: "Delivered" },
  cancelled: { color: T.red, bg: T.redDim, label: "Cancelled" },
  rolled: { color: T.purple, bg: T.purpleDim, label: "Rolled" },
};

// ─── Shared Styles ───────────────────────────────────────────
const inputClass =
  "w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const selectClass =
  "bg-[#111827] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[2px] font-mono font-semibold text-[#64748B] mb-1.5";
const btnPrimary = "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all";
const btnSecondary = "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-white/[0.10] text-[#94A3B8] hover:text-[#F1F5F9] hover:border-white/[0.16] transition-all";

// ─── Interfaces ──────────────────────────────────────────────
interface Contract {
  id: string;
  crop: string;
  buyer: string;
  contract_type: string;
  tonnes: number;
  price_per_tonne: number;
  delivery_start: string;
  delivery_end: string;
  status: string;
  delivered_tonnes: number;
  notes?: string;
}

interface CropPosition {
  crop: string;
  estimated_production: number;
  contracted: number;
  delivered: number;
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label, value, sub, icon: Icon, iconColor, bgColor, highlight,
}: {
  label: string; value: string; sub?: string; icon: React.ElementType;
  iconColor: string; bgColor: string; highlight?: boolean;
}) {
  return (
    <div
      className={`bg-[#0F1729] rounded-xl p-5 transition-all hover:border-white/[0.12] ${
        highlight ? "border-2" : "border"
      }`}
      style={{ borderColor: highlight ? `${iconColor}30` : T.border }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <span className="text-[10px] uppercase tracking-[2px] font-mono font-semibold" style={{ color: T.text3 }}>
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: T.text1 }}>{value}</div>
      {sub && <p className="text-xs mt-1 font-mono" style={{ color: T.text3 }}>{sub}</p>}
    </div>
  );
}

// ─── Position Gauge (THE killer visual) ──────────────────────
function PositionGauge({ positions }: { positions: CropPosition[] }) {
  if (positions.length === 0) return null;

  return (
    <div className="bg-[#0F1729] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.10] transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-[#F1F5F9]">Contract Position by Crop</h3>
          <p className="text-xs text-[#475569] mt-0.5">Contracted vs estimated production</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: T.green }} />
            <span style={{ color: T.text3 }}>Delivered</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: T.sky }} />
            <span style={{ color: T.text3 }}>Contracted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span style={{ color: T.text3 }}>Uncontracted</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {positions.map((pos) => {
          const total = pos.estimated_production || 1;
          const contractedPct = Math.min((pos.contracted / total) * 100, 100);
          const deliveredPct = Math.min((pos.delivered / total) * 100, 100);
          const openPct = contractedPct - deliveredPct;
          const color = CROP_COLORS[pos.crop] || T.sky;

          // Risk indicator
          const riskLevel =
            contractedPct > 90 ? { label: "Fully Committed", color: T.amber, icon: AlertTriangle }
            : contractedPct > 60 ? { label: "Well Positioned", color: T.green, icon: CheckCircle }
            : contractedPct > 30 ? { label: "Moderate", color: T.sky, icon: Target }
            : { label: "Unhedged", color: T.red, icon: AlertTriangle };

          return (
            <div key={pos.crop} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-sm font-medium" style={{ color: T.text1 }}>{pos.crop}</span>
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `${riskLevel.color}15`, color: riskLevel.color }}
                  >
                    <riskLevel.icon size={9} />
                    {riskLevel.label}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span style={{ color: T.text3 }}>
                    {pos.contracted.toLocaleString()}
                    <span style={{ color: T.text4 }}> / {pos.estimated_production.toLocaleString()} MT</span>
                  </span>
                  <span className="font-semibold" style={{ color: contractedPct > 80 ? T.amber : T.green }}>
                    {contractedPct.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Multi-layer progress bar */}
              <div className="relative h-4 rounded-full overflow-hidden bg-white/[0.04]">
                {/* Delivered (solid green) */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${deliveredPct}%`, backgroundColor: T.green }}
                />
                {/* Contracted but not delivered (striped pattern) */}
                <div
                  className="absolute inset-y-0 rounded-r-full transition-all duration-700"
                  style={{
                    left: `${deliveredPct}%`,
                    width: `${openPct}%`,
                    backgroundColor: T.sky,
                    opacity: 0.6,
                  }}
                />
                {/* Hover tooltip zone */}
                <div
                  className="absolute inset-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title={`${pos.delivered.toLocaleString()} MT delivered · ${(pos.contracted - pos.delivered).toLocaleString()} MT open · ${(pos.estimated_production - pos.contracted).toLocaleString()} MT uncontracted`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Contract Value Donut ────────────────────────────────────
function ContractValueDonut({ contracts }: { contracts: Contract[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const byCrop = useMemo(() => {
    const map: Record<string, number> = {};
    contracts
      .filter((c) => c.status !== "cancelled")
      .forEach((c) => {
        map[c.crop] = (map[c.crop] || 0) + c.tonnes * c.price_per_tonne;
      });
    return Object.entries(map)
      .map(([crop, value]) => ({ crop, value, fill: CROP_COLORS[crop] || T.sky }))
      .sort((a, b) => b.value - a.value);
  }, [contracts]);

  if (byCrop.length === 0) return null;

  const total = byCrop.reduce((s, d) => s + d.value, 0);

  const renderActive = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    return (
      <g>
        <Sector
          cx={cx} cy={cy}
          innerRadius={innerRadius - 2} outerRadius={outerRadius + 6}
          startAngle={startAngle} endAngle={endAngle}
          fill={fill}
          style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.3))" }}
        />
        <text x={cx} y={cy - 12} textAnchor="middle" fill={T.text1} fontSize={13} fontWeight={700} fontFamily="monospace">
          ${(value / 1000).toFixed(0)}K
        </text>
        <text x={cx} y={cy + 4} textAnchor="middle" fill={T.text2} fontSize={10}>
          {payload.crop}
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fill={fill} fontSize={10} fontWeight={600} fontFamily="monospace">
          {(percent * 100).toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div className="bg-[#0F1729] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.10] transition-colors">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-[#F1F5F9]">Value by Crop</h3>
        <span className="text-xs font-mono font-semibold" style={{ color: T.green }}>
          ${total.toLocaleString("en-CA", { minimumFractionDigits: 0 })}
        </span>
      </div>
      <p className="text-xs text-[#475569] mb-3">Hover for breakdown</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
  {...{ activeIndex: activeIdx !== null ? activeIdx : undefined } as any}
            activeShape={renderActive}
            data={byCrop}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={78}
            dataKey="value"
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            stroke="none"
          >
            {byCrop.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {/* Mini legend below chart */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
        {byCrop.map((d) => (
          <div key={d.crop} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-sm" style={{ background: d.fill }} />
            <span style={{ color: T.text3 }}>{d.crop}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Delivery Timeline (Gantt-style) ─────────────────────────
function DeliveryTimeline({ contracts }: { contracts: Contract[] }) {
  const activeContracts = contracts.filter((c) => c.status !== "cancelled");
  if (activeContracts.length === 0) return null;

  // Find date range
  const allDates = activeContracts.flatMap((c) => [
    new Date(c.delivery_start).getTime(),
    new Date(c.delivery_end).getTime(),
  ]);
  const minDate = Math.min(...allDates);
  const maxDate = Math.max(...allDates);
  const range = maxDate - minDate || 1;

  // Group months for header
  const monthLabels: { label: string; leftPct: number }[] = [];
  const startMonth = new Date(minDate);
  startMonth.setDate(1);
  while (startMonth.getTime() <= maxDate) {
    const pct = ((startMonth.getTime() - minDate) / range) * 100;
    if (pct >= 0 && pct <= 100) {
      monthLabels.push({
        label: startMonth.toLocaleDateString("en-CA", { month: "short" }),
        leftPct: pct,
      });
    }
    startMonth.setMonth(startMonth.getMonth() + 1);
  }

  return (
    <div className="bg-[#0F1729] border border-white/[0.06] rounded-xl p-6 hover:border-white/[0.10] transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-[#F1F5F9]">Delivery Timeline</h3>
          <p className="text-xs text-[#475569] mt-0.5">Contract delivery windows</p>
        </div>
      </div>

      {/* Month headers */}
      <div className="relative h-5 mb-2">
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="absolute text-[9px] font-mono uppercase"
            style={{ left: `${m.leftPct}%`, color: T.text4, transform: "translateX(-50%)" }}
          >
            {m.label}
          </span>
        ))}
      </div>

      {/* Timeline bars */}
      <div className="space-y-2">
        {activeContracts.map((c) => {
          const start = new Date(c.delivery_start).getTime();
          const end = new Date(c.delivery_end).getTime();
          const leftPct = ((start - minDate) / range) * 100;
          const widthPct = Math.max(((end - start) / range) * 100, 2);
          const color = CROP_COLORS[c.crop] || T.sky;
          const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
          const deliveryPct = c.tonnes > 0 ? (c.delivered_tonnes / c.tonnes) * 100 : 0;

          return (
            <div key={c.id} className="group relative">
              <div className="flex items-center gap-3">
                <div className="w-24 flex-shrink-0 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs truncate" style={{ color: T.text2 }}>{c.crop}</span>
                </div>
                <div className="flex-1 relative h-7 rounded-lg bg-white/[0.02]">
                  {/* Month gridlines */}
                  {monthLabels.map((m, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: `${m.leftPct}%`, backgroundColor: T.gridLine }} />
                  ))}
                  {/* Bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded-md flex items-center px-2 cursor-pointer transition-all group-hover:brightness-110"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor: `${color}30`,
                      border: `1px solid ${color}50`,
                    }}
                    title={`${c.buyer} · ${c.tonnes} MT @ $${c.price_per_tonne}/MT · ${c.delivery_start} → ${c.delivery_end}`}
                  >
                    {/* Delivered fill within the bar */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-l-md"
                      style={{
                        width: `${deliveryPct}%`,
                        backgroundColor: `${color}60`,
                      }}
                    />
                    <span className="relative text-[9px] font-mono font-semibold truncate" style={{ color: T.text1 }}>
                      {c.buyer} · {c.tonnes}MT
                    </span>
                  </div>
                </div>
                <span
                  className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ color: status.color, background: status.bg }}
                >
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
//  MARKETING PAGE — FINTECH GRADE
// ═════════════════════════════════════════════════════════════
export default function MarketingPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [positions, setPositions] = useState<CropPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("contracts");

  // Filters
  const [filterCrop, setFilterCrop] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    crop: "", buyer: "", contract_type: "Flat Price", tonnes: 0,
    price_per_tonne: 0, delivery_start: "", delivery_end: "", status: "open", notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/marketing/contracts").then((r) => r.json()),
      fetch("/api/marketing/positions").then((r) => r.json()),
    ])
      .then(([c, p]) => {
        setContracts(Array.isArray(c) ? c : []);
        setPositions(Array.isArray(p) ? p : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { id: "contracts", label: "Contracts", enabled: true },
    { id: "prices", label: "Price Tracker", enabled: false },
    { id: "hedges", label: "Hedge Tracker", enabled: false },
  ];

  // ── Computed ────────────────────────────────────
  const crops = useMemo(() => [...new Set(contracts.map((c) => c.crop))].sort(), [contracts]);

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (filterCrop !== "all" && c.crop !== filterCrop) return false;
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      return true;
    });
  }, [contracts, filterCrop, filterStatus]);

  const kpis = useMemo(() => {
    const active = contracts.filter((c) => c.status !== "cancelled");
    return {
      totalTonnes: active.reduce((s, c) => s + c.tonnes, 0),
      totalValue: active.reduce((s, c) => s + c.tonnes * c.price_per_tonne, 0),
      openCount: contracts.filter((c) => c.status === "open" || c.status === "partial").length,
      deliveredCount: contracts.filter((c) => c.status === "delivered").length,
    };
  }, [contracts]);

  // ── Form helpers ───────────────────────────────
  const contractValue = form.tonnes * form.price_per_tonne;

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ crop: "", buyer: "", contract_type: "Flat Price", tonnes: 0, price_per_tonne: 0, delivery_start: "", delivery_end: "", status: "open", notes: "" });
  };

  const handleSave = async () => {
    if (!form.crop || !form.buyer || !form.tonnes) return;
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/marketing/contracts/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await fetch("/api/marketing/contracts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) {
        const saved = await res.json();
        setContracts((p) => editingId ? p.map((c) => (c.id === editingId ? saved : c)) : [saved, ...p]);
        resetForm();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contract?")) return;
    try {
      await fetch(`/api/marketing/contracts/${id}`, { method: "DELETE" });
      setContracts((p) => p.filter((c) => c.id !== id));
    } catch {}
  };

  const handleEdit = (c: Contract) => {
    setEditingId(c.id);
    setForm({
      crop: c.crop, buyer: c.buyer, contract_type: c.contract_type,
      tonnes: c.tonnes, price_per_tonne: c.price_per_tonne,
      delivery_start: c.delivery_start, delivery_end: c.delivery_end,
      status: c.status, notes: c.notes || "",
    });
    setShowForm(true);
  };

  const markDelivered = async (c: Contract) => {
    try {
      const res = await fetch(`/api/marketing/contracts/${c.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...c, status: "delivered", delivered_tonnes: c.tonnes }),
      });
      if (res.ok) {
        const saved = await res.json();
        setContracts((p) => p.map((x) => (x.id === c.id ? saved : x)));
      }
    } catch {}
  };

  const fmt = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;
  const fmtShort = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0 })}`;

  return (
    <div>
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: T.text1 }}>Marketing</h1>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            Grain sales strategy &amp; contract management
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className={btnPrimary}
          style={{ backgroundColor: T.green, color: T.bg }}
        >
          <Plus size={14} />
          New Contract
        </button>
      </div>

      {/* ── Tab Switcher ─────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-white/[0.03] p-1 rounded-xl w-fit border border-white/[0.06]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => t.enabled && setActiveTab(t.id)}
            disabled={!t.enabled}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === t.id
                ? "bg-white/[0.08] text-[#F1F5F9] shadow-sm"
                : t.enabled
                ? "text-[#64748B] hover:text-[#94A3B8]"
                : "text-[#334155] cursor-not-allowed"
            }`}
          >
            {t.label}
            {!t.enabled && (
              <span className="ml-1.5 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-white/[0.04] text-[#475569]">
                Soon
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: T.green }} />
          <span className="text-sm" style={{ color: T.text3 }}>Loading contracts...</span>
        </div>
      ) : (
        <>
          {/* ── KPI Cards ──────────────────────────── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard label="Committed" value={`${kpis.totalTonnes.toLocaleString()} MT`} icon={Package} iconColor={T.green} bgColor={T.greenDim} />
            <KpiCard label="Total Value" value={fmtShort(kpis.totalValue)} icon={DollarSign} iconColor={T.green} bgColor={T.greenDim} />
            <KpiCard label="Open" value={String(kpis.openCount)} icon={Clock} iconColor={T.sky} bgColor={T.skyDim} highlight />
            <KpiCard label="Delivered" value={String(kpis.deliveredCount)} icon={Truck} iconColor={T.green} bgColor={T.greenDim} />
          </div>

          {/* ── Position Gauges + Donut ────────────── */}
          <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
            <PositionGauge positions={positions} />
            <ContractValueDonut contracts={contracts} />
          </div>

          {/* ── Delivery Timeline ─────────────────── */}
          <div className="mb-6">
            <DeliveryTimeline contracts={contracts} />
          </div>

          {/* ── Filter Bar ────────────────────────── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 text-xs" style={{ color: T.text3 }}>
              <Filter size={12} />
              Filters:
            </div>
            <select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)} className={selectClass + " text-xs"}>
              <option value="all">All Crops</option>
              {crops.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass + " text-xs"}>
              <option value="all">All Status</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {(filterCrop !== "all" || filterStatus !== "all") && (
              <button
                onClick={() => { setFilterCrop("all"); setFilterStatus("all"); }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                style={{ color: T.text3 }}
              >
                <RotateCcw size={12} />
                Clear
              </button>
            )}
            <span className="ml-auto text-xs font-mono" style={{ color: T.text4 }}>
              {filtered.length} contract{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* ── Contracts Table ────────────────────── */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
                <BarChart3 size={24} style={{ color: T.text4 }} />
              </div>
              <p className="text-sm mb-1" style={{ color: T.text2 }}>
                {contracts.length === 0 ? "No contracts yet" : "No contracts match your filters"}
              </p>
              <p className="text-xs" style={{ color: T.text4 }}>
                {contracts.length === 0 ? "Click \"New Contract\" to add your first grain sales contract" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="bg-[#0F1729] border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.8fr_1fr_0.7fr_auto] gap-3 px-5 py-3 border-b border-white/[0.06] bg-white/[0.01]">
                {["Crop", "Buyer", "Type", "Quantity", "Price", "Delivery", "Status", ""].map((h) => (
                  <span key={h} className="text-[9px] uppercase tracking-[2px] font-mono font-semibold" style={{ color: T.text4 }}>{h}</span>
                ))}
              </div>
              {/* Rows */}
              {filtered.map((c) => {
                const color = CROP_COLORS[c.crop] || T.sky;
                const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.open;
                return (
                  <div
                    key={c.id}
                    className="group grid grid-cols-[1fr_1.2fr_0.8fr_0.8fr_0.8fr_1fr_0.7fr_auto] gap-3 px-5 py-3 border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors items-center"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium" style={{ color: T.text1 }}>{c.crop}</span>
                    </div>
                    <span className="text-sm" style={{ color: T.text2 }}>{c.buyer}</span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full w-fit"
                      style={{ color: T.green, background: T.greenDim, border: `1px solid ${T.green}20` }}
                    >
                      {c.contract_type}
                    </span>
                    <span className="text-sm font-mono" style={{ color: T.text1 }}>{c.tonnes.toLocaleString()} MT</span>
                    <span className="text-sm font-mono" style={{ color: T.green }}>{fmt(c.price_per_tonne)}</span>
                    <span className="text-xs font-mono" style={{ color: T.text3 }}>
                      {c.delivery_start && new Date(c.delivery_start).toLocaleDateString("en-CA", { month: "short" })}
                      {" — "}
                      {c.delivery_end && new Date(c.delivery_end).toLocaleDateString("en-CA", { month: "short", year: "2-digit" })}
                    </span>
                    <span
                      className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full w-fit"
                      style={{ color: status.color, background: status.bg }}
                    >
                      {status.label}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-white/[0.06]" title="Edit">
                        <Edit2 size={12} style={{ color: T.text3 }} />
                      </button>
                      {(c.status === "open" || c.status === "partial") && (
                        <button onClick={() => markDelivered(c)} className="p-1.5 rounded-lg hover:bg-green-500/10" title="Mark Delivered">
                          <CheckCircle size={12} style={{ color: T.green }} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10" title="Delete">
                        <Trash2 size={12} style={{ color: T.red }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══ NEW / EDIT CONTRACT MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl p-6" style={{ background: "#0F1729", border: `1px solid ${T.borderHover}` }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: T.text1 }}>
                {editingId ? "Edit Contract" : "New Contract"}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
                <X size={16} style={{ color: T.text3 }} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>Crop</label>
                <select value={form.crop} onChange={(e) => setForm((p) => ({ ...p, crop: e.target.value }))} className={selectClass + " w-full"}>
                  <option value="">Select crop...</option>
                  {Object.keys(CROP_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Buyer</label>
                <input type="text" value={form.buyer} onChange={(e) => setForm((p) => ({ ...p, buyer: e.target.value }))} placeholder="e.g. Cargill" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Contract Type</label>
                <select value={form.contract_type} onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value }))} className={selectClass + " w-full"}>
                  {["Flat Price", "Basis", "Deferred Delivery", "Futures Only", "Spot"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} className={selectClass + " w-full"}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Tonnes (MT)</label>
                <input type="number" min={0} value={form.tonnes || ""} onChange={(e) => setForm((p) => ({ ...p, tonnes: parseFloat(e.target.value) || 0 }))} className={inputClass + " font-mono"} />
              </div>
              <div>
                <label className={labelClass}>Price / Tonne (CAD)</label>
                <input type="number" min={0} step={0.01} value={form.price_per_tonne || ""} onChange={(e) => setForm((p) => ({ ...p, price_per_tonne: parseFloat(e.target.value) || 0 }))} className={inputClass + " font-mono"} />
              </div>
              <div>
                <label className={labelClass}>Delivery Start</label>
                <input type="date" value={form.delivery_start} onChange={(e) => setForm((p) => ({ ...p, delivery_start: e.target.value }))} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Delivery End</label>
                <input type="date" value={form.delivery_end} onChange={(e) => setForm((p) => ({ ...p, delivery_end: e.target.value }))} className={inputClass} />
              </div>
            </div>

            <div className="mb-4">
              <label className={labelClass}>Notes</label>
              <input type="text" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" className={inputClass} />
            </div>

            {/* Contract value preview */}
            {contractValue > 0 && (
              <div className="rounded-xl p-4 mb-5" style={{ background: T.greenDim, border: `1px solid rgba(52,211,153,0.2)` }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold" style={{ color: T.green }}>Contract Value</span>
                  <span className="text-lg font-bold font-mono" style={{ color: T.green }}>
                    {fmtShort(contractValue)}
                  </span>
                </div>
                <p className="text-xs mt-0.5 font-mono" style={{ color: T.text3 }}>
                  {form.tonnes.toLocaleString()} MT × ${form.price_per_tonne.toLocaleString()}/MT
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={resetForm} className={btnSecondary}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!form.crop || !form.buyer || !form.tonnes || saving}
                className={btnPrimary}
                style={{
                  backgroundColor: form.crop && form.buyer && form.tonnes ? T.green : T.text4,
                  color: form.crop && form.buyer && form.tonnes ? T.bg : T.text3,
                  opacity: form.crop && form.buyer && form.tonnes ? 1 : 0.5,
                  cursor: form.crop && form.buyer && form.tonnes ? "pointer" : "not-allowed",
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {editingId ? "Update" : "Save Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}