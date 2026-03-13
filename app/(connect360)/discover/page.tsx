'use client'
import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import {
  Search, SlidersHorizontal, Truck, Sprout, Users, Briefcase,
  MapPin, Star, ChevronDown, X, ArrowUpDown, Map, List, ChevronRight
, Tractor } from 'lucide-react'

interface Provider {
  id: string
  type: string
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  base_city?: string
  base_province?: string
  base_country?: string
  avg_rating?: number
  review_count?: number
  years_experience?: number
  availability: string
  verified_at?: string
  bio?: string
  lat?: number
  lng?: number
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Trucker',      icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { label: 'Applicator',   icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  farmer:       { label: 'Farmer',       icon: Tractor,   color: '#16A34A', bg: '#F0FDF4' },
  worker:       { label: 'Worker',       icon: Users,     color: '#60A5FA', bg: '#EFF6FF' },
  professional: { label: 'Professional', icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

const AVAIL_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  immediate:   { label: 'Available',   dot: '#22C55E', text: '#16A34A' },
  seasonal:    { label: 'Seasonal',    dot: '#F59E0B', text: '#D97706' },
  contract:    { label: 'Contract',    dot: '#60A5FA', text: '#3B82F6' },
  unavailable: { label: 'Unavailable', dot: '#D1D5DB', text: '#9CA3AF' },
}

const FILTER_TABS = [
  { key: '',             label: 'All'           },
  { key: 'farmer',       label: 'Farmers'       },
  { key: 'worker',       label: 'Workers'       },
  { key: 'trucker',      label: 'Transport'     },
  { key: 'applicator',   label: 'Custom Work'   },
  { key: 'professional', label: 'Professionals' },
]

const SORT_OPTIONS = [
  { key: 'recent',     label: 'Recently added'  },
  { key: 'rating',     label: 'Top rated'       },
  { key: 'experience', label: 'Most experience' },
]

const MAP_COLORS: Record<string, string> = {
  farmer:       '#C9A84C',
  trucker:      '#22C55E',
  applicator:   '#F59E0B',
  worker:       '#60A5FA',
  professional: '#A855F7',
}

const MAP_LEGEND = [
  { type: 'farmer',       label: 'Farmer',       color: '#C9A84C' },
  { type: 'trucker',      label: 'Transport',    color: '#22C55E' },
  { type: 'applicator',   label: 'Custom Work',  color: '#F59E0B' },
  { type: 'worker',       label: 'Worker',       color: '#60A5FA' },
  { type: 'professional', label: 'Professional', color: '#A855F7' },
]

// ── Map View Component ──────────────────────────────────────────────────────
function MapView({
  providers,
  onSelect,
}: {
  providers: Provider[]
  onSelect: (p: Provider) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-96, 56],
      zoom: 3.2,
    })
    mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    const mapped = providers.filter(p => p.lat != null && p.lng != null)
    mapped.forEach(p => {
      const color = MAP_COLORS[p.type] ?? '#C9A84C'
      const initial = (p.type.charAt(0).toUpperCase())
      const el = document.createElement('div')
      el.style.cssText = [
        'width:34px', 'height:34px', 'border-radius:50%',
        `background:${color}`, 'border:3px solid rgba(255,255,255,0.9)',
        'box-shadow:0 3px 10px rgba(0,0,0,0.45)',
        'cursor:pointer', 'display:flex', 'align-items:center', 'justify-content:center',
        'font-size:13px', 'font-weight:800', 'color:#fff',
        'transition:transform 0.15s',
        'font-family:system-ui,sans-serif',
      ].join(';')
      el.textContent = initial
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.25)' })
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)' })
      el.addEventListener('click', () => onSelect(p))
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([p.lng!, p.lat!])
        .addTo(mapRef.current!)
      markersRef.current.push(marker)
    })
  }, [providers, onSelect])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}

