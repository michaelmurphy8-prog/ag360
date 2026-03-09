"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp, TrendingDown, DollarSign, Percent, ChevronDown,
  ChevronRight, Loader2, BarChart3, BookOpen, ArrowUpRight,
  ArrowDownRight, Minus, Layers, FileText, X, Download,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Sector, AreaChart, Area, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ─── Design Tokens ───────────────────────────────────────────
const T = {
  bg: "var(--ag-bg-base)",
  card: "var(--ag-bg-card)",
  cardAlt: "var(--ag-bg-card)",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text1: "var(--ag-text-primary)",
  text2: "var(--ag-text-secondary)",
  text3: "var(--ag-text-muted)",
  text4: "var(--ag-text-dim)",
  green: "var(--ag-green)",
  greenDim: "rgba(52,211,153,0.12)",
  red: "var(--ag-red)",
  redDim: "rgba(248,113,113,0.12)",
  amber: "var(--ag-yellow)",
  amberDim: "rgba(251,191,36,0.12)",
  sky: "var(--ag-blue)",
  skyDim: "rgba(56,189,248,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
  gridLine: "rgba(255,255,255,0.04)",
  tooltipBg: "var(--ag-border-solid)",
  tooltipBorder: "rgba(255,255,255,0.10)",
};

// Crop-specific colors for charts
const CROP_PALETTE: Record<string, string> = {
  "HRW Wheat": "#D4A843", "HRS Wheat": "#C49B3D", "Durum": "#E8C547",
  Canola: "#E8B931", Barley: "#9B8B6E", Oats: "#BFB599",
  Peas: "#7BAE6E", Lentils: "#A67B5B", Flax: "#6B8FA3",
  Soybeans: "#8FA86E", Corn: "#D4A843", Mustard: "#E8D547",
  Canaryseed: "#8B9DC3",
};

const EXPENSE_PALETTE = [
  "var(--ag-red)", "#FB923C", "var(--ag-yellow)", "#A78BFA", "var(--ag-blue)",
  "var(--ag-green)", "#F472B6", "#818CF8", "var(--ag-text-secondary)", "var(--ag-green)",
];

// ─── Shared Styles ───────────────────────────────────────────
const selectClass =
  `bg-[${T.cardAlt}] border border-[var(--ag-border-solid)] rounded-lg px-3 py-1.5 text-sm text-[${T.text1}] focus:outline-none focus:border-[${T.green}]/50 transition-colors`;

// ─── Interfaces ──────────────────────────────────────────────
interface PnLLine {
  account_id: string;
  code: string;
  name: string;
  sub_type: string;
  balance: number;
  field_name?: string;
  crop?: string;
}

interface ExpenseCategory {
  label: string;
  total: number;
  lines: PnLLine[];
}

interface PnLData {
  cropYear: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  margin: number;
  revenueLines: PnLLine[];
  expensesByCategory: Record<string, ExpenseCategory>;
}

