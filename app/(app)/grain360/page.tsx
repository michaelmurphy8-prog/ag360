"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Plus, Trash2, Send, CheckCircle2, Circle,
  TrendingUp, TrendingDown, Star, Cloud, Wind,
  Droplets, Sun, CloudRain, CloudSnow, CloudLightning,
  CloudDrizzle, CloudSun, CloudFog, Bot,
} from "lucide-react";
import Link from "next/link";
import LilyIcon from "@/components/LilyIcon";

// ─── Types ───────────────────────────────────────────────────────────────────

type Holding = {
  id?: number;
  crop: string;
  location: string;
  quantity_bu: number;
  grade?: string;
  estimated_price?: number;
};

type Contract = {
  id?: number;
  crop: string;
  contract_type: string;
  quantity_bu: number;
  price_per_bu?: number;
  elevator?: string;
  delivery_date?: string;
};

type Reminder = {
  id?: number;
  title: string;
  due_date?: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
};

type FarmProfile = {
  farmName: string;
  province: string;
  totalAcres: number;
  storageCapacity: number;
  primaryElevator: string;
  riskProfile: string;
  inventory: {
    crop: string;
    mode: "on_hand" | "forecast";
    bushels?: number;
    acres?: number;
    aph?: number;
    targetPrice?: number;
    landRent?: number;
    equipmentDepreciation?: number;
    insurance?: number;
    propertyTax?: number;
    overhead?: number;
    seed?: number;
    fertilizer?: number;
    herbicide?: number;
    fungicide?: number;
    insecticide?: number;
    fuel?: number;
    drying?: number;
    trucking?: number;
    elevation?: number;
    cropInsurance?: number;
  }[];
};

type WeatherData = {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
};

