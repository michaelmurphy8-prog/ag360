"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Wheat, TrendingUp, TrendingDown, DollarSign, Percent, BarChart3, Truck,
  Loader2, Plus, AlertTriangle, Calendar, ScatterChart as ScatterIcon,
  X, Edit2, Trash2, Search, FileText, ArrowUpRight, ArrowDownRight,
  Eye, MapPin, Clock, Shield, Bell, Lock, Activity,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  ScatterChart as RechartsScatter, Scatter, ZAxis,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import { getCropColor, buToMt } from "@/lib/crop-colors";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Theme ──────────────────────────────────────────────
const T = {
  bg: "#0B1120", card: "#111827", cardAlt: "#151F32",
  border: "rgba(255,255,255,0.06)", borderHover: "rgba(255,255,255,0.12)",
  text: "#F1F5F9", text2: "#CBD5E1", text3: "#64748B", text4: "#475569",
  green: "#34D399", greenBg: "rgba(52,211,153,0.08)",
  red: "#F87171", redBg: "rgba(248,113,113,0.08)",
  blue: "#60A5FA", blueBg: "rgba(96,165,250,0.08)",
  gold: "#F5A623", goldBg: "rgba(245,166,35,0.08)",
  purple: "#A78BFA", purpleBg: "rgba(167,139,250,0.08)",
};

// ─── Types ──────────────────────────────────────────────
interface Position { crop: string; estimated_production: number; contracted: number; contracted_value: number; delivered: number; avg_price: number; unpriced: number; percent_contracted: number; percent_delivered: number; contracts: any[]; }
interface Totals { production: number; contracted: number; contracted_value: number; unpriced: number; delivered: number; avg_price: number; percent_contracted: number; }
interface MarketingData { success: boolean; cropYear: number; totals: Totals; positions: Position[]; }
interface ContractRow { id: string; crop: string; contract_type: string | null; quantity_bu: number; price_per_bu: number; basis: number; elevator: string | null; delivery_date: string | null; notes: string | null; created_at: string; }
interface FuturesQuote { symbol: string; name: string; lastPrice: number; priceChange: number; percentChange: number; tradeTime: string; unitCode: string; }
interface CashBid { id: string; commodity: string; location: string; cashPrice: number; basis: number; deliveryStart: string; deliveryEnd: string; }
interface PriceHistoryPoint { date: string; price: number; }

const CONTRACT_TYPES = ["Flat Price", "Basis", "Deferred Delivery", "Minimum Price", "Futures Only", "Act of God", "Target", "Other"];
const PRAIRIE_CROPS = ["Canola", "CWRS Wheat", "Durum", "Barley", "Oats", "Peas", "Lentils", "Flax", "Soybeans", "Corn"];

// ─── Formatters ─────────────────────────────────────────
const fmtNum = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
const fmtDollar = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n.toFixed(0)}`;
const fmtPrice = (n: number) => `$${n.toFixed(2)}`;
const fmtDate = (d: string | null) => { if (!d) return "—"; return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }); };

// ─── Mini Donut ─────────────────────────────────────────
function MiniDonut({ data, size = 56 }: { data: { name: string; value: number }[]; size?: number }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return (<div style={{ width: size, height: size, borderRadius: "50%", border: `2px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: T.text4, fontSize: 10 }}>—</span></div>);
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart><Pie data={filtered} cx="50%" cy="50%" innerRadius={size * 0.3} outerRadius={size * 0.48} dataKey="value" stroke="none">{filtered.map((e) => (<Cell key={e.name} fill={getCropColor(e.name)} />))}</Pie>
        <Tooltip content={({ payload }) => { if (!payload?.length) return null; const d = payload[0].payload; return (<div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", fontSize: 11, color: T.text }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: getCropColor(d.name) }} /><span style={{ textTransform: "capitalize" }}>{d.name}</span></div><div style={{ color: T.text2, marginTop: 2 }}>{fmtNum(d.value)}</div></div>); }} /></PieChart>
    </ResponsiveContainer>);
}

function ProgressRing({ percent, size = 56 }: { percent: number; size?: number }) {
  const r = size * 0.4; const circ = 2 * Math.PI * r; const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const color = percent >= 80 ? T.green : percent >= 50 ? T.gold : T.red;
  return (<svg width={size} height={size}><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={4} /><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset 0.6s ease" }} /><text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={size * 0.22} fontWeight={700}>{percent}%</text></svg>);
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, donut, sub }: { label: string; value: string; icon: any; iconColor: string; iconBg: string; donut?: React.ReactNode; sub?: string }) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0, flex: 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={14} style={{ color: iconColor }} /></div>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: T.text3 }}>{label}</span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>{sub}</div>}
      </div>
      {donut && <div style={{ flexShrink: 0, marginLeft: 12 }}>{donut}</div>}
    </div>);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div style={{ marginBottom: 14 }}><label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>{children}</div>);
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 12px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

