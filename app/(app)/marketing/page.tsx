"use client";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Wheat, TrendingUp, DollarSign, Percent, BarChart3, Truck,
  Loader2, Plus, ChevronDown, Lock, ArrowUpRight, ArrowDownRight,
  AlertTriangle, Calendar, ScatterChart,
} from "lucide-react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  ScatterChart as RechartsScatter, Scatter, ZAxis,
  AreaChart, Area,
} from "recharts";
import { getCropColor, buToMt, CROP_COLORS } from "@/lib/crop-colors";

// ─── Theme ──────────────────────────────────────────────
const T = {
  bg: "#0B1120",
  card: "#111827",
  cardAlt: "#151F32",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text: "#F1F5F9",
  text2: "#CBD5E1",
  text3: "#64748B",
  text4: "#475569",
  green: "#34D399",
  greenBg: "rgba(52,211,153,0.08)",
  red: "#F87171",
  redBg: "rgba(248,113,113,0.08)",
  blue: "#60A5FA",
  blueBg: "rgba(96,165,250,0.08)",
  gold: "#F5A623",
  goldBg: "rgba(245,166,35,0.08)",
};

// ─── Interfaces ─────────────────────────────────────────
interface Position {
  crop: string;
  estimated_production: number;
  contracted: number;
  contracted_value: number;
  delivered: number;
  avg_price: number;
  unpriced: number;
  percent_contracted: number;
  percent_delivered: number;
  contracts: Contract[];
}

interface Contract {
  quantity_bu: number;
  price_per_bu: number;
  basis: number;
  contract_type: string;
  elevator: string;
  delivery_date: string;
  status: string;
  created_at: string;
}

interface Totals {
  production: number;
  contracted: number;
  contracted_value: number;
  unpriced: number;
  delivered: number;
  avg_price: number;
  percent_contracted: number;
}

interface MarketingData {
  success: boolean;
  cropYear: number;
  totals: Totals;
  positions: Position[];
}