type MonthlyEntry = {
  month: string;
  budget: number;
  actual: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WMO_ICONS: Record<number, { label: string; Icon: React.ElementType }> = {
  0: { label: "Clear", Icon: Sun },
  1: { label: "Mainly Clear", Icon: CloudSun },
  2: { label: "Partly Cloudy", Icon: CloudSun },
  3: { label: "Overcast", Icon: Cloud },
  51: { label: "Drizzle", Icon: CloudDrizzle },
  61: { label: "Rain", Icon: CloudRain },
  71: { label: "Snow", Icon: CloudSnow },
  80: { label: "Showers", Icon: CloudRain },
  95: { label: "Storm", Icon: CloudLightning },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CURRENT_MONTH = new Date().getMonth();
const CURRENT_YEAR = new Date().getFullYear();

const MONTHLY_BUDGETS: MonthlyEntry[] = MONTHS_SHORT.map((month, i) => ({
  month,
  budget: i >= 3 && i <= 5 ? 45000 : i >= 6 && i <= 8 ? 35000 : 20000,
  actual: i < CURRENT_MONTH ? Math.round((Math.random() * 0.3 + 0.85) * (i >= 3 && i <= 5 ? 45000 : i >= 6 && i <= 8 ? 35000 : 20000)) : 0,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function normalizeCrop(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}
function calcCropCosts(crop: FarmProfile["inventory"][0]) {
  const fixed = (crop.landRent || 0) + (crop.equipmentDepreciation || 0) + (crop.insurance || 0) + (crop.propertyTax || 0) + (crop.overhead || 0);
  const variable = (crop.seed || 0) + (crop.fertilizer || 0) + (crop.herbicide || 0) + (crop.fungicide || 0) + (crop.insecticide || 0) + (crop.fuel || 0) + (crop.drying || 0) + (crop.trucking || 0) + (crop.elevation || 0) + (crop.cropInsurance || 0);
  return fixed + variable;
}

function getWeatherInfo(code: number) {
  return WMO_ICONS[code] || { label: "Unknown", Icon: Cloud };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, highlight, trend }: { label: string; value: string; sub?: string; highlight?: boolean; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "border-[var(--ag-border)]" : "bg-[var(--ag-bg-card)] border-[var(--ag-border)]"}`}
  style={highlight ? { backgroundColor: "rgba(var(--ag-yellow-rgb, 234,179,8), 0.06)" } : {}}>
      <p className="font-mono text-[11px] font-bold text-ag-primary uppercase tracking-[1.5px]">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <p className={`text-2xl font-bold ${highlight ? "text-[var(--ag-yellow)]" : "text-ag-primary"}`}>{value}</p>
        {trend === "up" && <TrendingUp size={14} className="text-[var(--ag-green)] mb-1" />}
        {trend === "down" && <TrendingDown size={14} className="text-[var(--ag-red)] mb-1" />}
      </div>
      {sub && <p className="text-xs text-ag-muted mt-1">{sub}</p>}
    </div>
  );
}

function CropCard({ crop, holdings, contracts }: { crop: FarmProfile["inventory"][0]; holdings: Holding[]; contracts: Contract[] }) {
  const costPerAcre = calcCropCosts(crop);
  const aph = crop.aph || 1;
  const breakEven = costPerAcre / aph;
  const cropHoldings = holdings.filter(h => normalizeCrop(h.crop) === normalizeCrop(crop.crop));
const totalBu = cropHoldings.reduce((s, h) => s + Number(h.quantity_bu), 0);
const contracted = contracts.filter(c => normalizeCrop(c.crop) === normalizeCrop(crop.crop)).reduce((s, c) => s + Number(c.quantity_bu), 0);
  const targetPrice = crop.targetPrice || 0;
  const margin = targetPrice - breakEven;
  const pctContracted = totalBu > 0 ? Math.min(100, Math.round((contracted / totalBu) * 100)) : 0;
  const estValue = totalBu * targetPrice;

  return (
    <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-ag-primary text-base">{crop.crop}</p>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${margin >= 0 ? "bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)]" : "bg-[var(--ag-red-dim)] text-[var(--ag-red)]"}`}>
          {margin >= 0 ? "+" : ""}{fmt(margin)}/bu margin
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><p className="text-ag-muted">On Hand</p><p className="font-bold text-ag-primary">{totalBu.toLocaleString()} bu</p></div>
        <div><p className="text-ag-muted">Est. Value</p><p className="font-bold text-[var(--ag-green)]">{fmt(estValue)}</p></div>
        <div><p className="text-ag-muted">Break-even</p><p className="font-bold text-ag-primary">${breakEven.toFixed(2)}/bu</p></div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-ag-muted mb-1">
          <span>{contracted.toLocaleString()} bu contracted</span>
          <span>{pctContracted}%</span>
        </div>
        <div className="h-2 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--ag-accent)] rounded-full" style={{ width: `${pctContracted}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Watchlist Widget ─────────────────────────────────────────────────────────

function WatchlistWidget() {
  const [items, setItems] = useState<{ symbol: string; label: string; type: string }[]>([]);
  const [prices, setPrices] = useState<Record<string, { lastPrice: number; priceChange: number; percentChange: number; unitCode: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          fetch("/api/grain360/watchlist"),
          fetch("/api/grain360/prices"),
        ]);
        const wData = await wRes.json();
        const pData = await pRes.json();

        if (wData.success) setItems(wData.watchlist);

        if (pData.success) {
          const map: Record<string, { lastPrice: number; priceChange: number; percentChange: number; unitCode: string }> = {};
          pData.futures.forEach((f: { symbol: string; lastPrice: number; priceChange: number; percentChange: number; unitCode: string }) => {
            map[f.symbol] = { lastPrice: f.lastPrice, priceChange: f.priceChange, percentChange: f.percentChange, unitCode: f.unitCode };
          });
          pData.cashBids.forEach((b: { id: string; cashPrice: number; basis: number }) => {
            map[b.id] = { lastPrice: b.cashPrice, priceChange: b.basis, percentChange: 0, unitCode: "CAD" };
          });
          setPrices(map);
        }
      } catch {
        console.error("Watchlist widget load failed");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star size={14} className="text-[var(--ag-yellow)] fill-[var(--ag-yellow)]" />
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">Market Watchlist</p>
        </div>
        <Link href="/grain360/prices" className="text-xs text-[var(--ag-green)] font-medium hover:text-[var(--ag-green)] transition-colors">
          View All Prices →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.slice(0, 5).map(item => {
          const price = prices[item.symbol];
          const isUp = price && price.priceChange > 0;
          const isDown = price && price.priceChange < 0;
          return (
            <div key={item.symbol} className="bg-[var(--ag-bg-hover)] rounded-[10px] p-3 border border-[var(--ag-border)]">
              <p className="text-xs text-ag-muted truncate mb-1">{item.label}</p>
              {price ? (
                <>
                  <p className="text-base font-bold text-ag-primary">
                    {item.type === "cash" ? `$${price.lastPrice.toFixed(2)}` : price.lastPrice.toFixed(2)}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${isUp ? "text-[var(--ag-green)]" : isDown ? "text-[var(--ag-red)]" : "text-ag-muted"}`}>
                    {isUp ? "+" : ""}{price.priceChange.toFixed(2)}
                    {item.type === "futures" && ` (${price.percentChange.toFixed(2)}%)`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ag-muted">—</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Grain360Page() {
  const { user } = useUser();
  const [profile, setProfile] = useState<FarmProfile | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [lilyInput, setLilyInput] = useState("");
  const [lilyResponse, setLilyResponse] = useState("");
  const [lilyLoading, setLilyLoading] = useState(false);
  const [newReminder, setNewReminder] = useState<{ title: string; due_date: string; priority: "low" | "medium" | "high" }>({ title: "", due_date: "", priority: "medium" });
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [activeMonthlyTab, setActiveMonthlyTab] = useState<"spend" | "income">("spend");

  const headers = { "x-user-id": user?.id || "" };

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      fetch("/api/farm-profile", { headers }).then(r => r.json()),
      fetch("/api/inventory/holdings", { headers }).then(r => r.json()),
      fetch("/api/inventory/contracts", { headers }).then(r => r.json()),
      fetch("/api/grain360/reminders", { headers }).then(r => r.json()),
      fetch("/api/weather").then(r => r.json()),
    ]).then(([p, h, c, rem, w]) => {
      if (p.profile) setProfile(p.profile);
      setHoldings(h.holdings || []);
      setContracts(c.contracts || []);
      setReminders(rem.reminders || []);
      if (w.weather) setWeather(w.weather);
    });
  }, [user?.id]);

  // ── Derived KPIs ──
  const totalBu = holdings.reduce((s, h) => s + Number(h.quantity_bu), 0);
  const totalValue = holdings.reduce((s, h) => {
  const profileCrop = profile?.inventory.find(
    c => c.crop.toLowerCase().trim() === h.crop.toLowerCase().trim()
  );
  const price = profileCrop?.targetPrice || Number(h.estimated_price) || 0;
  return s + Number(h.quantity_bu) * price;
}, 0);
  const totalContracted = contracts.reduce((s, c) => s + Number(c.quantity_bu), 0);
  const projectedHarvest = profile?.inventory.reduce((s, crop) => {
  return s + ((crop.acres || 0) * (crop.aph || 0));
}, 0) || 0;
const pctContracted = projectedHarvest > 0 ? Math.round((totalContracted / projectedHarvest) * 100) : 0;
  const totalAcres = profile?.totalAcres || 1;

  const totalCosts = profile?.inventory.reduce((s, crop) => {
    return s + calcCropCosts(crop) * (crop.acres || 0);
  }, 0) || 0;

  const avgCostPerAcre = totalCosts > 0 && totalAcres > 0 ? totalCosts / totalAcres : 0;
const avgCostPerAcreDisplay = avgCostPerAcre > 0 ? fmt(avgCostPerAcre) : "—";

  const ytdIncome = contracts.reduce((s, c) => s + Number(c.quantity_bu) * Number(c.price_per_bu || 0), 0);

  const fixedAssets = profile ? (profile.totalAcres * 1200) + (profile.storageCapacity * 2) : 0;

  // ── Lily Quick Ask ──
  async function askLily() {
    if (!lilyInput.trim() || lilyLoading) return;
    setLilyLoading(true);
    setLilyResponse("");
    const prompt = profile
      ? `[FARM: ${profile.farmName}, ${profile.province}, ${profile.totalAcres} acres]\n\n${lilyInput}`
      : lilyInput;
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.body) throw new Error("No body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setLilyResponse(full);
      }
    } catch (e) { console.error(e); }
    finally { setLilyLoading(false); setLilyInput(""); }
  }

  // ── Reminders ──
  async function addReminder() {
    if (!newReminder.title.trim()) return;
    const res = await fetch("/api/grain360/reminders", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item: newReminder }),
    });
    const data = await res.json();
    setReminders([data.reminder, ...reminders]);
    setNewReminder({ title: "", due_date: "", priority: "medium" });
    setShowAddReminder(false);
  }

  async function toggleReminder(id: number) {
    await fetch("/api/grain360/reminders", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", item: { id } }),
    });
    setReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  }

  async function deleteReminder(id: number) {
    await fetch("/api/grain360/reminders", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item: { id } }),
    });
    setReminders(reminders.filter(r => r.id !== id));
  }

  const inputClass = "w-full text-sm border border-[var(--ag-border-solid)] rounded-[10px] px-3 py-2 outline-none focus:border-[var(--ag-accent)]/50 bg-[var(--ag-bg-hover)] text-ag-primary placeholder:text-ag-muted";
  const priorityColor = { low: "var(--ag-green)", medium: "var(--ag-yellow)", high: "var(--ag-red)" };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Grain360</h1>
          <p className="text-[13px] text-ag-muted mt-1">
            {profile ? `${profile.farmName} · ${profile.totalAcres.toLocaleString()} acres · ${profile.riskProfile} risk` : "Complete your Farm Profile to unlock full insights"}
          </p>
        </div>
        <div className="font-mono text-[11px] font-medium text-[var(--ag-green)] bg-[var(--ag-accent)]/[0.08] border border-[var(--ag-accent-border)] px-4 py-2 rounded-full tracking-[1px]">
          {CURRENT_YEAR} Crop Year
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Total Inventory" value={`${totalBu.toLocaleString()} bu`} sub="across all bins" />
        <KPICard label="Est. Value" value={fmt(totalValue)} sub="at target prices" trend="up" />
        <KPICard label="% Contracted" value={`${pctContracted}%`} sub={projectedHarvest > 0 ? `${totalContracted.toLocaleString()} of ${projectedHarvest.toLocaleString()} bu projected` : "Set Farm Profile to calculate"} highlight={pctContracted < 50} />
        <KPICard label="Avg Cost/Acre" value={avgCostPerAcreDisplay} sub={avgCostPerAcre > 0 ? "all crops blended" : "Complete Farm Profile"} />
        <KPICard label="YTD Income" value={fmt(ytdIncome)} sub="contracted sales" trend="up" />
        <KPICard label="Fixed Assets" value={fmt(fixedAssets)} sub="land + storage est." />
      </div>

      {/* Crop Position Cards */}
      {profile && profile.inventory.length > 0 && (
        <div>
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px] mb-3">Crop Positions</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
  {profile.inventory.filter(c => c.crop).map((crop, i, arr) => (
    <div key={i} className={
      arr.length % 3 === 1 && i === arr.length - 1 ? "col-span-2 lg:col-span-3" :
      arr.length % 3 === 2 && i === arr.length - 1 ? "col-span-2 lg:col-span-1" : ""
    }>
      <CropCard crop={crop} holdings={holdings} contracts={contracts} />
    </div>
  ))}
</div>
        </div>
      )}

      {/* Market Prices Watchlist Widget */}
      <WatchlistWidget />

      {/* Marketing + Reminders Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Active Contracts */}
        <div className="col-span-2 bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px] mb-4">Active Contracts</p>
          {contracts.length === 0 ? (
            <p className="text-sm text-ag-muted py-4 text-center">No contracts yet — go to Inventory to add sales.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-ag-muted uppercase tracking-wide border-b border-[var(--ag-border)]">
                  <th className="text-left pb-2 pr-4">Crop</th>
                  <th className="text-left pb-2 pr-4">Type</th>
                  <th className="text-right pb-2 pr-4">Qty</th>
                  <th className="text-right pb-2 pr-4">Price</th>
                  <th className="text-right pb-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ag-border)]">
                {contracts.slice(0, 6).map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-semibold text-ag-primary">{c.crop}</td>
                    <td className="py-2 pr-4"><span className="text-xs bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)] font-semibold px-2 py-0.5 rounded-full">{c.contract_type}</span></td>
                    <td className="py-2 pr-4 text-right text-ag-secondary">{Number(c.quantity_bu).toLocaleString()} bu</td>
                    <td className="py-2 pr-4 text-right text-ag-muted">{c.price_per_bu ? `$${c.price_per_bu}/bu` : "—"}</td>
                    <td className="py-2 text-right font-semibold text-[var(--ag-green)]">{c.price_per_bu ? fmt(Number(c.quantity_bu) * Number(c.price_per_bu)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Reminders */}
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">To-Do / Reminders</p>
            <button onClick={() => setShowAddReminder(!showAddReminder)} className="text-xs font-semibold text-[var(--ag-green)] hover:text-[var(--ag-green)] flex items-center gap-1 transition-colors">
              <Plus size={12} /> Add
            </button>
          </div>
          {showAddReminder && (
            <div className="mb-3 space-y-2">
              <input type="text" placeholder="Task title..." value={newReminder.title}
                onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                onKeyDown={e => e.key === "Enter" && addReminder()}
                className={inputClass} />
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={newReminder.due_date}
                  onChange={e => setNewReminder({ ...newReminder, due_date: e.target.value })}
                  className={inputClass} />
                <select value={newReminder.priority}
                  onChange={e => setNewReminder({ ...newReminder, priority: e.target.value as "low" | "medium" | "high" })}
                  className={inputClass}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <button onClick={addReminder} className="w-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-xs font-semibold py-2 rounded-full hover:bg-[var(--ag-accent-hover)] transition-colors">Save</button>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
            {reminders.length === 0 ? (
              <p className="text-xs text-ag-muted text-center py-4">No reminders yet.</p>
            ) : reminders.map((r, i) => (
              <div key={r.id || i} className="flex items-start gap-2 group">
                <button onClick={() => r.id && toggleReminder(r.id)} className="mt-0.5 shrink-0">
                  {r.completed
                    ? <CheckCircle2 size={16} className="text-[var(--ag-green)]" />
                    : <Circle size={16} className="text-ag-muted" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${r.completed ? "line-through text-ag-muted" : "text-ag-primary"}`}>{r.title}</p>
                  {r.due_date && <p className="text-xs text-ag-muted">{r.due_date}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor[r.priority] }} />
                  <button onClick={() => r.id && deleteReminder(r.id)}><Trash2 size={12} className="text-[var(--ag-red)]" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Spend + Weather Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly Spend Tracker */}
        <div className="col-span-2 bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">Monthly Spend Tracker</p>
            <div className="flex gap-2">
              {(["spend", "income"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveMonthlyTab(tab)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${activeMonthlyTab === tab ? "bg-[var(--ag-accent)] text-[var(--ag-accent-text)] border-[var(--ag-accent)]" : "text-ag-muted border-[var(--ag-border-solid)] hover:text-[var(--ag-text-secondary)]"}`}>
                  {tab === "spend" ? "Expenses" : "Income"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {MONTHLY_BUDGETS.slice(0, 6).map((m, i) => {
              const isCurrent = i === CURRENT_MONTH;
              const pct = m.budget > 0 ? Math.min(130, Math.round((m.actual / m.budget) * 100)) : 0;
              const over = m.actual > m.budget;
              return (
                <div key={m.month} className={`p-3 rounded-[10px] ${isCurrent ? "bg-[var(--ag-accent)]/[0.06] border border-[var(--ag-accent-border)]" : "bg-[var(--ag-bg-hover)]"}`}>
                  <p className="text-xs font-bold text-ag-primary">{m.month}</p>
                  <div className="mt-2 h-16 bg-[var(--ag-bg-active)] rounded-full overflow-hidden flex items-end">
                    <div className="w-full rounded-full transition-all"
                      style={{ height: `${pct}%`, backgroundColor: over ? "var(--ag-red)" : "var(--ag-green)", opacity: m.actual === 0 ? 0.2 : 0.85 }} />
                  </div>
                  <p className="text-xs font-semibold text-ag-primary mt-1">{m.actual > 0 ? fmt(m.actual) : "—"}</p>
                  <p className="text-xs text-ag-muted">of {fmt(m.budget)}</p>
                  {m.actual > 0 && (
                    <p className={`text-xs font-semibold ${over ? "text-[var(--ag-red)]" : "text-[var(--ag-green)]"}`}>
                      {over ? "+" : "-"}{Math.abs(100 - pct)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-6 gap-2 mt-2">
            {MONTHLY_BUDGETS.slice(6).map((m, i) => {
              const idx = i + 6;
              const isCurrent = idx === CURRENT_MONTH;
              const pct = m.budget > 0 ? Math.min(130, Math.round((m.actual / m.budget) * 100)) : 0;
              const over = m.actual > m.budget;
              return (
                <div key={m.month} className={`p-3 rounded-[10px] ${isCurrent ? "bg-[var(--ag-accent)]/[0.06] border border-[var(--ag-accent-border)]" : "bg-[var(--ag-bg-hover)]"}`}>
                  <p className="text-xs font-bold text-ag-primary">{m.month}</p>
                  <div className="mt-2 h-16 bg-[var(--ag-bg-active)] rounded-full overflow-hidden flex items-end">
                    <div className="w-full rounded-full transition-all"
                      style={{ height: `${pct}%`, backgroundColor: over ? "var(--ag-red)" : "var(--ag-green)", opacity: m.actual === 0 ? 0.2 : 0.85 }} />
                  </div>
                  <p className="text-xs font-semibold text-ag-primary mt-1">{m.actual > 0 ? fmt(m.actual) : "—"}</p>
                  <p className="text-xs text-ag-muted">of {fmt(m.budget)}</p>
                  {m.actual > 0 && (
                    <p className={`text-xs font-semibold ${over ? "text-[var(--ag-red)]" : "text-[var(--ag-green)]"}`}>
                      {over ? "+" : "-"}{Math.abs(100 - pct)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weather Widget */}
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px] mb-4">Weather · Swift Current</p>
          {weather ? (() => {
            const windDir = weather.current.wind_direction_10m;
            const compassDir = ["N","NE","E","SE","S","SW","W","NW"][Math.round(windDir / 45) % 8];
            const frostDays = weather.daily.time.slice(0, 7).reduce((acc: string[], d, i) => {
              if (weather.daily.temperature_2m_min[i] <= 0) acc.push(DAYS[new Date(d).getDay()]);
              return acc;
            }, []);
            const rainDays = weather.daily.time.slice(0, 7).reduce((acc: {day: string; mm: number}[], d, i) => {
              if ((weather.daily.precipitation_sum[i] || 0) >= 5) acc.push({ day: DAYS[new Date(d).getDay()], mm: Math.round(weather.daily.precipitation_sum[i]) });
              return acc;
            }, []);
            const { Icon: CurrentIcon } = getWeatherInfo(weather.current.weather_code);
            return (
              <div className="space-y-4">
                {/* Current conditions */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-4xl font-bold text-ag-primary">{Math.round(weather.current.temperature_2m)}°C</p>
                    <p className="text-xs text-ag-secondary mt-1">{getWeatherInfo(weather.current.weather_code).label}</p>
                    <p className="text-xs text-ag-muted mt-0.5">Feels like {Math.round(weather.current.apparent_temperature)}°C</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Wind size={11} className="text-ag-muted" />
                      <p className="text-xs text-ag-muted">{Math.round(weather.current.wind_speed_10m)} km/h {compassDir}</p>
                      <span className="text-ag-muted mx-1">·</span>
                      <Droplets size={11} className="text-ag-muted" />
                      <p className="text-xs text-ag-muted">{weather.current.relative_humidity_2m}% RH</p>
                    </div>
                  </div>
                  <CurrentIcon size={44} className="text-[var(--ag-yellow)]" />
                </div>

                {/* Ag alerts */}
                {(frostDays.length > 0 || rainDays.length > 0) && (
                  <div className="space-y-1.5">
                    {frostDays.length > 0 && (
                      <div className="flex items-center gap-2 bg-[var(--ag-blue)]/[0.06] border border-[var(--ag-blue)]/20 rounded-lg px-3 py-2">
                        <CloudSnow size={12} className="text-[var(--ag-blue)] shrink-0" />
                        <p className="text-xs text-ag-secondary">Frost risk: <span className="font-semibold text-ag-primary">{frostDays.join(", ")}</span></p>
                      </div>
                    )}
                    {rainDays.length > 0 && (
                      <div className="flex items-center gap-2 bg-[var(--ag-accent)]/[0.06] border border-[var(--ag-accent-border)] rounded-lg px-3 py-2">
                        <CloudRain size={12} className="text-[var(--ag-green)] shrink-0" />
                        <p className="text-xs text-ag-secondary">
                          Rain: <span className="font-semibold text-ag-primary">{rainDays.map(r => `${r.day} ${r.mm}mm`).join(", ")}</span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 7-day forecast */}
                <div className="space-y-1.5">
                  {weather.daily.time.slice(0, 7).map((dateStr, i) => {
                    const date = new Date(dateStr);
                    const { Icon } = getWeatherInfo(weather.daily.weather_code[i]);
                    const precip = weather.daily.precipitation_sum[i] || 0;
                    return (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <p className="text-ag-muted w-8 shrink-0">{i === 0 ? "Today" : DAYS[date.getDay()]}</p>
                        <Icon size={13} className="text-ag-secondary shrink-0" />
                        <div className="flex items-center gap-1 w-10 justify-end">
                          <Droplets size={9} className="text-[var(--ag-blue)]" />
                          <p className="text-ag-muted">{weather.daily.precipitation_probability_max[i]}%</p>
                        </div>
                        {precip >= 1 && (
                          <p className="text-[var(--ag-blue)] w-10 text-right">{precip.toFixed(1)}mm</p>
                        )}
                        {precip < 1 && <p className="w-10" />}
                        <p className="font-semibold text-ag-primary text-right w-16">{Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })() : <p className="text-xs text-ag-muted">Loading weather...</p>}
        </div>
      </div>

      {/* Lily Quick Ask */}
      <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[var(--ag-accent)]/[0.12] border border-[var(--ag-accent-border)] flex items-center justify-center">
            <LilyIcon size={20} />
          </div>
          <div>
            <p className="text-sm font-bold text-ag-primary">Ask Lily</p>
            <p className="text-xs text-ag-muted">Ask anything about your operation</p>
          </div>
        </div>
        {lilyResponse && (
          <div className="mb-4 p-4 bg-[var(--ag-bg-hover)] rounded-xl text-sm text-ag-secondary leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
            {lilyResponse}
            {lilyLoading && <span className="inline-block w-1.5 h-3.5 bg-[var(--ag-accent)] ml-0.5 animate-pulse rounded-sm" />}
          </div>
        )}
        <div className="flex gap-3 items-center bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-xl px-4 py-3">
          <input type="text" value={lilyInput} onChange={e => setLilyInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askLily()}
            placeholder="Ask Lily anything about your farm…"
            className="flex-1 text-sm text-ag-primary placeholder:text-ag-muted outline-none bg-transparent" />
          <button onClick={askLily} disabled={lilyLoading || !lilyInput.trim()}
            className="w-8 h-8 rounded-full bg-[var(--ag-accent)] flex items-center justify-center hover:bg-[var(--ag-accent-hover)] disabled:opacity-40 transition-colors">
            <Send size={14} className="text-[var(--ag-accent-text)]" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {["What's my best crop to sell right now?", "When is my next spray window?", "Give me a P&L summary"].map(chip => (
            <button key={chip} onClick={() => { setLilyInput(chip); }}
              className="text-xs bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-secondary px-3 py-1.5 rounded-full hover:bg-[var(--ag-bg-active)] hover:text-ag-primary transition-colors">
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}