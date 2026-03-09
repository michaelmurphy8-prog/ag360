'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Sprout, BookOpen, DollarSign, Search, Shield, Calendar, ChevronRight,
  Trophy, BarChart3, Target, Bug, Leaf, Lightbulb, Droplets, Zap,
  AlertTriangle, Trash2, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle,
} from 'lucide-react'
import {
  CROPS, SPRAY_RATES, HERBICIDE_PASSES, DEFAULT_INPUT_COSTS,
  COMMODITY_OUTLOOK, ZONES_BY_PROVINCE, ZONE_LABELS, PROV_SOURCES,
  getZoneData, getTotalCosts, getTotalVariableCosts, getTotalFixedCosts,
  parseNumber, VARIABLE_COST_KEYS, FIXED_COST_KEYS, VARIABLE_COST_LABELS,
  type InputCosts, type SoilZone, type Crop,
} from '@/lib/agronomy-data'
import ScoutReports from '@/components/scout-reports'
import LilyIcon from '@/components/LilyIcon'

// ─── Sub-tab config ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Crop Dashboard', icon: Sprout },
  { id: 'playbook', label: 'Playbook', icon: BookOpen },
  { id: 'costs', label: 'Crop Economics', icon: DollarSign },
  { id: 'scout', label: 'Scout', icon: Search },
  { id: 'protection', label: 'Protection', icon: Shield },
  { id: 'spray', label: 'Spray Calendar', icon: Calendar },
]

const PROVINCES = ['SK', 'AB', 'MB']

const CAT_COLORS: Record<string, string> = {
  Cereal: 'bg-[#F59E0B]/[0.08] text-[var(--ag-yellow)] border-[var(--ag-yellow)/0.2]',
  Oilseed: 'bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)] border-[var(--ag-accent-border)]',
  Pulse: 'bg-[#38BDF8]/[0.08] text-[var(--ag-blue)] border-[#38BDF8]/20',
}

const selectClass = "text-sm border border-[var(--ag-border-solid)] rounded-lg px-3 py-1.5 bg-[var(--ag-bg-card)] text-ag-primary focus:outline-none focus:border-[var(--ag-accent)]/50"
const inputClass = "w-full text-sm border border-[var(--ag-border-solid)] rounded-lg px-2 py-2 bg-[var(--ag-bg-hover)] text-ag-primary placeholder:text-ag-dim focus:outline-none focus:border-[var(--ag-accent)]/50"

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════

