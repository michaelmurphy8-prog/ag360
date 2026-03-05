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
import LocalCashBids from "@/components/marketing/LocalCashBids";

// ─── Theme ──────────────────────────────────────────────
const T = {
  bg: "var(--ag-bg-primary)", card: "var(--ag-bg-card)", cardAlt: "var(--ag-bg-secondary)",
  border: "rgba(255,255,255,0.06)", borderHover: "rgba(255,255,255,0.12)",
  text: "var(--ag-text-primary)", text2: "#CBD5E1", text3: "var(--ag-text-muted)", text4: "var(--ag-text-dim)",
  green: "var(--ag-green)", greenBg: "var(--ag-green-dim)",
  red: "var(--ag-red)", redBg: "var(--ag-red-dim)",
  blue: "var(--ag-blue)", blueBg: "rgba(96,165,250,0.08)",
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
  const [showCanolaEntry, setShowCanolaEntry] = useState(false)
  const [canolaPrice, setCanolaPrice] = useState('')
  const [canolaElevator, setCanolaElevator] = useState('')
  const [canolaSaving, setCanolaSaving] = useState(false)

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

  // ── Fetch hedge positions ─────────────────────────────  
  useEffect(() => {
    if (tab !== "hedge") return;
    setHedgeLoading(true);
    fetch("/api/marketing/hedge")
      .then(r => r.json())
      .then(d => setHedgePositions(d.positions || []))
      .catch(() => setHedgePositions([]))
      .finally(() => setHedgeLoading(false));
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

  // ── Hedge helpers ─────────────────────────────────────   
  const resetHedgeForm = () => {
    setEditingHedge(null); setHCrop("Canola"); setHExchange("ICE");
    setHMonth(""); setHContracts(""); setHSizeMt("20"); setHDirection("short");
    setHEntry(""); setHCurrent(""); setHDate(""); setHNotes("");
  };

  const openNewHedge = () => { resetHedgeForm(); setShowHedgeModal(true); };

  const openEditHedge = (p: HedgePosition) => {
    setEditingHedge(p); setHCrop(p.crop); setHExchange(p.exchange);
    setHMonth(p.contract_month); setHContracts(String(p.contracts));
    setHSizeMt(String(p.contract_size_mt)); setHDirection(p.direction);
    setHEntry(String(p.entry_price)); setHCurrent(p.current_price != null ? String(p.current_price) : "");
    setHDate(p.opened_date?.slice(0, 10) || ""); setHNotes(p.notes || "");
    setShowHedgeModal(true);
  };

  const handleSaveHedge = async () => {
    if (!hCrop || !hMonth || !hContracts || !hEntry) return;
    setSavingHedge(true);
    const body = {
      ...(editingHedge ? { id: editingHedge.id } : {}),
      crop: hCrop, exchange: hExchange, contract_month: hMonth,
      contracts: Number(hContracts), contract_size_mt: Number(hSizeMt),
      direction: hDirection, entry_price: Number(hEntry),
      current_price: hCurrent ? Number(hCurrent) : null,
      opened_date: hDate || null, notes: hNotes || null,
    };
    try {
      const res = await fetch("/api/marketing/hedge", {
        method: editingHedge ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const d = await res.json();
        setHedgePositions(prev => editingHedge
          ? prev.map(p => p.id === editingHedge.id ? d.position : p)
          : [d.position, ...prev]
        );
        setShowHedgeModal(false); resetHedgeForm();
      }
    } catch {}
    setSavingHedge(false);
  };

  const handleDeleteHedge = async (id: string) => {
    if (!confirm("Delete this hedge position?")) return;
    await fetch(`/api/marketing/hedge?id=${id}`, { method: "DELETE" });
    setHedgePositions(prev => prev.filter(p => p.id !== id));
  };                                                          
async function saveCanolaSpot() {
    if (!canolaPrice || !canolaElevator) return
    setCanolaSaving(true)
    try {
      await fetch('/api/grain360/canola-bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elevator: canolaElevator,
          cash_price: parseFloat(canolaPrice),
          delivery_month: null,
          notes: null,
        }),
      })
      setShowCanolaEntry(false)
      setCanolaPrice('')
      setCanolaElevator('')
      setPricesLoading(true)
      fetch('/api/grain360/prices')
        .then(r => r.json())
        .then(d => { if (d.success) { setFutures(d.futures || []); setCashBids(d.cashBids || []) } })
        .finally(() => setPricesLoading(false))
    } catch {}
    setCanolaSaving(false)
  }

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

  // Hedge Tracker
  interface HedgePosition {
    id: string; crop: string; exchange: string; contract_month: string;
    contracts: number; contract_size_mt: number; direction: string;
    entry_price: number; current_price: number | null; status: string;
    opened_date: string | null; notes: string | null;
  }
  const [hedgePositions, setHedgePositions] = useState<HedgePosition[]>([]);
  const [hedgeLoading, setHedgeLoading] = useState(false);
  const [showHedgeModal, setShowHedgeModal] = useState(false);
  const [editingHedge, setEditingHedge] = useState<HedgePosition | null>(null);
  const [savingHedge, setSavingHedge] = useState(false);
  const [hCrop, setHCrop] = useState("Canola");
  const [hExchange, setHExchange] = useState("ICE");
  const [hMonth, setHMonth] = useState("");
  const [hContracts, setHContracts] = useState("");
  const [hSizeMt, setHSizeMt] = useState("20");
  const [hDirection, setHDirection] = useState("short");
  const [hEntry, setHEntry] = useState("");
  const [hCurrent, setHCurrent] = useState("");
  const [hDate, setHDate] = useState("");
  const [hNotes, setHNotes] = useState("");

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
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3, color: T.green }}>
                    <Activity size={10} />
                    Wheat · Corn · Cattle · Diesel: live
                  </span>
                  <span style={{ color: T.text4 }}>·</span>
                  <span style={{ color: T.gold }}>Canola: manual entry</span>
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
                          <td style={{ padding: "10px 16px", fontSize: 11, color: T.text4 }}>
                            {f.unitCode}
                            {(f.symbol === "ZW*1" || f.symbol === "ZC*1") && (
                              <div style={{ fontSize: 9, color: T.text4, marginTop: 1 }}>¢/bu</div>
                            )}
                            {f.symbol === "WC*1" && (
                              <button
                                onClick={e => { e.stopPropagation(); setShowCanolaEntry(v => !v) }}
                                style={{ display: 'block', marginTop: 3, fontSize: 9, color: T.gold, background: 'none', border: `1px solid ${T.gold}`, borderRadius: 4, padding: '1px 6px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                              >
                                + update
                              </button>
                            )}
                            {(f.symbol === "ZW*1" || f.symbol === "ZC*1") && (
                              <div style={{ fontSize: 9, color: T.text4, marginTop: 1 }}>¢/bu</div>
                            )}
                          </td>
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

          {/* Canola Quick Entry */}
          {showCanolaEntry && (
            <div style={{ background: T.card, border: `1px solid ${T.gold}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: T.gold, marginBottom: 'auto', paddingBottom: 6 }}>📞 Enter today&apos;s canola bid</div>
              <div>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 4 }}>ELEVATOR</div>
                <input
                  value={canolaElevator}
                  onChange={e => setCanolaElevator(e.target.value)}
                  placeholder="e.g. Viterra Swift Current"
                  style={{ ...inputStyle, width: 220, background: T.bg }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.text4, marginBottom: 4 }}>CASH PRICE (CAD/bu)</div>
                <input
                  type="number"
                  step="0.01"
                  value={canolaPrice}
                  onChange={e => setCanolaPrice(e.target.value)}
                  placeholder="e.g. 13.42"
                  style={{ ...inputStyle, width: 140, background: T.bg }}
                />
              </div>
              <button
                onClick={saveCanolaSpot}
                disabled={canolaSaving || !canolaPrice || !canolaElevator}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: T.gold, color: T.bg, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: canolaSaving ? 0.7 : 1 }}
              >
                {canolaSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => setShowCanolaEntry(false)}
                style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'transparent', color: T.text3, fontSize: 12, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          )}

          <LocalCashBids />
        </>

      /* ═══ HEDGE TRACKER TAB ══════════════════════════════ */
      ) : tab === "hedge" ? (
        <>
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: "0 0 2px" }}>Hedge Tracker</h2>
              <p style={{ fontSize: 12, color: T.text4, margin: 0 }}>Futures positions, P&L, and hedge ratios vs your physical crop</p>
            </div>
            <button onClick={openNewHedge} style={{ background: T.purple, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={15} /> Add Position
            </button>
          </div>

          {hedgeLoading ? (
            <div style={{ textAlign: "center", padding: 60 }}><Loader2 size={24} className="animate-spin" style={{ color: T.purple }} /></div>
          ) : hedgePositions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: T.purpleBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Shield size={28} style={{ color: T.purple }} />
              </div>
              <p style={{ color: T.text2, fontSize: 15, marginBottom: 6 }}>No hedge positions yet</p>
              <p style={{ color: T.text4, fontSize: 12, marginBottom: 20 }}>Add a futures position to start tracking your hedge</p>
              <button onClick={openNewHedge} style={{ background: T.purple, color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Add First Position</button>
            </div>
          ) : (() => {
            // ── Calculations ──────────────────────────────────────
            const KG_PER_BU: Record<string, number> = {
              Canola: 22.68, Wheat: 27.22, "CWRS Wheat": 27.22, Durum: 27.22,
              Barley: 21.77, Oats: 15.42, Peas: 27.22, Lentils: 27.22,
              Flax: 25.40, Soybeans: 27.22, Corn: 25.40,
            };

            const openPositions = hedgePositions.filter(p => p.status === "open");

            const totalHedgedMT = openPositions.reduce((s, p) => s + (p.contracts * Number(p.contract_size_mt)), 0);

            const totalPnL = openPositions.reduce((s, p) => {
              if (p.current_price == null) return s;
              const sizeMt = p.contracts * Number(p.contract_size_mt);
              const diff = p.direction === "short"
                ? Number(p.entry_price) - Number(p.current_price)
                : Number(p.current_price) - Number(p.entry_price);
              return s + diff * sizeMt;
            }, 0);

            const totalProductionMT = data?.positions.reduce((s, p) => {
              const kgPerBu = KG_PER_BU[p.crop] || 27.22;
              return s + (p.estimated_production * kgPerBu / 1000);
            }, 0) || 0;

            const hedgeRatio = totalProductionMT > 0
              ? Math.round((totalHedgedMT / totalProductionMT) * 100)
              : 0;

            // Per-crop hedge vs production
            const cropHedge = data?.positions.map(p => {
              const kgPerBu = KG_PER_BU[p.crop] || 27.22;
              const prodMT = p.estimated_production * kgPerBu / 1000;
              const hedgedMT = openPositions
                .filter(h => h.crop === p.crop)
                .reduce((s, h) => s + h.contracts * Number(h.contract_size_mt), 0);
              const ratio = prodMT > 0 ? Math.min(100, Math.round((hedgedMT / prodMT) * 100)) : 0;
              return { crop: p.crop, prodMT: Math.round(prodMT), hedgedMT: Math.round(hedgedMT), ratio };
            }) || [];

            return (
              <>
                {/* KPI Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Total Hedged</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: T.purple }}>{fmtNum(totalHedgedMT)} MT</div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>{openPositions.length} open position{openPositions.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Unrealized P&L</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: totalPnL >= 0 ? T.green : T.red }}>
                      {totalPnL >= 0 ? "+" : ""}{fmtDollar(totalPnL)}
                    </div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>Positions with current price</div>
                  </div>
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 20px" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: T.text3, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Hedge Ratio</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: hedgeRatio >= 30 ? T.green : T.gold }}>{hedgeRatio}%</div>
                    <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>vs estimated production</div>
                  </div>
                </div>

                {/* Per-crop hedge ratio bars */}
                {cropHedge.length > 0 && (
                  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: "0 0 16px" }}>Hedge Ratio by Crop</h3>
                    {cropHedge.map(c => (
                      <div key={c.crop} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCropColor(c.crop) }} />
                            <span style={{ fontSize: 12, color: T.text }}>{c.crop}</span>
                          </div>
                          <span style={{ fontSize: 11, color: T.text3 }}>
                            {fmtNum(c.hedgedMT)} / {fmtNum(c.prodMT)} MT hedged ({c.ratio}%)
                          </span>
                        </div>
                        <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                          <div style={{ width: `${c.ratio}%`, height: "100%", borderRadius: 4, background: c.ratio >= 30 ? T.purple : T.gold, transition: "width 0.6s ease" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Positions table */}
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                  <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}` }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, margin: 0 }}>Open Positions</h3>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                        {["Crop", "Exchange", "Month", "Direction", "Contracts", "Size (MT)", "Entry", "Current", "Unrealized P&L", ""].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 10, fontWeight: 600, color: T.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hedgePositions.map(p => {
                        const sizeMt = p.contracts * Number(p.contract_size_mt);
                        const hasCurrent = p.current_price != null;
                        const diff = hasCurrent
                          ? p.direction === "short"
                            ? Number(p.entry_price) - Number(p.current_price)
                            : Number(p.current_price) - Number(p.entry_price)
                          : null;
                        const pnl = diff != null ? diff * sizeMt : null;

                        return (
                          <tr key={p.id} style={{ borderBottom: `1px solid ${T.border}` }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <td style={{ padding: "12px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCropColor(p.crop) }} />
                                <span style={{ fontSize: 13, color: T.text, fontWeight: 500 }}>{p.crop}</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{p.exchange}</td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2, fontWeight: 600 }}>{p.contract_month}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 10, background: p.direction === "short" ? T.redBg : T.greenBg, color: p.direction === "short" ? T.red : T.green, textTransform: "uppercase" }}>
                                {p.direction}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 13, color: T.text, fontWeight: 600 }}>{p.contracts}</td>
                            <td style={{ padding: "12px 14px", fontSize: 12, color: T.text2 }}>{fmtNum(sizeMt)}</td>
                            <td style={{ padding: "12px 14px", fontSize: 13, color: T.text }}>${Number(p.entry_price).toFixed(2)}</td>
                            <td style={{ padding: "12px 14px", fontSize: 13, color: T.text2 }}>
                              {p.current_price != null ? `$${Number(p.current_price).toFixed(2)}` : <span style={{ color: T.text4 }}>—</span>}
                            </td>
                            <td style={{ padding: "12px 14px", fontSize: 13, fontWeight: 600, color: pnl == null ? T.text4 : pnl >= 0 ? T.green : T.red }}>
                              {pnl != null ? `${pnl >= 0 ? "+" : ""}${fmtDollar(pnl)}` : "—"}
                            </td>
                            <td style={{ padding: "12px 14px", textAlign: "right" }}>
                              <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                                <button onClick={() => openEditHedge(p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Edit2 size={14} style={{ color: T.text3 }} /></button>
                                <button onClick={() => handleDeleteHedge(p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><Trash2 size={14} style={{ color: T.red }} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}

          {/* Add/Edit Modal */}
          {showHedgeModal && (
            <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div onClick={() => { setShowHedgeModal(false); resetHedgeForm(); }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
              <div style={{ position: "relative", background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", padding: 28, zIndex: 101 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>{editingHedge ? "Edit Position" : "Add Hedge Position"}</h2>
                  <button onClick={() => { setShowHedgeModal(false); resetHedgeForm(); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><X size={18} style={{ color: T.text3 }} /></button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
                  <Field label="Crop *">
                    <select value={hCrop} onChange={e => setHCrop(e.target.value)} style={inputStyle}>
                      {PRAIRIE_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Exchange">
                    <select value={hExchange} onChange={e => { setHExchange(e.target.value); setHSizeMt(e.target.value === "ICE" ? "20" : "136"); }} style={inputStyle}>
                      <option value="ICE">ICE (Canola — 20 MT)</option>
                      <option value="CME">CME (Grains — 136 MT)</option>
                      <option value="MGE">MGE (Wheat — 136 MT)</option>
                    </select>
                  </Field>
                  <Field label="Contract Month *">
                    <input value={hMonth} onChange={e => setHMonth(e.target.value)} placeholder="e.g. NOV25" style={inputStyle} />
                  </Field>
                  <Field label="Direction">
                    <select value={hDirection} onChange={e => setHDirection(e.target.value)} style={inputStyle}>
                      <option value="short">Short (selling hedge)</option>
                      <option value="long">Long (buying hedge)</option>
                    </select>
                  </Field>
                  <Field label="# Contracts *">
                    <input type="number" value={hContracts} onChange={e => setHContracts(e.target.value)} placeholder="e.g. 5" style={inputStyle} />
                  </Field>
                  <Field label="Contract Size (MT)">
                    <input type="number" value={hSizeMt} onChange={e => setHSizeMt(e.target.value)} placeholder="20" style={inputStyle} />
                  </Field>
                  <Field label="Entry Price ($/MT) *">
                    <input type="number" step="0.01" value={hEntry} onChange={e => setHEntry(e.target.value)} placeholder="e.g. 612.50" style={inputStyle} />
                  </Field>
                  <Field label="Current Price ($/MT)">
                    <input type="number" step="0.01" value={hCurrent} onChange={e => setHCurrent(e.target.value)} placeholder="e.g. 598.00" style={inputStyle} />
                  </Field>
                  <Field label="Opened Date">
                    <input type="date" value={hDate} onChange={e => setHDate(e.target.value)} style={inputStyle} />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea value={hNotes} onChange={e => setHNotes(e.target.value)} placeholder="Optional notes..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
                </Field>
                {/* Live P&L preview */}
                {hEntry && hCurrent && hContracts && (
                  <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(167,139,250,0.06)", border: `1px solid rgba(167,139,250,0.15)` }}>
                    {(() => {
                      const size = Number(hContracts) * Number(hSizeMt);
                      const diff = hDirection === "short" ? Number(hEntry) - Number(hCurrent) : Number(hCurrent) - Number(hEntry);
                      const pnl = diff * size;
                      return (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: T.text3 }}>Unrealized P&L preview</span>
                          <span style={{ fontSize: 16, fontWeight: 700, color: pnl >= 0 ? T.green : T.red }}>
                            {pnl >= 0 ? "+" : ""}{fmtDollar(pnl)}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setShowHedgeModal(false); resetHedgeForm(); }} style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleSaveHedge} disabled={savingHedge || !hCrop || !hMonth || !hContracts || !hEntry} style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: T.purple, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: savingHedge ? 0.7 : 1 }}>
                    {savingHedge ? "Saving..." : editingHedge ? "Update Position" : "Add Position"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>

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
    <Suspense fallback={<div className="flex items-center justify-center h-96 text-ag-muted">Loading...</div>}>
      <MarketingPageInner />
    </Suspense>
  );
}