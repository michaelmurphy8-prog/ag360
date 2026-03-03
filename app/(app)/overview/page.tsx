'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Wheat, Tractor, TrendingUp, Users, Sprout, AlertTriangle, Clock, DollarSign, FileText } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────
interface SeedingEntry {
  id: string
  crop: string
  field_name: string | null
  acres: number | null
  seeding_date: string
}

interface WindowStatus {
  label: string
  advice: string
}

// ─── Agronomy Window Logic ───────────────────────────────────
function getWindowStatus(crop: string, daysIn: number): WindowStatus | null {
  const windows = [
    { min: 0, max: 21, label: "Early Scout Window", advice: "Scout for cutworms and flea beetles. Check for uneven emergence. Pre-emergence soil herbicide window closing soon." },
    { min: 14, max: 35, label: "In-Crop Spray Window", advice: "Assess weed pressure and crop staging. Apply in-crop herbicide at correct leaf stage." },
    { min: 30, max: 55, label: "Fungicide Window", advice: "Monitor for disease pressure. Flag leaf fungicide timing approaching for cereals." },
  ]
  for (const w of windows) {
    if (daysIn >= w.min && daysIn <= w.max) {
      return { label: w.label, advice: w.advice }
    }
  }
  return null
}

// ─── Static Data ─────────────────────────────────────────────
const kpis = [
  { label: "TOTAL ACRES", value: "3,200", sub: "ac", accent: false },
  { label: "ASSETS VALUE", value: "$892,000", sub: "CAD  +2.1%", accent: true },
  { label: "BUSHELS ON HAND", value: "48,000", sub: "bu", accent: false },
  { label: "OPEN CONTRACTS", value: "4", sub: "contracts", accent: false },
  { label: "NET WORTH EST.", value: "$2.4M", sub: "CAD  +4.3%", accent: true },
]

const alerts: { type: 'warning' | 'info' | 'success'; message: string }[] = [
  { type: "warning", message: "Canola basis improved +12¢ — review sell plan" },
  { type: "info", message: "Sprayer service due in 80 hours" },
  { type: "success", message: "All employees certified for harvest season" },
]

const modules = [
  { label: "Grain360", icon: Wheat, stats: "4 open contracts · 48,000 bu on hand", status: "ACTIVE", statusColor: "#34D399", href: "/grain360" },
  { label: "Machinery", icon: Tractor, stats: "8 assets · 1 unit needs attention", status: "WATCH", statusColor: "#F59E0B", href: "/machinery" },
  { label: "Marketing", icon: TrendingUp, stats: "68% of production contracted", status: "ACTIVE", statusColor: "#34D399", href: "/marketing" },
  { label: "Labour & HR", icon: Users, stats: "6 employees · harvest crew ready", status: "ACTIVE", statusColor: "#34D399", href: "/labour" },
]

