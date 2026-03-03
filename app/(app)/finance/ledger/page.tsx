"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  BookOpen, Plus, X, CheckCircle, AlertTriangle, Loader2, Search,
  ChevronDown, Trash2, Edit2, Filter, RotateCcw, Calendar, ArrowUpRight,
  ArrowDownRight, Scale, FileText, DollarSign, TrendingUp, TrendingDown, ScanLine,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from "recharts";
import ScanDocumentModal from "@/components/finance/ScanDocumentModal";

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

// ─── Shared Styles ───────────────────────────────────────────
const inputClass =
  "w-full bg-[var(--ag-bg-hover)] border border-[var(--ag-border-solid)] rounded-lg px-3 py-2 text-sm text-ag-primary placeholder-[#475569] focus:outline-none focus:border-[var(--ag-accent)]/50 transition-colors";
const selectClass =
  "bg-[var(--ag-bg-card)] border border-[var(--ag-border-solid)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:outline-none focus:border-[var(--ag-accent)]/50 transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[2px] font-mono font-semibold text-ag-muted mb-1.5";
const btnPrimary =
  "flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all";
const btnSecondary =
  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-[var(--ag-border-solid)] text-ag-secondary hover:text-ag-primary hover:border-white/[0.16] transition-all";

// ─── Interfaces ──────────────────────────────────────────────
interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  account_type?: string;
  sub_type: string;
}

interface JournalLine {
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit: number;
  credit: number;
  field_id?: string;
  field_name?: string;
  notes?: string;
}

interface JournalEntry {
  id: string;
  date: string;
  description: string;
  reference?: string;
  lines: JournalLine[];
  created_at: string;
}

