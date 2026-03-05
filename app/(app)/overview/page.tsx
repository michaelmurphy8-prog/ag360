'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Wheat, Tractor, TrendingUp, Users, Sprout, AlertTriangle,
  Clock, DollarSign, FileText, Cloud, Wind, Droplets, Sun,
  CloudRain, CloudSnow, CloudSun, CloudDrizzle, CloudLightning,
  CheckCircle2, ChevronRight, Package, Database, Calendar
} from 'lucide-react'

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

interface Worker {
  id: number
  name: string
  status: string
  role: string
  expired_certs: number
  monthly_hours: number
}

interface ServiceSchedule {
  id: string
  asset_name: string
  make: string
  model: string
  serviceType: string
  status: 'OVERDUE' | 'DUE_SOON' | 'OK'
  dueAtDate: string | null
  dueAtHours: number | null
  current_hours: number | null
  priority: string
}

interface Contract {
  id: number
  crop: string
  contract_type: string
  quantity_bu: number
  price_per_bu: number
  delivery_date?: string
  elevator?: string
}

interface Holding {
  crop: string
  quantity_bu: number
  estimated_price: number
}

interface FarmProfile {
  farmName: string
  province: string
  totalAcres: number
  storageCapacity: number
  riskProfile: string
  inventory: {
    crop: string
    acres?: number
    aph?: number
    targetPrice?: number
    landRent?: number
    seed?: number
    fertilizer?: number
    herbicide?: number
    fungicide?: number
    insecticide?: number
    fuel?: number
    drying?: number
    trucking?: number
    elevation?: number
    cropInsurance?: number
    equipmentDepreciation?: number
    insurance?: number
    propertyTax?: number
    overhead?: number
  }[]
}

interface WeatherData {
  current: {
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
    apparent_temperature: number
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
    weather_code: number[]
  }
}

// ─── Agronomy Window Logic ────────────────────────────────────
function getWindowStatus(_crop: string, daysIn: number): WindowStatus | null {
  const windows = [
    { min: 0, max: 21, label: "Early Scout Window", advice: "Scout for cutworms and flea beetles. Check for uneven emergence. Pre-emergence herbicide window closing soon." },
    { min: 14, max: 35, label: "In-Crop Spray Window", advice: "Assess weed pressure and crop staging. Apply in-crop herbicide at correct leaf stage." },
    { min: 30, max: 55, label: "Fungicide Window", advice: "Monitor for disease pressure. Flag leaf fungicide timing approaching for cereals." },
  ]
  for (const w of windows) {
    if (daysIn >= w.min && daysIn <= w.max) return { label: w.label, advice: w.advice }
  }
  return null
}

// ─── Weather Icons ────────────────────────────────────────────
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
}
function getWeatherInfo(code: number) {
  return WMO_ICONS[code] || { label: "Cloudy", Icon: Cloud }
}