const alertColors = {
  warning: { dot: "#F59E0B", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
  info: { dot: "#38BDF8", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)" },
  success: { dot: "#34D399", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
}

// ═══════════════════════════════════════════════════════════════
//  OVERVIEW PAGE
// ═══════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const { user } = useUser()
  const [reminders, setReminders] = useState<{ entry: SeedingEntry; status: WindowStatus; daysIn: number }[]>([])
const [payables, setPayables] = useState<any[]>([])

  // Fetch seeding log for agronomy reminders
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/agronomy/seeding', {
      headers: { 'x-user-id': user.id },
    })
      .then(res => res.json())
      .then(data => {
        if (!data.success || !data.records) return
        const active = data.records
          .map((row: any) => {
            const entry: SeedingEntry = {
              id: row.id,
              crop: row.crop,
              field_name: row.field_name,
              acres: row.acres ? Number(row.acres) : null,
              seeding_date: row.seeding_date,
            }
            const daysIn = Math.floor(
              (new Date().getTime() - new Date(entry.seeding_date).getTime()) / (1000 * 60 * 60 * 24)
            )
            const status = getWindowStatus(entry.crop, daysIn)
            return status ? { entry, status, daysIn } : null
          })
          .filter(Boolean) as { entry: SeedingEntry; status: WindowStatus; daysIn: number }[]
        setReminders(active)
      })
      .catch(() => {})
  }, [user?.id])
  // Fetch unpaid payables for bills-due widget
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/finance/journal')
      .then(res => res.json())
      .then(data => {
        const raw = Array.isArray(data) ? data : data?.entries || []
        const unpaid = raw.filter((e: any) => e.payment_status === 'unpaid' || e.payment_status === 'draft')
        setPayables(unpaid)
      })
      .catch(() => {})
  }, [user?.id])

  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = payables.filter((e: any) => e.due_date && e.due_date < today).length
  const dueSoonCount = payables.filter((e: any) => {
    if (!e.due_date || e.due_date < today) return false
    const diff = (new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    return diff <= 7
  }).length
  const totalOwing = payables.reduce((s: number, e: any) => {
    const t = (e.lines || []).reduce((ls: number, l: any) => ls + (parseFloat(l.debit) || 0), 0)
    return s + t
  }, 0)

  return (
    <div className="space-y-8">

      {/* ── Page Header ───────────────────────────────────── */}
      <div>
        <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">
          Farm Overview
        </h1>
        <p className="text-[13px] text-ag-muted mt-1">
          Murphy Farms · Saskatchewan, CA · <span className="text-ag-secondary">Updated just now</span>
        </p>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#111827] border border-white/[0.06] rounded-xl px-5 py-5 flex-1 min-w-[160px]"
          >
            <p className="font-mono text-[11px] font-bold text-ag-primary tracking-[1.5px] uppercase mb-2">
              {kpi.label}
            </p>
            <p className="text-[28px] font-bold text-ag-primary leading-none mb-1">
              {kpi.value}
            </p>
            <p className={`font-mono text-[11px] ${kpi.accent ? 'text-[#34D399]' : 'text-ag-secondary'}`}>
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── Agronomy Reminders ─────────────────────────────── */}
      {reminders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sprout size={16} className="text-[#34D399]" />
              <h2 className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">
                Agronomy Reminders
              </h2>
            </div>
            <Link href="/agronomy" className="text-xs text-[#34D399] hover:text-[#6EE7B7] transition-colors">
              View Spray Calendar →
            </Link>
          </div>
          <div className="space-y-2">
            {reminders.map(({ entry, status, daysIn }) => (
              <div
                key={entry.id}
                className="bg-[#34D399]/[0.04] border border-[#34D399]/[0.12] rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <Sprout size={16} className="text-[#34D399] mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-[#34D399]">{entry.crop}</span>
                      {entry.field_name && <span className="text-xs text-ag-muted">· {entry.field_name}</span>}
                      {entry.acres && <span className="text-xs text-ag-muted">· {entry.acres} ac</span>}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[#34D399]/20 bg-[#34D399]/[0.08] text-[#34D399]">
                        Day {daysIn} — {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-ag-secondary mt-1 leading-relaxed">{status.advice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

{/* ── Bills Due ──────────────────────────────────────── */}
      {payables.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-[#F59E0B]" />
              <h2 className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">
                Bills Due
              </h2>
            </div>
            <Link href="/finance/ledger" className="text-xs text-[#34D399] hover:text-[#6EE7B7] transition-colors">
              View Payables →
            </Link>
          </div>

          {/* Summary strip */}
          <div className="flex gap-3">
            {overdueCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F87171]/[0.06] border border-[#F87171]/[0.15]">
                <AlertTriangle size={13} className="text-[#F87171]" />
                <span className="text-xs font-semibold text-[#F87171]">{overdueCount} overdue</span>
              </div>
            )}
            {dueSoonCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#F59E0B]/[0.06] border border-[#F59E0B]/[0.15]">
                <Clock size={13} className="text-[#F59E0B]" />
                <span className="text-xs font-semibold text-[#F59E0B]">{dueSoonCount} due this week</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <FileText size={13} className="text-ag-secondary" />
              <span className="text-xs text-ag-secondary">{payables.length} unpaid · <span className="font-semibold text-ag-primary">${totalOwing.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span> total</span>
            </div>
          </div>

          {/* Top 3 bills */}
          <div className="space-y-2">
            {payables
              .sort((a: any, b: any) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)
              .slice(0, 3)
              .map((e: any) => {
                const isOverdue = e.due_date && e.due_date < today
                const total = (e.lines || []).reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0)
                const daysUntil = e.due_date
                  ? Math.round((new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
                  : null
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl p-3.5"
                    style={{
                      background: isOverdue ? 'rgba(248,113,113,0.04)' : 'rgba(245,158,11,0.04)',
                      border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.12)' : 'rgba(245,158,11,0.12)'}`,
                    }}
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: isOverdue ? '#F87171' : '#F59E0B' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-ag-primary truncate">{e.description}</span>
                        {e.vendor && (
                          <span className="text-[10px] font-mono text-ag-muted px-1.5 py-0.5 rounded bg-white/[0.04]">{e.vendor}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-ag-muted mt-0.5">
                        {e.due_date ? (daysUntil !== null && daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`) : 'No due date'}
                        {e.payment_terms && e.payment_terms !== 'paid' && ` · ${e.payment_terms.replace('_', ' ')}`}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-ag-primary">
                      ${total.toLocaleString('en-CA', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}
      {/* ── Modules + Alerts Grid ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Modules — left 2/3 */}
        <div className="col-span-2 space-y-4">
          <h2 className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">
            MODULES
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {modules.map((mod) => {
              const Icon = mod.icon
              return (
                <Link
                  key={mod.label}
                  href={mod.href}
                  className="group bg-[#111827] border border-white/[0.06] rounded-xl p-6 hover:bg-white/[0.04] hover:border-[#34D399]/20 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-[10px] bg-[#34D399]/[0.08] border border-[#34D399]/[0.15] flex items-center justify-center">
                      <Icon size={18} className="text-[#34D399]" />
                    </div>
                    <span
                      className="font-mono text-[10px] font-medium tracking-[1px] uppercase"
                      style={{ color: mod.statusColor }}
                    >
                      {mod.status}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold text-ag-primary mt-4">{mod.label}</p>
                  <p className="text-xs text-ag-muted mt-1">{mod.stats}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Alerts — right 1/3 */}
        <div className="space-y-4">
          <h2 className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">
            ALERTS & ACTIONS
          </h2>
          <div className="space-y-3">
            {alerts.map((alert, i) => {
              const c = alertColors[alert.type]
              return (
                <div
                  key={i}
                  className="rounded-[10px] p-3.5 flex items-center gap-3"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: c.dot }}
                  />
                  <p className="text-[12px] text-ag-secondary leading-relaxed">{alert.message}</p>
                </div>
              )
            })}
          </div>

          {/* Ask Lily CTA */}
          <Link
            href="/advisor"
            className="block rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.06))',
              border: '1px solid rgba(52,211,153,0.15)',
            }}
          >
            <p className="text-[14px] font-semibold text-[#34D399]">Ask Lily</p>
            <p className="text-[12px] text-ag-secondary mt-1">Get AI-powered advice for your farm right now.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}