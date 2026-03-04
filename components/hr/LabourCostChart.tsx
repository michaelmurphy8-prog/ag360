"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp } from "lucide-react";

type MonthData = {
  month: string;
  label: string;
  cost: number;
  hours: number;
};

const fmtMoney = (n: number) =>
  `$${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export default function LabourCostChart() {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonths = async () => {
      setLoading(true);
      const now = new Date();
      const months: MonthData[] = [];

      // Fetch last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-CA", { month: "short" });

        try {
          const r = await fetch(`/api/hr/time-entries?month=${key}`);
          const res = await r.json();
          const totalCost = (res.summary || []).reduce((s: number, r: { total_cost: number }) => s + Number(r.total_cost), 0);
          const totalHours = (res.summary || []).reduce((s: number, r: { total_hours: number }) => s + Number(r.total_hours), 0);
          months.push({ month: key, label, cost: totalCost, hours: totalHours });
        } catch {
          months.push({ month: key, label, cost: 0, hours: 0 });
        }
      }

      setData(months);
      setLoading(false);
    };
    fetchMonths();
  }, []);

  const maxCost = Math.max(...data.map(d => d.cost), 1);
  const totalCost = data.reduce((s, d) => s + d.cost, 0);
  const totalHours = data.reduce((s, d) => s + d.hours, 0);
  const currentMonth = data.length > 0 ? data[data.length - 1] : null;

  // Don't render if no data at all
  if (!loading && data.every(d => d.cost === 0 && d.hours === 0)) return null;

  if (loading) return (
    <div className="rounded-2xl border border-[var(--ag-border)] p-6" style={{ backgroundColor: "var(--ag-bg-card)" }}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} style={{ color: "var(--ag-accent)" }} />
        <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">Labour Cost Trend</p>
      </div>
      <div className="flex justify-center py-8">
        <div className="flex gap-1.5">{[0, 150, 300].map(d => (
          <div key={d} className="w-2 h-2 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}</div>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-[var(--ag-border)] p-5" style={{ backgroundColor: "var(--ag-bg-card)" }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: "var(--ag-accent)" }} />
          <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">Labour Cost Trend (6 Months)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-[1.5px] text-[var(--ag-text-dim)]">This Month</p>
            <p className="text-[14px] font-bold" style={{ color: "var(--ag-accent)" }}>
              {currentMonth ? fmtMoney(currentMonth.cost) : "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-[1.5px] text-[var(--ag-text-dim)]">6-Mo Total</p>
            <p className="text-[14px] font-bold text-[var(--ag-text-primary)]">{fmtMoney(totalCost)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-mono uppercase tracking-[1.5px] text-[var(--ag-text-dim)]">Total Hours</p>
            <p className="text-[14px] font-bold text-[var(--ag-text-primary)]">{totalHours.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--ag-border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--ag-text-muted)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 9, fill: "var(--ag-text-dim)", fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
            width={45}
          />
          <Tooltip
            cursor={{ fill: "var(--ag-bg-hover)", radius: 4 }}
            contentStyle={{
              backgroundColor: "var(--ag-bg-card)",
              border: "1px solid var(--ag-border)",
              borderRadius: "10px",
              fontSize: "11px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
            labelStyle={{ fontWeight: "bold", color: "var(--ag-text-primary)", marginBottom: "4px" }}
            
          />
          <Bar dataKey="cost" radius={[6, 6, 0, 0]} maxBarSize={40}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={index === data.length - 1 ? "var(--ag-accent)" : "var(--ag-accent)"}
                fillOpacity={index === data.length - 1 ? 1 : 0.4}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}