// ── Mini Profile Card (map popup) ───────────────────────────────────────────
function MiniProfileCard({
  provider,
  onClose,
  onView,
}: {
  provider: Provider
  onClose: () => void
  onView: () => void
}) {
  const cfg = TYPE_CONFIG[provider.type] ?? TYPE_CONFIG.worker
  const Icon = cfg.icon
  const avail = AVAIL_CONFIG[provider.availability] ?? AVAIL_CONFIG.unavailable
  const name = provider.business_name || `${provider.first_name} ${provider.last_name}`
  const location = [provider.base_city, provider.base_province].filter(Boolean).join(', ')
  const rating = provider.avg_rating ? Number(provider.avg_rating).toFixed(1) : null
  const color = MAP_COLORS[provider.type] ?? '#C9A84C'

  return (
    <div
      style={{
        position: 'absolute', bottom: 100, left: 16, right: 16, zIndex: 30,
        backgroundColor: '#FFFFFF', borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        padding: '16px',
        animation: 'slideUp 0.2s ease',
      }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 24, height: 24, borderRadius: '50%',
          backgroundColor: '#F3F4F6', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <X size={12} color="#6B7280" />
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 14, flexShrink: 0,
          backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `2px solid ${color}22`,
          overflow: 'hidden',
        }}>
          {provider.photo_url
            ? <img src={provider.photo_url} style={{ width: 52, height: 52, objectFit: 'cover' }} alt="" />
            : <Icon size={20} color={cfg.color} />}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0D1520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, paddingInline: 8, paddingBlock: 2,
              borderRadius: 20, backgroundColor: `${color}18`, color: color,
            }}>
              {cfg.label}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: avail.dot }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: avail.text }}>{avail.label}</span>
            </div>
          </div>
          {location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin size={10} color="#8A9BB0" />
              <span style={{ fontSize: 11, color: '#8A9BB0' }}>{location}</span>
              {rating && (
                <>
                  <span style={{ color: '#D1D5DB', fontSize: 10 }}>·</span>
                  <Star size={10} fill="#F59E0B" color="#F59E0B" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#D97706' }}>{rating}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View profile button */}
      <button
        onClick={onView}
        style={{
          marginTop: 12, width: '100%', height: 40, borderRadius: 12,
          backgroundColor: '#0D1520', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>View Profile</span>
        <ChevronRight size={14} color="#FFFFFF" />
      </button>
    </div>
  )
}

// ── Main Discover Content ───────────────────────────────────────────────────
function DiscoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState(searchParams.get('type') ?? '')
  const [sortBy, setSortBy] = useState('recent')
  const [showSort, setShowSort] = useState(false)
  const [country, setCountry] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [availability, setAvailability] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeType) params.set('type', activeType)
      if (country) params.set('country', country)
      if (availability) params.set('availability', availability)
      if (search) params.set('search', search)
      if (sortBy) params.set('sort', sortBy)
      const res = await fetch(`/api/connect360/profiles?${params.toString()}`)
      const data = await res.json()
      let list: Provider[] = data.profiles ?? []
      setProviders(list)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }, [activeType, country, availability, search, sortBy])

  useEffect(() => {
    const t = setTimeout(fetchProviders, 300)
    return () => clearTimeout(t)
  }, [fetchProviders])

  const activeSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Sort'
  const hasActiveFilters = country || availability
  const mappableCount = providers.filter(p => p.lat != null && p.lng != null).length

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Sticky header */}
      <div className="sticky top-0 z-20" style={{ backgroundColor: '#F7F5F0', paddingBottom: 8 }}>
        {/* Title row */}
        <div style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 12 }}>
          <div className="flex items-center justify-between px-5 pt-14 pb-5">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Discover</h1>
              <p className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                {loading ? 'Loading...' : `${providers.length} provider${providers.length !== 1 ? 's' : ''} found`}
              </p>
            </div>
            <div className="flex items-center gap-2">


              {/* Sort — list mode only */}
              {viewMode === 'list' && (
                <div className="relative">
                  <button
                    onClick={() => setShowSort(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{ backgroundColor: '#FFFFFF', color: '#0D1520', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    <ArrowUpDown size={13} />
                    {activeSortLabel}
                  </button>
                  {showSort && (
                    <div className="absolute right-0 top-10 rounded-2xl overflow-hidden z-30 w-44"
                      style={{ backgroundColor: '#FFFFFF', boxShadow: '0 8px 30px rgba(0,0,0,0.15)' }}>
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt.key}
                          onClick={() => { setSortBy(opt.key); setShowSort(false) }}
                          className="w-full text-left px-4 py-3 text-sm transition-all"
                          style={{
                            color: sortBy === opt.key ? '#C9A84C' : '#0D1520',
                            fontWeight: sortBy === opt.key ? 700 : 400,
                            backgroundColor: sortBy === opt.key ? '#FDF8EE' : 'transparent',
                          }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Filter button */}
              <button
                onClick={() => setShowFilters(s => !s)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: hasActiveFilters ? '#C9A84C' : '#FFFFFF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                }}>
                <SlidersHorizontal size={16} style={{ color: hasActiveFilters ? '#FFFFFF' : '#0D1520' }} />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#0D1520' }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-5 mb-3">
          <div className="flex items-center gap-3 px-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', height: 48 }}>
            <Search size={16} style={{ color: '#B0A898', flexShrink: 0 }} />
            <input
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#0D1520' }}
              placeholder="Search by name, business, location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')}>
                <X size={14} style={{ color: '#B0A898' }} />
              </button>
            )}
          </div>
        </div>

        {/* List / Map toggle pill */}
        <div className="flex justify-center mb-3">
          <div className="flex rounded-2xl p-1" style={{ backgroundColor: '#E8E4DC', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <button
              onClick={() => { setViewMode('list'); setSelectedProvider(null) }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: viewMode === 'list' ? '#0D1520' : 'transparent',
                color: viewMode === 'list' ? '#FFFFFF' : '#8A9BB0',
                border: 'none', cursor: 'pointer',
              }}>
              <List size={13} />
              List
            </button>
            <button
              onClick={() => setViewMode('map')}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                backgroundColor: viewMode === 'map' ? '#C9A84C' : 'transparent',
                color: viewMode === 'map' ? '#FFFFFF' : '#8A9BB0',
                border: 'none', cursor: 'pointer',
              }}>
              <Map size={13} />
              Map
            </button>
          </div>
        </div>
        {/* Filter chips */}
        <div className="flex gap-2 px-5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TABS.map(tab => {
            const active = activeType === tab.key
            return (
              <button key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#0D1520' : '#FFFFFF',
                  color: active ? '#FFFFFF' : '#8A9BB0',
                  boxShadow: active ? '0 2px 8px rgba(13,21,32,0.25)' : '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mx-5 mt-3 p-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold tracking-wide uppercase mb-1.5 block"
                  style={{ color: '#8A9BB0' }}>Country</label>
                <div className="relative">
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    className="w-full appearance-none text-sm rounded-xl px-3 py-2.5 pr-8 outline-none"
                    style={{ backgroundColor: '#F7F5F0', color: '#0D1520', border: '1px solid #EEE9E0' }}>
                    <option value="">All</option>
                    <option value="Canada">Canada</option>
                    <option value="United States">United States</option>
                    <option value="Australia">Australia</option>
                    <option value="New Zealand">New Zealand</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="France">France</option>
                    <option value="Brazil">Brazil</option>
                    <option value="Argentina">Argentina</option>
                    <option value="South Africa">South Africa</option>
                    <option value="Ukraine">Ukraine</option>
                    <option value="India">India</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#8A9BB0' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-wide uppercase mb-1.5 block"
                  style={{ color: '#8A9BB0' }}>Availability</label>
                <div className="relative">
                  <select value={availability} onChange={e => setAvailability(e.target.value)}
                    className="w-full appearance-none text-sm rounded-xl px-3 py-2.5 pr-8 outline-none"
                    style={{ backgroundColor: '#F7F5F0', color: '#0D1520', border: '1px solid #EEE9E0' }}>
                    <option value="">All</option>
                    <option value="immediate">Available now</option>
                    <option value="seasonal">Seasonal</option>
                    <option value="contract">Contract</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#8A9BB0' }} />
                </div>
              </div>
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setCountry(''); setAvailability('') }}
                className="mt-3 text-xs font-semibold" style={{ color: '#EF4444' }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MAP VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === 'map' ? (
        <div style={{ position: 'relative', height: 'calc(100vh - 220px)', marginInline: 20, borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
          <MapView providers={providers} onSelect={p => { setSelectedProvider(p) }} />

          {/* Legend */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 10,
            backgroundColor: 'rgba(13,21,32,0.88)', borderRadius: 14, padding: '10px 12px',
            backdropFilter: 'blur(8px)',
          }}>
            {MAP_LEGEND.map(l => (
              <div key={l.type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: l.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#E2E8F0' }}>{l.label}</span>
              </div>
            ))}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 9, color: '#8A9BB0' }}>{mappableCount} mapped</span>
            </div>
          </div>

          {/* Selected provider mini card */}
          {selectedProvider && (
            <MiniProfileCard
              provider={selectedProvider}
              onClose={() => setSelectedProvider(null)}
              onView={() => router.push(`/profile/${selectedProvider.id}`)}
            />
          )}

          {/* No mappable providers notice */}
          {!loading && mappableCount === 0 && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(13,21,32,0.88)', borderRadius: 16, padding: '16px 24px',
              backdropFilter: 'blur(8px)', textAlign: 'center',
            }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', margin: 0 }}>No mapped providers</p>
              <p style={{ fontSize: 11, color: '#8A9BB0', marginTop: 4 }}>Try adjusting your filters</p>
            </div>
          )}
        </div>
      ) : (
        /* ── LIST VIEW ───────────────────────────────────────────────────── */
        <div className="px-5 pt-4 pb-6 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full p-4 rounded-2xl animate-pulse"
                style={{ backgroundColor: '#FFFFFF', height: 96 }} />
            ))
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: '#FDF8EE' }}>
                <Users size={28} style={{ color: '#C9A84C' }} />
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>No providers found</h3>
              <p className="text-sm" style={{ color: '#8A9BB0' }}>Try adjusting your search or filters</p>
              {(search || activeType || hasActiveFilters) && (
                <button
                  onClick={() => { setSearch(''); setActiveType(''); setCountry(''); setAvailability('') }}
                  className="mt-4 px-5 py-2.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                  Clear all
                </button>
              )}
            </div>
          ) : (
            providers.map(p => {
              const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.worker
              const Icon = cfg.icon
              const avail = AVAIL_CONFIG[p.availability] ?? AVAIL_CONFIG.unavailable
              const name = p.business_name || `${p.first_name} ${p.last_name}`
              const rating = p.avg_rating ? Number(p.avg_rating).toFixed(1) : null
              const location = [p.base_city, p.base_province].filter(Boolean).join(', ')
              const isClosed = p.type === 'farmer' && p.availability === 'unavailable'
              return (
                <button key={p.id}
                  onClick={() => router.push(`/profile/${p.id}`)}
                  className="w-full text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: '#FFFFFF', borderRadius: 20,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    overflow: 'hidden', opacity: isClosed ? 0.55 : 1,
                    border: '1px solid rgba(0,0,0,0.04)',
                  }}>
                  {/* Accent bar */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}44)` }} />
                  <div className="flex items-center gap-4 p-4">
                    {/* Avatar */}
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                      backgroundColor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1.5px solid ${cfg.color}30`, overflow: 'hidden', position: 'relative',
                    }}>
                      {p.photo_url
                        ? <img src={p.photo_url} style={{ width: 56, height: 56, objectFit: 'cover' }} alt="" />
                        : <Icon size={22} style={{ color: cfg.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-bold text-sm leading-tight truncate" style={{ color: '#0D1520' }}>{name}</div>
                          <span style={{
                            display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 700,
                            paddingInline: 8, paddingBlock: 2, borderRadius: 20,
                            backgroundColor: `${cfg.color}15`, color: cfg.color, letterSpacing: '0.02em',
                          }}>{cfg.label}</span>
                        </div>
                        {isClosed ? (
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                            <span className="text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>Closed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.dot }} />
                            <span className="text-[10px] font-semibold" style={{ color: avail.text }}>{avail.label}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {location && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: '#8A9BB0' }}>
                            <MapPin size={10} /> {location}
                          </span>
                        )}
                        {rating && (
                          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#D97706' }}>
                            <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                            {rating}
                            {p.review_count ? (
                              <span className="font-normal" style={{ color: '#8A9BB0' }}>({p.review_count})</span>
                            ) : null}
                          </span>
                        )}
                        {p.years_experience ? (
                          <span className="text-xs" style={{ color: '#8A9BB0' }}>{p.years_experience}yr exp</span>
                        ) : null}
                        {p.verified_at && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      {p.bio && (
                        <p className="text-xs mt-2 line-clamp-1" style={{ color: '#8A9BB0' }}>{p.bio}</p>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="space-y-3 px-5 w-full pt-32">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFFFFF' }} />
          ))}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
}
