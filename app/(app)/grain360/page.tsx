"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { Plus, Trash2, Send, CheckCircle2, Circle, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import Link from 'next/link'

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
  current: { temperature_2m: number; weather_code: number; wind_speed_10m: number };
  daily: { time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[]; weather_code: number[] };
};

type MonthlyEntry = {
  month: string;
  budget: number;
  actual: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear", icon: "☀️" }, 1: { label: "Mainly Clear", icon: "🌤️" },
  2: { label: "Partly Cloudy", icon: "⛅" }, 3: { label: "Overcast", icon: "☁️" },
  51: { label: "Drizzle", icon: "🌦️" }, 61: { label: "Rain", icon: "🌧️" },
  71: { label: "Snow", icon: "🌨️" }, 80: { label: "Showers", icon: "🌦️" },
  95: { label: "Storm", icon: "⛈️" },
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

function calcCropCosts(crop: FarmProfile["inventory"][0]) {
  const fixed = (crop.landRent || 0) + (crop.equipmentDepreciation || 0) + (crop.insurance || 0) + (crop.propertyTax || 0) + (crop.overhead || 0);
  const variable = (crop.seed || 0) + (crop.fertilizer || 0) + (crop.herbicide || 0) + (crop.fungicide || 0) + (crop.insecticide || 0) + (crop.fuel || 0) + (crop.drying || 0) + (crop.trucking || 0) + (crop.elevation || 0) + (crop.cropInsurance || 0);
  return fixed + variable;
}

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { label: "Unknown", icon: "🌡️" };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KPICard({ label, value, sub, highlight, trend }: { label: string; value: string; sub?: string; highlight?: boolean; trend?: "up" | "down" | "neutral" }) {
  return (
    <div className={`rounded-[20px] border shadow-sm p-5 ${highlight ? "bg-[#FFF8EC] border-[#F5D78E]" : "bg-white border-[#E4E7E0]"}`}>
      <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-2 mt-1">
        <p className={`text-2xl font-bold ${highlight ? "text-[#D97706]" : "text-[#222527]"}`}>{value}</p>
        {trend === "up" && <TrendingUp size={14} className="text-[#4A7C59] mb-1" />}
        {trend === "down" && <TrendingDown size={14} className="text-[#D94F3D] mb-1" />}
      </div>
      {sub && <p className="text-xs text-[#7A8A7C] mt-1">{sub}</p>}
    </div>
  );
}

function CropCard({ crop, holdings, contracts }: { crop: FarmProfile["inventory"][0]; holdings: Holding[]; contracts: Contract[] }) {
  const costPerAcre = calcCropCosts(crop);
  const aph = crop.aph || 1;
  const breakEven = costPerAcre / aph;
  const cropHoldings = holdings.filter(h => h.crop.toLowerCase() === crop.crop.toLowerCase());
  const totalBu = cropHoldings.reduce((s, h) => s + Number(h.quantity_bu), 0);
  const contracted = contracts.filter(c => c.crop.toLowerCase() === crop.crop.toLowerCase()).reduce((s, c) => s + Number(c.quantity_bu), 0);
  const targetPrice = crop.targetPrice || 0;
  const margin = targetPrice - breakEven;
  const pctContracted = totalBu > 0 ? Math.min(100, Math.round((contracted / totalBu) * 100)) : 0;
  const estValue = totalBu * targetPrice;

  return (
    <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-[#222527] text-base">{crop.crop}</p>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${margin >= 0 ? "bg-[#EEF5F0] text-[#4A7C59]" : "bg-[#FDEEED] text-[#D94F3D]"}`}>
          {margin >= 0 ? "+" : ""}{fmt(margin)}/bu margin
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><p className="text-[#7A8A7C]">On Hand</p><p className="font-bold text-[#222527]">{totalBu.toLocaleString()} bu</p></div>
        <div><p className="text-[#7A8A7C]">Est. Value</p><p className="font-bold text-[#4A7C59]">{fmt(estValue)}</p></div>
        <div><p className="text-[#7A8A7C]">Break-even</p><p className="font-bold text-[#222527]">${breakEven.toFixed(2)}/bu</p></div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-[#7A8A7C] mb-1">
          <span>{contracted.toLocaleString()} bu contracted</span>
          <span>{pctContracted}%</span>
        </div>
        <div className="h-2 bg-[#F5F5F3] rounded-full overflow-hidden">
          <div className="h-full bg-[#4A7C59] rounded-full" style={{ width: `${pctContracted}%` }} />
        </div>
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
  const totalValue = holdings.reduce((s, h) => s + Number(h.quantity_bu) * Number(h.estimated_price || 0), 0);
  const totalContracted = contracts.reduce((s, c) => s + Number(c.quantity_bu), 0);
  const pctContracted = totalBu > 0 ? Math.round((totalContracted / totalBu) * 100) : 0;
  const totalAcres = profile?.totalAcres || 1;

  const totalCosts = profile?.inventory.reduce((s, crop) => {
    return s + calcCropCosts(crop) * (crop.acres || 0);
  }, 0) || 0;

  const avgCostPerAcre = totalAcres > 0 ? totalCosts / totalAcres : 0;

  const ytdIncome = contracts.reduce((s, c) => s + Number(c.quantity_bu) * Number(c.price_per_bu || 0), 0);
  const ytdExpenses = MONTHLY_BUDGETS.slice(0, CURRENT_MONTH).reduce((s, m) => s + m.actual, 0);

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

  const inputClass = "w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white";
  const priorityColor = { low: "#4A7C59", medium: "#D97706", high: "#D94F3D" };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Grain360</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">
            {profile ? `${profile.farmName} · ${profile.totalAcres.toLocaleString()} acres · ${profile.riskProfile} risk` : "Complete your Farm Profile to unlock full insights"}
          </p>
        </div>
        <div className="text-xs font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2 rounded-full">
          {CURRENT_YEAR} Crop Year
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KPICard label="Total Inventory" value={`${totalBu.toLocaleString()} bu`} sub="across all bins" />
        <KPICard label="Est. Value" value={fmt(totalValue)} sub="at target prices" trend="up" />
        <KPICard label="% Contracted" value={`${pctContracted}%`} sub={`${totalContracted.toLocaleString()} bu sold`} highlight={pctContracted < 50} />
        <KPICard label="Avg Cost/Acre" value={fmt(avgCostPerAcre)} sub="all crops blended" />
        <KPICard label="YTD Income" value={fmt(ytdIncome)} sub="contracted sales" trend="up" />
        <KPICard label="Fixed Assets" value={fmt(fixedAssets)} sub="land + storage est." />
      </div>

      {/* Crop Position Cards */}
      {profile && profile.inventory.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide mb-3">Crop Positions</p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {profile.inventory.filter(c => c.crop).map((crop, i) => (
              <CropCard key={i} crop={crop} holdings={holdings} contracts={contracts} />
            ))}
          </div>
        </div>
      )}

{/* Market Prices Watchlist Widget */}
<WatchlistWidget />
      {/* Marketing + Reminders Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Active Contracts */}
        <div className="col-span-2 bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide mb-4">Active Contracts</p>
          {contracts.length === 0 ? (
            <p className="text-sm text-[#7A8A7C] py-4 text-center">No contracts yet — go to Inventory to add sales.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide border-b border-[#E4E7E0]">
                  <th className="text-left pb-2 pr-4">Crop</th>
                  <th className="text-left pb-2 pr-4">Type</th>
                  <th className="text-right pb-2 pr-4">Qty</th>
                  <th className="text-right pb-2 pr-4">Price</th>
                  <th className="text-right pb-2">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F3]">
                {contracts.slice(0, 6).map((c, i) => (
                  <tr key={i}>
                    <td className="py-2 pr-4 font-semibold text-[#222527]">{c.crop}</td>
                    <td className="py-2 pr-4"><span className="text-xs bg-[#EEF5F0] text-[#4A7C59] font-semibold px-2 py-0.5 rounded-full">{c.contract_type}</span></td>
                    <td className="py-2 pr-4 text-right">{Number(c.quantity_bu).toLocaleString()} bu</td>
                    <td className="py-2 pr-4 text-right text-[#7A8A7C]">{c.price_per_bu ? `$${c.price_per_bu}/bu` : "—"}</td>
                    <td className="py-2 text-right font-semibold text-[#4A7C59]">{c.price_per_bu ? fmt(Number(c.quantity_bu) * Number(c.price_per_bu)) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Reminders */}
        <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">To-Do / Reminders</p>
            <button onClick={() => setShowAddReminder(!showAddReminder)} className="text-xs font-semibold text-[#4A7C59] hover:underline flex items-center gap-1">
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
              <button onClick={addReminder} className="w-full bg-[#4A7C59] text-white text-xs font-semibold py-2 rounded-full">Save</button>
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {reminders.length === 0 ? (
              <p className="text-xs text-[#7A8A7C] text-center py-4">No reminders yet.</p>
            ) : reminders.map((r, i) => (
              <div key={r.id || i} className="flex items-start gap-2 group">
                <button onClick={() => r.id && toggleReminder(r.id)} className="mt-0.5 shrink-0">
                  {r.completed
                    ? <CheckCircle2 size={16} className="text-[#4A7C59]" />
                    : <Circle size={16} className="text-[#7A8A7C]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${r.completed ? "line-through text-[#7A8A7C]" : "text-[#222527]"}`}>{r.title}</p>
                  {r.due_date && <p className="text-xs text-[#7A8A7C]">{r.due_date}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: priorityColor[r.priority] }} />
                  <button onClick={() => r.id && deleteReminder(r.id)}><Trash2 size={12} className="text-[#D94F3D]" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Spend + Weather Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly Spend Tracker */}
        <div className="col-span-2 bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Monthly Spend Tracker</p>
            <div className="flex gap-2">
              {(["spend", "income"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveMonthlyTab(tab)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${activeMonthlyTab === tab ? "bg-[#4A7C59] text-white border-[#4A7C59]" : "text-[#7A8A7C] border-[#E4E7E0]"}`}>
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
                <div key={m.month} className={`p-3 rounded-[12px] ${isCurrent ? "bg-[#EEF5F0] border border-[#4A7C59]" : "bg-[#F5F5F3]"}`}>
                  <p className="text-xs font-bold text-[#222527]">{m.month}</p>
                  <div className="mt-2 h-16 bg-[#E4E7E0] rounded-full overflow-hidden flex items-end">
                    <div className="w-full rounded-full transition-all"
                      style={{ height: `${pct}%`, backgroundColor: over ? "#D94F3D" : "#4A7C59", opacity: m.actual === 0 ? 0.2 : 0.85 }} />
                  </div>
                  <p className="text-xs font-semibold text-[#222527] mt-1">{m.actual > 0 ? fmt(m.actual) : "—"}</p>
                  <p className="text-xs text-[#7A8A7C]">of {fmt(m.budget)}</p>
                  {m.actual > 0 && (
                    <p className={`text-xs font-semibold ${over ? "text-[#D94F3D]" : "text-[#4A7C59]"}`}>
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
                <div key={m.month} className={`p-3 rounded-[12px] ${isCurrent ? "bg-[#EEF5F0] border border-[#4A7C59]" : "bg-[#F5F5F3]"}`}>
                  <p className="text-xs font-bold text-[#222527]">{m.month}</p>
                  <div className="mt-2 h-16 bg-[#E4E7E0] rounded-full overflow-hidden flex items-end">
                    <div className="w-full rounded-full transition-all"
                      style={{ height: `${pct}%`, backgroundColor: over ? "#D94F3D" : "#4A7C59", opacity: m.actual === 0 ? 0.2 : 0.85 }} />
                  </div>
                  <p className="text-xs font-semibold text-[#222527] mt-1">{m.actual > 0 ? fmt(m.actual) : "—"}</p>
                  <p className="text-xs text-[#7A8A7C]">of {fmt(m.budget)}</p>
                  {m.actual > 0 && (
                    <p className={`text-xs font-semibold ${over ? "text-[#D94F3D]" : "text-[#4A7C59]"}`}>
                      {over ? "+" : "-"}{Math.abs(100 - pct)}%
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weather Widget */}
        <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide mb-4">Weather · Swift Current</p>
          {weather ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-4xl font-bold text-[#222527]">{Math.round(weather.current.temperature_2m)}°C</p>
                  <p className="text-xs text-[#7A8A7C] mt-1">{getWeatherInfo(weather.current.weather_code).label}</p>
                  <p className="text-xs text-[#7A8A7C]">Wind: {Math.round(weather.current.wind_speed_10m)} km/h</p>
                </div>
                <div className="text-5xl">{getWeatherInfo(weather.current.weather_code).icon}</div>
              </div>
              <div className="space-y-2">
                {weather.daily.time.slice(0, 4).map((dateStr, i) => {
                  const date = new Date(dateStr);
                  const info = getWeatherInfo(weather.daily.weather_code[i]);
                  return (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <p className="text-[#7A8A7C] w-8">{i === 0 ? "Today" : DAYS[date.getDay()]}</p>
                      <span>{info.icon}</span>
                      <p className="text-[#7A8A7C]">{weather.daily.precipitation_probability_max[i]}% 💧</p>
                      <p className="font-semibold text-[#222527]">{Math.round(weather.daily.temperature_2m_max[i])}° / {Math.round(weather.daily.temperature_2m_min[i])}°</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : <p className="text-xs text-[#7A8A7C]">Loading weather...</p>}
        </div>
      </div>

      {/* Lily Quick Ask */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#DDE3D6] flex items-center justify-center text-lg">👩‍🌾</div>
          <div>
            <p className="text-sm font-bold text-[#222527]">Ask Lily</p>
            <p className="text-xs text-[#7A8A7C]">Quick question without leaving Grain360</p>
          </div>
        </div>
        {lilyResponse && (
          <div className="mb-4 p-4 bg-[#F5F5F3] rounded-[16px] text-sm text-[#222527] leading-relaxed max-h-48 overflow-y-auto">
            {lilyResponse}
            {lilyLoading && <span className="inline-block w-1.5 h-3.5 bg-[#4A7C59] ml-0.5 animate-pulse rounded-sm" />}
          </div>
        )}
        <div className="flex gap-3 items-center bg-[#F5F5F3] rounded-[16px] px-4 py-3">
          <input type="text" value={lilyInput} onChange={e => setLilyInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && askLily()}
            placeholder="Ask about your grain position, basis, sell plan..."
            className="flex-1 text-sm text-[#222527] placeholder:text-[#7A8A7C] outline-none bg-transparent" />
          <button onClick={askLily} disabled={lilyLoading || !lilyInput.trim()}
            className="w-8 h-8 rounded-full bg-[#4A7C59] flex items-center justify-center hover:bg-[#3d6b4a] disabled:opacity-40">
            <Send size={14} className="text-white" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {["What's my best crop to sell right now?", "Should I price more canola?", "Build me a sell plan"].map(chip => (
            <button key={chip} onClick={() => { setLilyInput(chip); }}
              className="text-xs bg-[#F5F5F3] border border-[#E4E7E0] text-[#222527] px-3 py-1.5 rounded-full hover:bg-[#DDE3D6] transition-colors">
              {chip}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
  function WatchlistWidget() {
  const [items, setItems] = useState<{ symbol: string; label: string; type: string }[]>([])
  const [prices, setPrices] = useState<Record<string, { lastPrice: number; priceChange: number; percentChange: number; unitCode: string }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [wRes, pRes] = await Promise.all([
          fetch('/api/grain360/watchlist'),
          fetch('/api/grain360/prices'),
        ])
        const wData = await wRes.json()
        const pData = await pRes.json()

        if (wData.success) setItems(wData.watchlist)

        if (pData.success) {
          const map: Record<string, { lastPrice: number; priceChange: number; percentChange: number; unitCode: string }> = {}
          pData.futures.forEach((f: { symbol: string; lastPrice: number; priceChange: number; percentChange: number; unitCode: string }) => {
            map[f.symbol] = { lastPrice: f.lastPrice, priceChange: f.priceChange, percentChange: f.percentChange, unitCode: f.unitCode }
          })
          pData.cashBids.forEach((b: { id: string; cashPrice: number; basis: number }) => {
            map[b.id] = { lastPrice: b.cashPrice, priceChange: b.basis, percentChange: 0, unitCode: 'CAD' }
          })
          setPrices(map)
        }
      } catch {
        console.error('Watchlist widget load failed')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading || items.length === 0) return null

  return (
    <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-base">★</span>
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Market Watchlist</p>
        </div>
        <Link href="/grain360/prices" className="text-xs text-[#4A7C59] font-medium hover:underline">
          View All Prices →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {items.slice(0, 5).map(item => {
          const price = prices[item.symbol]
          const isUp = price && price.priceChange > 0
          const isDown = price && price.priceChange < 0
          return (
            <div key={item.symbol} className="bg-[#F9FAF8] rounded-[12px] p-3 border border-[#E4E7E0]">
              <p className="text-xs text-[#7A8A7C] truncate mb-1">{item.label}</p>
              {price ? (
                <>
                  <p className="text-base font-bold text-[#222527]">
                    {item.type === 'cash' ? `$${price.lastPrice.toFixed(2)}` : price.lastPrice.toFixed(2)}
                  </p>
                  <p className={`text-xs font-medium mt-0.5 ${isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-[#7A8A7C]'}`}>
                    {isUp ? '+' : ''}{price.priceChange.toFixed(2)}
                    {item.type === 'futures' && ` (${price.percentChange.toFixed(2)}%)`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[#7A8A7C]">—</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
}