// ═══════════════════════════════════════════════════════════
import { Suspense } from "react";

function MarketingPageInner() {
  const { user } = useUser();
  const router = useRouter();
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState(String(new Date().getFullYear()));
  const [unit, setUnit] = useState<"bu" | "mt">("bu");
const [prodView, setProdView] = useState<"forecast" | "actual">("forecast");

  // Contracts
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const cropParam = searchParams.get("crop");
  const [filterCrop, setFilterCrop] = useState(cropParam || "all");
  const [tab, setTab] = useState<"overview" | "contracts" | "price" | "hedge">(cropParam ? "contracts" : "overview");
  const [filterType, setFilterType] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [formCrop, setFormCrop] = useState("");
  const [formType, setFormType] = useState("");
  const [formQty, setFormQty] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formBasis, setFormBasis] = useState("");
  const [formElevator, setFormElevator] = useState("");
  const [formDelivery, setFormDelivery] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Price Tracker
  const [futures, setFutures] = useState<FuturesQuote[]>([]);
  const [cashBids, setCashBids] = useState<CashBid[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [priceFilter, setPriceFilter] = useState<"all" | "grain" | "livestock" | "energy">("all");

  // ── Fetch positions ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/marketing/positions?cropYear=${cropYear}&view=${prodView}`, { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); else setData(null); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cropYear, prodView, user?.id]);

  // ── Fetch contracts ───────────────────────────────────
  const fetchContracts = useCallback(() => {
    if (!user?.id) return;
    setContractsLoading(true);
    fetch("/api/marketing/contracts", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((d) => setContracts(d.contracts || []))
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [user?.id]);

  useEffect(() => { if (tab === "contracts") fetchContracts(); }, [tab, fetchContracts]);

  // ── Fetch prices ──────────────────────────────────────
  useEffect(() => {
    if (tab !== "price") return;
    setPricesLoading(true);
    fetch("/api/grain360/prices")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setFutures(d.futures || []);
          setCashBids(d.cashBids || []);
        }
      })
      .catch(() => {})
      .finally(() => setPricesLoading(false));
  }, [tab]);

  // ── Fetch price history ───────────────────────────────
  useEffect(() => {
    if (!selectedSymbol) { setPriceHistory([]); return; }
    setHistoryLoading(true);
    fetch(`/api/grain360/prices/history?symbol=${encodeURIComponent(selectedSymbol)}`)
      .then((r) => r.json())
      .then((d) => setPriceHistory(d.history || []))
      .catch(() => setPriceHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [selectedSymbol]);

  // ── Contract form helpers ─────────────────────────────
  const resetForm = () => { setFormCrop(""); setFormType(""); setFormQty(""); setFormPrice(""); setFormBasis(""); setFormElevator(""); setFormDelivery(""); setFormNotes(""); setEditingId(null); };
  const openNew = () => { resetForm(); setShowModal(true); };
  const openEdit = (c: ContractRow) => { setEditingId(c.id); setFormCrop(c.crop || ""); setFormType(c.contract_type || ""); setFormQty(String(c.quantity_bu || "")); setFormPrice(String(c.price_per_bu || "")); setFormBasis(String(c.basis || "")); setFormElevator(c.elevator || ""); setFormDelivery(c.delivery_date ? c.delivery_date.slice(0, 10) : ""); setFormNotes(c.notes || ""); setShowModal(true); };

  const handleSave = async () => {
    if (!user?.id || !formCrop || !formQty) return;
    setSaving(true);
    const body = { ...(editingId ? { id: editingId } : {}), crop: formCrop, contract_type: formType || null, quantity_bu: Number(formQty), price_per_bu: Number(formPrice) || 0, basis: Number(formBasis) || 0, elevator: formElevator || null, delivery_date: formDelivery || null, notes: formNotes || null };
    try {
      const res = await fetch("/api/marketing/contracts", { method: editingId ? "PUT" : "POST", headers: { "Content-Type": "application/json", "x-user-id": user.id }, body: JSON.stringify(body) });
      if (res.ok) { setShowModal(false); resetForm(); fetchContracts(); fetch(`/api/marketing/positions?cropYear=${cropYear}&view=${prodView}`, { headers: { "x-user-id": user.id } }).then((r) => r.json()).then((d) => { if (d.success) setData(d); }); }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!user?.id || !confirm("Delete this contract? This cannot be undone.")) return;
    try { await fetch(`/api/marketing/contracts?id=${id}`, { method: "DELETE", headers: { "x-user-id": user.id } }); fetchContracts(); fetch(`/api/marketing/positions?cropYear=${cropYear}&view=${prodView}`, { headers: { "x-user-id": user.id } }).then((r) => r.json()).then((d) => { if (d.success) setData(d); }); } catch {}
  };

  // ── Computed ───────────────────────────────────────────
  const filteredContracts = useMemo(() => {
    let list = contracts;
    if (filterCrop !== "all") list = list.filter((c) => c.crop === filterCrop);
    if (filterType !== "all") list = list.filter((c) => c.contract_type === filterType);
    if (searchQ) { const q = searchQ.toLowerCase(); list = list.filter((c) => c.crop?.toLowerCase().includes(q) || c.elevator?.toLowerCase().includes(q) || c.contract_type?.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q)); }
    return list;
  }, [contracts, filterCrop, filterType, searchQ]);

  const uniqueCrops = useMemo(() => [...new Set(contracts.map((c) => c.crop).filter(Boolean))], [contracts]);
  const uniqueTypes = useMemo(() => [...new Set(contracts.map((c) => c.contract_type).filter(Boolean))], [contracts]);
  const toUnit = (bu: number, crop?: string) => unit === "mt" && crop ? buToMt(bu, crop) : bu;
  const unitLabel = unit === "bu" ? "BU" : "MT";

  const productionDonut = useMemo(() => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.estimated_production, p.crop) })) || [], [data, unit]);
  const contractedDonut = useMemo(() => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.contracted, p.crop) })) || [], [data, unit]);
  const unpricedDonut = useMemo(() => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.unpriced, p.crop) })) || [], [data, unit]);
  const valueDonut = useMemo(() => data?.positions.map((p) => ({ name: p.crop, value: p.contracted_value })) || [], [data]);
  const avgPriceDonut = useMemo(() => data?.positions.filter((p) => p.avg_price > 0).map((p) => ({ name: p.crop, value: p.avg_price })) || [], [data]);

  const positionBars = useMemo(() => data?.positions.map((p) => ({ crop: p.crop, contracted: toUnit(p.contracted, p.crop), delivered: toUnit(p.delivered, p.crop), unpriced: toUnit(p.unpriced, p.crop), total: toUnit(p.estimated_production, p.crop), color: getCropColor(p.crop) })) || [], [data, unit]);
  const deliveryData = useMemo(() => data?.positions.filter((p) => p.contracted > 0).map((p) => ({ crop: p.crop, delivered: toUnit(p.delivered, p.crop), contracted: toUnit(p.contracted, p.crop), percent: p.percent_delivered, color: getCropColor(p.crop), behind: p.percent_delivered < 50 })) || [], [data, unit]);
  const timelineData = useMemo(() => { if (!data) return []; const all: any[] = []; for (const p of data.positions) for (const c of p.contracts) if (c.created_at) all.push({ crop: p.crop, date: c.created_at.slice(0, 10), qty: toUnit(c.quantity_bu, p.crop), price: c.price_per_bu, color: getCropColor(p.crop) }); return all.sort((a, b) => a.date.localeCompare(b.date)); }, [data, unit]);

  const contractTotals = useMemo(() => { const totalQty = filteredContracts.reduce((s, c) => s + Number(c.quantity_bu), 0); const totalValue = filteredContracts.reduce((s, c) => s + Number(c.quantity_bu) * Number(c.price_per_bu), 0); return { count: filteredContracts.length, totalQty, totalValue }; }, [filteredContracts]);

  // Price filter
  const filteredFutures = useMemo(() => {
    if (priceFilter === "all") return futures;
    const grainSymbols = ["WC", "ZW", "ZC"];
    const livestockSymbols = ["LE", "GF"];
    const energySymbols = ["HO"];
    return futures.filter((f) => {
      const prefix = f.symbol.split("*")[0];
      if (priceFilter === "grain") return grainSymbols.includes(prefix);
      if (priceFilter === "livestock") return livestockSymbols.includes(prefix);
      if (priceFilter === "energy") return energySymbols.includes(prefix);
      return true;
    });
  }, [futures, priceFilter]);

  const selectedFuture = futures.find((f) => f.symbol === selectedSymbol);

  const t = data?.totals;
  const tabs_list = [
    { key: "overview", label: "Overview" },
    { key: "contracts", label: "Contracts" },
    { key: "price", label: "Price Tracker" },
    { key: "hedge", label: "Hedge Tracker" },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Marketing</h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>Grain sales strategy &amp; position management — crop year {cropYear}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            {(["forecast", "actual"] as const).map((v) => (<button key={v} onClick={() => setProdView(v)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: prodView === v ? T.purple : "transparent", color: prodView === v ? "#fff" : T.text3, border: "none", cursor: "pointer", textTransform: "capitalize", letterSpacing: 0.3 }}>{v}</button>))}
          </div>
          <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${T.border}`, overflow: "hidden" }}>
            {(["bu", "mt"] as const).map((u) => (<button key={u} onClick={() => setUnit(u)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, background: unit === u ? T.green : "transparent", color: unit === u ? T.bg : T.text3, border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5 }}>{u}</button>))}
          </div>
          <select value={cropYear} onChange={(e) => setCropYear(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, padding: "6px 12px", fontSize: 13 }}>
            {[2024, 2025, 2026].map((y) => (<option key={y} value={y}>{y}</option>))}
          </select>
          <button onClick={openNew} style={{ background: T.green, color: T.bg, border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}><Plus size={15} /> New Contract</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {tabs_list.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: tab === tb.key ? "rgba(52,211,153,0.12)" : "transparent", color: tab === tb.key ? T.green : T.text3, fontSize: 13, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>{tb.label}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && tab !== "price" && tab !== "hedge" ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.text3 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: T.green, margin: "0 auto 12px" }} />
          <span style={{ fontSize: 13 }}>Loading marketing positions...</span>
        </div>

      /* ═══ OVERVIEW TAB ═══════════════════════════════════ */
      ) : tab === "overview" && data && t ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
            <KpiCard label="Total Production" value={`${fmtNum(unit === "bu" ? t.production : data.positions.reduce((s, p) => s + buToMt(p.estimated_production, p.crop), 0))} ${unitLabel}`} icon={Wheat} iconColor={T.green} iconBg={T.greenBg} donut={<MiniDonut data={productionDonut} />} sub={`${data.positions.length} crop${data.positions.length !== 1 ? "s" : ""}`} />
            <KpiCard label="Total Contracted" value={`${fmtNum(unit === "bu" ? t.contracted : data.positions.reduce((s, p) => s + buToMt(p.contracted, p.crop), 0))} ${unitLabel}`} icon={TrendingUp} iconColor={T.blue} iconBg={T.blueBg} donut={<MiniDonut data={contractedDonut} />} />
            <KpiCard label="% Contracted" value={`${t.percent_contracted}%`} icon={Percent} iconColor={t.percent_contracted >= 50 ? T.green : T.gold} iconBg={t.percent_contracted >= 50 ? T.greenBg : T.goldBg} donut={<ProgressRing percent={t.percent_contracted} />} sub={`${fmtNum(t.unpriced)} ${unitLabel} remaining`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            <KpiCard label="Contracted Value" value={fmtDollar(t.contracted_value)} icon={DollarSign} iconColor={T.green} iconBg={T.greenBg} donut={<MiniDonut data={valueDonut} />} />
            <KpiCard label="Unpriced" value={`${fmtNum(unit === "bu" ? t.unpriced : data.positions.reduce((s, p) => s + buToMt(p.unpriced, p.crop), 0))} ${unitLabel}`} icon={AlertTriangle} iconColor={t.unpriced > 0 ? T.red : T.green} iconBg={t.unpriced > 0 ? T.redBg : T.greenBg} donut={<MiniDonut data={unpricedDonut} />} sub={t.unpriced > 0 ? "Market exposure" : "Fully contracted"} />
            <KpiCard label="Avg Realized Price" value={t.avg_price > 0 ? fmtPrice(t.avg_price) : "—"} icon={DollarSign} iconColor={T.gold} iconBg={T.goldBg} donut={<MiniDonut data={avgPriceDonut} />} sub={t.avg_price > 0 ? "Weighted avg $/bu" : "No contracts yet"} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 24, padding: "10px 16px", background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>
            {data.positions.map((p) => (<div key={p.crop} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: getCropColor(p.crop) }} /><span style={{ color: T.text2, textTransform: "capitalize" }}>{p.crop}</span></div>))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {/* Position Bars */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Crop Positions</h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 20px" }}>Contracted vs unpriced by crop</p>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.green }} /><span style={{ color: T.text3 }}>Contracted</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: T.blue }} /><span style={{ color: T.text3 }}>Delivered</span></span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} /><span style={{ color: T.text3 }}>Unpriced</span></span>
              </div>
              {positionBars.map((p) => { const max = Math.max(...positionBars.map((b) => b.total || b.contracted), 1); return (
                <div key={p.crop} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: T.text, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />{p.crop}</span><span style={{ fontSize: 11, color: T.text3 }}>{fmtNum(p.total || p.contracted)} {unitLabel}</span></div>
                  <div style={{ height: 22, borderRadius: 6, background: "rgba(255,255,255,0.04)", overflow: "hidden", display: "flex", width: "100%" }}>
                    {p.delivered > 0 && <div style={{ width: `${(p.delivered / max) * 100}%`, background: T.blue, height: "100%" }} />}
                    {(p.contracted - p.delivered) > 0 && <div style={{ width: `${((p.contracted - p.delivered) / max) * 100}%`, background: T.green, height: "100%" }} />}
                    {p.unpriced > 0 && <div style={{ width: `${(p.unpriced / max) * 100}%`, background: "rgba(255,255,255,0.08)", height: "100%" }} />}
                  </div>
                </div>); })}
            </div>
            {/* Delivery Progress */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Delivery Progress</h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 20px" }}>Delivered vs contracted — are you on track?</p>
              {deliveryData.length > 0 ? deliveryData.map((d) => (
                <div key={d.crop} style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}><span style={{ fontSize: 12, color: T.text, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />{d.crop}{d.behind && <span style={{ color: T.red, fontSize: 10, fontWeight: 600 }}>BEHIND</span>}</span><span style={{ fontSize: 11, color: T.text3 }}>{fmtNum(d.delivered)} / {fmtNum(d.contracted)} {unitLabel} ({d.percent}%)</span></div>
                  <div style={{ height: 10, borderRadius: 5, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}><div style={{ width: `${Math.min(d.percent, 100)}%`, height: "100%", borderRadius: 5, background: d.behind ? `linear-gradient(90deg, ${T.red}, ${T.gold})` : `linear-gradient(90deg, ${d.color}, ${T.green})`, transition: "width 0.6s ease" }} /></div>
                </div>
              )) : (<div style={{ textAlign: "center", padding: 30 }}><Truck size={24} style={{ color: T.text4, margin: "0 auto 8px" }} /><p style={{ color: T.text4, fontSize: 12 }}>No contracts to deliver against yet.</p></div>)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Sales Timeline</h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 16px" }}>When contracts were signed</p>
              {timelineData.length > 0 ? (<div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={timelineData}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" /><XAxis dataKey="date" tick={{ fill: T.text4, fontSize: 10 }} /><YAxis tick={{ fill: T.text4, fontSize: 10 }} /><Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.text }} formatter={(v: any) => [`${fmtNum(Number(v))} ${unitLabel}`, "Volume"]} /><Bar dataKey="qty" radius={[4, 4, 0, 0]}>{timelineData.map((e, i) => (<Cell key={i} fill={e.color} />))}</Bar></BarChart></ResponsiveContainer></div>) : (<div style={{ textAlign: "center", padding: 30 }}><Calendar size={24} style={{ color: T.text4, margin: "0 auto 8px" }} /><p style={{ color: T.text4, fontSize: 12 }}>Contract timeline appears when contracts are added.</p></div>)}
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Price Performance</h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 16px" }}>Contract prices vs weighted average</p>
              {timelineData.length > 0 ? (<div style={{ height: 200 }}><ResponsiveContainer width="100%" height="100%"><RechartsScatter><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" /><XAxis dataKey="date" tick={{ fill: T.text4, fontSize: 10 }} name="Date" /><YAxis dataKey="price" tick={{ fill: T.text4, fontSize: 10 }} name="Price" unit="$/bu" /><ZAxis dataKey="qty" range={[40, 400]} name="Volume" /><Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.text }} formatter={(v: any, name: any) => { if (name === "Price") return [fmtPrice(v), name]; if (name === "Volume") return [`${fmtNum(v)} ${unitLabel}`, name]; return [v, name]; }} /><Scatter data={timelineData}>{timelineData.map((e, i) => (<Cell key={i} fill={e.color} />))}</Scatter></RechartsScatter></ResponsiveContainer></div>) : (<div style={{ textAlign: "center", padding: 30 }}><ScatterIcon size={24} style={{ color: T.text4, margin: "0 auto 8px" }} /><p style={{ color: T.text4, fontSize: 12 }}>Price scatter appears when contracts with prices are added.</p></div>)}
            </div>
          </div>

          <div style={{ marginTop: 24, background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(96,165,250,0.06))", border: `1px solid ${T.border}`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 20 }}>🌱</span><div><span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Ask Lily about your marketing position</span><p style={{ fontSize: 11, color: T.text3, margin: "2px 0 0" }}>AI-powered advice based on your contracts, prices, and production</p></div></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["Build a sell plan for my unpriced crops", "Am I behind on deliveries?", "What's my break-even price by crop?"].map((chip) => (
  <button key={chip} onClick={() => router.push(`/advisor?prompt=${encodeURIComponent(chip)}`)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", color: T.text2, fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>{chip}</button>
))}</div>
          </div>
        </>

      /* ═══ CONTRACTS TAB ══════════════════════════════════ */
      ) : tab === "contracts" ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Contracts</div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{contractTotals.count}</div></div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Total Volume</div><div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{fmtNum(contractTotals.totalQty)} {unitLabel}</div></div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Total Value</div><div style={{ fontSize: 22, fontWeight: 700, color: T.green }}>{fmtDollar(contractTotals.totalValue)}</div></div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}><div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Avg Price</div><div style={{ fontSize: 22, fontWeight: 700, color: T.gold }}>{contractTotals.totalQty > 0 ? fmtPrice(contractTotals.totalValue / contractTotals.totalQty) : "—"}</div></div>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, maxWidth: 300 }}><Search size={14} style={{ position: "absolute", left: 10, top: 10, color: T.text4 }} /><input placeholder="Search contracts..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} style={{ ...inputStyle, paddingLeft: 30, background: T.card }} /></div>
            <select value={filterCrop} onChange={(e) => setFilterCrop(e.target.value)} style={{ ...inputStyle, width: "auto", background: T.card }}><option value="all">All Crops</option>{uniqueCrops.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ ...inputStyle, width: "auto", background: T.card }}><option value="all">All Types</option>{uniqueTypes.map((t) => (<option key={t} value={t!}>{t}</option>))}</select>
            <span style={{ fontSize: 12, color: T.text4, marginLeft: "auto" }}>{filteredContracts.length} contract{filteredContracts.length !== 1 ? "s" : ""}</span>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            {contractsLoading ? (<div style={{ textAlign: "center", padding: 40 }}><Loader2 size={22} className="animate-spin" style={{ color: T.green }} /></div>
            ) : filteredContracts.length === 0 ? (<div style={{ textAlign: "center", padding: 50 }}><FileText size={28} style={{ color: T.text4, margin: "0 auto 10px" }} /><p style={{ color: T.text2, fontSize: 14, marginBottom: 4 }}>No contracts found</p><p style={{ color: T.text4, fontSize: 12 }}>Click &quot;New Contract&quot; to add your first grain sales contract.</p></div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Crop", "Type", `Qty (${unitLabel})`, "Price", "Basis", "Elevator", "Delivery", "Value", ""].map((h) => (<th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: T.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>))}</tr></thead>
                <tbody>{filteredContracts.map((c) => { const qty = unit === "mt" ? buToMt(Number(c.quantity_bu), c.crop) : Number(c.quantity_bu); const value = Number(c.quantity_bu) * Number(c.price_per_bu); return (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: getCropColor(c.crop), flexShrink: 0 }} /><span style={{ fontSize: 13, color: T.text, fontWeight: 500, textTransform: "capitalize" }}>{c.crop}</span></div></td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{c.contract_type || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: T.text, fontWeight: 600 }}>{fmtNum(qty)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: T.green, fontWeight: 600 }}>{Number(c.price_per_bu) > 0 ? fmtPrice(Number(c.price_per_bu)) : "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{Number(c.basis) !== 0 ? `${Number(c.basis) > 0 ? "+" : ""}${c.basis}` : "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{c.elevator || "—"}</td>
                    <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{fmtDate(c.delivery_date)}</td>
                    <td style={{ padding: "12px 14px", fontSize: 13, color: T.text, fontWeight: 600 }}>{value > 0 ? fmtDollar(value) : "—"}</td>
                    <td style={{ padding: "12px 14px", textAlign: "right" }}><div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}><button onClick={() => openEdit(c)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Edit2 size={14} style={{ color: T.text3 }} /></button><button onClick={() => handleDelete(c.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} style={{ color: T.red }} /></button></div></td>
                  </tr>); })}</tbody>
              </table>
            )}
          </div>
        </>

      /* ═══ PRICE TRACKER TAB ══════════════════════════════ */
      ) : tab === "price" ? (
        <>
          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {(["all", "grain", "livestock", "energy"] as const).map((f) => (
              <button key={f} onClick={() => setPriceFilter(f)} style={{ padding: "6px 16px", borderRadius: 20, border: `1px solid ${priceFilter === f ? T.green : T.border}`, background: priceFilter === f ? T.greenBg : "transparent", color: priceFilter === f ? T.green : T.text3, fontSize: 12, fontWeight: 500, cursor: "pointer", textTransform: "capitalize" }}>{f === "all" ? "All Markets" : f}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: selectedSymbol ? "1fr 1fr" : "1fr", gap: 14, marginBottom: 14 }}>
            {/* Futures Table */}
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>Futures Markets</h3>
                  <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>Click a row to view price history</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: T.text4 }}>
                  <Clock size={10} />
                  <span>Mock data — live feed coming soon</span>
                </div>
              </div>
              {pricesLoading ? (
                <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={22} className="animate-spin" style={{ color: T.green }} /></div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12 }}>
                  <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Contract", "Last", "Change", "%", "Unit"].map((h) => (<th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 10, fontWeight: 600, color: T.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>))}</tr></thead>
                  <tbody>
                    {filteredFutures.map((f) => {
                      const isUp = f.priceChange >= 0;
                      const isSelected = f.symbol === selectedSymbol;
                      return (
                        <tr key={f.symbol} onClick={() => setSelectedSymbol(isSelected ? null : f.symbol)} style={{ borderBottom: `1px solid ${T.border}`, cursor: "pointer", background: isSelected ? "rgba(52,211,153,0.06)" : "transparent", transition: "background 0.15s" }} onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }} onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{f.name}</div>
                            <div style={{ fontSize: 10, color: T.text4, marginTop: 1 }}>{f.symbol}</div>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 700, color: T.text }}>{f.lastPrice.toFixed(2)}</td>
                          <td style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, fontWeight: 600, color: isUp ? T.green : T.red }}>
                              {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {isUp ? "+" : ""}{f.priceChange.toFixed(2)}
                            </div>
                          </td>
                          <td style={{ padding: "10px 16px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: isUp ? T.greenBg : T.redBg, color: isUp ? T.green : T.red }}>{isUp ? "+" : ""}{f.percentChange.toFixed(2)}%</span>
                          </td>
                          <td style={{ padding: "10px 16px", fontSize: 11, color: T.text4 }}>{f.unitCode}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Price Chart */}
            {selectedSymbol && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>{selectedFuture?.name || selectedSymbol}</h3>
                    <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>6-month price history</p>
                  </div>
                  {selectedFuture && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: T.text }}>{selectedFuture.lastPrice.toFixed(2)}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: selectedFuture.priceChange >= 0 ? T.green : T.red, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                        {selectedFuture.priceChange >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {selectedFuture.priceChange >= 0 ? "+" : ""}{selectedFuture.priceChange.toFixed(2)} ({selectedFuture.percentChange >= 0 ? "+" : ""}{selectedFuture.percentChange.toFixed(2)}%)
                      </div>
                    </div>
                  )}
                </div>
                {historyLoading ? (
                  <div style={{ textAlign: "center", padding: 40 }}><Loader2 size={22} className="animate-spin" style={{ color: T.green }} /></div>
                ) : priceHistory.length > 0 ? (
                  <div style={{ height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={priceHistory}>
                        <defs>
                          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.green} stopOpacity={0.15} />
                            <stop offset="95%" stopColor={T.green} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: T.text4, fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} interval={20} />
                        <YAxis domain={["auto", "auto"]} tick={{ fill: T.text4, fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, fontSize: 11, color: T.text }} formatter={(v: any) => [Number(v).toFixed(2), "Price"]} />
                        <Area type="monotone" dataKey="price" stroke={T.green} fill="url(#priceGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (<p style={{ color: T.text4, fontSize: 12, textAlign: "center", padding: 40 }}>No history available</p>)}
                <button onClick={() => setSelectedSymbol(null)} style={{ marginTop: 12, padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text3, fontSize: 11, cursor: "pointer" }}>Close chart</button>
              </div>
            )}
          </div>

          {/* Cash Bids */}
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "18px 20px 0" }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 2px" }}>Local Cash Bids</h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 12px" }}>Elevator prices near your operation</p>
            </div>
            {cashBids.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30 }}><MapPin size={24} style={{ color: T.text4, margin: "0 auto 8px" }} /><p style={{ color: T.text4, fontSize: 12 }}>No cash bids available</p></div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>{["Commodity", "Location", "Cash Price", "Basis", "Delivery Window"].map((h) => (<th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 10, fontWeight: 600, color: T.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {cashBids.map((b) => (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${T.border}` }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "10px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: getCropColor(b.commodity) }} /><span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{b.commodity}</span></div></td>
                      <td style={{ padding: "10px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: T.text2 }}><MapPin size={11} style={{ color: T.text4 }} />{b.location}</div></td>
                      <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 700, color: T.green }}>${b.cashPrice.toFixed(2)}</td>
                      <td style={{ padding: "10px 16px" }}><span style={{ fontSize: 12, fontWeight: 600, color: b.basis >= 0 ? T.green : T.red }}>{b.basis >= 0 ? "+" : ""}{b.basis.toFixed(2)}</span></td>
                      <td style={{ padding: "10px 16px", fontSize: 11, color: T.text3 }}>{fmtDate(b.deliveryStart)} — {fmtDate(b.deliveryEnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>

      /* ═══ HEDGE TRACKER TAB ══════════════════════════════ */
      ) : tab === "hedge" ? (
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center", padding: "40px 0" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: T.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Shield size={32} style={{ color: T.purple }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginBottom: 8 }}>Hedge Tracker</h2>
          <p style={{ fontSize: 14, color: T.text2, marginBottom: 32, lineHeight: 1.6 }}>
            Track your futures positions, monitor margin requirements, and see real-time P&amp;L on your hedging strategy — all integrated with your physical grain positions.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 32 }}>
            {[
              { icon: Activity, label: "Futures Positions", desc: "Track open futures contracts with real-time P&L" },
              { icon: Shield, label: "Margin Monitor", desc: "Monitor margin requirements and account balance" },
              { icon: TrendingUp, label: "Hedge Analysis", desc: "Hedge ratio, basis risk, and effectiveness metrics" },
            ].map((item) => (
              <div key={item.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, textAlign: "left" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: T.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  <item.icon size={18} style={{ color: T.purple }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.08), rgba(96,165,250,0.08))", border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Bell size={16} style={{ color: T.purple }} />
            <span style={{ fontSize: 13, color: T.text2 }}>Coming Q3 2026 — we&apos;ll notify you when it&apos;s ready</span>
          </div>
        </div>

      /* ═══ EMPTY STATE ════════════════════════════════════ */
      ) : tab === "overview" ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><BarChart3 size={24} style={{ color: T.text4 }} /></div>
          <p style={{ color: T.text2, fontSize: 15, marginBottom: 6 }}>No marketing data yet</p>
          <p style={{ color: T.text4, fontSize: 12 }}>Add crops in Farm Profile and contracts to see your position.</p>
        </div>
      ) : null}

      {/* ═══ CONTRACT MODAL ════════════════════════════════ */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => { setShowModal(false); resetForm(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", padding: 28, zIndex: 101 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>{editingId ? "Edit Contract" : "New Contract"}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} style={{ color: T.text3 }} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Crop *"><select value={formCrop} onChange={(e) => setFormCrop(e.target.value)} style={inputStyle}><option value="">Select crop...</option>{PRAIRIE_CROPS.map((c) => (<option key={c} value={c}>{c}</option>))}</select></Field>
              <Field label="Contract Type"><select value={formType} onChange={(e) => setFormType(e.target.value)} style={inputStyle}><option value="">Select type...</option>{CONTRACT_TYPES.map((t) => (<option key={t} value={t}>{t}</option>))}</select></Field>
              <Field label="Quantity (BU) *"><input type="number" value={formQty} onChange={(e) => setFormQty(e.target.value)} placeholder="e.g. 5000" style={inputStyle} /></Field>
              <Field label="Price ($/BU)"><input type="number" step="0.01" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="e.g. 14.50" style={inputStyle} /></Field>
              <Field label="Basis ($/BU)"><input type="number" step="0.01" value={formBasis} onChange={(e) => setFormBasis(e.target.value)} placeholder="e.g. -0.35" style={inputStyle} /></Field>
              <Field label="Elevator"><input value={formElevator} onChange={(e) => setFormElevator(e.target.value)} placeholder="e.g. Viterra Swift Current" style={inputStyle} /></Field>
            </div>
            <Field label="Delivery Date"><input type="date" value={formDelivery} onChange={(e) => setFormDelivery(e.target.value)} style={inputStyle} /></Field>
            <Field label="Notes"><textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inputStyle, resize: "vertical" }} /></Field>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={saving || !formCrop || !formQty} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: !formCrop || !formQty ? T.text4 : T.green, color: T.bg, fontSize: 13, fontWeight: 600, cursor: !formCrop || !formQty ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving..." : editingId ? "Update Contract" : "Add Contract"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-[#64748B]">Loading...</div>}>
      <MarketingPageInner />
    </Suspense>
  );
}