'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Sprout, BookOpen, DollarSign, Search, Shield, Calendar, ChevronRight
} from 'lucide-react'
import {
  CROPS, SPRAY_RATES, HERBICIDE_PASSES, DEFAULT_INPUT_COSTS,
  COMMODITY_OUTLOOK, ZONES_BY_PROVINCE, ZONE_LABELS, PROV_SOURCES,
  getZoneData, getTotalCosts, getTotalVariableCosts, getTotalFixedCosts,
  parseNumber, VARIABLE_COST_KEYS, FIXED_COST_KEYS, VARIABLE_COST_LABELS,
  type InputCosts, type SoilZone, type Crop,
} from '@/lib/agronomy-data'

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
  Cereal: 'bg-amber-50 text-amber-700 border-amber-200',
  Oilseed: 'bg-green-50 text-green-700 border-green-200',
  Pulse: 'bg-blue-50 text-blue-700 border-blue-200',
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AgronomyPage() {
  const { user } = useUser()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [province, setProvince] = useState('SK')
  const [zone, setZone] = useState<SoilZone>('Black')
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Pull province + soil zone from Farm Profile automatically
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
    SK: 'SK', AB: 'AB', MB: 'MB',
  }
  setProvince(provMap[json.profile.province] ?? 'SK')
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
    <div className="min-h-screen bg-[#F9FAF8] flex items-center justify-center">
      <div className="text-[#7A8A7C] text-sm animate-pulse">Loading agronomy data...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9FAF8] text-[#222527]">

      {/* Page Header */}
      <div className="bg-white border-b border-[#E4E7E0] px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#222527]">Agronomy</h1>
            <p className="text-sm text-[#7A8A7C] mt-0.5">
              Crop planning, scouting, protection & spray management
            </p>
          </div>

          {/* Province + Zone Selectors */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#7A8A7C]">Province</label>
              <select
                value={province}
                onChange={e => {
                  setProvince(e.target.value)
                  const zones = ZONES_BY_PROVINCE[e.target.value]
                  if (zones && !zones.includes(zone)) setZone(zones[0])
                }}
                className="text-sm border border-[#E4E7E0] rounded-lg px-3 py-1.5 bg-white text-[#222527] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30"
              >
                {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-[#7A8A7C]">Soil Zone</label>
              <select
                value={zone}
                onChange={e => setZone(e.target.value as SoilZone)}
                className="text-sm border border-[#E4E7E0] rounded-lg px-3 py-1.5 bg-white text-[#222527] focus:outline-none focus:ring-2 focus:ring-[#4A7C59]/30"
              >
                {availableZones.map(z => (
                  <option key={z} value={z}>{ZONE_LABELS[z]}</option>
                ))}
              </select>
            </div>

            {/* Source Badge */}
            <div className="text-xs text-[#7A8A7C] bg-[#F5F5F3] border border-[#E4E7E0] px-3 py-1.5 rounded-lg hidden md:block">
              Source: {sources.crop}
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex gap-1 mt-4 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#4A7C59] text-white'
                    : 'text-[#7A8A7C] hover:text-[#222527] hover:bg-[#F5F5F3]'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
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

// ─── Crop Dashboard ────────────────────────────────────────────────────────────

function CropDashboard({ crops, zone, province }: { crops: Crop[], zone: SoilZone, province: string }) {
  const [filterCat, setFilterCat] = useState<string>('All')
  const categories = ['All', 'Cereal', 'Oilseed', 'Pulse']

  const filtered = crops.filter(c => filterCat === 'All' || c.cat === filterCat)

  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterCat === cat
                ? 'bg-[#4A7C59] text-white'
                : 'bg-white border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
            }`}
          >
            {cat}
          </button>
        ))}
        <span className="text-xs text-[#7A8A7C] ml-2">{filtered.length} crops for {province} · {ZONE_LABELS[zone]} zone</span>
      </div>

      {/* Crop Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(crop => {
          const zd = getZoneData(crop, zone)
          if (!zd) return null
          return (
            <div key={crop.name} className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#222527]">{crop.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[crop.cat]}`}>
                    {crop.cat}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#4A7C59]">{zd.rev}</div>
                  <div className="text-xs text-[#7A8A7C]">gross/ac</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-[#F9FAF8] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7A8A7C]">Yield</div>
                  <div className="text-sm font-semibold text-[#222527]">{zd.yield}</div>
                </div>
                <div className="bg-[#F9FAF8] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7A8A7C]">Price</div>
                  <div className="text-sm font-semibold text-[#222527]">{zd.price}</div>
                </div>
                <div className="bg-[#F9FAF8] rounded-lg p-2 text-center">
                  <div className="text-xs text-[#7A8A7C]">BE Price</div>
                  <div className="text-sm font-semibold text-red-500">{zd.beP}</div>
                </div>
              </div>

              {/* Nutrient Bar */}
              <div className="flex items-center gap-2 text-xs text-[#7A8A7C]">
                <span className="font-medium">Fertility:</span>
                {zd.N > 0 && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">N {zd.N}</span>}
                {zd.P > 0 && <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">P {zd.P}</span>}
                {zd.S > 0 && <span className="bg-yellow-50 text-yellow-700 px-1.5 py-0.5 rounded">S {zd.S}</span>}
                {zd.K > 0 && <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">K {zd.K}</span>}
                <span className="text-[#7A8A7C]">lb/ac</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Playbook ─────────────────────────────────────────────────────────────────

function Playbook({ crops, zone, province }: { crops: Crop[], zone: SoilZone, province: string }) {
  const [selected, setSelected] = useState<Crop>(crops[0])
  const zd = getZoneData(selected, zone)
  const outlook = COMMODITY_OUTLOOK.find(o => o.crop === selected.name)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Crop Selector */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E7E0]">
            <h3 className="text-sm font-semibold text-[#222527]">Select Crop</h3>
          </div>
          <div className="divide-y divide-[#E4E7E0]">
            {crops.map(crop => (
              <button
                key={crop.name}
                onClick={() => setSelected(crop)}
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors ${
                  selected.name === crop.name
                    ? 'bg-[#4A7C59]/5 text-[#4A7C59]'
                    : 'text-[#222527] hover:bg-[#F9FAF8]'
                }`}
              >
                <span className="text-sm font-medium">{crop.name}</span>
                <ChevronRight size={14} className="text-[#7A8A7C]" />
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
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-[#222527]">{selected.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[selected.cat]}`}>
                      {selected.cat}
                    </span>
                    <span className="text-xs text-[#7A8A7C]">{ZONE_LABELS[zone]} zone · {province}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-[#4A7C59]">{zd.rev}</div>
                  <div className="text-xs text-[#7A8A7C]">gross revenue/ac</div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                  { label: 'Target Yield', value: zd.yield },
                  { label: 'Guide Price', value: zd.price },
                  { label: 'Breakeven Yield', value: zd.beY },
                  { label: 'Breakeven Price', value: zd.beP },
                ].map(item => (
                  <div key={item.label} className="bg-[#F9FAF8] rounded-lg p-3 text-center">
                    <div className="text-xs text-[#7A8A7C] mb-1">{item.label}</div>
                    <div className="font-bold text-[#222527]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fertility */}
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-[#222527] mb-3">Fertility Recommendations (lb/ac)</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Nitrogen (N)', value: zd.N, color: 'bg-blue-50 text-blue-700 border-blue-200' },
                  { label: 'Phosphorus (P)', value: zd.P, color: 'bg-orange-50 text-orange-700 border-orange-200' },
                  { label: 'Sulphur (S)', value: zd.S, color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
                  { label: 'Potassium (K)', value: zd.K, color: 'bg-purple-50 text-purple-700 border-purple-200' },
                ].map(n => (
                  <div key={n.label} className={`rounded-xl p-3 text-center border ${n.color}`}>
                    <div className="text-2xl font-bold">{n.value}</div>
                    <div className="text-xs font-medium mt-1">{n.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rotation + Pests + Diseases */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#222527] mb-2">Rotation Notes</h3>
                <p className="text-sm text-[#7A8A7C]">{selected.rot}</p>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#222527] mb-2">Spray Timings</h3>
                <p className="text-sm text-[#7A8A7C]">{selected.timings}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#222527] mb-2">Key Insects</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.insects.map(i => (
                    <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{i}</span>
                  ))}
                </div>
                <p className="text-xs text-[#7A8A7C] mt-2">{selected.wNotes}</p>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#222527] mb-2">Key Diseases</h3>
                <div className="flex flex-wrap gap-1">
                  {selected.diseases.map(d => (
                    <span key={d} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">{d}</span>
                  ))}
                </div>
                <p className="text-xs text-[#7A8A7C] mt-2">{selected.dNotes}</p>
              </div>
            </div>

            {/* Outlook */}
            {outlook && (
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-[#222527] mb-3">5-Year Commodity Outlook</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#F9FAF8] rounded-lg p-3">
                    <div className="text-xs text-[#7A8A7C]">10-Year Price Range</div>
                    <div className="font-semibold text-[#222527] mt-1">{outlook.range10yr}</div>
                  </div>
                  <div className="bg-[#F9FAF8] rounded-lg p-3">
                    <div className="text-xs text-[#7A8A7C]">5-Year Forecast</div>
                    <div className="font-semibold text-[#222527] mt-1">{outlook.forecast5yr}</div>
                  </div>
                  <div className="bg-[#F9FAF8] rounded-lg p-3 text-center">
                    <div className="text-xs text-[#7A8A7C]">Outlook</div>
                    <div className="text-xl font-bold text-[#4A7C59] mt-1">{outlook.direction}</div>
                    <div className="text-xs text-[#4A7C59] font-medium">{outlook.rating}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Source */}
            <div className="text-xs text-[#7A8A7C] bg-[#F9FAF8] border border-[#E4E7E0] rounded-lg px-4 py-2">
              Source: {selected.src}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Input Costs ──────────────────────────────────────────────────────────────

function InputCostsTab({ crops, zone }: { crops: Crop[], zone: SoilZone }) {
  const total = getTotalCosts(DEFAULT_INPUT_COSTS)

  // Build ranked crop data
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
      return {
        name: crop.name,
        cat: crop.cat,
        rev: revenueNum,
        yield: zd.yield,
        price: zd.price,
        guidePrice,
        bePrice,
        margin,
        profitable,
      }
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

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-[#7A8A7C] font-medium uppercase tracking-wide mb-1">Total Cost/Ac</div>
          <div className="text-2xl font-bold text-[#222527]">${total.toFixed(0)}</div>
          <div className="text-xs text-[#7A8A7C] mt-0.5">Default prairie average</div>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-[#7A8A7C] font-medium uppercase tracking-wide mb-1">Profitable Crops</div>
          <div className="text-2xl font-bold text-emerald-600">{profitableCount}</div>
          <div className="text-xs text-[#7A8A7C] mt-0.5">Above breakeven at guide price</div>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-[#7A8A7C] font-medium uppercase tracking-wide mb-1">At Risk Crops</div>
          <div className="text-2xl font-bold text-red-500">{atRiskCount}</div>
          <div className="text-xs text-[#7A8A7C] mt-0.5">Below breakeven at guide price</div>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
          <div className="text-xs text-[#7A8A7C] font-medium uppercase tracking-wide mb-1">Best Gross Revenue</div>
          <div className="text-2xl font-bold text-[#4A7C59]">${bestMargin?.rev.toFixed(0)}/ac</div>
          <div className="text-xs text-[#7A8A7C] mt-0.5">{bestMargin?.name}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top 3 Crops by Revenue */}
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#222527] mb-4">
            🏆 Top Crops by Gross Revenue — {ZONE_LABELS[zone]} Zone
          </h3>
          <div className="space-y-3">
            {top3.map((crop, i) => (
              <div key={crop.name} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-slate-400' : 'bg-amber-600'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[#222527]">{crop.name}</span>
                    <span className="text-sm font-bold text-[#4A7C59]">${crop.rev.toFixed(0)}/ac</span>
                  </div>
                  <div className="w-full bg-[#F9FAF8] rounded-full h-1.5">
                    <div
                      className="bg-[#4A7C59] h-1.5 rounded-full"
                      style={{ width: `${(crop.rev / cropEconomics[0].rev) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Margin vs Cost */}
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#222527] mb-4">
            📊 Net Margin at Guide Price
          </h3>
          <div className="space-y-2">
            {cropEconomics.slice(0, 6).map(crop => (
              <div key={crop.name} className="flex items-center justify-between py-1.5 border-b border-[#E4E7E0]/50 last:border-0">
                <span className="text-sm text-[#222527]">{crop.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${crop.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {crop.margin >= 0 ? '+' : ''}${crop.margin.toFixed(0)}/ac
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    crop.margin >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {crop.margin >= 0 ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakeven by Crop — full list */}
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-semibold text-[#222527] mb-4">
            🎯 Breakeven Price Analysis — All Crops
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7E0] text-xs text-[#7A8A7C]">
                  <th className="text-left px-3 py-2 font-medium">Crop</th>
                  <th className="text-left px-3 py-2 font-medium">Category</th>
                  <th className="text-right px-3 py-2 font-medium">Target Yield</th>
                  <th className="text-right px-3 py-2 font-medium">Guide Price</th>
                  <th className="text-right px-3 py-2 font-medium">Breakeven Price</th>
                  <th className="text-right px-3 py-2 font-medium">Gross Revenue</th>
                  <th className="text-right px-3 py-2 font-medium">Net Margin</th>
                  <th className="text-center px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {cropEconomics.map(crop => (
                  <tr key={crop.name} className="border-b border-[#E4E7E0]/50 last:border-0 hover:bg-[#F9FAF8]">
                    <td className="px-3 py-2.5 font-medium text-[#222527]">{crop.name}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${CAT_COLORS[crop.cat]}`}>
                        {crop.cat}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[#222527]">{crop.yield}</td>
                    <td className="px-3 py-2.5 text-right text-[#222527]">{crop.price}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#222527]">
                      ${crop.bePrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#4A7C59]">
                      ${crop.rev.toFixed(0)}/ac
                    </td>
                    <td className={`px-3 py-2.5 text-right font-bold ${crop.margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {crop.margin >= 0 ? '+' : ''}${crop.margin.toFixed(0)}/ac
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        crop.profitable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {crop.profitable ? 'Profitable' : 'At Risk'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#7A8A7C] mt-3">
            Based on default input costs of ${total.toFixed(0)}/ac. Update your actual costs in Farm Profile for precise breakeven calculations.
          </p>
        </div>

      </div>
    </div>
  )
}

// ─── Scout ────────────────────────────────────────────────────────────────────

function ScoutTab({ crops }: { crops: Crop[] }) {
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
    setSelectedCrop('')
    setSelectedType('')
    setSelectedSymptom('')
    setSelectedPest('')
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[#222527] mb-1">Pest & Disease Diagnosis</h2>
        <p className="text-xs text-[#7A8A7C] mb-5">
          Work through the steps below to get registered product recommendations with rates.
        </p>

        {/* Step 1 — Crop */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-[#4A7C59] text-white text-xs font-bold flex items-center justify-center">1</span>
            <label className="text-xs font-semibold text-[#222527] uppercase tracking-wide">Select Crop</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {crops.map(c => (
              <button
                key={c.name}
                onClick={() => { setSelectedCrop(c.name); setSelectedType(''); setSelectedSymptom(''); setSelectedPest('') }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedCrop === c.name
                    ? 'bg-[#4A7C59] text-white'
                    : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Type */}
        {selectedCrop && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#4A7C59] text-white text-xs font-bold flex items-center justify-center">2</span>
              <label className="text-xs font-semibold text-[#222527] uppercase tracking-wide">What Are You Seeing?</label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSelectedType('insects'); setSelectedSymptom(''); setSelectedPest('') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === 'insects'
                    ? 'bg-red-500 text-white'
                    : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
                }`}
              >
                🐛 Insect Damage
              </button>
              <button
                onClick={() => { setSelectedType('diseases'); setSelectedSymptom(''); setSelectedPest('') }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedType === 'diseases'
                    ? 'bg-purple-500 text-white'
                    : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
                }`}
              >
                🍂 Disease Symptoms
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Symptoms Observed */}
        {selectedType && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#4A7C59] text-white text-xs font-bold flex items-center justify-center">3</span>
              <label className="text-xs font-semibold text-[#222527] uppercase tracking-wide">Symptoms Observed</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptomList.map(s => (
                <button
                  key={s.label}
                  onClick={() => { setSelectedSymptom(s.label); setSelectedPest('') }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSymptom === s.label
                      ? selectedType === 'insects' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'
                      : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Identify Pest */}
        {selectedSymptom && filteredPests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#4A7C59] text-white text-xs font-bold flex items-center justify-center">4</span>
              <label className="text-xs font-semibold text-[#222527] uppercase tracking-wide">Identify the Problem</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredPests.map(pest => (
                <button
                  key={pest}
                  onClick={() => setSelectedPest(pest)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedPest === pest
                      ? selectedType === 'insects' ? 'bg-red-500 text-white' : 'bg-purple-500 text-white'
                      : 'bg-[#F9FAF8] border border-[#E4E7E0] text-[#7A8A7C] hover:text-[#222527]'
                  }`}
                >
                  {pest}
                </button>
              ))}
            </div>
            {filteredPests.length === 0 && (
              <p className="text-xs text-[#7A8A7C]">No matching pests found for this symptom on {selectedCrop}. Ask Lily for guidance.</p>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {selectedPest && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#222527]">Recommended Products — {selectedPest}</h3>
            <button onClick={reset} className="text-xs text-[#7A8A7C] hover:text-[#222527] underline">Start over</button>
          </div>

          {sprayData.length > 0 ? sprayData.map(sr => (
            <div key={sr.pest} className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#E4E7E0]">
                <span className="font-medium text-[#222527]">{sr.pest}</span>
                <span className="text-xs text-[#7A8A7C] ml-2">· {sr.crop}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E4E7E0] text-xs text-[#7A8A7C]">
                    <th className="text-left px-4 py-2 font-medium">Product</th>
                    <th className="text-left px-4 py-2 font-medium">Rate</th>
                    <th className="text-left px-4 py-2 font-medium">Group</th>
                    <th className="text-left px-4 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sr.products.map((p, i) => (
                    <tr key={i} className="border-b border-[#E4E7E0]/50 last:border-0 hover:bg-[#F9FAF8]">
                      <td className="px-4 py-2.5 font-medium text-[#222527]">{p.name}</td>
                      <td className="px-4 py-2.5 text-[#4A7C59] font-semibold">{p.rate}</td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs bg-[#F5F5F3] border border-[#E4E7E0] px-2 py-0.5 rounded font-medium text-[#7A8A7C]">
                          {p.grp}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-[#7A8A7C]">{p.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 bg-[#F9FAF8] border-t border-[#E4E7E0]">
                <p className="text-xs text-[#7A8A7C]">Source: {sr.src}</p>
              </div>
            </div>
          )) : (
            <div className="bg-white border border-[#E4E7E0] rounded-xl p-6 text-center">
              <p className="text-[#7A8A7C] text-sm">No specific product data found for {selectedPest}.</p>
              <p className="text-xs text-[#7A8A7C] mt-1">Ask Lily for guidance on this pest.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Protection ───────────────────────────────────────────────────────────────

function ProtectionTab() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E7E0]">
          <h2 className="font-semibold text-[#222527]">5-Pass Herbicide Timing System</h2>
          <p className="text-xs text-[#7A8A7C] mt-0.5">
            Standard prairie spray program — apply each pass at the right timing window
          </p>
        </div>
        <div className="divide-y divide-[#E4E7E0]">
          {HERBICIDE_PASSES.map((pass, i) => (
            <div key={pass.pass} className="p-5">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4A7C59] text-white flex items-center justify-center text-sm font-bold">
                  {pass.pass}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <h3 className="font-semibold text-[#222527]">{pass.label}</h3>
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      {pass.timing}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-xs font-medium text-[#7A8A7C] uppercase tracking-wide block mb-1">Products</span>
                      <span className="text-[#222527]">{pass.products}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#7A8A7C] uppercase tracking-wide block mb-1">Target Weeds</span>
                      <span className="text-[#222527]">{pass.targetWeeds}</span>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-[#7A8A7C] uppercase tracking-wide block mb-1">Crops</span>
                      <span className="text-[#222527]">{pass.crops}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-[#7A8A7C] bg-[#F9FAF8] border border-[#E4E7E0] rounded-lg px-3 py-2">
                    💡 {pass.notes}
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

// ─── Spray Calendar ───────────────────────────────────────────────────────────

function SprayCalendarTab({ crops }: { crops: Crop[] }) {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']

  const TIMING_WINDOWS: Record<string, { start: number; end: number; color: string }[]> = {
    'Pre-seed': [{ start: 0, end: 1, color: 'bg-amber-400' }],
    'Soil': [{ start: 1, end: 2, color: 'bg-blue-400' }],
    'In-crop': [{ start: 2, end: 4, color: 'bg-[#4A7C59]' }],
    'In-crop ×2': [{ start: 2, end: 4, color: 'bg-[#4A7C59]' }],
    'Fungicide': [{ start: 3, end: 5, color: 'bg-purple-400' }],
    'Pre-harv': [{ start: 5, end: 6, color: 'bg-orange-400' }],
    'Desiccation': [{ start: 5, end: 6, color: 'bg-orange-400' }],
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-[#E4E7E0]">
          <h2 className="font-semibold text-[#222527]">Seasonal Spray Calendar</h2>
          <p className="text-xs text-[#7A8A7C] mt-0.5">Approximate spray timing windows by crop</p>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-b border-[#E4E7E0] flex flex-wrap gap-3">
          {[
            { color: 'bg-amber-400', label: 'Pre-Seed Burnoff' },
            { color: 'bg-blue-400', label: 'Pre-Emergence (Soil)' },
            { color: 'bg-[#4A7C59]', label: 'In-Crop Herbicide' },
            { color: 'bg-purple-400', label: 'Fungicide' },
            { color: 'bg-orange-400', label: 'Pre-Harvest / Desiccation' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${item.color}`}></div>
              <span className="text-xs text-[#7A8A7C]">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7E0]">
                <th className="text-left px-5 py-3 text-xs font-semibold text-[#7A8A7C] w-40">Crop</th>
                {months.map(m => (
                  <th key={m} className="text-center px-2 py-3 text-xs font-semibold text-[#7A8A7C]">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {crops.map(crop => {
                const timingStr = crop.timings
                return (
                  <tr key={crop.name} className="border-b border-[#E4E7E0]/50 hover:bg-[#F9FAF8]">
                    <td className="px-5 py-3 font-medium text-[#222527]">{crop.name}</td>
                    {months.map((m, mi) => {
                      const bars: string[] = []
                      if (mi === 0 && (timingStr.includes('Pre-seed') || timingStr.includes('Pre-harv'))) bars.push('bg-amber-400')
                      if (mi === 1 && timingStr.includes('Soil')) bars.push('bg-blue-400')
                      if ((mi === 2 || mi === 3) && timingStr.includes('In-crop')) bars.push('bg-[#4A7C59]')
                      if ((mi === 3 || mi === 4)) bars.push('bg-purple-400')
                      if ((mi === 5 || mi === 6) && (timingStr.includes('Pre-harv') || timingStr.includes('Desiccation'))) bars.push('bg-orange-400')

                      return (
                        <td key={m} className="px-2 py-3 text-center">
                          <div className="flex flex-col gap-0.5 items-center">
                            {bars.map((color, bi) => (
                              <div key={bi} className={`h-2 w-6 rounded-full ${color} opacity-80`}></div>
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
        </div>
      </div>
    </div>
  )
}