'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Wheat, Tractor, TrendingUp, Users, Sprout } from 'lucide-react'

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

  return (
    <div className="space-y-8">

      {/* ── Page Header ───────────────────────────────────── */}
      <div>
        <h1 className="text-[28px] font-bold text-[#F1F5F9] tracking-tight">
          Farm Overview
        </h1>
        <p className="text-[13px] text-[#64748B] mt-1">
          Murphy Farms · Saskatchewan, CA · <span className="text-[#94A3B8]">Updated just now</span>
        </p>
      </div>

      {/* ── KPI Strip ─────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-[#111827] border border-white/[0.06] rounded-xl px-5 py-5 flex-1 min-w-[160px]"
          >
            <p className="font-mono text-[11px] font-bold text-[#F1F5F9] tracking-[1.5px] uppercase mb-2">
              {kpi.label}
            </p>
            <p className="text-[28px] font-bold text-[#F1F5F9] leading-none mb-1">
              {kpi.value}
            </p>
            <p className={`font-mono text-[11px] ${kpi.accent ? 'text-[#34D399]' : 'text-[#94A3B8]'}`}>
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
              <h2 className="font-mono text-[11px] font-semibold text-[#94A3B8] tracking-[2px] uppercase">
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
                      {entry.field_name && <span className="text-xs text-[#64748B]">· {entry.field_name}</span>}
                      {entry.acres && <span className="text-xs text-[#64748B]">· {entry.acres} ac</span>}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[#34D399]/20 bg-[#34D399]/[0.08] text-[#34D399]">
                        Day {daysIn} — {status.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">{status.advice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modules + Alerts Grid ──────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">

        {/* Modules — left 2/3 */}
        <div className="col-span-2 space-y-4">
          <h2 className="font-mono text-[11px] font-semibold text-[#94A3B8] tracking-[2px] uppercase">
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
                  <p className="text-[15px] font-semibold text-[#F1F5F9] mt-4">{mod.label}</p>
                  <p className="text-xs text-[#64748B] mt-1">{mod.stats}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Alerts — right 1/3 */}
        <div className="space-y-4">
          <h2 className="font-mono text-[11px] font-semibold text-[#94A3B8] tracking-[2px] uppercase">
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
                  <p className="text-[12px] text-[#94A3B8] leading-relaxed">{alert.message}</p>
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
            <p className="text-[12px] text-[#94A3B8] mt-1">Get AI-powered advice for your farm right now.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}