// ─── Custom Tooltip ──────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: T.tooltipBg,
        border: `1px solid ${T.tooltipBorder}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {label && (
        <p style={{ color: T.text3, fontSize: 11, marginBottom: 6, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </p>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.fill }} />
          <span style={{ color: T.text2, fontSize: 12 }}>{p.name || p.dataKey}:</span>
          <span style={{ color: T.text1, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
            {formatter ? formatter(p.value) : `$${Math.abs(p.value).toLocaleString("en-CA", { minimumFractionDigits: 0 })}`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function KpiCard({
  label, value, change, icon: Icon, iconColor, variant = "default",
}: {
  label: string;
  value: string;
  change?: { value: string; direction: "up" | "down" | "flat" };
  icon: React.ElementType;
  iconColor: string;
  variant?: "default" | "positive" | "negative";
}) {
  const borderClass =
    variant === "positive"
      ? `border-[${T.green}]/20`
      : variant === "negative"
      ? "border-red-500/20"
      : "border-[var(--ag-border)]";

  const valueColor =
    variant === "positive" ? T.green : variant === "negative" ? T.red : T.text1;

  const ChangeIcon =
    change?.direction === "up" ? ArrowUpRight
    : change?.direction === "down" ? ArrowDownRight
    : Minus;

  const changeColor =
    change?.direction === "up" ? T.green
    : change?.direction === "down" ? T.red
    : T.text3;

  return (
    <div className={`bg-[var(--ag-bg-card)] ${borderClass} border rounded-xl p-5 hover:border-white/[0.12] transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${iconColor}12` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <span
            className="text-[10px] uppercase tracking-[2px] font-mono font-semibold"
            style={{ color: T.text3 }}
          >
            {label}
          </span>
        </div>
        {change && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ backgroundColor: `${changeColor}12` }}>
            <ChangeIcon size={11} style={{ color: changeColor }} />
            <span className="text-[10px] font-mono font-semibold" style={{ color: changeColor }}>
              {change.value}
            </span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold font-mono" style={{ color: valueColor }}>
        {value}
      </div>
    </div>
  );
}

// ─── Waterfall Chart ─────────────────────────────────────────
function WaterfallChart({ revenue, expenses, netIncome }: {
  revenue: number; expenses: number; netIncome: number;
}) {
  // Build waterfall data: stacked bars with invisible base
  const data = [
    { name: "Revenue", value: revenue, fill: T.green, base: 0 },
    { name: "Expenses", value: -expenses, fill: T.red, base: revenue - expenses },
    { name: "Net Income", value: netIncome, fill: netIncome >= 0 ? T.green : T.red, base: 0 },
  ];

  const maxVal = Math.max(revenue, expenses, Math.abs(netIncome)) * 1.15;

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 hover:border-[var(--ag-border-solid)] transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-ag-primary">Income Waterfall</h3>
          <p className="text-xs text-ag-dim mt-0.5">Revenue → Expenses → Net Income</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-mono uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: T.green }} />
            <span style={{ color: T.text3 }}>Inflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: T.red }} />
            <span style={{ color: T.text3 }}>Outflow</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text3, fontSize: 11, fontFamily: "monospace" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text4, fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
            domain={[0, maxVal]}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
          />
          {/* Invisible base bar */}
          <Bar dataKey="base" stackId="a" fill="transparent" radius={[0, 0, 0, 0]} />
          {/* Visible value bar */}
          <Bar dataKey="value" stackId="a" radius={[6, 6, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Revenue By Crop Chart ───────────────────────────────────
function RevenueByCropChart({ revenueLines }: { revenueLines: PnLLine[] }) {
  // Aggregate by crop (extract crop from account name)
  const byCrop: Record<string, number> = {};
  revenueLines.forEach((l) => {
    const crop = l.name.replace("Grain Sales — ", "").replace("Grain Sales - ", "").trim();
    byCrop[crop] = (byCrop[crop] || 0) + l.balance;
  });

  const data = Object.entries(byCrop)
    .map(([crop, value]) => ({ crop, value }))
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) return null;

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 hover:border-[var(--ag-border-solid)] transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-ag-primary">Revenue by Crop</h3>
          <p className="text-xs text-ag-dim mt-0.5">Sorted by contribution</p>
        </div>
        <span className="text-sm font-bold font-mono" style={{ color: T.green }}>
          ${total.toLocaleString("en-CA", { minimumFractionDigits: 0 })}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={data.length * 48 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} horizontal={false} />
          <XAxis
            type="number"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text4, fontSize: 10, fontFamily: "monospace" }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
          />
          <YAxis
            type="category"
            dataKey="crop"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text2, fontSize: 12 }}
            width={120}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
              return (
                <div style={{
                  background: T.tooltipBg, border: `1px solid ${T.tooltipBorder}`,
                  borderRadius: 10, padding: "10px 14px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}>
                  <p style={{ color: T.text1, fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{d.crop}</p>
                  <p style={{ color: T.green, fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
                    ${d.value.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </p>
                  <p style={{ color: T.text3, fontSize: 11, marginTop: 2 }}>{pct}% of total revenue</p>
                </div>
              );
            }}
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={CROP_PALETTE[entry.crop] || EXPENSE_PALETTE[idx % EXPENSE_PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Expense Breakdown Chart ─────────────────────────────────
function ExpenseBreakdownChart({
  categories, totalExpenses,
}: {
  categories: Record<string, ExpenseCategory>;
  totalExpenses: number;
}) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const data = Object.entries(categories)
    .map(([key, cat], idx) => ({
      key,
      label: cat.label,
      value: cat.total,
      color: EXPENSE_PALETTE[idx % EXPENSE_PALETTE.length],
      lines: cat.lines,
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) return null;

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 hover:border-[var(--ag-border-solid)] transition-colors">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-ag-primary">Expense Breakdown</h3>
          <p className="text-xs text-ag-dim mt-0.5">Click a category to see line items</p>
        </div>
        <span className="text-sm font-bold font-mono" style={{ color: T.text1 }}>
          ${totalExpenses.toLocaleString("en-CA", { minimumFractionDigits: 0 })}
        </span>
      </div>

      {/* Horizontal stacked bar (proportion bar) */}
      <div className="flex h-3 rounded-full overflow-hidden mb-5 bg-[var(--ag-bg-hover)]">
        {data.map((d) => {
          const widthPct = totalExpenses > 0 ? (d.value / totalExpenses) * 100 : 0;
          return (
            <div
              key={d.key}
              className="h-full transition-all duration-500 cursor-pointer hover:opacity-80"
              style={{
                width: `${widthPct}%`,
                backgroundColor: d.color,
                minWidth: widthPct > 0 ? 4 : 0,
              }}
              title={`${d.label}: $${d.value.toLocaleString("en-CA")}`}
              onClick={() => setExpandedCat(expandedCat === d.key ? null : d.key)}
            />
          );
        })}
      </div>

      {/* Category rows */}
      <div className="space-y-1">
        {data.map((d) => {
          const pct = totalExpenses > 0 ? ((d.value / totalExpenses) * 100).toFixed(1) : "0";
          const isExpanded = expandedCat === d.key;

          return (
            <div key={d.key}>
              <button
                onClick={() => setExpandedCat(isExpanded ? null : d.key)}
                className="w-full flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                  {isExpanded ? (
                    <ChevronDown size={13} style={{ color: T.text4 }} />
                  ) : (
                    <ChevronRight size={13} style={{ color: T.text4 }} />
                  )}
                  <span className="text-sm font-medium" style={{ color: T.text1 }}>{d.label}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono" style={{ color: T.text3 }}>{pct}%</span>
                  <span className="text-sm font-mono font-semibold" style={{ color: T.text1 }}>
                    ${d.value.toLocaleString("en-CA", { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </button>

              {/* Expanded line items */}
              {isExpanded && (
                <div className="ml-9 pl-3 border-l border-[var(--ag-border)] pb-2 space-y-1">
                  {d.lines.map((line, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                      <span style={{ color: T.text2 }}>
                        <span className="font-mono mr-2" style={{ color: T.text4 }}>{line.code}</span>
                        {line.name}
                        {line.field_name && <span style={{ color: T.text4 }}> ({line.field_name})</span>}
                      </span>
                      <span className="font-mono" style={{ color: T.text2 }}>
                        ${line.balance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Revenue vs Expense Donut ────────────────────────────────
function RevenueExpenseDonut({ revenue, expenses }: { revenue: number; expenses: number }) {
  const data = [
    { name: "Revenue", value: revenue, fill: T.green },
    { name: "Expenses", value: expenses, fill: T.red },
  ];
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const renderActiveShape = (props: any) => {
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
        <text x={cx} y={cy - 8} textAnchor="middle" fill={T.text1} fontSize={14} fontWeight={700} fontFamily="monospace">
          ${(value / 1000).toFixed(0)}K
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={T.text3} fontSize={10}>
          {payload.name}
        </text>
        <text x={cx} y={cy + 24} textAnchor="middle" fill={fill} fontSize={11} fontWeight={600} fontFamily="monospace">
          {(percent * 100).toFixed(1)}%
        </text>
      </g>
    );
  };

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 hover:border-[var(--ag-border-solid)] transition-colors">
      <h3 className="text-sm font-bold text-ag-primary mb-1">Revenue vs Expenses</h3>
      <p className="text-xs text-ag-dim mb-4">Hover for details</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
  {...{ activeIndex: activeIdx !== null ? activeIdx : undefined } as any}
            activeShape={renderActiveShape}
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            dataKey="value"
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            stroke="none"
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── P&L Statement (text version) ────────────────────────────
function PnLStatement({
  data, expandedCategories, toggleCategory,
}: {
  data: PnLData;
  expandedCategories: Record<string, boolean>;
  toggleCategory: (key: string) => void;
}) {
  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden hover:border-[var(--ag-border-solid)] transition-colors">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--ag-border)] bg-white/[0.01]">
        <div className="flex items-center gap-2">
          <BookOpen size={14} style={{ color: T.text3 }} />
          <h2 className="text-sm font-bold" style={{ color: T.text1 }}>
            Statement of Farm Income — {data.cropYear} Crop Year
          </h2>
        </div>
        <p className="text-xs mt-0.5 ml-[22px]" style={{ color: T.text4 }}>
          All figures in CAD · Updates in real-time from Ledger
        </p>
      </div>

      {/* Revenue */}
      <div className="px-5 py-4 border-b border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[2px] font-mono" style={{ color: T.green }}>
            Revenue
          </h3>
          <span className="text-sm font-bold font-mono" style={{ color: T.green }}>{fmt(data.totalRevenue)}</span>
        </div>
        {data.revenueLines.map((line, i) => (
          <div key={i} className="flex justify-between py-1.5 text-sm group hover:bg-white/[0.01] -mx-2 px-2 rounded-md transition-colors">
            <span style={{ color: T.text2 }}>
              <span className="font-mono text-xs mr-2" style={{ color: T.text4 }}>{line.code}</span>
              <span style={{ color: T.text1 }}>{line.name}</span>
              {line.field_name && <span className="text-xs ml-2" style={{ color: T.text4 }}>({line.field_name})</span>}
            </span>
            <span className="font-mono" style={{ color: T.text1 }}>{fmt(line.balance)}</span>
          </div>
        ))}
        {data.revenueLines.length === 0 && (
          <p className="text-xs py-2" style={{ color: T.text4 }}>No revenue recorded yet</p>
        )}
      </div>

      {/* Expenses */}
      <div className="px-5 py-4 border-b border-[var(--ag-border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-bold uppercase tracking-[2px] font-mono" style={{ color: T.red }}>
            Expenses
          </h3>
          <span className="text-sm font-bold font-mono" style={{ color: T.text1 }}>{fmt(data.totalExpenses)}</span>
        </div>
        {Object.entries(data.expensesByCategory)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([key, cat]) => {
            const isExpanded = expandedCategories[key];
            return (
              <div key={key} className="mb-0.5">
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full flex justify-between items-center py-2 text-sm hover:bg-white/[0.01] rounded-md px-2 -mx-2 transition-colors"
                >
                  <span className="font-medium flex items-center gap-2" style={{ color: T.text1 }}>
                    {isExpanded ? <ChevronDown size={13} style={{ color: T.text4 }} /> : <ChevronRight size={13} style={{ color: T.text4 }} />}
                    {cat.label}
                  </span>
                  <span className="font-mono" style={{ color: T.text1 }}>{fmt(cat.total)}</span>
                </button>
                {isExpanded && (
                  <div className="pl-8 pb-2">
                    {cat.lines.map((line, i) => (
                      <div key={i} className="flex justify-between py-1 text-xs">
                        <span style={{ color: T.text3 }}>
                          <span className="font-mono mr-2">{line.code}</span>
                          <span style={{ color: T.text2 }}>{line.name}</span>
                          {line.field_name && <span className="ml-1">({line.field_name})</span>}
                        </span>
                        <span className="font-mono" style={{ color: T.text2 }}>{fmt(line.balance)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Net Income Footer */}
      <div
        className="px-5 py-5"
        style={{ background: data.netIncome >= 0 ? T.greenDim : T.redDim }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold" style={{ color: T.text1 }}>Net Farm Income</h3>
          <span
            className="text-xl font-bold font-mono"
            style={{ color: data.netIncome >= 0 ? T.green : T.red }}
          >
            {data.netIncome < 0 ? "-" : ""}{fmt(data.netIncome)}
          </span>
        </div>
        <p className="text-xs mt-1" style={{ color: T.text3 }}>
          Revenue {fmt(data.totalRevenue)} — Expenses {fmt(data.totalExpenses)} = {data.margin}% margin
        </p>
      </div>
    </div>
  );
}
// ─── Professional P&L Drawer ─────────────────────────────────
function PnLDrawer({ data, onClose }: { data: PnLData; onClose: () => void }) {
  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Derive EBITDA components
  const depreciation = Object.entries(data.expensesByCategory)
    .filter(([k]) => k.toLowerCase().includes("depreciat"))
    .reduce((s, [, v]) => s + v.total, 0);

  const interest = Object.entries(data.expensesByCategory)
    .filter(([k]) => k.toLowerCase().includes("interest"))
    .reduce((s, [, v]) => s + v.total, 0);

  const ebitda = data.netIncome + depreciation + interest;
  const ebit = ebitda - depreciation;

  const handleExportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

    const pageW = 215.9;
    const margin = 20;
    const colRight = pageW - margin;
    let y = 20;

    const line = () => { doc.setDrawColor(220, 220, 220); doc.line(margin, y, colRight, y); y += 5; };
    const thickLine = () => { doc.setDrawColor(40, 40, 40); doc.setLineWidth(0.5); doc.line(margin, y, colRight, y); doc.setLineWidth(0.2); y += 5; };
    const row = (label: string, value: string, bold = false, color = [30, 30, 30] as [number,number,number]) => {
      doc.setFontSize(bold ? 10 : 9.5);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setTextColor(...color);
      doc.text(label, margin, y);
      doc.text(value, colRight, y, { align: "right" });
      y += 6;
    };
    const section = (title: string) => {
      y += 3;
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(120, 120, 120);
      doc.text(title.toUpperCase(), margin, y);
      y += 5;
      line();
    };

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("AG/360", margin, y);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Statement of Farm Income — ${data.cropYear} Crop Year`, margin, y + 7);
    doc.text(`Generated ${new Date().toLocaleDateString("en-CA")}  ·  All figures in CAD`, margin, y + 13);
    y += 22;
    thickLine();

    // Revenue
    section("Revenue");
    data.revenueLines.forEach((l) => row(`  ${l.name}`, fmt(l.balance)));
    y += 1; line();
    row("Total Revenue", fmt(data.totalRevenue), true, [34, 197, 94]);
    y += 2;

    // Expenses
    section("Operating Expenses");
    Object.entries(data.expensesByCategory)
      .sort(([, a], [, b]) => b.total - a.total)
      .forEach(([, cat]) => row(`  ${cat.label}`, fmt(cat.total)));
    y += 1; line();
    row("Total Operating Expenses", fmt(data.totalExpenses), true, [239, 68, 68]);
    y += 2;

    // EBITDA block
    section("Profitability");
    thickLine();
    row("EBITDA", fmt(ebitda), true, [20, 20, 20]);
    row("  Depreciation & Amortization", depreciation > 0 ? `(${fmt(depreciation)})` : "$0.00");
    line();
    row("EBIT", fmt(ebit), true);
    row("  Interest Expense", interest > 0 ? `(${fmt(interest)})` : "$0.00");
    line();
    row("NET FARM INCOME", fmt(data.netIncome), true, data.netIncome >= 0 ? [34,197,94] : [239,68,68]);
    y += 2;
    row("Profit Margin", `${data.margin}%`, false, [100,100,100]);

    // Footer
    y = 265;
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text("AG/360 — For the Farmer  ·  ag360.farm  ·  Confidential", margin, y);
    doc.text(`Page 1`, colRight, y, { align: "right" });

    doc.save(`AG360_PnL_${data.cropYear}.pdf`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full w-[520px] z-50 flex flex-col"
        style={{ background: "var(--ag-bg-base)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.greenDim }}>
              <FileText size={14} style={{ color: T.green }} />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: T.text1 }}>P&L Statement</h2>
              <p className="text-xs" style={{ color: T.text4 }}>{data.cropYear} Crop Year · CAD</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{ backgroundColor: T.greenDim, color: T.green }}
            >
              <Download size={12} />
              Export PDF
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/[0.06] transition-colors"
            >
              <X size={15} style={{ color: T.text3 }} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">

          {/* Revenue Section */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[2px] font-mono font-bold mb-3" style={{ color: T.green }}>Revenue</p>
            {data.revenueLines.map((l, i) => (
              <div key={i} className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                <span style={{ color: T.text2 }}>{l.name}</span>
                <span className="font-mono" style={{ color: T.text1 }}>{fmt(l.balance)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 mt-1">
              <span className="text-sm font-bold" style={{ color: T.text1 }}>Total Revenue</span>
              <span className="text-sm font-bold font-mono" style={{ color: T.green }}>{fmt(data.totalRevenue)}</span>
            </div>
          </div>

          <div className="border-t mb-4" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

          {/* Expenses Section */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[2px] font-mono font-bold mb-3" style={{ color: T.red }}>Operating Expenses</p>
            {Object.entries(data.expensesByCategory)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([key, cat]) => (
                <div key={key} className="flex justify-between py-1.5 text-sm border-b" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
                  <span style={{ color: T.text2 }}>{cat.label}</span>
                  <span className="font-mono" style={{ color: T.text1 }}>{fmt(cat.total)}</span>
                </div>
              ))}
            <div className="flex justify-between py-2.5 mt-1">
              <span className="text-sm font-bold" style={{ color: T.text1 }}>Total Expenses</span>
              <span className="text-sm font-bold font-mono" style={{ color: T.red }}>{fmt(data.totalExpenses)}</span>
            </div>
          </div>

          <div className="border-t mb-4" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

          {/* EBITDA Block */}
          <div className="mb-4">
            <p className="text-[10px] uppercase tracking-[2px] font-mono font-bold mb-3" style={{ color: T.text3 }}>Profitability</p>

            {/* EBITDA */}
            <div className="flex justify-between py-2.5 px-4 rounded-lg mb-1" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
              <span className="text-sm font-bold" style={{ color: T.text1 }}>EBITDA</span>
              <span className="text-sm font-bold font-mono" style={{ color: ebitda >= 0 ? T.green : T.red }}>{fmt(ebitda)}</span>
            </div>
            <div className="flex justify-between py-1.5 px-4 text-sm">
              <span style={{ color: T.text3 }}>Depreciation & Amortization</span>
              <span className="font-mono" style={{ color: T.text3 }}>({fmt(depreciation)})</span>
            </div>

            <div className="border-t my-2" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

            {/* EBIT */}
            <div className="flex justify-between py-2 px-4">
              <span className="text-sm font-semibold" style={{ color: T.text1 }}>EBIT</span>
              <span className="text-sm font-semibold font-mono" style={{ color: T.text1 }}>{fmt(ebit)}</span>
            </div>
            <div className="flex justify-between py-1.5 px-4 text-sm">
              <span style={{ color: T.text3 }}>Interest Expense</span>
              <span className="font-mono" style={{ color: T.text3 }}>({fmt(interest)})</span>
            </div>

            <div className="border-t my-2" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

            {/* Net Income */}
            <div
              className="flex justify-between py-3 px-4 rounded-xl mt-1"
              style={{ backgroundColor: data.netIncome >= 0 ? T.greenDim : T.redDim }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: T.text1 }}>Net Farm Income</p>
                <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Profit Margin: {data.margin}%</p>
              </div>
              <span
                className="text-lg font-bold font-mono self-center"
                style={{ color: data.netIncome >= 0 ? T.green : T.red }}
              >
                {fmt(data.netIncome)}
              </span>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-center font-mono mt-4" style={{ color: T.text4 }}>
            AG/360 · ag360.farm · For the Farmer
          </p>
        </div>
      </div>
    </>
  );
}
// ═════════════════════════════════════════════════════════════
//  P&L PAGE — FINTECH GRADE
// ═════════════════════════════════════════════════════════════
export default function PnLPage() {
  const { user } = useUser();
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState("2025");
  const [view, setView] = useState("farm");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetch(`/api/finance/pnl?cropYear=${cropYear}&view=${view}`, {
      headers: { "x-user-id": user.id },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) { setData(null); return; }
        // Transform API response to match page's expected shape
        const revenueLines: PnLLine[] = [];
        const expensesByCategory: Record<string, ExpenseCategory> = {};
        for (const g of (d.groups || [])) {
          for (const cat of (g.categories || [])) {
            if (cat.type === "revenue") {
              revenueLines.push({ account_id: "", code: "", name: cat.name, sub_type: "", balance: cat.amount });
            } else if (cat.type === "expense") {
              expensesByCategory[cat.name] = {
                label: cat.name,
                total: cat.amount,
                lines: [{ account_id: "", code: "", name: cat.name, sub_type: "", balance: cat.amount }],
              };
            }
          }
        }
        const totalRevenue = d.totals?.revenue || 0;
        const totalExpenses = d.totals?.expenses || 0;
        const netIncome = d.totals?.netIncome || 0;
        const transformed: PnLData = {
          cropYear: d.cropYear,
          totalRevenue,
          totalExpenses,
          netIncome,
          margin: totalRevenue > 0 ? Math.round((netIncome / totalRevenue) * 100) : 0,
          revenueLines,
          expensesByCategory,
        };
        setData(transformed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cropYear, view, user?.id]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const fmtShort = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const hasData = data && ((data as any).totals?.revenue > 0 || (data as any).totals?.expenses > 0 || data.totalRevenue > 0 || data.totalExpenses > 0);

  return (
    <div>
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: T.text1 }}>Profit & Loss</h1>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            Real-time farm profitability — crop year {cropYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
  {data && (
    <button
      onClick={() => setShowBreakdown(true)}
      className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
      style={{ backgroundColor: T.greenDim, color: T.green, border: `1px solid ${T.green}30` }}
    >
      <FileText size={13} />
      Breakdown
    </button>
  )}
  <select
    value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
            className="bg-[var(--ag-bg-card)] border border-[var(--ag-border-solid)] rounded-lg px-3 py-1.5 text-sm text-ag-primary focus:outline-none focus:border-[var(--ag-accent)]/50 transition-colors"
          >
            {["2026", "2025", "2024", "2023"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── View Tabs ────────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-[var(--ag-bg-hover)] p-1 rounded-xl w-fit border border-[var(--ag-border)]">
        {[
          { id: "farm", label: "Farm P&L" },
          { id: "crop", label: "By Crop" },
          { id: "field", label: "By Field" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              view === t.id
                ? "bg-white/[0.08] text-ag-primary shadow-sm"
                : "text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Loading ──────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3" style={{ color: T.text3 }}>
          <Loader2 size={28} className="animate-spin" style={{ color: T.green }} />
          <span className="text-sm">Loading financial data...</span>
        </div>
      ) : !hasData ? (
        /* ── Empty State ───────────────────────────── */
        <div className="text-center py-20">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}
          >
            <BarChart3 size={24} style={{ color: T.text4 }} />
          </div>
          <p className="text-base mb-2" style={{ color: T.text2 }}>
            No financial data for crop year {cropYear}.
          </p>
          <p className="text-xs mb-5" style={{ color: T.text4 }}>
            Record transactions in the Ledger — they&apos;ll appear here automatically.
          </p>
          <a
            href="/finance/ledger"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-colors"
            style={{ backgroundColor: T.green, color: T.bg }}
          >
            <BookOpen size={14} />
            Open Ledger
          </a>
        </div>
      ) : data ? (
        <>
          {/* ── KPI Cards ──────────────────────────── */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <KpiCard
              label="Total Revenue"
              value={fmtShort(data.totalRevenue)}
              icon={TrendingUp}
              iconColor={T.green}
              variant="positive"
            />
            <KpiCard
              label="Total Expenses"
              value={fmtShort(data.totalExpenses)}
              icon={TrendingDown}
              iconColor={T.red}
            />
            <KpiCard
              label="Net Income"
              value={`${data.netIncome < 0 ? "-" : ""}${fmtShort(data.netIncome)}`}
              icon={DollarSign}
              iconColor={data.netIncome >= 0 ? T.green : T.red}
              variant={data.netIncome >= 0 ? "positive" : "negative"}
            />
            <KpiCard
              label="Profit Margin"
              value={`${data.margin}%`}
              icon={Percent}
              iconColor={data.margin >= 0 ? T.green : T.red}
              variant={data.margin >= 0 ? "positive" : "negative"}
            />
          </div>

          {/* ── Charts Row: Waterfall + Donut ──────── */}
          <div className="grid grid-cols-[2fr_1fr] gap-4 mb-4">
            <WaterfallChart
              revenue={data.totalRevenue}
              expenses={data.totalExpenses}
              netIncome={data.netIncome}
            />
            <RevenueExpenseDonut
              revenue={data.totalRevenue}
              expenses={data.totalExpenses}
            />
          </div>

          {/* ── Charts Row: Revenue + Expenses ─────── */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <RevenueByCropChart revenueLines={data.revenueLines} />
            <ExpenseBreakdownChart
              categories={data.expensesByCategory}
              totalExpenses={data.totalExpenses}
            />
          </div>

          {/* ── P&L Statement (Detail) ─────────────── */}
          <PnLStatement
            data={data}
            expandedCategories={expandedCategories}
            toggleCategory={toggleCategory}
          />

          <div className="mt-3 text-xs text-right font-mono" style={{ color: T.text4 }}>
            Updated in real-time from Ledger · {new Date().toLocaleString("en-CA")}
          </div>
        </>
      ) : null}
      {showBreakdown && data && (
        <PnLDrawer data={data} onClose={() => setShowBreakdown(false)} />
      )}
    </div>
  );
}