'use client';

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Breakdown { type: string; amount: number; }

interface FieldRow {
  field_id: string;
  field_name: string;
  acres: number;
  field_crop_id: string | null;
  crop_type: string | null;
  variety: string | null;
  crop_year: string;
  seeded_acres: number | null;
  expected_yield: number | null;
  status: string | null;
  total_costs: number;
  total_revenue: number;
  cost_breakdown: Breakdown[] | null;
  revenue_breakdown: Breakdown[] | null;
}

interface Summary {
  totalRevenue: number;
  totalCosts: number;
  totalAcres: number;
  fieldCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cad = (n: number) =>
  n.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 });

const signed = (n: number) => `${n >= 0 ? '+' : ''}${cad(n)}`;

const card: React.CSSProperties = {
  background: 'var(--ag-bg-card)',
  border: '1px solid var(--ag-border)',
  borderRadius: '0.75rem',
  padding: '1.25rem',
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={card}>
      <p style={{ fontSize: '0.7rem', color: 'var(--ag-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

// ─── Slide-out ───────────────────────────────────────────────────────────────

function SlideOut({ field, cropYear, onClose }: { field: FieldRow; cropYear: string; onClose: () => void }) {
  const margin  = Number(field.total_revenue) - Number(field.total_costs);
  const perAcre = field.acres > 0 ? margin / field.acres : 0;
  const green   = 'var(--ag-green)';
  const red     = 'var(--ag-red)';

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '420px',
        background: 'var(--ag-bg-card)', borderLeft: '1px solid var(--ag-border)',
        zIndex: 50, overflowY: 'auto', padding: '1.75rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ag-text-primary)' }}>{field.field_name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--ag-text-muted)', marginTop: '0.2rem' }}>
              {field.crop_type || 'No crop recorded'} · {field.acres} ac · {cropYear}
              {field.variety ? ` · ${field.variety}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ag-text-muted)', fontSize: '1.25rem', lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Summary grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            { label: 'Revenue',    value: cad(Number(field.total_revenue)), color: green },
            { label: 'Costs',      value: cad(Number(field.total_costs)),   color: red },
            { label: 'Net Margin', value: cad(margin),   color: margin  >= 0 ? green : red },
            { label: '$ / Acre',   value: cad(perAcre),  color: perAcre >= 0 ? green : red },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--ag-bg-secondary)', borderRadius: '0.5rem', padding: '1rem' }}>
              <p style={{ fontSize: '0.68rem', color: 'var(--ag-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>{c.label}</p>
              <p style={{ fontWeight: 700, color: c.color, fontSize: '1rem' }}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue breakdown */}
        {field.revenue_breakdown && field.revenue_breakdown.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ag-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Revenue by Type
            </p>
            {field.revenue_breakdown.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--ag-border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--ag-text-primary)' }}>{r.type}</span>
                <span style={{ fontSize: '0.875rem', color: green, fontWeight: 500 }}>{cad(r.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cost breakdown */}
        {field.cost_breakdown && field.cost_breakdown.length > 0 && (
          <div>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--ag-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>
              Costs by Type
            </p>
            {field.cost_breakdown.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--ag-border)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--ag-text-primary)' }}>{c.type}</span>
                <span style={{ fontSize: '0.875rem', color: red, fontWeight: 500 }}>{cad(c.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FieldPnL({ cropYear: cropYearProp }: { cropYear: number }) {
  const [cropYear, setCropYear] = useState(cropYearProp.toString());
  const [fields, setFields]       = useState<FieldRow[]>([]);
  const [summary, setSummary]     = useState<Summary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<FieldRow | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/fields/pnl?cropYear=${cropYear}`)
      .then(r => r.json())
      .then(d => { setFields(d.fields || []); setSummary(d.summary || null); })
      .finally(() => setLoading(false));
  }, [cropYear]);

  const netMargin    = summary ? summary.totalRevenue - summary.totalCosts : 0;
  const marginPerAcre = summary && summary.totalAcres > 0 ? netMargin / summary.totalAcres : 0;
  const green = 'var(--ag-green)';
  const red   = 'var(--ag-red)';

  const chartData = fields
    .filter(f => f.crop_type)
    .map(f => ({
      name:     f.field_name.length > 12 ? f.field_name.slice(0, 12) + '…' : f.field_name,
      fullName: f.field_name,
      Revenue:  Number(f.total_revenue),
      Costs:    Number(f.total_costs),
    }));

  return (
    <div style={{ color: 'var(--ag-text-primary)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Field-Level P&L</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--ag-text-muted)', marginTop: '0.2rem' }}>
            Revenue, cost, and margin by field · click any row for full breakdown
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <KpiCard label="Total Revenue"   value={cad(summary.totalRevenue)}  color={green} />
          <KpiCard label="Total Costs"     value={cad(summary.totalCosts)}    color={red} />
          <KpiCard label="Net Margin"      value={cad(netMargin)}             color={netMargin >= 0 ? green : red} />
          <KpiCard label="Margin / Acre"   value={signed(marginPerAcre)}      color={marginPerAcre >= 0 ? green : red} />
        </div>
      )}

      {/* ── Chart ── */}
      {chartData.length > 0 && (
        <div style={{ ...card, marginBottom: '1.5rem' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>Revenue vs. Costs by Field</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={4} barCategoryGap="30%">
              <XAxis dataKey="name" tick={{ fill: 'var(--ag-text-muted)', fontSize: 11 }} />
              <YAxis
                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                tick={{ fill: 'var(--ag-text-muted)', fontSize: 11 }}
              />
              <Tooltip
                formatter={(v, name) => [cad(Number(v)), String(name)]}
                labelFormatter={(_l, p) => p?.[0]?.payload?.fullName || _l}
                contentStyle={{ background: 'var(--ag-bg-card)', border: '1px solid var(--ag-border)', borderRadius: '0.5rem' }}
                labelStyle={{ color: 'var(--ag-text-primary)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
              <Bar dataKey="Revenue" fill="var(--ag-green)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Costs"   fill="var(--ag-red)"   radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Comparison Table ── */}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--ag-border)' }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>Fields Ranked by Margin / Acre</p>
        </div>

        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ag-text-muted)' }}>Loading…</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--ag-bg-secondary)' }}>
                {['Field', 'Crop', 'Acres', 'Revenue', 'Costs', 'Net Margin', '$/Acre', ''].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left',
                    fontSize: '0.68rem', color: 'var(--ag-text-muted)',
                    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--ag-text-muted)', fontSize: '0.875rem' }}>
                    No field data for {cropYear}. Add costs and revenue in the Fields tab.
                  </td>
                </tr>
              ) : fields.map((f, i) => {
                const margin  = Number(f.total_revenue) - Number(f.total_costs);
                const perAcre = f.acres > 0 ? margin / f.acres : 0;
                return (
                  <tr
                    key={f.field_id}
                    onClick={() => setSelected(f)}
                    style={{ borderTop: i > 0 ? '1px solid var(--ag-border)' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--ag-bg-secondary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 500 }}>{f.field_name}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--ag-text-muted)', fontSize: '0.875rem' }}>{f.crop_type || '—'}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--ag-text-muted)', fontSize: '0.875rem' }}>{f.acres}</td>
                    <td style={{ padding: '0.875rem 1rem', color: green,                  fontSize: '0.875rem' }}>{cad(Number(f.total_revenue))}</td>
                    <td style={{ padding: '0.875rem 1rem', color: red,                    fontSize: '0.875rem' }}>{cad(Number(f.total_costs))}</td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: margin  >= 0 ? green : red, fontSize: '0.875rem' }}>{cad(margin)}</td>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: perAcre >= 0 ? green : red, fontSize: '0.875rem' }}>{cad(perAcre)}</td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--ag-text-muted)', textAlign: 'right' }}>›</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Slide-out ── */}
      {selected && (
        <SlideOut field={selected} cropYear={cropYear} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}