// ─── Chart Tooltip ───────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
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
      <p style={{ color: T.text3, fontSize: 10, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: p.color || p.stroke }} />
          <span style={{ color: T.text2, fontSize: 12 }}>{p.name}:</span>
          <span style={{ color: T.text1, fontSize: 13, fontWeight: 600, fontFamily: "monospace" }}>
            ${Math.abs(p.value).toLocaleString("en-CA", { minimumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Cashflow Sparkline ──────────────────────────────────────
function CashflowSparkline({ entries }: { entries: JournalEntry[] }) {
  // Build daily running cashflow from journal entries
  const dailyData = useMemo(() => {
    if (!entries.length) return [];
    const byDate: Record<string, { inflow: number; outflow: number }> = {};
    entries.forEach((e) => {
      const d = e.date.slice(0, 10);
      if (!byDate[d]) byDate[d] = { inflow: 0, outflow: 0 };
      e.lines.forEach((l) => {
        // Revenue accounts (4xxx) credit = inflow; Expense accounts (5xxx+) debit = outflow
        const code = l.account_code || "";
        if (code.startsWith("4")) byDate[d].inflow += l.credit;
        else if (parseInt(code) >= 5000) byDate[d].outflow += l.debit;
      });
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString("en-CA", { month: "short", day: "numeric" }),
        inflow: d.inflow,
        outflow: -d.outflow,
        net: d.inflow - d.outflow,
      }));
  }, [entries]);

  if (dailyData.length < 2) return null;

  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5 hover:border-[var(--ag-border-solid)] transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-ag-primary">Cashflow</h3>
          <p className="text-xs text-ag-dim mt-0.5">Daily money in &amp; out</p>
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
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.green} stopOpacity={0.25} />
              <stop offset="100%" stopColor={T.green} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.red} stopOpacity={0.25} />
              <stop offset="100%" stopColor={T.red} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false} />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text4, fontSize: 9, fontFamily: "monospace" }}
            interval="preserveStartEnd"
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.text4, fontSize: 9, fontFamily: "monospace" }}
            tickFormatter={(v: number) => `$${(Math.abs(v) / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="inflow"
            stroke={T.green}
            strokeWidth={2}
            fill="url(#inflowGrad)"
            name="Inflow"
          />
          <Area
            type="monotone"
            dataKey="outflow"
            stroke={T.red}
            strokeWidth={2}
            fill="url(#outflowGrad)"
            name="Outflow"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Revenue / Expense Donut ─────────────────────────────────
function LedgerDonut({ entries }: { entries: JournalEntry[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const totals = useMemo(() => {
    let revenue = 0;
    let expenses = 0;
    entries.forEach((e) =>
      e.lines.forEach((l) => {
        const code = l.account_code || "";
        if (code.startsWith("4")) revenue += l.credit;
        else if (parseInt(code) >= 5000) expenses += l.debit;
      })
    );
    return [
      { name: "Revenue", value: revenue, fill: T.green },
      { name: "Expenses", value: expenses, fill: T.red },
    ];
  }, [entries]);

  if (totals[0].value === 0 && totals[1].value === 0) return null;

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
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5 hover:border-[var(--ag-border-solid)] transition-colors">
      <h3 className="text-sm font-bold text-ag-primary mb-1">YTD Split</h3>
      <p className="text-xs text-ag-dim mb-3">Hover for details</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
  {...{ activeIndex: activeIdx !== null ? activeIdx : undefined } as any}
            activeShape={renderActiveShape}
            data={totals}
            cx="50%"
            cy="50%"
            innerRadius={42}
            outerRadius={65}
            dataKey="value"
            onMouseEnter={(_, idx) => setActiveIdx(idx)}
            onMouseLeave={() => setActiveIdx(null)}
            stroke="none"
          >
            {totals.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────
function LedgerKpi({
  label, value, icon: Icon, iconColor, bgColor,
}: {
  label: string; value: string; icon: React.ElementType; iconColor: string; bgColor: string;
}) {
  return (
    <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4 hover:border-[var(--ag-border-solid)] transition-all">
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <Icon size={13} style={{ color: iconColor }} />
        </div>
        <span className="text-[10px] uppercase tracking-[2px] font-mono font-semibold" style={{ color: T.text3 }}>{label}</span>
      </div>
      <div className="text-lg font-bold font-mono" style={{ color: T.text1 }}>{value}</div>
    </div>
  );
}

// ─── Entry Type Badge ────────────────────────────────────────
function EntryTypeBadge({ lines }: { lines: JournalLine[] }) {
  const hasRevenue = lines.some((l) => (l.account_code || "").startsWith("4") && l.credit > 0);
  const hasExpense = lines.some((l) => parseInt(l.account_code || "0") >= 5000 && l.debit > 0);

  if (hasRevenue && hasExpense)
    return <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: T.amber, background: T.amberDim }}>Mixed</span>;
  if (hasRevenue)
    return <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: T.green, background: T.greenDim }}>Revenue</span>;
  if (hasExpense)
    return <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: T.red, background: T.redDim }}>Expense</span>;
  return <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full" style={{ color: T.sky, background: T.skyDim }}>Transfer</span>;
}

// ─── Entry Edge Color (Stripe-style left bar) ────────────────
function entryEdgeColor(lines: JournalLine[]): string {
  const hasRevenue = lines.some((l) => (l.account_code || "").startsWith("4") && l.credit > 0);
  const hasExpense = lines.some((l) => parseInt(l.account_code || "0") >= 5000 && l.debit > 0);
  if (hasRevenue && hasExpense) return T.amber;
  if (hasRevenue) return T.green;
  if (hasExpense) return T.red;
  return T.sky;
}

// ═════════════════════════════════════════════════════════════
//  LEDGER PAGE — FINTECH GRADE
// ═════════════════════════════════════════════════════════════
// ─── Payables Tab ────────────────────────────────────────────
function PayablesTab({ entries, fmt, onMarkPaid }: { entries: any[]; fmt: (n: number) => string; onMarkPaid: (id: string) => void }) {
  const payables = entries.filter((e: any) => e.payment_status === "unpaid" || e.payment_status === "draft");
  const paidRecent = entries.filter((e: any) => e.payment_status === "paid" && e.paid_date);
  
  const today = new Date().toISOString().slice(0, 10);
  
  const overdue = payables.filter((e: any) => e.due_date && e.due_date < today);
  const dueSoon = payables.filter((e: any) => {
    if (!e.due_date || e.due_date < today) return false;
    const diff = (new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  });
  const upcoming = payables.filter((e: any) => {
    if (!e.due_date) return true;
    const diff = (new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
    return diff > 7;
  });

  const totalOutstanding = payables.reduce((s: number, e: any) => {
    const total = e.lines?.reduce((ls: number, l: any) => ls + (parseFloat(l.debit) || 0), 0) || 0;
    return s + total;
  }, 0);
  const totalOverdue = overdue.reduce((s: number, e: any) => {
    const total = e.lines?.reduce((ls: number, l: any) => ls + (parseFloat(l.debit) || 0), 0) || 0;
    return s + total;
  }, 0);
  const totalDueSoon = dueSoon.reduce((s: number, e: any) => {
    const total = e.lines?.reduce((ls: number, l: any) => ls + (parseFloat(l.debit) || 0), 0) || 0;
    return s + total;
  }, 0);

  const getEntryTotal = (e: any) => {
    return e.lines?.reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0) || 0;
  };

  const getDaysLabel = (dueDate: string) => {
    if (!dueDate) return "No due date";
    const diff = Math.round((new Date(dueDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return "Due today";
    return `Due in ${diff} days`;
  };

  const statusStyle = (e: any) => {
    if (!e.due_date) return { color: T.text3, bg: "rgba(255,255,255,0.04)", label: "No Due Date" };
    const diff = (new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { color: T.red, bg: T.redDim, label: "Overdue" };
    if (diff <= 7) return { color: T.amber, bg: T.amberDim, label: "Due Soon" };
    return { color: T.green, bg: T.greenDim, label: "Upcoming" };
  };

  const renderRow = (e: any) => {
    const s = statusStyle(e);
    const total = getEntryTotal(e);
    return (
      <div
        key={e.id}
        className="flex items-center gap-4 px-4 py-3 border-b hover:bg-white/[0.02] transition-colors"
        style={{ borderColor: T.border }}
      >
        {/* Status dot */}
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate" style={{ color: T.text1 }}>{e.description}</span>
            {e.vendor && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: T.text3 }}>
                {e.vendor}
              </span>
            )}
            {e.document_type === "quote" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: T.purpleDim, color: T.purple }}>
                Quote
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] font-mono" style={{ color: T.text4 }}>
              {e.entry_date?.slice(0, 10) || e.date?.slice(0, 10)}
            </span>
            {e.document_number && (
              <span className="text-[11px]" style={{ color: T.text4 }}>#{e.document_number}</span>
            )}
            {e.due_date && (
              <span className="text-[11px] font-medium" style={{ color: s.color }}>
                {getDaysLabel(e.due_date)}
              </span>
            )}
          </div>
        </div>
        {/* Amount */}
        <div className="text-right mr-2">
          <span className="text-sm font-mono font-semibold" style={{ color: T.text1 }}>{fmt(total)}</span>
          {e.payment_terms && e.payment_terms !== "paid" && (
            <div className="text-[10px] font-mono mt-0.5" style={{ color: T.text4 }}>
              {e.payment_terms.replace("_", " ")}
            </div>
          )}
        </div>
        {/* Status badge */}
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold flex-shrink-0"
          style={{ background: s.bg, color: s.color }}
        >
          {s.label}
        </div>
        {/* Mark paid button */}
        <button
          onClick={() => {
            if (confirm(`Mark "${e.description}" as paid?`)) onMarkPaid(e.id);
          }}
          className="flex items-center gap-1 text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all hover:bg-[var(--ag-bg-active)] flex-shrink-0"
          style={{ color: T.green, border: `1px solid ${T.green}30` }}
        >
          <CheckCircle size={11} />
          Mark Paid
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <LedgerKpi label="Total Outstanding" value={fmt(totalOutstanding)} icon={DollarSign} iconColor={T.sky} bgColor={T.skyDim} />
        <LedgerKpi label="Overdue" value={fmt(totalOverdue)} icon={AlertTriangle} iconColor={T.red} bgColor={T.redDim} />
        <LedgerKpi label="Due This Week" value={fmt(totalDueSoon)} icon={Calendar} iconColor={T.amber} bgColor={T.amberDim} />
        <LedgerKpi label="Unpaid Bills" value={String(payables.length)} icon={FileText} iconColor={T.purple} bgColor={T.purpleDim} />
      </div>

      {payables.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: T.green }} />
          <p className="text-sm font-medium" style={{ color: T.text1 }}>All caught up!</p>
          <p className="text-xs mt-1" style={{ color: T.text3 }}>No outstanding payables. Scan an invoice to track payments.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: T.border, background: T.card }}>
          {/* Section: Overdue */}
          {overdue.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[2px] font-mono font-semibold flex items-center gap-2" style={{ background: "rgba(248,113,113,0.04)", color: T.red }}>
                <AlertTriangle size={11} /> Overdue ({overdue.length})
              </div>
              {overdue.map(renderRow)}
            </>
          )}
          {/* Section: Due Soon */}
          {dueSoon.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[2px] font-mono font-semibold flex items-center gap-2" style={{ background: "rgba(251,191,36,0.04)", color: T.amber }}>
                <Calendar size={11} /> Due This Week ({dueSoon.length})
              </div>
              {dueSoon.map(renderRow)}
            </>
          )}
          {/* Section: Upcoming */}
          {upcoming.length > 0 && (
            <>
              <div className="px-4 py-2 text-[10px] uppercase tracking-[2px] font-mono font-semibold flex items-center gap-2" style={{ background: "rgba(255,255,255,0.02)", color: T.text3 }}>
                <FileText size={11} /> Upcoming ({upcoming.length})
              </div>
              {upcoming.map(renderRow)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default function LedgerPage() {
  const { user } = useUser();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"journal" | "coa" | "payables">("journal");
  const [showScan, setShowScan] = useState(false);

  // Filters
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState("all"); // all | revenue | expense | transfer
  const [filterMonth, setFilterMonth] = useState("all");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formDesc, setFormDesc] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formLines, setFormLines] = useState<JournalLine[]>([
    { account_id: "", debit: 0, credit: 0, notes: "" },
    { account_id: "", debit: 0, credit: 0, notes: "" },
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
Promise.all([
fetch("/api/finance/journal", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
fetch("/api/finance/accounts", { headers: { "x-user-id": user.id } }).then((r) => r.json()),
    ])
      .then(([e, a]) => {
        const rawEntries = Array.isArray(e) ? e : e?.entries || e?.data || [];
        const mapped = rawEntries.map((entry: any) => ({
          ...entry,
          date: entry.date || entry.entry_date || "",
          number: entry.number || entry.entry_number || 0,
          ref: entry.ref || entry.source || "",
          lines: entry.lines || [],
        }));
        setEntries(mapped);
        setAccounts(Array.isArray(a) ? a : a?.accounts || a?.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  // ── Computed ────────────────────────────────────
  const totalDebits = useMemo(() => entries.reduce((s, e) => s + e.lines.reduce((ss, l) => ss + l.debit, 0), 0), [entries]);
  const totalCredits = useMemo(() => entries.reduce((s, e) => s + e.lines.reduce((ss, l) => ss + l.credit, 0), 0), [entries]);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (searchQ && !e.description.toLowerCase().includes(searchQ.toLowerCase()) && !e.reference?.toLowerCase().includes(searchQ.toLowerCase())) return false;
      if (filterMonth !== "all" && !e.date.startsWith(filterMonth)) return false;
      if (filterType !== "all") {
        const hasRev = e.lines.some((l) => (l.account_code || "").startsWith("4") && l.credit > 0);
        const hasExp = e.lines.some((l) => parseInt(l.account_code || "0") >= 5000 && l.debit > 0);
        if (filterType === "revenue" && !hasRev) return false;
        if (filterType === "expense" && !hasExp) return false;
        if (filterType === "transfer" && (hasRev || hasExp)) return false;
      }
      return true;
    });
  }, [entries, searchQ, filterType, filterMonth]);

  // ── Unique months from entries ──────────────────
  const months = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => set.add(e.date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [entries]);

  // ── Form helpers ───────────────────────────────
  const formTotalDebit = formLines.reduce((s, l) => s + (l.debit || 0), 0);
  const formTotalCredit = formLines.reduce((s, l) => s + (l.credit || 0), 0);
  const formBalanced = Math.abs(formTotalDebit - formTotalCredit) < 0.01 && formTotalDebit > 0;

  const addLine = () =>
    setFormLines((p) => [...p, { account_id: "", debit: 0, credit: 0, notes: "" }]);
  const removeLine = (i: number) =>
    setFormLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i: number, field: string, val: any) =>
    setFormLines((p) => p.map((l, idx) => (idx === i ? { ...l, [field]: val } : l)));

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormDesc("");
    setFormRef("");
    setFormLines([
      { account_id: "", debit: 0, credit: 0, notes: "" },
      { account_id: "", debit: 0, credit: 0, notes: "" },
    ]);
  };

  const handleSave = async () => {
    if (!formBalanced || !formDesc) return;
    setSaving(true);
    try {
      const body = { date: formDate, description: formDesc, reference: formRef, lines: formLines };
      const res = editingId
        ? await fetch(`/api/finance/journal/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" }, body: JSON.stringify(body) })
: await fetch("/api/finance/journal", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": user?.id || "" }, body: JSON.stringify(body) });
      if (res.ok) {
        const saved = await res.json();
        setEntries((prev) =>
          editingId
            ? prev.map((e) => (e.id === editingId ? saved : e))
            : [saved, ...prev]
        );
        resetForm();
      }
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this journal entry?")) return;
    try {
      await fetch(`/api/finance/journal/${id}`, { method: "DELETE", headers: { "x-user-id": user?.id || "" } });
      setEntries((p) => p.filter((e) => e.id !== id));
    } catch {}
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setFormDate(entry.date.slice(0, 10));
    setFormDesc(entry.description);
    setFormRef(entry.reference || "");
    setFormLines(entry.lines);
    setShowForm(true);
  };

  // ── Format helpers ─────────────────────────────
  const fmt = (n: number) => `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;

  // ── Chart of Accounts grouped ──────────────────
  const coaGroups = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    accounts.forEach((a) => {
      const raw = a.account_type || a.type || "other";
      const g = raw.charAt(0).toUpperCase() + raw.slice(1);
      if (!groups[g]) groups[g] = [];
      groups[g].push(a);
    });
    return groups;
  }, [accounts]);

  const coaMeta: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    Asset: { icon: Scale, color: T.green, bg: T.greenDim },
    Liability: { icon: AlertTriangle, color: T.amber, bg: T.amberDim },
    Equity: { icon: BookOpen, color: T.purple, bg: T.purpleDim },
    Revenue: { icon: TrendingUp, color: T.green, bg: T.greenDim },
    Expense: { icon: TrendingDown, color: T.red, bg: T.redDim },
  };

  return (
    <div>
      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: T.text1 }}>Ledger</h1>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            Double-entry journal &middot; {entries.length} entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Balance indicator */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold"
            style={{
              background: isBalanced ? T.greenDim : T.redDim,
              color: isBalanced ? T.green : T.red,
            }}
          >
            {isBalanced ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
            {isBalanced ? "Balanced" : "Out of Balance"}
          </div>
          <button
            onClick={() => setShowScan(true)}
            className={btnPrimary}
            style={{ backgroundColor: T.purple, color: "#fff" }}
          >
            <ScanLine size={14} />
            Scan Document
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className={btnPrimary}
            style={{ backgroundColor: T.green, color: T.bg }}
          >
            <Plus size={14} />
            New Entry
          </button>
        </div>
      </div>

      {/* ── Tab Switcher ─────────────────────────────── */}
      <div className="flex gap-1 mb-6 bg-[var(--ag-bg-hover)] p-1 rounded-xl w-fit border border-[var(--ag-border)]">
        {[
          { id: "journal" as const, label: "Journal Entries" },
          { id: "payables" as const, label: "Payables" },
          { id: "coa" as const, label: "Chart of Accounts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id
                ? "bg-white/[0.08] text-ag-primary shadow-sm"
                : "text-ag-muted hover:text-[var(--ag-text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin" style={{ color: T.green }} />
          <span className="text-sm" style={{ color: T.text3 }}>Loading ledger...</span>
        </div>
      ) : tab === "journal" ? (
        <>
          {/* ── KPI Row + Charts ──────────────────────── */}
          {entries.length > 0 && (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <LedgerKpi label="Entries" value={String(entries.length)} icon={FileText} iconColor={T.sky} bgColor={T.skyDim} />
                <LedgerKpi label="Total Debits" value={fmt(totalDebits)} icon={ArrowUpRight} iconColor={T.green} bgColor={T.greenDim} />
                <LedgerKpi label="Total Credits" value={fmt(totalCredits)} icon={ArrowDownRight} iconColor={T.red} bgColor={T.redDim} />
                <LedgerKpi label="Net" value={fmt(totalDebits - totalCredits)} icon={DollarSign} iconColor={isBalanced ? T.green : T.red} bgColor={isBalanced ? T.greenDim : T.redDim} />
              </div>
              <div className="grid grid-cols-[2fr_1fr] gap-4 mb-6">
                <CashflowSparkline entries={entries} />
                <LedgerDonut entries={entries} />
              </div>
            </>
          )}

          {/* ── Filter Bar (Mercury-style) ────────────── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.text4 }} />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className={inputClass + " pl-9"}
              />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={selectClass}>
              <option value="all">All Types</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className={selectClass}>
              <option value="all">All Months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString("en-CA", { year: "numeric", month: "long" })}
                </option>
              ))}
            </select>
            {(searchQ || filterType !== "all" || filterMonth !== "all") && (
              <button
                onClick={() => { setSearchQ(""); setFilterType("all"); setFilterMonth("all"); }}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-colors"
                style={{ color: T.text3 }}
              >
                <RotateCcw size={12} />
                Clear
              </button>
            )}
            <div className="ml-auto text-xs font-mono" style={{ color: T.text4 }}>
              {filteredEntries.length} of {entries.length}
            </div>
          </div>

          {/* ── Entries List ──────────────────────────── */}
          {filteredEntries.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
                <BookOpen size={24} style={{ color: T.text4 }} />
              </div>
              <p className="text-sm mb-1" style={{ color: T.text2 }}>
                {entries.length === 0 ? "No journal entries yet" : "No entries match your filters"}
              </p>
              <p className="text-xs" style={{ color: T.text4 }}>
                {entries.length === 0 ? "Click \"New Entry\" to record your first transaction" : "Try adjusting your search or filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const entryTotal = entry.lines.reduce((s, l) => s + l.debit, 0);
                const edgeColor = entryEdgeColor(entry.lines);
                return (
                  <div
                    key={entry.id}
                    className="group bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all"
                  >
                    {/* Stripe-style left color edge */}
                    <div className="flex">
                      <div className="w-1 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: edgeColor }} />
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono" style={{ color: T.text4 }}>
                              {new Date(entry.date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-sm font-medium" style={{ color: T.text1 }}>{entry.description}</span>
                            <EntryTypeBadge lines={entry.lines} />
                            {entry.reference && (
                              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--ag-bg-hover)]" style={{ color: T.text4 }}>
                                #{entry.reference}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-mono font-semibold" style={{ color: T.text1 }}>
                              {fmt(entryTotal)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={13} style={{ color: T.text3 }} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={13} style={{ color: T.red }} />
                              </button>
                            </div>
                          </div>
                        </div>
                        {/* Line items (collapsed by default, shows on hover) */}
                        <div className="mt-2 overflow-hidden max-h-0 group-hover:max-h-96 transition-all duration-300">
                          <div className="pt-2 border-t border-white/[0.04] space-y-1">
                            {entry.lines.map((l, i) => (
                              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                                <span style={{ color: T.text2 }}>
                                  <span className="font-mono mr-2" style={{ color: T.text4 }}>{l.account_code}</span>
                                  {l.account_name}
                                  {l.field_name && <span className="ml-1" style={{ color: T.text4 }}>({l.field_name})</span>}
                                </span>
                                <div className="flex gap-6 font-mono">
                                  <span style={{ color: l.debit > 0 ? T.text1 : T.text4 }}>
                                    {l.debit > 0 ? fmt(l.debit) : "—"}
                                  </span>
                                  <span style={{ color: l.credit > 0 ? T.text1 : T.text4 }}>
                                    {l.credit > 0 ? fmt(l.credit) : "—"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : tab === "payables" ? (
        /* ── Payables Tracker ───────────────────────── */
        <PayablesTab entries={entries} fmt={fmt} onMarkPaid={async (id: string) => {
          try {
            await fetch(`/api/finance/journal/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ payment_status: "paid", paid_date: new Date().toISOString().slice(0, 10) }),
            });
            window.location.reload();
          } catch {}
        }} />
      ) : (
        /* ── Chart of Accounts ──────────────────────── */
        <div className="space-y-4">
          {Object.entries(coaGroups).map(([type, accts]) => {
            const meta = coaMeta[type] || { icon: FileText, color: T.text3, bg: "rgba(255,255,255,0.04)" };
            const Icon = meta.icon;
            return (
              <div key={type} className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden hover:border-[var(--ag-border-solid)] transition-colors">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.04]">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: meta.bg }}>
                    <Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: T.text1 }}>{type}s</h3>
                  <span className="text-xs font-mono" style={{ color: T.text4 }}>{accts.length} accounts</span>
                </div>
                <div className="divide-y divide-[var(--ag-border)]">
                  {accts.sort((a, b) => a.code.localeCompare(b.code)).map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-white/[0.01] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono w-12" style={{ color: T.text4 }}>{a.code}</span>
                        <span className="text-sm" style={{ color: T.text1 }}>{a.name}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--ag-bg-hover)] font-mono" style={{ color: T.text3 }}>
                        {a.sub_type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${T.border}` }}>
                <BookOpen size={24} style={{ color: T.text4 }} />
              </div>
              <p className="text-sm" style={{ color: T.text2 }}>Chart of Accounts will appear when you add accounts.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ NEW / EDIT ENTRY MODAL ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
            style={{ background: "var(--ag-bg-card)", border: `1px solid ${T.borderHover}` }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold" style={{ color: T.text1 }}>
                {editingId ? "Edit Journal Entry" : "New Journal Entry"}
              </h2>
              <button onClick={resetForm} className="p-2 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
                <X size={16} style={{ color: T.text3 }} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className={labelClass}>Date</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <input type="text" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="e.g. Fuel purchase" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Reference</label>
                <input type="text" value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="Optional #" className={inputClass} />
              </div>
            </div>

            {/* Line items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className={labelClass + " mb-0"}>Line Items</label>
                <button onClick={addLine} className="text-xs flex items-center gap-1 hover:text-[var(--ag-green)] transition-colors" style={{ color: T.text3 }}>
                  <Plus size={12} /> Add Line
                </button>
              </div>
              <div className="space-y-2">
                {formLines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-2 items-center">
                    <select
                      value={line.account_id}
                      onChange={(e) => updateLine(i, "account_id", e.target.value)}
                      className={selectClass + " text-xs"}
                    >
                      <option value="">Select account...</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.debit || ""}
                      onChange={(e) => updateLine(i, "debit", parseFloat(e.target.value) || 0)}
                      placeholder="Debit"
                      className={inputClass + " text-right font-mono text-xs"}
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={line.credit || ""}
                      onChange={(e) => updateLine(i, "credit", parseFloat(e.target.value) || 0)}
                      placeholder="Credit"
                      className={inputClass + " text-right font-mono text-xs"}
                    />
                    <button
                      onClick={() => removeLine(i)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                      disabled={formLines.length <= 2}
                    >
                      <X size={13} style={{ color: formLines.length <= 2 ? T.text4 : T.red }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance preview */}
            <div
              className="rounded-xl p-4 mb-5 border"
              style={{
                background: formBalanced ? T.greenDim : T.redDim,
                borderColor: formBalanced ? "rgba(52,211,153,0.2)" : "rgba(248,113,113,0.2)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {formBalanced ? (
                    <CheckCircle size={14} style={{ color: T.green }} />
                  ) : (
                    <AlertTriangle size={14} style={{ color: T.red }} />
                  )}
                  <span className="text-xs font-semibold" style={{ color: formBalanced ? T.green : T.red }}>
                    {formBalanced ? "Balanced" : "Entry must balance"}
                  </span>
                </div>
                <div className="flex gap-6 text-xs font-mono">
                  <span style={{ color: T.text2 }}>DR: <span style={{ color: T.text1 }}>{fmt(formTotalDebit)}</span></span>
                  <span style={{ color: T.text2 }}>CR: <span style={{ color: T.text1 }}>{fmt(formTotalCredit)}</span></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button onClick={resetForm} className={btnSecondary}>Cancel</button>
              <button
                onClick={handleSave}
                disabled={!formBalanced || !formDesc || saving}
                className={btnPrimary}
                style={{
                  backgroundColor: formBalanced && formDesc ? T.green : T.text4,
                  color: formBalanced && formDesc ? T.bg : T.text3,
                  opacity: formBalanced && formDesc ? 1 : 0.5,
                  cursor: formBalanced && formDesc ? "pointer" : "not-allowed",
                }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {editingId ? "Update" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
      <ScanDocumentModal
        open={showScan}
        onClose={() => setShowScan(false)}
        accounts={accounts}
        cropYear={2025}
        userId={user?.id || ""}
        onEntryCreated={() => { setShowScan(false); window.location.reload(); }}
      />
    </div>
  );
}