export default function AgronomyPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab && ['dashboard', 'playbook', 'costs', 'scout', 'protection', 'spray'].includes(tab)) return tab;
    }
    return 'dashboard';
  })
  const [province, setProvince] = useState('SK')
  const [zone, setZone] = useState<SoilZone>('Black')
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [regionNotice, setRegionNotice] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/farm-profile', {
          headers: { 'x-user-id': user?.id || '' },
        })
        const json = await res.json()
        if (json.profile) {
          if (json.profile.province) {
            const provMap: Record<string, string> = {
              Saskatchewan: 'SK', Alberta: 'AB', Manitoba: 'MB',
              'British Columbia': 'SK', 'Ontario': 'SK',
              SK: 'SK', AB: 'AB', MB: 'MB',
            }
            const mapped = provMap[json.profile.province]
            if (mapped) {
              setProvince(mapped)
            } else {
              // US state or unsupported region — default to SK with notice
              setProvince('SK')
              setRegionNotice(`Agronomy data is currently available for SK, AB, and MB. Showing Saskatchewan defaults for your reference.`)
            }
          }
          if (json.profile.soilZone) setZone(json.profile.soilZone as SoilZone)
        }
      } catch {
        // fallback to SK Black defaults
      } finally {
        setProfileLoaded(true)
      }
    }
    if (user?.id) loadProfile()
  }, [user?.id])

  const availableZones = ZONES_BY_PROVINCE[province] ?? ['Black']
  const filteredCrops = CROPS.filter(c => c.prov.includes(province))
  const sources = PROV_SOURCES[province] ?? PROV_SOURCES['SK']

  if (!profileLoaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5">
        {[0, 150, 300].map(d => (
          <div key={d} className="w-2 h-2 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-0">

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="pb-5 mb-6 border-b border-[var(--ag-border)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Agronomy</h1>
            <p className="text-[13px] text-ag-muted mt-0.5">
              Crop planning, scouting, protection & spray management
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="font-mono text-[9px] font-semibold text-ag-muted uppercase tracking-[1.5px]">Province</label>
              <select
                value={province}
                onChange={e => {
                  setProvince(e.target.value)
                  const zones = ZONES_BY_PROVINCE[e.target.value]
                  if (zones && !zones.includes(zone)) setZone(zones[0])
                }}
                className={selectClass}
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-mono text-[9px] font-semibold text-ag-muted uppercase tracking-[1.5px]">Soil Zone</label>
              <select
                value={zone}
                onChange={e => setZone(e.target.value as SoilZone)}
                className={selectClass}
              >
                {availableZones.map(z => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
              </select>
            </div>

            <div className="font-mono text-[10px] text-ag-muted bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] px-3 py-1.5 rounded-lg hidden md:block">
              Source: {sources.crop}
            </div>
          </div>
        </div>
        {regionNotice && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2 mt-2">
            <span>⚠</span>
            <span>{regionNotice}</span>
          </div>
        )}
        {/* Sub-tab Navigation */}
        <div className="flex gap-1 mt-5 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  active
                    ? 'bg-[var(--ag-accent)] text-[var(--ag-accent-text)]'
                    : 'text-ag-muted hover:text-ag-primary hover:bg-[var(--ag-bg-hover)]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab Content ───────────────────────────────── */}
      <div>
        {activeTab === 'dashboard' && (
          <CropDashboard crops={filteredCrops} zone={zone} province={province} />
        )}
        {activeTab === 'playbook' && (
          <Playbook crops={filteredCrops} zone={zone} province={province} />
        )}
        {activeTab === 'costs' && (
          <InputCostsTab crops={filteredCrops} zone={zone} />
        )}
        {activeTab === 'scout' && (
          <ScoutTab crops={filteredCrops} />
        )}
        {activeTab === 'protection' && (
          <ProtectionTab />
        )}
        {activeTab === 'spray' && (
          <SprayCalendarTab crops={filteredCrops} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CROP DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

function CropDashboard({ crops, zone, province }: { crops: Crop[], zone: SoilZone, province: string }) {
  const [filterCat, setFilterCat] = useState<string>('All')
  const categories = ['All', 'Cereal', 'Oilseed', 'Pulse']
  const filtered = crops.filter(c => filterCat === 'All' || c.cat === filterCat)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              filterCat === cat
                ? 'bg-[var(--ag-accent)] text-[var(--ag-accent-text)]'
                : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary hover:border-white/[0.12]'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="text-xs text-ag-muted ml-2">{filtered.length} crops for {province} · {ZONE_LABELS[zone]} zone</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(crop => {
          const zd = getZoneData(crop, zone)
          if (!zd) return null
          return (
            <div key={crop.name} className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5 hover:border-white/[0.12] transition-all duration-200 group">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-ag-primary group-hover:text-white transition-colors">{crop.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold mt-1 inline-block ${CAT_COLORS[crop.cat]}`}>
                    {crop.cat}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[var(--ag-green)]">{zd.rev}</div>
                  <div className="text-[10px] text-ag-muted">gross/ac</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: 'Yield', value: zd.yield },
                  { label: 'Price', value: zd.price },
                  { label: 'BE Price', value: zd.beP, red: true },
                ].map(item => (
                  <div key={item.label} className="bg-[var(--ag-bg-hover)] border border-white/[0.04] rounded-lg p-2 text-center">
                    <div className="text-[10px] text-ag-muted">{item.label}</div>
                    <div className={`text-sm font-semibold ${item.red ? 'text-[var(--ag-red)]' : 'text-ag-primary'}`}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-ag-muted">
                <Droplets size={11} className="text-[var(--ag-blue)]" />
                {zd.N > 0 && <span className="bg-[#38BDF8]/[0.08] text-[var(--ag-blue)] px-1.5 py-0.5 rounded font-medium">N {zd.N}</span>}
                {zd.P > 0 && <span className="bg-[#F59E0B]/[0.08] text-[var(--ag-yellow)] px-1.5 py-0.5 rounded font-medium">P {zd.P}</span>}
                {zd.S > 0 && <span className="bg-[#FBBF24]/[0.08] text-[var(--ag-yellow)] px-1.5 py-0.5 rounded font-medium">S {zd.S}</span>}
                {zd.K > 0 && <span className="bg-[#818CF8]/[0.08] text-[#818CF8] px-1.5 py-0.5 rounded font-medium">K {zd.K}</span>}
                <span className="text-ag-dim">lb/ac</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PLAYBOOK
// ═══════════════════════════════════════════════════════════════════════════════

function Playbook({ crops, zone, province }: { crops: Crop[], zone: SoilZone, province: string }) {
  const [selected, setSelected] = useState<Crop>(crops[0])
  const zd = getZoneData(selected, zone)
  const outlook = COMMODITY_OUTLOOK.find(o => o.crop === selected.name)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Crop Selector */}
      <div className="lg:col-span-1">
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--ag-border)]">
            <h3 className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px]">Select Crop</h3>
          </div>
          <div className="divide-y divide-[var(--ag-border)]">
            {crops.map(crop => (
              <button
                key={crop.name}
                onClick={() => setSelected(crop)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-all ${
                  selected.name === crop.name
                    ? 'bg-[var(--ag-accent)]/[0.06] text-[var(--ag-green)] border-l-2 border-l-[var(--ag-accent)]'
                    : 'text-ag-secondary hover:bg-[var(--ag-bg-hover)] hover:text-ag-primary border-l-2 border-l-transparent'
                }`}
              >
                <span className="text-sm font-medium">{crop.name}</span>
                <ChevronRight size={14} className="text-ag-dim" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crop Detail */}
      <div className="lg:col-span-3 space-y-4">
        {zd && (
          <>
            {/* Header */}
            <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-ag-primary">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${CAT_COLORS[selected.cat]}`}>
                      {selected.cat}
                    </span>
                    <span className="text-xs text-ag-muted">{ZONE_LABELS[zone]} zone · {province}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[var(--ag-green)]">{zd.rev}</div>
                  <div className="text-[10px] text-ag-muted">gross revenue/ac</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Target Yield', value: zd.yield },
                  { label: 'Guide Price', value: zd.price },
                  { label: 'Breakeven Yield', value: zd.beY },
                  { label: 'Breakeven Price', value: zd.beP },
                ].map(item => (
                  <div key={item.label} className="bg-[var(--ag-bg-hover)] border border-white/[0.04] rounded-lg p-3 text-center">
                    <div className="text-[10px] text-ag-muted mb-1">{item.label}</div>
                    <div className="font-bold text-ag-primary">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fertility */}
            <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
              <h3 className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px] mb-3">Fertility Recommendations (lb/ac)</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Nitrogen (N)', value: zd.N, color: '#38BDF8' },
                  { label: 'Phosphorus (P)', value: zd.P, color: '#F59E0B' },
                  { label: 'Sulphur (S)', value: zd.S, color: 'var(--ag-yellow)' },
                  { label: 'Potassium (K)', value: zd.K, color: '#818CF8' },
                ].map(n => (
                  <div key={n.label} className="rounded-xl p-3 text-center border"
                    style={{ background: `${n.color}08`, borderColor: `${n.color}20` }}>
                    <div className="text-2xl font-bold" style={{ color: n.color }}>{n.value}</div>
                    <div className="text-[10px] font-medium mt-1" style={{ color: n.color }}>{n.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation + Spray Timings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-ag-primary mb-2">Rotation Notes</h3>
                <p className="text-sm text-ag-secondary leading-relaxed">{selected.rot}</p>
              </div>
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-ag-primary mb-2">Spray Timings</h3>
                <p className="text-sm text-ag-secondary leading-relaxed">{selected.timings}</p>
              </div>
            </div>

            {/* Insects + Diseases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bug size={14} className="text-[var(--ag-red)]" />
                  <h3 className="text-sm font-semibold text-ag-primary">Key Insects</h3>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selected.insects.map(i => (
                    <span key={i} className="text-[10px] bg-[var(--ag-red-dim)] text-[var(--ag-red)] border border-[var(--ag-red)]/20 px-2 py-0.5 rounded-full font-medium">{i}</span>
                  ))}
                </div>
                <p className="text-xs text-ag-muted leading-relaxed">{selected.wNotes}</p>
              </div>
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-[#818CF8]" />
                  <h3 className="text-sm font-semibold text-ag-primary">Key Diseases</h3>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {selected.diseases.map(d => (
                    <span key={d} className="text-[10px] bg-[#818CF8]/[0.08] text-[#818CF8] border border-[#818CF8]/20 px-2 py-0.5 rounded-full font-medium">{d}</span>
                  ))}
                </div>
                <p className="text-xs text-ag-muted leading-relaxed">{selected.dNotes}</p>
              </div>
            </div>

            {/* Outlook */}
            {outlook && (
              <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={14} className="text-[var(--ag-green)]" />
                  <h3 className="text-sm font-semibold text-ag-primary">5-Year Commodity Outlook</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[var(--ag-bg-hover)] border border-white/[0.04] rounded-lg p-3">
                    <div className="text-[10px] text-ag-muted">10-Year Price Range</div>
                    <div className="font-semibold text-ag-primary mt-1">{outlook.range10yr}</div>
                  </div>
                  <div className="bg-[var(--ag-bg-hover)] border border-white/[0.04] rounded-lg p-3">
                    <div className="text-[10px] text-ag-muted">5-Year Forecast</div>
                    <div className="font-semibold text-ag-primary mt-1">{outlook.forecast5yr}</div>
                  </div>
                  <div className="bg-[var(--ag-bg-hover)] border border-white/[0.04] rounded-lg p-3 text-center">
                    <div className="text-[10px] text-ag-muted">Outlook</div>
                    <div className="text-xl font-bold text-[var(--ag-green)] mt-1">{outlook.direction}</div>
                    <div className="text-xs text-[var(--ag-green)] font-medium">{outlook.rating}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Source */}
            <div className="font-mono text-[10px] text-ag-muted bg-white/[0.02] border border-white/[0.04] rounded-lg px-4 py-2">
              Source: {selected.src}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INPUT COSTS / CROP ECONOMICS
// ═══════════════════════════════════════════════════════════════════════════════

function InputCostsTab({ crops, zone }: { crops: Crop[], zone: SoilZone }) {
  const total = getTotalCosts(DEFAULT_INPUT_COSTS)

  const cropEconomics = crops
    .map(crop => {
      const zd = getZoneData(crop, zone)
      if (!zd) return null
      const yieldNum = parseNumber(zd.yield)
      const revenueNum = parseNumber(zd.rev)
      const bePrice = yieldNum > 0 ? total / yieldNum : 0
      const guidePrice = parseNumber(zd.price)
      const margin = revenueNum - total
      const isPerLb = zd.price.includes('/lb')
      const profitable = isPerLb ? margin >= 0 : guidePrice > bePrice
      return { name: crop.name, cat: crop.cat, rev: revenueNum, yield: zd.yield, price: zd.price, guidePrice, bePrice, margin, profitable }
    })
    .filter(Boolean)
    .sort((a, b) => b!.rev - a!.rev) as {
      name: string; cat: string; rev: number; yield: string;
      price: string; guidePrice: number; bePrice: number; margin: number; profitable: boolean
    }[]

  const top3 = cropEconomics.slice(0, 3)
  const profitableCount = cropEconomics.filter(c => c.profitable).length
  const atRiskCount = cropEconomics.length - profitableCount
  const bestMargin = cropEconomics[0]

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
          <div className="font-mono text-[10px] text-ag-muted font-semibold uppercase tracking-[1.5px] mb-1">Total Cost/Ac</div>
          <div className="text-2xl font-bold text-ag-primary">${total.toFixed(0)}</div>
          <div className="text-[10px] text-ag-dim mt-0.5">Default prairie average</div>
        </div>
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
          <div className="font-mono text-[10px] text-ag-muted font-semibold uppercase tracking-[1.5px] mb-1">Profitable Crops</div>
          <div className="text-2xl font-bold text-[var(--ag-green)]">{profitableCount}</div>
          <div className="text-[10px] text-ag-dim mt-0.5">Above breakeven at guide price</div>
        </div>
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
          <div className="font-mono text-[10px] text-ag-muted font-semibold uppercase tracking-[1.5px] mb-1">At Risk Crops</div>
          <div className="text-2xl font-bold text-[var(--ag-red)]">{atRiskCount}</div>
          <div className="text-[10px] text-ag-dim mt-0.5">Below breakeven at guide price</div>
        </div>
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-4">
          <div className="font-mono text-[10px] text-ag-muted font-semibold uppercase tracking-[1.5px] mb-1">Best Gross Revenue</div>
          <div className="text-2xl font-bold text-[var(--ag-green)]">${bestMargin?.rev.toFixed(0)}/ac</div>
          <div className="text-[10px] text-ag-dim mt-0.5">{bestMargin?.name}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 3 */}
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={14} className="text-[var(--ag-yellow)]" />
            <h3 className="text-sm font-semibold text-ag-primary">Top Crops by Gross Revenue — {ZONE_LABELS[zone]} Zone</h3>
          </div>
          <div className="space-y-3">
            {top3.map((crop, i) => (
              <div key={crop.name} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  i === 0 ? 'bg-[#F59E0B] text-[var(--ag-accent-text)]' : i === 1 ? 'bg-[#94A3B8] text-[var(--ag-accent-text)]' : 'bg-[#B45309] text-white'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-ag-primary">{crop.name}</span>
                    <span className="text-sm font-bold text-[var(--ag-green)]">${crop.rev.toFixed(0)}/ac</span>
                  </div>
                  <div className="w-full bg-[var(--ag-bg-hover)] rounded-full h-1.5">
                    <div className="bg-[var(--ag-accent)] h-1.5 rounded-full transition-all" style={{ width: `${(crop.rev / cropEconomics[0].rev) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Net Margin */}
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-[var(--ag-blue)]" />
            <h3 className="text-sm font-semibold text-ag-primary">Net Margin at Guide Price</h3>
          </div>
          <div className="space-y-2">
            {cropEconomics.slice(0, 6).map(crop => (
              <div key={crop.name} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                <span className="text-sm text-ag-secondary">{crop.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${crop.margin >= 0 ? 'text-[var(--ag-green)]' : 'text-[var(--ag-red)]'}`}>
                    {crop.margin >= 0 ? '+' : ''}${crop.margin.toFixed(0)}/ac
                  </span>
                  {crop.margin >= 0
                    ? <CheckCircle size={12} className="text-[var(--ag-green)]" />
                    : <XCircle size={12} className="text-[var(--ag-red)]" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakeven Table */}
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[var(--ag-yellow)]" />
            <h3 className="text-sm font-semibold text-ag-primary">Breakeven Price Analysis — All Crops</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-border)]">
                  {['Crop', 'Category', 'Target Yield', 'Guide Price', 'Breakeven Price', 'Gross Revenue', 'Net Margin', 'Status'].map(h => (
                    <th key={h} className={`font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1px] px-3 py-2 ${h === 'Status' ? 'text-center' : h === 'Crop' || h === 'Category' ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cropEconomics.map(crop => (
                  <tr key={crop.name} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="px-3 py-2.5 font-medium text-ag-primary">{crop.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${CAT_COLORS[crop.cat]}`}>{crop.cat}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-ag-secondary">{crop.yield}</td>
                    <td className="px-3 py-2.5 text-right text-ag-secondary">{crop.price}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ag-primary">${crop.bePrice.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[var(--ag-green)]">${crop.rev.toFixed(0)}/ac</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${crop.margin >= 0 ? 'text-[var(--ag-green)]' : 'text-[var(--ag-red)]'}`}>
                      {crop.margin >= 0 ? '+' : ''}${crop.margin.toFixed(0)}/ac
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        crop.profitable ? 'bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)]' : 'bg-[var(--ag-red-dim)] text-[var(--ag-red)]'
                      }`}>
                        {crop.profitable ? 'Profitable' : 'At Risk'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-ag-dim mt-3">
            Based on default input costs of ${total.toFixed(0)}/ac. Update your actual costs in Farm Profile for precise breakeven calculations.
          </p>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCOUT
// ═══════════════════════════════════════════════════════════════════════════════

function ScoutTab({ crops }: { crops: Crop[] }) {
  const [fieldOptions, setFieldOptions] = useState<string[]>([])
  const [selectedCrop, setSelectedCrop] = useState<string>('')
  const [selectedType, setSelectedType] = useState<'insects' | 'diseases' | ''>('')
  const [selectedSymptom, setSelectedSymptom] = useState<string>('')
  const [selectedPest, setSelectedPest] = useState<string>('')

  const INSECT_SYMPTOMS = [
    { label: 'Holes / Defoliation', pests: ['Flea Beetles', 'Bertha Armyworm', 'Grasshoppers', 'Diamondback Moth', 'Cutworms'] },
    { label: 'Wilting / Lodging', pests: ['Cutworms', 'Wireworms'] },
    { label: 'Stunted Growth', pests: ['Wireworms', 'Cutworms', 'Aphids', 'Pea aphid'] },
    { label: 'Pod / Head Damage', pests: ['Cabbage Seedpod Weevil', 'Lygus bugs', 'Wheat Midge', 'Bertha Armyworm'] },
    { label: 'Stem Damage', pests: ['Cutworms', 'Sawfly'] },
    { label: 'Leaf Curling / Sticky Residue', pests: ['Aphids', 'Pea aphid'] },
    { label: 'Root Damage', pests: ['Wireworms', 'Cutworms'] },
    { label: 'General Feeding Damage', pests: ['Grasshoppers', 'Armyworms'] },
  ]

  const DISEASE_SYMPTOMS = [
    { label: 'Yellowing / Chlorosis', pests: ['Leaf Diseases (Cereals)', 'Ascochyta / Mycosphaerella'] },
    { label: 'Lesions / Spots on Leaves', pests: ['FHB (Fusarium Head Blight)', 'Leaf Diseases (Cereals)', 'Ascochyta / Mycosphaerella'] },
    { label: 'White / Grey Mould on Stem', pests: ['Sclerotinia Stem Rot'] },
    { label: 'Blackened / Rotted Stem Base', pests: ['Sclerotinia Stem Rot', 'Ascochyta / Mycosphaerella'] },
    { label: 'Head / Spike Discolouration', pests: ['FHB (Fusarium Head Blight)'] },
    { label: 'Root Rot / Damping Off', pests: ['Ascochyta / Mycosphaerella'] },
    { label: 'Premature Ripening', pests: ['Sclerotinia Stem Rot', 'FHB (Fusarium Head Blight)'] },
    { label: 'Powdery Coating on Leaves', pests: ['Leaf Diseases (Cereals)'] },
  ]

  const symptomList = selectedType === 'insects' ? INSECT_SYMPTOMS : selectedType === 'diseases' ? DISEASE_SYMPTOMS : []
  const symptomObj = symptomList.find(s => s.label === selectedSymptom)

  const cropObj = crops.find(c => c.name === selectedCrop)
  const allPestsForCrop = selectedType === 'insects' ? cropObj?.insects ?? [] : cropObj?.diseases ?? []
  const filteredPests = symptomObj
    ? allPestsForCrop.filter(p => symptomObj.pests.some(sp => p.toLowerCase().includes(sp.toLowerCase()) || sp.toLowerCase().includes(p.toLowerCase())))
    : allPestsForCrop

  const sprayData = SPRAY_RATES.filter(sr =>
    sr.pest === selectedPest ||
    sr.pest.toLowerCase().includes(selectedPest.toLowerCase()) ||
    selectedPest.toLowerCase().includes(sr.pest.toLowerCase())
  )

  function reset() {
    setSelectedCrop(''); setSelectedType(''); setSelectedSymptom(''); setSelectedPest('')
  }

  return (
    <div className="space-y-6">
      <ScoutReports crops={crops} />
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
        <h2 className="text-sm font-semibold text-ag-primary mb-1">Pest & Disease Diagnosis</h2>
        <p className="text-xs text-ag-muted mb-5">Work through the steps below to get registered product recommendations with rates.</p>

        {/* Step 1 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-xs font-bold flex items-center justify-center">1</span>
            <label className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[1.5px]">Select Crop</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {crops.map(c => (
              <button key={c.name}
                onClick={() => { setSelectedCrop(c.name); setSelectedType(''); setSelectedSymptom(''); setSelectedPest('') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  selectedCrop === c.name ? 'bg-[var(--ag-accent)] text-[var(--ag-accent-text)]' : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary'
                }`}>{c.name}</button>
            ))}
          </div>
        </div>

        {/* Step 2 */}
        {selectedCrop && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-xs font-bold flex items-center justify-center">2</span>
              <label className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[1.5px]">What Are You Seeing?</label>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setSelectedType('insects'); setSelectedSymptom(''); setSelectedPest('') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === 'insects' ? 'bg-[var(--ag-red)] text-white' : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary'
                }`}>
                <Bug size={14} /> Insect Damage
              </button>
              <button onClick={() => { setSelectedType('diseases'); setSelectedSymptom(''); setSelectedPest('') }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedType === 'diseases' ? 'bg-[#818CF8] text-white' : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary'
                }`}>
                <Leaf size={14} /> Disease Symptoms
              </button>
            </div>
          </div>
        )}

        {/* Step 3 */}
        {selectedType && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-xs font-bold flex items-center justify-center">3</span>
              <label className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[1.5px]">Symptoms Observed</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptomList.map(s => (
                <button key={s.label}
                  onClick={() => { setSelectedSymptom(s.label); setSelectedPest('') }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedSymptom === s.label
                      ? selectedType === 'insects' ? 'bg-[var(--ag-red)] text-white' : 'bg-[#818CF8] text-white'
                      : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 */}
        {selectedSymptom && filteredPests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-xs font-bold flex items-center justify-center">4</span>
              <label className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[1.5px]">Identify the Problem</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredPests.map(pest => (
                <button key={pest} onClick={() => setSelectedPest(pest)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedPest === pest
                      ? selectedType === 'insects' ? 'bg-[var(--ag-red)] text-white' : 'bg-[#818CF8] text-white'
                      : 'bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] text-ag-muted hover:text-ag-primary'
                  }`}>{pest}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {selectedPest && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ag-primary">Recommended Products — {selectedPest}</h3>
            <button onClick={reset} className="text-xs text-ag-muted hover:text-ag-primary underline transition-colors">Start over</button>
          </div>

          {sprayData.length > 0 ? sprayData.map(sr => (
            <div key={sr.pest} className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--ag-border)]">
                <span className="font-medium text-ag-primary">{sr.pest}</span>
                <span className="text-xs text-ag-muted ml-2">· {sr.crop}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--ag-border)]">
                    {['Product', 'Rate', 'Group', 'Notes'].map(h => (
                      <th key={h} className="text-left px-4 py-2 font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sr.products.map((p, i) => (
                    <tr key={i} className="border-b border-white/[0.03] last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-ag-primary">{p.name}</td>
                      <td className="px-4 py-2.5 text-[var(--ag-green)] font-semibold">{p.rate}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] px-2 py-0.5 rounded font-medium text-ag-secondary">{p.grp}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ag-muted">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-white/[0.04] bg-white/[0.02]">
                <p className="text-[10px] text-ag-dim">Source: {sr.src}</p>
              </div>
            </div>
          )) : (
            <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-6 text-center">
              <p className="text-ag-muted text-sm">No specific product data found for {selectedPest}.</p>
              <p className="text-xs text-ag-dim mt-1">Ask Lily for guidance on this pest.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════

function ProtectionTab() {
  return (
    <div className="space-y-4">
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--ag-border)]">
          <h2 className="font-semibold text-ag-primary">5-Pass Herbicide Timing System</h2>
          <p className="text-xs text-ag-muted mt-0.5">Standard prairie spray program — apply each pass at the right timing window</p>
        </div>
        <div className="divide-y divide-[var(--ag-border)]">
          {HERBICIDE_PASSES.map((pass) => (
            <div key={pass.pass} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--ag-accent)] text-[var(--ag-accent-text)] flex items-center justify-center text-sm font-bold">
                  {pass.pass}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="font-semibold text-ag-primary">{pass.label}</h3>
                    <span className="text-[10px] bg-[#F59E0B]/[0.08] text-[var(--ag-yellow)] border border-[var(--ag-yellow)/0.2] px-2 py-0.5 rounded-full font-semibold">
                      {pass.timing}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {[
                      { label: 'Products', value: pass.products },
                      { label: 'Target Weeds', value: pass.targetWeeds },
                      { label: 'Crops', value: pass.crops },
                    ].map(item => (
                      <div key={item.label}>
                        <span className="font-mono text-[9px] font-semibold text-ag-muted uppercase tracking-[1.5px] block mb-1">{item.label}</span>
                        <span className="text-ag-secondary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-start gap-2 text-xs text-ag-muted bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2">
                    <Lightbulb size={12} className="text-[var(--ag-yellow)] mt-0.5 flex-shrink-0" />
                    <span>{pass.notes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SPRAY CALENDAR
// ═══════════════════════════════════════════════════════════════════════════════

function SprayCalendarTab({ crops }: { crops: Crop[] }) {
  const { user } = useUser()
  const [seedingLog, setSeedingLog] = useState<{
    id: string; crop: string; seeding_date: string; acres: number; field_name: string; notes: string
  }[]>([])
  const [form, setForm] = useState({ crop: crops[0]?.name ?? '', seeding_date: '', acres: '', field_name: '', notes: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLog() }, [user?.id])

  async function fetchLog() {
    try {
      const res = await fetch('/api/agronomy/seeding', { headers: { 'x-user-id': user?.id || '' } })
      const json = await res.json()
      if (json.success) setSeedingLog(json.records)
    } catch { console.error('Failed to fetch seeding log') }
  }

  async function addEntry() {
    if (!form.crop || !form.seeding_date) return
    setSaving(true)
    try {
      await fetch('/api/agronomy/seeding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ ...form, acres: parseFloat(form.acres) || null }),
      })
      setForm({ crop: crops[0]?.name ?? '', seeding_date: '', acres: '', field_name: '', notes: '' })
      fetchLog()
    } catch { console.error('Failed to save') }
    finally { setSaving(false) }
  }

  async function deleteEntry(id: string) {
    try {
      await fetch('/api/agronomy/seeding', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
        body: JSON.stringify({ id }),
      })
      fetchLog()
    } catch { console.error('Failed to delete') }
  }

  function getWindowStatus(seedingDate: string) {
    const seeded = new Date(seedingDate)
    const today = new Date()
    const daysIn = Math.floor((today.getTime() - seeded.getTime()) / (1000 * 60 * 60 * 24))
    if (daysIn < 0) return { label: 'Not Yet Seeded', color: 'text-ag-muted', bg: 'bg-[var(--ag-bg-hover)]', urgent: false }
    if (daysIn <= 7) return { label: 'Pre-Seed / Just Seeded', color: 'text-[var(--ag-yellow)]', bg: 'bg-[var(--ag-yellow)/0.06]', urgent: false }
    if (daysIn <= 21) return { label: 'Early Scout Window', color: 'text-[var(--ag-blue)]', bg: 'bg-[#38BDF8]/[0.06]', urgent: true }
    if (daysIn <= 42) return { label: 'In-Crop Spray Window', color: 'text-[var(--ag-green)]', bg: 'bg-[var(--ag-accent)]/[0.06]', urgent: true }
    if (daysIn <= 70) return { label: 'Fungicide Window', color: 'text-[#818CF8]', bg: 'bg-[#818CF8]/[0.06]', urgent: true }
    if (daysIn <= 100) return { label: 'Pre-Harvest Window', color: 'text-[#F97316]', bg: 'bg-[#F97316]/[0.06]', urgent: true }
    if (daysIn <= 120) return { label: 'Harvest Approaching', color: 'text-[var(--ag-red)]', bg: 'bg-[var(--ag-red)]/[0.06]', urgent: true }
    return { label: 'Season Complete', color: 'text-ag-muted', bg: 'bg-[var(--ag-bg-hover)]', urgent: false }
  }

  return (
    <div className="space-y-6">
      {/* Seeding Log Entry */}
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl p-5">
        <h3 className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px] mb-4">Log Seeded Crop</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-[10px] text-ag-muted font-semibold block mb-1 uppercase tracking-[1px]">Crop</label>
            <select value={form.crop} onChange={e => setForm(p => ({ ...p, crop: e.target.value }))} className={inputClass + " bg-[var(--ag-bg-card)]"}>
              {crops.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-ag-muted font-semibold block mb-1 uppercase tracking-[1px]">Seeding Date</label>
            <input type="date" value={form.seeding_date} onChange={e => setForm(p => ({ ...p, seeding_date: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-ag-muted font-semibold block mb-1 uppercase tracking-[1px]">Acres</label>
            <input type="number" placeholder="e.g. 320" value={form.acres} onChange={e => setForm(p => ({ ...p, acres: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-ag-muted font-semibold block mb-1 uppercase tracking-[1px]">Field Name</label>
            <input type="text" placeholder="e.g. North Quarter" value={form.field_name} onChange={e => setForm(p => ({ ...p, field_name: e.target.value }))} className={inputClass} />
          </div>
          <div>
            <label className="text-[10px] text-ag-muted font-semibold block mb-1 uppercase tracking-[1px]">Notes</label>
            <input type="text" placeholder="Optional" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputClass} />
          </div>
          <div className="flex items-end">
            <button onClick={addEntry} disabled={saving || !form.seeding_date}
              className="w-full px-4 py-2 bg-[var(--ag-accent)] text-[var(--ag-accent-text)] text-sm font-semibold rounded-lg hover:bg-[var(--ag-accent-hover)] disabled:opacity-40 transition-colors">
              {saving ? 'Saving...' : 'Log Crop'}
            </button>
          </div>
        </div>
      </div>

      {/* Active Windows */}
      {seedingLog.length > 0 && (
        <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--ag-border)]">
            <h3 className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px]">Active Crop Windows</h3>
            <p className="text-[10px] text-ag-dim mt-0.5">Based on days since seeding — reminders appear on your Overview dashboard</p>
          </div>
          <div className="divide-y divide-[var(--ag-border)]">
            {seedingLog.map(entry => {
              const status = getWindowStatus(entry.seeding_date)
              const seeded = new Date(entry.seeding_date)
              const daysIn = Math.floor((new Date().getTime() - seeded.getTime()) / (1000 * 60 * 60 * 24))
              return (
                <div key={entry.id} className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap hover:bg-white/[0.02] transition-colors">
                  <div>
                    <div className="font-medium text-ag-primary">{entry.crop}</div>
                    <div className="text-[10px] text-ag-muted mt-0.5">
                      Seeded {new Date(entry.seeding_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {entry.field_name && ` · ${entry.field_name}`}
                      {entry.acres && ` · ${entry.acres} ac`}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg ${status.bg} ${status.color}`}>
                      Day {daysIn} — {status.label}
                    </div>
                    <button onClick={() => deleteEntry(entry.id)} className="text-xs text-[var(--ag-red)]/60 hover:text-[var(--ag-red)] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Spray Calendar */}
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--ag-border)]">
          <h2 className="font-semibold text-ag-primary">Seasonal Spray Calendar</h2>
          <p className="text-[10px] text-ag-dim mt-0.5">
            {seedingLog.length > 0
              ? 'Showing actual spray windows based on your logged seeding dates'
              : 'Log a seeded crop above to see personalized windows — showing guide defaults below'}
          </p>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-b border-white/[0.04] flex flex-wrap gap-4">
          {[
            { color: 'bg-[#F59E0B]', label: 'Pre-Seed Burnoff' },
            { color: 'bg-[#38BDF8]', label: 'Pre-Emergence' },
            { color: 'bg-[var(--ag-accent)]', label: 'In-Crop Herbicide' },
            { color: 'bg-[#818CF8]', label: 'Fungicide' },
            { color: 'bg-[#F97316]', label: 'Pre-Harvest' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded ${item.color}`} />
              <span className="text-[10px] text-ag-muted">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto">
          {seedingLog.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-border)]">
                  {['Crop / Field', 'Seeded', 'Pre-Seed Burnoff', 'Pre-Emergence', 'In-Crop Herbicide', 'Fungicide', 'Pre-Harvest'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {seedingLog.map(entry => {
                  const seeded = new Date(entry.seeding_date)
                  const today = new Date()

                  function addDays(d: Date, n: number) {
                    const r = new Date(d); r.setDate(r.getDate() + n)
                    return r.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                  }

                  function isActive(startDay: number, endDay: number) {
                    const daysIn = Math.floor((today.getTime() - seeded.getTime()) / (1000 * 60 * 60 * 24))
                    return daysIn >= startDay && daysIn <= endDay
                  }

                  const windows = [
                    { label: `${addDays(seeded, -3)} – ${addDays(seeded, 0)}`, color: 'bg-[#F59E0B]/[0.08] text-[var(--ag-yellow)] border-[var(--ag-yellow)/0.2]', active: isActive(-3, 0) },
                    { label: `${addDays(seeded, 1)} – ${addDays(seeded, 7)}`, color: 'bg-[#38BDF8]/[0.08] text-[var(--ag-blue)] border-[#38BDF8]/20', active: isActive(1, 7) },
                    { label: `${addDays(seeded, 21)} – ${addDays(seeded, 42)}`, color: 'bg-[var(--ag-accent)]/[0.08] text-[var(--ag-green)] border-[var(--ag-accent-border)]', active: isActive(21, 42) },
                    { label: `${addDays(seeded, 42)} – ${addDays(seeded, 70)}`, color: 'bg-[#818CF8]/[0.08] text-[#818CF8] border-[#818CF8]/20', active: isActive(42, 70) },
                    { label: `${addDays(seeded, 90)} – ${addDays(seeded, 110)}`, color: 'bg-[#F97316]/[0.08] text-[#F97316] border-[#F97316]/20', active: isActive(90, 110) },
                  ]

                  return (
                    <tr key={entry.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ag-primary">{entry.crop}</div>
                        {entry.field_name && <div className="text-[10px] text-ag-muted">{entry.field_name}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-ag-muted">
                        {seeded.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      </td>
                      {windows.map((w, i) => (
                        <td key={i} className="px-3 py-3">
                          <span className={`text-[10px] px-2 py-1 rounded-lg border font-semibold inline-block ${w.color} ${w.active ? 'ring-1 ring-current ring-offset-1 ring-offset-[var(--ag-bg-card)]' : ''}`}>
                            {w.label}
                            {w.active && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-current" />}
                          </span>
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-border)]">
                  <th className="text-left px-5 py-3 font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1px] w-40">Crop</th>
                  {['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'].map(m => (
                    <th key={m} className="text-center px-2 py-3 font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1px]">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crops.map(crop => {
                  const timingStr = crop.timings
                  return (
                    <tr key={crop.name} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3 font-medium text-ag-primary">{crop.name}</td>
                      {[0,1,2,3,4,5,6].map(mi => {
                        const bars: string[] = []
                        if (mi === 0 && timingStr.includes('Pre-seed')) bars.push('bg-[#F59E0B]')
                        if (mi === 1 && timingStr.includes('Soil')) bars.push('bg-[#38BDF8]')
                        if ((mi === 2 || mi === 3) && timingStr.includes('In-crop')) bars.push('bg-[var(--ag-accent)]')
                        if ((mi === 3 || mi === 4)) bars.push('bg-[#818CF8]')
                        if ((mi === 5 || mi === 6) && (timingStr.includes('Pre-harv') || timingStr.includes('Desiccation'))) bars.push('bg-[#F97316]')
                        return (
                          <td key={mi} className="px-2 py-3 text-center">
                            <div className="flex flex-col gap-0.5 items-center">
                              {bars.map((color, bi) => (
                                <div key={bi} className={`h-2 w-6 rounded-full ${color} opacity-70`} />
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}