const alertColors = {
  warning: { dot: "var(--ag-yellow)", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
  info: { dot: "var(--ag-blue)", bg: "rgba(56,189,248,0.06)", border: "rgba(56,189,248,0.15)" },
  success: { dot: "var(--ag-green)", bg: "rgba(52,211,153,0.06)", border: "rgba(52,211,153,0.15)" },
}

function fmt(n: number) {
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(n).toLocaleString('en-CA')}`
  return `$${n.toFixed(0)}`
}

// ─── Diesel Widget ────────────────────────────────────────────
function DieselWidget() {
  const [price, setPrice] = useState<{ lastPrice: number; priceChange: number; percentChange: number } | null>(null)
  const [history, setHistory] = useState<{ date: string; price: number }[]>([])

  useEffect(() => {
    fetch('/api/grain360/prices')
      .then(r => r.json())
      .then(data => {
        const ho = data.futures?.find((f: any) => f.symbol === 'HO*1')
        if (ho) setPrice({ lastPrice: ho.lastPrice, priceChange: ho.priceChange, percentChange: ho.percentChange })
      })
      .catch(() => {})

    fetch('/api/grain360/prices/history?symbol=HO*1')
      .then(r => r.json())
      .then(data => {
        if (data.history) setHistory(data.history.slice(-14))
      })
      .catch(() => {})
  }, [])

  if (!price) return <p className="text-xs text-ag-muted">Loading...</p>

  const isUp = price.priceChange >= 0
  const min = Math.min(...history.map(h => h.price))
  const max = Math.max(...history.map(h => h.price))
  const range = max - min || 1
  const points = history.map((h, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * 260
    const y = 40 - ((h.price - min) / range) * 36
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-ag-primary">${price.lastPrice.toFixed(3)}</p>
          <p className="text-[11px] text-ag-muted">per gallon USD</p>
        </div>
        <div className="text-right">
          <p className={`text-sm font-semibold ${isUp ? 'text-[var(--ag-red)]' : 'text-[var(--ag-green)]'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(price.priceChange).toFixed(3)}
          </p>
          <p className={`text-xs ${isUp ? 'text-[var(--ag-red)]' : 'text-[var(--ag-green)]'}`}>
            {isUp ? '+' : ''}{price.percentChange.toFixed(2)}%
          </p>
        </div>
      </div>
      {history.length > 1 && (
        <div className="relative">
          <svg width="100%" viewBox="0 0 260 44" preserveAspectRatio="none" className="overflow-visible">
            <defs>
              <linearGradient id="dieselGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isUp ? 'var(--ag-red)' : 'var(--ag-green)'} stopOpacity="0.15" />
                <stop offset="100%" stopColor={isUp ? 'var(--ag-red)' : 'var(--ag-green)'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={`0,44 ${points} 260,44`} fill="url(#dieselGrad)" />
            <polyline points={points} fill="none" stroke={isUp ? 'var(--ag-red)' : 'var(--ag-green)'} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div className="flex justify-between text-[10px] text-ag-muted mt-1">
            <span>14-day</span>
            <span>Low ${min.toFixed(3)}</span>
            <span>High ${max.toFixed(3)}</span>
          </div>
        </div>
      )}
      <div className="pt-2 border-t border-[var(--ag-border)]">
        <p className="text-[11px] text-ag-muted leading-relaxed">
          {isUp
            ? '⚠️ Diesel trending up — consider topping tanks before spring field work'
            : '✓ Diesel trending down — good window to lock in fuel purchases'}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
//  OVERVIEW PAGE
// ═══════════════════════════════════════════════════════════════
export default function OverviewPage() {
  const { user } = useUser()
  const [profile, setProfile] = useState<FarmProfile | null>(null)
  const [workers, setWorkers] = useState<Worker[]>([])
  const [schedules, setSchedules] = useState<ServiceSchedule[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [payables, setPayables] = useState<any[]>([])
  const [reminders, setReminders] = useState<{ entry: SeedingEntry; status: WindowStatus; daysIn: number }[]>([])
  const [binDismissed, setBinDismissed] = useState(false)
  const [lastIncidentDays, setLastIncidentDays] = useState<number | null>(null)
  const [dynamicAlerts, setDynamicAlerts] = useState<{ type: 'warning' | 'info' | 'success'; message: string }[]>([])

  const today = new Date().toISOString().slice(0, 10)

  // Bin health dismissal — stored per day
  useEffect(() => {
    const dismissed = localStorage.getItem('bin_health_dismissed')
    if (dismissed === today) setBinDismissed(true)
  }, [today])

  function dismissBinCheck() {
    localStorage.setItem('bin_health_dismissed', today)
    setBinDismissed(true)
  }

  useEffect(() => {
    if (!user?.id) return
    const headers = { 'x-user-id': user.id }

    Promise.all([
      fetch('/api/farm-profile', { headers }).then(r => r.json()),
      fetch('/api/hr/workers', { headers }).then(r => r.json()),
      fetch('/api/machinery/schedule').then(r => r.json()),
      fetch('/api/inventory/contracts', { headers }).then(r => r.json()),
      fetch('/api/inventory/holdings', { headers }).then(r => r.json()),
      fetch('/api/weather').then(r => r.json()),
      fetch('/api/finance/journal').then(r => r.json()),
      fetch('/api/agronomy/seeding', { headers }).then(r => r.json()),
      fetch('/api/hr/safety', { headers }).then(r => r.json()).catch(() => ({ incidents: [] })),
    ]).then(([p, w, sched, c, h, wx, journal, seeding, safety]) => {

      if (p.profile) setProfile(p.profile)
      setWorkers(w.workers || [])
      setSchedules(sched.schedules || [])
      setContracts(c.contracts || [])
      setHoldings(h.holdings || [])
      if (wx.weather) setWeather(wx.weather)

      // Payables
      const raw = Array.isArray(journal) ? journal : journal?.entries || []
      const unpaid = raw.filter((e: any) => e.payment_status === 'unpaid' || e.payment_status === 'draft')
      setPayables(unpaid)

      // Agronomy reminders
      if (seeding.success && seeding.records) {
        const active = seeding.records.map((row: any) => {
          const entry: SeedingEntry = {
            id: row.id, crop: row.crop, field_name: row.field_name,
            acres: row.acres ? Number(row.acres) : null, seeding_date: row.seeding_date,
          }
          const daysIn = Math.floor((new Date().getTime() - new Date(entry.seeding_date).getTime()) / (1000 * 60 * 60 * 24))
          const status = getWindowStatus(entry.crop, daysIn)
          return status ? { entry, status, daysIn } : null
        }).filter(Boolean)
        setReminders(active)
      }

      // Days since last incident
      const incidents = safety.incidents || []
      if (incidents.length > 0) {
        const sorted = [...incidents].sort((a: any, b: any) =>
  new Date(String(b.incident_date || b.created_at)).getTime() - new Date(String(a.incident_date || a.created_at)).getTime()
)
const incidentDate = sorted[0].incident_date || sorted[0].created_at
const days = incidentDate
  ? Math.floor((new Date().getTime() - new Date(String(incidentDate)).getTime()) / (1000 * 60 * 60 * 24))
  : null
setLastIncidentDays(days)
      }

      // Build dynamic alerts cross-module
      const alerts: { type: 'warning' | 'info' | 'success'; message: string }[] = []

      const overdueServices = (sched.schedules || []).filter((s: any) => s.status === 'OVERDUE')
      if (overdueServices.length > 0)
        alerts.push({ type: 'warning', message: `${overdueServices.length} machine service${overdueServices.length > 1 ? 's' : ''} overdue — check Machinery` })

      const expiredCerts = (w.workers || []).reduce((s: number, wk: any) => s + (parseInt(wk.expired_certs) || 0), 0)
      if (expiredCerts > 0)
        alerts.push({ type: 'warning', message: `${expiredCerts} worker certification${expiredCerts > 1 ? 's' : ''} expired — update in Labour & HR` })

      const totalContractedBu = (c.contracts || []).reduce((s: number, ct: any) => s + Number(ct.quantity_bu), 0)
      const totalBuOnHand = (h.holdings || []).reduce((s: number, hd: any) => s + Number(hd.quantity_bu), 0)
      const projectedBu = (p.profile?.inventory || []).reduce((s: number, c: any) => s + ((c.acres || 0) * (c.aph || 0)), 0)
const denominator = projectedBu > 0 ? projectedBu : totalBuOnHand
if (denominator > 0) {
  const pct = Math.min(100, Math.round(totalContractedBu / denominator * 100))
  if (pct < 50) alerts.push({ type: 'info', message: `Only ${pct}% of projected harvest contracted — review sell plan` })
  else alerts.push({ type: 'success', message: `${pct}% of projected harvest contracted` })
}

      const overduePayables = unpaid.filter((e: any) => e.due_date && e.due_date < today)
      if (overduePayables.length > 0)
        alerts.push({ type: 'warning', message: `${overduePayables.length} bill${overduePayables.length > 1 ? 's' : ''} overdue — review Finance` })

      if (alerts.filter(a => a.type !== 'success').length === 0)
        alerts.push({ type: 'success', message: 'All systems clear — no urgent actions today' })

      setDynamicAlerts(alerts)
    }).catch(() => {})
  }, [user?.id])

  // ── Derived values ──────────────────────────────────────────
  const activeWorkers = workers.filter(w => w.status === 'active')
  const expiredCertsTotal = workers.reduce((s, w) => s + (parseInt(String(w.expired_certs)) || 0), 0)
  const monthlyHoursTotal = workers.reduce((s, w) => s + (parseFloat(String(w.monthly_hours)) || 0), 0)
  const totalBu = holdings.reduce((s, h) => s + Number(h.quantity_bu), 0)
  const totalContracted = contracts.reduce((s, c) => s + Number(c.quantity_bu), 0)
  const totalAcres = profile?.totalAcres || 0
  const fixedAssets = profile ? (profile.totalAcres * 1200) + (profile.storageCapacity * 2) : 0
  const ytdIncome = contracts.reduce((s, c) => s + Number(c.quantity_bu) * Number(c.price_per_bu || 0), 0)
  const totalOwing = payables.reduce((s, e) => s + (e.lines || []).reduce((ls: number, l: any) => ls + (parseFloat(l.debit) || 0), 0), 0)
  const overduePayables = payables.filter(e => e.due_date && e.due_date < today)
  const dueSoonPayables = payables.filter(e => {
    if (!e.due_date || e.due_date < today) return false
    return (new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24) <= 7
  })
  const overdueSchedules = schedules.filter(s => s.status === 'OVERDUE')
  const dueSoonSchedules = schedules.filter(s => s.status === 'DUE_SOON')
  const contractsDueThisWeek = contracts.filter(c => {
    if (!c.delivery_date) return false
    const diff = (new Date(c.delivery_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    return diff >= 0 && diff <= 7
  })
  const projectedHarvest = profile?.inventory.reduce((s, c) => s + (c.acres || 0) * (c.aph || 0), 0) || 0
  const pctContractedOfProjected = projectedHarvest > 0 ? Math.round(totalContracted / projectedHarvest * 100) : 0

  // 6-month: per-crop marketing progress
  const cropContracted = (profile?.inventory || [])
    .map(crop => {
      const contracted = contracts
        .filter(c => c.crop.toLowerCase().trim() === crop.crop.toLowerCase().trim())
        .reduce((s, c) => s + Number(c.quantity_bu), 0)
      const projected = (crop.acres || 0) * (crop.aph || 0)
      const pct = projected > 0 ? Math.min(100, Math.round(contracted / projected * 100)) : 0
      return { crop: crop.crop, contracted, projected, pct }
    })
    .filter(c => c.projected > 0)

  const kpis = [
    { label: "TOTAL ACRES", value: totalAcres > 0 ? totalAcres.toLocaleString() : '—', sub: "ac", accent: false },
    { label: "ASSETS VALUE", value: fixedAssets > 0 ? fmt(fixedAssets) : '—', sub: "land + storage est.", accent: true },
    { label: "BUSHELS ON HAND", value: totalBu > 0 ? totalBu.toLocaleString() : '—', sub: "bu", accent: false },
    { label: "OPEN CONTRACTS", value: contracts.length.toString(), sub: `${totalContracted.toLocaleString()} bu committed`, accent: false },
    { label: "YTD INCOME", value: ytdIncome > 0 ? fmt(ytdIncome) : '—', sub: "contracted sales", accent: true },
  ]

  return (
    <div className="space-y-8 pb-16">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Farm Command</h1>
          <p className="text-[13px] text-ag-muted mt-1">
            {profile?.farmName || 'Your Farm'} · {profile?.province || 'Saskatchewan'} · <span className="text-ag-secondary">Updated just now</span>
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] text-ag-muted uppercase tracking-[1.5px]">
            {new Date().toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          {weather && (
            <p className="text-xs text-ag-secondary mt-1">
              {Math.round(weather.current.temperature_2m)}°C · {getWeatherInfo(weather.current.weather_code).label} · Feels like {Math.round(weather.current.apparent_temperature)}°C
            </p>
          )}
        </div>
      </div>

      {/* ── KPI Strip ──────────────────────────────────────── */}
      <div className="flex gap-4 flex-wrap">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl px-5 py-5 flex-1 min-w-[160px]">
            <p className="font-mono text-[11px] font-bold text-ag-primary tracking-[1.5px] uppercase mb-2">{kpi.label}</p>
            <p className="text-[28px] font-bold text-ag-primary leading-none mb-1">{kpi.value}</p>
            <p className={`font-mono text-[11px] ${kpi.accent ? 'text-[var(--ag-green)]' : 'text-ag-secondary'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── TODAY + ALERTS ROW ─────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">Today</p>

          {/* Agronomy Reminders */}
          {reminders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sprout size={13} className="text-[var(--ag-green)]" />
                  <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Agronomy</p>
                </div>
                <Link href="/agronomy" className="text-xs text-[var(--ag-green)]">View Spray Calendar →</Link>
              </div>
              {reminders.map(({ entry, status, daysIn }) => (
                <div key={entry.id} className="bg-[var(--ag-accent)]/[0.04] border border-[var(--ag-accent)]/[0.12] rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Sprout size={15} className="text-[var(--ag-green)] mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[var(--ag-green)]">{entry.crop}</span>
                        {entry.field_name && <span className="text-xs text-ag-muted">· {entry.field_name}</span>}
                        {entry.acres && <span className="text-xs text-ag-muted">· {entry.acres} ac</span>}
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-[var(--ag-accent-border)] bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)]">
                          Day {daysIn} — {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-ag-secondary mt-1 leading-relaxed">{status.advice}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bills Due */}
          {payables.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign size={13} className="text-[var(--ag-yellow)]" />
                  <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Bills Due</p>
                </div>
                <Link href="/finance/ledger" className="text-xs text-[var(--ag-green)]">View Payables →</Link>
              </div>
              <div className="flex gap-2 flex-wrap">
                {overduePayables.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--ag-red-dim)] border border-[var(--ag-red)]/15">
                    <AlertTriangle size={12} className="text-[var(--ag-red)]" />
                    <span className="text-xs font-semibold text-[var(--ag-red)]">{overduePayables.length} overdue</span>
                  </div>
                )}
                {dueSoonPayables.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#F59E0B]/[0.15]" style={{ background: 'rgba(245,158,11,0.06)' }}>
                    <Clock size={12} className="text-[var(--ag-yellow)]" />
                    <span className="text-xs font-semibold text-[var(--ag-yellow)]">{dueSoonPayables.length} due this week</span>
                  </div>
                )}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--ag-bg-hover)] border border-[var(--ag-border)]">
                  <FileText size={12} className="text-ag-secondary" />
                  <span className="text-xs text-ag-secondary">{payables.length} unpaid · <span className="font-semibold text-ag-primary">${totalOwing.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span></span>
                </div>
              </div>
              {payables
                .sort((a, b) => (a.due_date || '9999') < (b.due_date || '9999') ? -1 : 1)
                .slice(0, 2)
                .map((e: any) => {
                  const isOverdue = e.due_date && e.due_date < today
                  const total = (e.lines || []).reduce((s: number, l: any) => s + (parseFloat(l.debit) || 0), 0)
                  const daysUntil = e.due_date ? Math.round((new Date(e.due_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : null
                  return (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl p-3.5"
                      style={{ background: isOverdue ? 'rgba(248,113,113,0.04)' : 'rgba(245,158,11,0.04)', border: `1px solid ${isOverdue ? 'rgba(248,113,113,0.12)' : 'rgba(245,158,11,0.12)'}` }}>
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: isOverdue ? 'var(--ag-red)' : 'var(--ag-yellow)' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ag-primary truncate">{e.description}</p>
                        <p className="text-[11px] text-ag-muted mt-0.5">
                          {daysUntil !== null && daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} days`}
                          {e.payment_terms && ` · ${e.payment_terms.replace('_', ' ')}`}
                        </p>
                      </div>
                      <span className="text-sm font-mono font-semibold text-ag-primary">${total.toLocaleString('en-CA', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* HR Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-[var(--ag-blue)]" />
                <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Labour & HR</p>
              </div>
              <Link href="/labour" className="text-xs text-[var(--ag-green)]">View Labour →</Link>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-ag-primary">{activeWorkers.length}</p>
                <p className="text-[10px] text-ag-muted mt-0.5 uppercase tracking-wide">Active Workers</p>
              </div>
              <div className={`border rounded-xl p-3 text-center ${expiredCertsTotal > 0 ? 'bg-[var(--ag-red-dim)] border-[var(--ag-red)]/20' : 'bg-[var(--ag-bg-card)] border-[var(--ag-border)]'}`}>
                <p className={`text-xl font-bold ${expiredCertsTotal > 0 ? 'text-[var(--ag-red)]' : 'text-ag-primary'}`}>{expiredCertsTotal}</p>
                <p className="text-[10px] text-ag-muted mt-0.5 uppercase tracking-wide">Expired Certs</p>
              </div>
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-3 text-center">
                <p className="text-xl font-bold text-ag-primary">{Math.round(monthlyHoursTotal)}</p>
                <p className="text-[10px] text-ag-muted mt-0.5 uppercase tracking-wide">Monthly Hours</p>
              </div>
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-3 text-center">
                {lastIncidentDays !== null ? (
                  <>
                    <p className="text-xl font-bold text-[var(--ag-green)]">{lastIncidentDays}</p>
                    <p className="text-[10px] text-ag-muted mt-0.5 uppercase tracking-wide">Days Since Incident</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-[var(--ag-green)]">✓</p>
                    <p className="text-[10px] text-ag-muted mt-0.5 uppercase tracking-wide">No Incidents</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Actions */}
        <div className="space-y-4">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">Alerts & Actions</p>
          <div className="space-y-3">
            {dynamicAlerts.map((alert, i) => {
              const c = alertColors[alert.type]
              return (
                <div key={i} className="rounded-[10px] p-3.5 flex items-center gap-3"
                  style={{ background: c.bg, border: `1px solid ${c.border}` }}>
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.dot }} />
                  <p className="text-[12px] text-ag-secondary leading-relaxed">{alert.message}</p>
                </div>
              )
            })}
          </div>
          <Link href="/advisor" className="block rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, rgba(52,211,153,0.12), rgba(52,211,153,0.06))', border: '1px solid rgba(52,211,153,0.15)' }}>
            <p className="text-[14px] font-semibold text-[var(--ag-green)]">Ask Lily</p>
            <p className="text-[12px] text-ag-secondary mt-1">Get AI-powered advice for your farm right now.</p>
          </Link>

          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">Diesel / Heating Oil</p>
                <p className="text-[10px] text-ag-muted mt-0.5">NYMEX HO · USD/gal · Impacts farm fuel cost</p>
              </div>
              <Link href="/marketing" className="text-xs text-[var(--ag-green)]">Full Chart →</Link>
            </div>
            <DieselWidget />
          </div>
        </div>
      </div>

      {/* ── THIS WEEK ──────────────────────────────────────── */}
      <div className="space-y-4">
        <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">This Week</p>
        <div className="grid grid-cols-2 gap-4">

          {/* Bin Health Check — daily until dismissed */}
          {!binDismissed && (
            <div className="rounded-xl p-4 border border-[var(--ag-yellow)]/25"
              style={{ background: 'rgba(245,158,11,0.04)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Database size={15} className="text-[var(--ag-yellow)] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-ag-primary">Weekly Bin Health Check</p>
                    <p className="text-xs text-ag-secondary mt-1 leading-relaxed">
                      Inspect all bins for crusting, heating, mould, and off smells. Check aeration fans and temperature cables.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {["Crusting", "Heating", "Mould", "Smell", "Aeration", "Temp cables"].map(item => (
                        <span key={item} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={dismissBinCheck}
                  className="shrink-0 text-[10px] font-semibold text-[var(--ag-green)] bg-[var(--ag-accent)]/[0.08] border border-[var(--ag-accent-border)] px-2.5 py-1 rounded-full hover:bg-[var(--ag-accent)]/[0.15] transition-colors whitespace-nowrap">
                  Done ✓
                </button>
              </div>
            </div>
          )}

          {/* Machinery Service */}
          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tractor size={14} className="text-ag-secondary" />
                <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Machinery Service</p>
              </div>
              <Link href="/machinery" className="text-xs text-[var(--ag-green)]">View All →</Link>
            </div>
            {overdueSchedules.length === 0 && dueSoonSchedules.length === 0 ? (
              <div className="flex items-center gap-2 py-1">
                <CheckCircle2 size={14} className="text-[var(--ag-green)]" />
                <p className="text-xs text-ag-secondary">All machinery service up to date</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...overdueSchedules.slice(0, 2), ...dueSoonSchedules.slice(0, 1)].map(s => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: s.status === 'OVERDUE' ? 'var(--ag-red)' : 'var(--ag-yellow)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-ag-primary truncate">{s.asset_name || `${s.make} ${s.model}`}</p>
                      <p className="text-[11px] text-ag-muted">{s.serviceType} · {s.status === 'OVERDUE' ? 'Overdue' : 'Due soon'}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: s.status === 'OVERDUE' ? 'var(--ag-red)' : 'var(--ag-yellow)',
                        background: s.status === 'OVERDUE' ? 'rgba(248,113,113,0.08)' : 'rgba(245,158,11,0.08)'
                      }}>
                      {s.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contract Deliveries This Week */}
          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Package size={14} className="text-ag-secondary" />
                <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Deliveries This Week</p>
              </div>
              <Link href="/inventory" className="text-xs text-[var(--ag-green)]">View Contracts →</Link>
            </div>
            {contractsDueThisWeek.length === 0 ? (
              <p className="text-xs text-ag-muted py-1">No contract deliveries due this week</p>
            ) : contractsDueThisWeek.map(c => (
              <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-[var(--ag-border)] last:border-0">
                <div>
                  <p className="text-xs font-semibold text-ag-primary">{c.crop}</p>
                  <p className="text-[11px] text-ag-muted">{c.delivery_date} · {c.elevator || '—'}</p>
                </div>
                <p className="text-xs font-semibold text-ag-primary">{Number(c.quantity_bu).toLocaleString()} bu</p>
              </div>
            ))}
          </div>

          {/* Active Spray Windows */}
          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sprout size={14} className="text-ag-secondary" />
                <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Active Spray Windows</p>
              </div>
              <Link href="/agronomy" className="text-xs text-[var(--ag-green)]">Spray Calendar →</Link>
            </div>
            {reminders.length === 0 ? (
              <p className="text-xs text-ag-muted py-1">No active spray windows</p>
            ) : reminders.slice(0, 3).map(({ entry, status, daysIn }) => (
              <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-[var(--ag-border)] last:border-0">
                <div>
                  <p className="text-xs font-semibold text-ag-primary">{entry.crop}{entry.field_name ? ` · ${entry.field_name}` : ''}</p>
                  <p className="text-[11px] text-ag-muted">Day {daysIn} · {status.label}</p>
                </div>
                <span className="text-[10px] font-semibold text-[var(--ag-green)] bg-[var(--ag-accent)]/[0.08] border border-[var(--ag-accent-border)] px-2 py-0.5 rounded-full">Open</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── 30-DAY OUTLOOK ─────────────────────────────────── */}
      <div className="space-y-4">
        <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">30-Day Outlook</p>
        <div className="grid grid-cols-3 gap-4">

          {/* Cash position */}
          <div className="col-span-2 bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
            <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide mb-4">Cash Position</p>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-xs text-ag-muted">Contracted Income</p>
                <p className="text-xl font-bold text-[var(--ag-green)] mt-0.5">{ytdIncome > 0 ? fmt(ytdIncome) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ag-muted">Bills Outstanding</p>
                <p className="text-xl font-bold text-[var(--ag-red)] mt-0.5">{totalOwing > 0 ? fmt(totalOwing) : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-ag-muted">Net Position</p>
                <p className={`text-xl font-bold mt-0.5 ${ytdIncome - totalOwing >= 0 ? 'text-[var(--ag-green)]' : 'text-[var(--ag-red)]'}`}>
                  {ytdIncome > 0 || totalOwing > 0 ? fmt(ytdIncome - totalOwing) : '—'}
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--ag-border)]">
              <p className="text-xs text-ag-muted mb-2">Inventory Sold vs On Hand</p>
              <div className="h-2 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--ag-green)] rounded-full transition-all"
                  style={{ width: `${(totalContracted + totalBu) > 0 ? Math.round(totalContracted / (totalContracted + totalBu) * 100) : 0}%` }} />
              </div>
              <div className="flex justify-between text-[11px] text-ag-muted mt-1">
                <span>{totalContracted.toLocaleString()} bu contracted</span>
                <span>{totalBu.toLocaleString()} bu on hand</span>
              </div>
            </div>
          </div>

          {/* Price watch */}
          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Price Watch</p>
                <Link href="/grain360/prices" className="text-xs text-[var(--ag-green)]">Full View →</Link>
              </div>
              <p className="text-xs text-ag-muted leading-relaxed">
                Monitor canola, wheat, and pulse basis levels. Compare to your break-even targets before pricing more bushels.
              </p>
            </div>
            <Link href="/grain360/prices" className="mt-4 flex items-center gap-1 text-xs font-semibold text-[var(--ag-green)]">
              View live prices <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </div>

      {/* ── 6-MONTH OUTLOOK ────────────────────────────────── */}
      {cropContracted.length > 0 && (
        <div className="space-y-4">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">6-Month Outlook — Marketing Progress</p>
          <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
            <div className="space-y-4">
              {cropContracted.map(c => (
                <div key={c.crop}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-ag-primary">{c.crop}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-ag-muted">{c.contracted.toLocaleString()} of {c.projected.toLocaleString()} bu projected</span>
                      <span className="font-bold w-8 text-right" style={{ color: c.pct >= 75 ? 'var(--ag-green)' : c.pct >= 40 ? 'var(--ag-yellow)' : 'var(--ag-red)' }}>
                        {c.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-[var(--ag-bg-active)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${c.pct}%`, backgroundColor: c.pct >= 75 ? 'var(--ag-green)' : c.pct >= 40 ? 'var(--ag-yellow)' : 'var(--ag-red)' }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--ag-border)] flex items-center justify-between">
              <p className="text-xs text-ag-muted">Green = 75%+ contracted · Yellow = 40–74% · Red = under 40%</p>
              <Link href="/grain360" className="text-xs font-semibold text-[var(--ag-green)]">Grain360 →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MODULE CARDS ───────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary tracking-[2px] uppercase">Modules</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Grain360", Icon: Wheat, href: "/grain360",
                stats: `${contracts.length} open contracts · ${totalBu.toLocaleString()} bu on hand`,
                status: "ACTIVE", statusColor: "var(--ag-green)",
              },
              {
                label: "Machinery", Icon: Tractor, href: "/machinery",
                stats: overdueSchedules.length > 0 ? `${overdueSchedules.length} service${overdueSchedules.length > 1 ? 's' : ''} overdue` : "All services up to date",
                status: overdueSchedules.length > 0 ? "WATCH" : "ACTIVE",
                statusColor: overdueSchedules.length > 0 ? "var(--ag-yellow)" : "var(--ag-green)",
              },
              {
                label: "Marketing", Icon: TrendingUp, href: "/marketing",
                stats: projectedHarvest > 0 ? `${pctContractedOfProjected}% of projected harvest contracted` : `${contracts.length} active contracts`,
                status: "ACTIVE", statusColor: "var(--ag-green)",
              },
              {
                label: "Labour & HR", Icon: Users, href: "/labour",
                stats: `${activeWorkers.length} active workers${expiredCertsTotal > 0 ? ` · ${expiredCertsTotal} cert${expiredCertsTotal > 1 ? 's' : ''} expired` : ' · certs current'}`,
                status: expiredCertsTotal > 0 ? "WATCH" : "ACTIVE",
                statusColor: expiredCertsTotal > 0 ? "var(--ag-yellow)" : "var(--ag-green)",
              },
            ].map(mod => (
              <Link key={mod.label} href={mod.href}
                className="group bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 hover:bg-[var(--ag-bg-hover)] hover:border-[var(--ag-accent-border)] transition-all duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-[10px] bg-[var(--ag-accent)]/[0.08] border border-[var(--ag-accent)]/[0.15] flex items-center justify-center">
                    <mod.Icon size={18} className="text-[var(--ag-green)]" />
                  </div>
                  <span className="font-mono text-[10px] font-medium tracking-[1px] uppercase" style={{ color: mod.statusColor }}>{mod.status}</span>
                </div>
                <p className="text-[15px] font-semibold text-ag-primary mt-4">{mod.label}</p>
                <p className="text-xs text-ag-muted mt-1">{mod.stats}</p>
              </Link>
            ))}
          </div>
        </div>

        <div />
      </div>

    </div>
  )
}