// ─── Formatters ─────────────────────────────────────────
const fmtNum = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
const fmtDollar = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(0)}`;
const fmtPrice = (n: number) => `$${n.toFixed(2)}`;

// ─── Mini Donut Component ───────────────────────────────
function MiniDonut({
  data,
  size = 56,
}: {
  data: { name: string; value: number }[];
  size?: number;
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          border: `2px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ color: T.text4, fontSize: 10 }}>—</span>
      </div>
    );
  }
  return (
    <ResponsiveContainer width={size} height={size}>
      <PieChart>
        <Pie
          data={filtered}
          cx="50%"
          cy="50%"
          innerRadius={size * 0.3}
          outerRadius={size * 0.48}
          dataKey="value"
          stroke="none"
        >
          {filtered.map((entry) => (
            <Cell key={entry.name} fill={getCropColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: T.text,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: getCropColor(d.name),
                    }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{d.name}</span>
                </div>
                <div style={{ color: T.text2, marginTop: 2 }}>{fmtNum(d.value)}</div>
              </div>
            );
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Progress Ring (for % Contracted) ───────────────────
function ProgressRing({
  percent,
  size = 56,
}: {
  percent: number;
  size?: number;
}) {
  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percent, 100) / 100) * circ;
  const color = percent >= 80 ? T.green : percent >= 50 ? T.gold : T.red;

  return (
    <svg width={size} height={size}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={T.border}
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={size * 0.22}
        fontWeight={700}
      >
        {percent}%
      </text>
    </svg>
  );
}

// ─── KPI Card ───────────────────────────────────────────
function KpiCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  donut,
  sub,
}: {
  label: string;
  value: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  donut?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 14,
        padding: "18px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        minWidth: 0,
        flex: 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: iconBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={14} style={{ color: iconColor }} />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.text3,
            }}
          >
            {label}
          </span>
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: T.text, lineHeight: 1.1 }}>
          {value}
        </div>
        {sub && (
          <div style={{ fontSize: 11, color: T.text4, marginTop: 4 }}>{sub}</div>
        )}
      </div>
      {donut && <div style={{ flexShrink: 0, marginLeft: 12 }}>{donut}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function MarketingPage() {
  const { user } = useUser();
  const [data, setData] = useState<MarketingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState(String(new Date().getFullYear()));
  const [unit, setUnit] = useState<"bu" | "mt">("bu");
  const [tab, setTab] = useState<"overview" | "contracts" | "price" | "hedge">("overview");

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/marketing/positions?cropYear=${cropYear}`, {
      headers: { "x-user-id": user.id },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setData(d);
        else setData(null);
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [cropYear, user?.id]);

  // Convert BU to display unit
  const toUnit = (bu: number, crop?: string) =>
    unit === "mt" && crop ? buToMt(bu, crop) : bu;
  const unitLabel = unit === "bu" ? "BU" : "MT";

  // Build donut data arrays
  const productionDonut = useMemo(
    () => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.estimated_production, p.crop) })) || [],
    [data, unit]
  );
  const contractedDonut = useMemo(
    () => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.contracted, p.crop) })) || [],
    [data, unit]
  );
  const unpricedDonut = useMemo(
    () => data?.positions.map((p) => ({ name: p.crop, value: toUnit(p.unpriced, p.crop) })) || [],
    [data, unit]
  );
  const valueDonut = useMemo(
    () => data?.positions.map((p) => ({ name: p.crop, value: p.contracted_value })) || [],
    [data]
  );
  const avgPriceDonut = useMemo(
    () =>
      data?.positions
        .filter((p) => p.avg_price > 0)
        .map((p) => ({ name: p.crop, value: p.avg_price })) || [],
    [data]
  );

  // Position bars data
  const positionBars = useMemo(
    () =>
      data?.positions.map((p) => ({
        crop: p.crop,
        contracted: toUnit(p.contracted, p.crop),
        delivered: toUnit(p.delivered, p.crop),
        unpriced: toUnit(p.unpriced, p.crop),
        total: toUnit(p.estimated_production, p.crop),
        color: getCropColor(p.crop),
      })) || [],
    [data, unit]
  );

  // Delivery progress data
  const deliveryData = useMemo(
    () =>
      data?.positions
        .filter((p) => p.contracted > 0)
        .map((p) => ({
          crop: p.crop,
          delivered: toUnit(p.delivered, p.crop),
          contracted: toUnit(p.contracted, p.crop),
          percent: p.percent_delivered,
          color: getCropColor(p.crop),
          behind: p.percent_delivered < 50,
        })) || [],
    [data, unit]
  );

  // Contract timeline data
  const timelineData = useMemo(() => {
    if (!data) return [];
    const all: { crop: string; date: string; qty: number; price: number; color: string }[] = [];
    for (const p of data.positions) {
      for (const c of p.contracts) {
        if (c.created_at) {
          all.push({
            crop: p.crop,
            date: c.created_at.slice(0, 10),
            qty: toUnit(c.quantity_bu, p.crop),
            price: c.price_per_bu,
            color: getCropColor(p.crop),
          });
        }
      }
    }
    return all.sort((a, b) => a.date.localeCompare(b.date));
  }, [data, unit]);

  const t = data?.totals;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "contracts", label: "Contracts" },
    { key: "price", label: "Price Tracker", soon: true },
    { key: "hedge", label: "Hedge Tracker", soon: true },
  ];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1440, margin: "0 auto" }}>
      {/* ── Header ──────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: T.text, margin: 0 }}>Marketing</h1>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 4 }}>
            Grain sales strategy &amp; position management — crop year {cropYear}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {/* BU / MT Toggle */}
          <div
            style={{
              display: "flex",
              borderRadius: 8,
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            {(["bu", "mt"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: unit === u ? T.green : "transparent",
                  color: unit === u ? T.bg : T.text3,
                  border: "none",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {u}
              </button>
            ))}
          </div>
          {/* Year Selector */}
          <select
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              color: T.text,
              padding: "6px 12px",
              fontSize: 13,
            }}
          >
            {[2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            style={{
              background: T.green,
              color: T.bg,
              border: "none",
              borderRadius: 10,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={15} /> New Contract
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => !t.soon && setTab(t.key as any)}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: tab === t.key ? "rgba(52,211,153,0.12)" : "transparent",
              color: tab === t.key ? T.green : T.text3,
              fontSize: 13,
              fontWeight: 500,
              cursor: t.soon ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              opacity: t.soon ? 0.5 : 1,
            }}
          >
            {t.label}
            {t.soon && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  color: T.text4,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                SOON
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Loading ──────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: T.text3 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: T.green, margin: "0 auto 12px" }} />
          <span style={{ fontSize: 13 }}>Loading marketing positions...</span>
        </div>
      ) : !data || !t ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "rgba(255,255,255,0.03)",
              border: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <BarChart3 size={24} style={{ color: T.text4 }} />
          </div>
          <p style={{ color: T.text2, fontSize: 15, marginBottom: 6 }}>No marketing data yet</p>
          <p style={{ color: T.text4, fontSize: 12 }}>
            Add crops in Farm Profile and contracts to see your position.
          </p>
        </div>
      ) : tab === "overview" ? (
        <>
          {/* ── KPI Strip ──────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }}>
            <KpiCard
              label="Total Production"
              value={`${fmtNum(unit === "bu" ? t.production : data.positions.reduce((s, p) => s + buToMt(p.estimated_production, p.crop), 0))} ${unitLabel}`}
              icon={Wheat}
              iconColor={T.green}
              iconBg={T.greenBg}
              donut={<MiniDonut data={productionDonut} />}
              sub={`${data.positions.length} crop${data.positions.length !== 1 ? "s" : ""}`}
            />
            <KpiCard
              label="Total Contracted"
              value={`${fmtNum(unit === "bu" ? t.contracted : data.positions.reduce((s, p) => s + buToMt(p.contracted, p.crop), 0))} ${unitLabel}`}
              icon={TrendingUp}
              iconColor={T.blue}
              iconBg={T.blueBg}
              donut={<MiniDonut data={contractedDonut} />}
            />
            <KpiCard
              label="% Contracted"
              value={`${t.percent_contracted}%`}
              icon={Percent}
              iconColor={t.percent_contracted >= 50 ? T.green : T.gold}
              iconBg={t.percent_contracted >= 50 ? T.greenBg : T.goldBg}
              donut={<ProgressRing percent={t.percent_contracted} />}
              sub={`${fmtNum(t.unpriced)} ${unitLabel} remaining`}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            <KpiCard
              label="Contracted Value"
              value={fmtDollar(t.contracted_value)}
              icon={DollarSign}
              iconColor={T.green}
              iconBg={T.greenBg}
              donut={<MiniDonut data={valueDonut} />}
            />
            <KpiCard
              label="Unpriced"
              value={`${fmtNum(unit === "bu" ? t.unpriced : data.positions.reduce((s, p) => s + buToMt(p.unpriced, p.crop), 0))} ${unitLabel}`}
              icon={AlertTriangle}
              iconColor={t.unpriced > 0 ? T.red : T.green}
              iconBg={t.unpriced > 0 ? T.redBg : T.greenBg}
              donut={<MiniDonut data={unpricedDonut} />}
              sub={t.unpriced > 0 ? "Market exposure" : "Fully contracted"}
            />
            <KpiCard
              label="Avg Realized Price"
              value={t.avg_price > 0 ? fmtPrice(t.avg_price) : "—"}
              icon={DollarSign}
              iconColor={T.gold}
              iconBg={T.goldBg}
              donut={<MiniDonut data={avgPriceDonut} />}
              sub={t.avg_price > 0 ? "Weighted avg $/bu" : "No contracts yet"}
            />
          </div>

          {/* ── Crop Legend ─────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 24,
              padding: "10px 16px",
              background: T.card,
              borderRadius: 10,
              border: `1px solid ${T.border}`,
            }}
          >
            {data.positions.map((p) => (
              <div key={p.crop} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: getCropColor(p.crop),
                  }}
                />
                <span style={{ color: T.text2, textTransform: "capitalize" }}>{p.crop}</span>
              </div>
            ))}
          </div>

          {/* ── Crop Position Bars ──────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
              marginBottom: 14,
            }}
          >
            {/* Position Bars */}
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
                Crop Positions
              </h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 20px" }}>
                Contracted vs unpriced by crop
              </p>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: T.green }} />
                  <span style={{ color: T.text3 }}>Contracted</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: T.blue }} />
                  <span style={{ color: T.text3 }}>Delivered</span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
                  <span style={{ color: T.text3 }}>Unpriced</span>
                </span>
              </div>
              {positionBars.map((p) => {
                const max = Math.max(...positionBars.map((b) => b.total), 1);
                return (
                  <div key={p.crop} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.text, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.color }} />
                        {p.crop}
                      </span>
                      <span style={{ fontSize: 11, color: T.text3 }}>
                        {fmtNum(p.total)} {unitLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        height: 22,
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.04)",
                        overflow: "hidden",
                        display: "flex",
                        width: "100%",
                      }}
                    >
                      {p.delivered > 0 && (
                        <div
                          style={{
                            width: `${(p.delivered / max) * 100}%`,
                            background: T.blue,
                            height: "100%",
                            transition: "width 0.4s",
                          }}
                          title={`Delivered: ${fmtNum(p.delivered)} ${unitLabel}`}
                        />
                      )}
                      {p.contracted - p.delivered > 0 && (
                        <div
                          style={{
                            width: `${((p.contracted - p.delivered) / max) * 100}%`,
                            background: T.green,
                            height: "100%",
                            transition: "width 0.4s",
                          }}
                          title={`Contracted (not delivered): ${fmtNum(p.contracted - p.delivered)} ${unitLabel}`}
                        />
                      )}
                      {p.unpriced > 0 && (
                        <div
                          style={{
                            width: `${(p.unpriced / max) * 100}%`,
                            background: "rgba(255,255,255,0.08)",
                            height: "100%",
                            transition: "width 0.4s",
                          }}
                          title={`Unpriced: ${fmtNum(p.unpriced)} ${unitLabel}`}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
              {positionBars.length === 0 && (
                <p style={{ color: T.text4, fontSize: 12, textAlign: "center", padding: 20 }}>
                  No crop data — update Farm Profile with acres and yields.
                </p>
              )}
            </div>

            {/* Delivery Progress */}
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
                Delivery Progress
              </h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 20px" }}>
                Delivered vs contracted — are you on track?
              </p>
              {deliveryData.length > 0 ? (
                deliveryData.map((d) => (
                  <div key={d.crop} style={{ marginBottom: 18 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: T.text, textTransform: "capitalize", display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                        {d.crop}
                        {d.behind && (
                          <span style={{ color: T.red, fontSize: 10, fontWeight: 600 }}>BEHIND</span>
                        )}
                      </span>
                      <span style={{ fontSize: 11, color: T.text3 }}>
                        {fmtNum(d.delivered)} / {fmtNum(d.contracted)} {unitLabel} ({d.percent}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 10,
                        borderRadius: 5,
                        background: "rgba(255,255,255,0.04)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.min(d.percent, 100)}%`,
                          height: "100%",
                          borderRadius: 5,
                          background: d.behind
                            ? `linear-gradient(90deg, ${T.red}, ${T.gold})`
                            : `linear-gradient(90deg, ${d.color}, ${T.green})`,
                          transition: "width 0.6s ease",
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <Truck size={24} style={{ color: T.text4, margin: "0 auto 8px" }} />
                  <p style={{ color: T.text4, fontSize: 12 }}>
                    No contracts to deliver against yet.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Timeline + Price Scatter ────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            {/* Contract Timeline */}
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
                Sales Timeline
              </h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 16px" }}>
                When contracts were signed
              </p>
              {timelineData.length > 0 ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: T.text4, fontSize: 10 }} />
                      <YAxis tick={{ fill: T.text4, fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          background: T.card,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          fontSize: 11,
                          color: T.text,
                        }}
                        formatter={(v: any) => [`${fmtNum(Number(v))} ${unitLabel}`, "Volume"]}
                      />
                      <Bar dataKey="qty" radius={[4, 4, 0, 0]}>
                        {timelineData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <Calendar size={24} style={{ color: T.text4, margin: "0 auto 8px" }} />
                  <p style={{ color: T.text4, fontSize: 12 }}>
                    Contract timeline appears when contracts are added.
                  </p>
                </div>
              )}
            </div>

            {/* Price Scatter */}
            <div
              style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: 24,
              }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>
                Price Performance
              </h3>
              <p style={{ fontSize: 11, color: T.text4, margin: "0 0 16px" }}>
                Contract prices vs weighted average
              </p>
              {timelineData.length > 0 ? (
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsScatter>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: T.text4, fontSize: 10 }} name="Date" />
                      <YAxis dataKey="price" tick={{ fill: T.text4, fontSize: 10 }} name="Price" unit="$/bu" />
                      <ZAxis dataKey="qty" range={[40, 400]} name="Volume" />
                      <Tooltip
                        contentStyle={{
                          background: T.card,
                          border: `1px solid ${T.border}`,
                          borderRadius: 8,
                          fontSize: 11,
                          color: T.text,
                        }}
                        formatter={(v: any, name: any) => {
                          if (name === "Price") return [fmtPrice(v), name];
                          if (name === "Volume") return [`${fmtNum(v)} ${unitLabel}`, name];
                          return [v, name];
                        }}
                      />
                      <Scatter data={timelineData}>
                        {timelineData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Scatter>
                    </RechartsScatter>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 30 }}>
                  <ScatterChart size={24} style={{ color: T.text4, margin: "0 auto 8px" }} />
                  <p style={{ color: T.text4, fontSize: 12 }}>
                    Price scatter appears when contracts with prices are added.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Lily Marketing Chip ────────────────────────── */}
          <div
            style={{
              marginTop: 24,
              background: "linear-gradient(135deg, rgba(52,211,153,0.06), rgba(96,165,250,0.06))",
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🌱</span>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
                  Ask Lily about your marketing position
                </span>
                <p style={{ fontSize: 11, color: T.text3, margin: "2px 0 0" }}>
                  AI-powered advice based on your contracts, prices, and production
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                "Build a sell plan",
                "Am I behind on deliveries?",
                "Break-even by crop",
              ].map((chip) => (
                <button
                  key={chip}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    border: `1px solid ${T.border}`,
                    background: "rgba(255,255,255,0.04)",
                    color: T.text2,
                    fontSize: 11,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : tab === "contracts" ? (
        /* ── Contracts Tab (placeholder) ───────────────── */
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 40,
            textAlign: "center",
          }}
        >
          <p style={{ color: T.text2, fontSize: 14, marginBottom: 8 }}>
            Contracts table coming in Phase 3
          </p>
          <p style={{ color: T.text4, fontSize: 12 }}>
            Full CRUD table with filters by crop, status, delivery date
          </p>
        </div>
      ) : null}
    </div>
  );
}