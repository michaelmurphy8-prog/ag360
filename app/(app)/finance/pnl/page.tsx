"use client";

import { useState, useEffect } from "react";

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

export default function PnLPage() {
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState("2025");
  const [view, setView] = useState("farm");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    fetch(`/api/finance/pnl?cropYear=${cropYear}&view=${view}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cropYear, view]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fmtShort = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const hasData = data && (data.totalRevenue > 0 || data.totalExpenses > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Profit & Loss</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">
            Real-time farm profitability — crop year {cropYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
            className="bg-white border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm text-[#222527]"
          >
            {["2026", "2025", "2024", "2023"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5F5F3] p-1 rounded-xl w-fit">
        {[
          { id: "farm", label: "Farm P&L" },
          { id: "crop", label: "By Crop" },
          { id: "field", label: "By Field" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              view === t.id ? "bg-white text-[#222527] shadow-sm" : "text-[#7A8A7C] hover:text-[#222527]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#7A8A7C]">Loading P&L...</div>
      ) : !hasData ? (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-[#7A8A7C] mb-2">No financial data for crop year {cropYear}.</p>
          <p className="text-xs text-[#B0B8B0] mb-4">
            Record transactions in the Ledger — they'll appear here automatically.
          </p>
          <a
            href="/finance/ledger"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#4A7C59] text-white hover:bg-[#3D6B4A] inline-block"
          >
            Open Ledger
          </a>
        </div>
      ) : data ? (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
              <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-[#4A7C59]">{fmtShort(data.totalRevenue)}</div>
            </div>
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
              <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Total Expenses</div>
              <div className="text-2xl font-bold text-[#222527]">{fmtShort(data.totalExpenses)}</div>
            </div>
            <div className={`border rounded-xl p-5 ${
              data.netIncome >= 0 ? "bg-[#F0F7F2] border-[#4A7C59]/20" : "bg-red-50 border-red-200"
            }`}>
              <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Net Income</div>
              <div className={`text-2xl font-bold ${data.netIncome >= 0 ? "text-[#4A7C59]" : "text-red-600"}`}>
                {data.netIncome < 0 ? "-" : ""}{fmtShort(data.netIncome)}
              </div>
            </div>
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
              <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Profit Margin</div>
              <div className={`text-2xl font-bold ${data.margin >= 0 ? "text-[#4A7C59]" : "text-red-600"}`}>
                {data.margin}%
              </div>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#E4E7E0] bg-[#F8FAF7]">
              <h2 className="text-sm font-bold text-[#222527]">
                Statement of Farm Income — {cropYear} Crop Year
              </h2>
              <p className="text-xs text-[#B0B8B0] mt-0.5">
                All figures in CAD. Updates in real-time from Ledger entries.
              </p>
            </div>

            {/* REVENUE SECTION */}
            <div className="px-5 py-3 border-b border-[#E4E7E0]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A7C59]">Revenue</h3>
                <span className="text-sm font-bold text-[#4A7C59]">{fmt(data.totalRevenue)}</span>
              </div>
              {data.revenueLines.map((line, i) => (
                <div key={i} className="flex justify-between py-1.5 text-sm">
                  <span className="text-[#222527]">
                    <span className="text-[#B0B8B0] font-mono text-xs mr-2">{line.code}</span>
                    {line.name}
                    {line.field_name && <span className="text-[#B0B8B0] text-xs ml-2">({line.field_name})</span>}
                  </span>
                  <span className="font-mono text-[#222527]">{fmt(line.balance)}</span>
                </div>
              ))}
              {data.revenueLines.length === 0 && (
                <p className="text-xs text-[#B0B8B0] py-2">No revenue recorded yet</p>
              )}
            </div>

            {/* EXPENSES SECTION */}
            <div className="px-5 py-3 border-b border-[#E4E7E0]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-600">Expenses</h3>
                <span className="text-sm font-bold text-[#222527]">{fmt(data.totalExpenses)}</span>
              </div>

              {Object.entries(data.expensesByCategory)
                .sort(([, a], [, b]) => b.total - a.total)
                .map(([key, cat]) => {
                  const isExpanded = expandedCategories[key];
                  return (
                    <div key={key} className="mb-1">
                      <button
                        onClick={() => toggleCategory(key)}
                        className="w-full flex justify-between items-center py-2 text-sm hover:bg-[#F8FAF7] rounded-lg px-2 -mx-2"
                      >
                        <span className="font-medium text-[#222527]">{cat.label}</span>
                        <span className="font-mono text-[#222527]">{fmt(cat.total)}</span>
                      </button>
                      {isExpanded && (
                        <div className="pl-6 pb-2">
                          {cat.lines.map((line, i) => (
                            <div key={i} className="flex justify-between py-1 text-xs text-[#7A8A7C]">
                              <span>
                                <span className="font-mono mr-2">{line.code}</span>
                                {line.name}
                                {line.field_name && <span className="ml-1">({line.field_name})</span>}
                              </span>
                              <span className="font-mono">{fmt(line.balance)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              {Object.keys(data.expensesByCategory).length === 0 && (
                <p className="text-xs text-[#B0B8B0] py-2">No expenses recorded yet</p>
              )}
            </div>

            {/* NET INCOME */}
            <div className={`px-5 py-4 ${data.netIncome >= 0 ? "bg-[#F0F7F2]" : "bg-red-50"}`}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#222527]">Net Farm Income</h3>
                <span className={`text-xl font-bold ${data.netIncome >= 0 ? "text-[#4A7C59]" : "text-red-600"}`}>
                  {data.netIncome < 0 ? "-" : ""}{fmt(data.netIncome)}
                </span>
              </div>
              <p className="text-xs text-[#7A8A7C] mt-1">
                Revenue {fmt(data.totalRevenue)} — Expenses {fmt(data.totalExpenses)} = {data.margin}% margin
              </p>
            </div>
          </div>

          <div className="mt-3 text-xs text-[#B0B8B0] text-right">
            Updated in real-time from Ledger entries. Last refresh: {new Date().toLocaleString("en-CA")}
          </div>
        </>
      ) : null}
    </div>
  );
}