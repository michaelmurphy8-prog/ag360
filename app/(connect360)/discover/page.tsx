'use client'
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search, SlidersHorizontal, Truck, Sprout, Users, Briefcase,
  MapPin, Star, ChevronDown, X, ArrowUpDown
} from 'lucide-react'

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
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Trucker',      icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { label: 'Applicator',   icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  worker:       { label: 'Worker',       icon: Users,     color: '#C9A84C', bg: '#FDF8EE' },
  professional: { label: 'Professional', icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

const AVAIL_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  immediate:   { label: 'Available',    dot: '#22C55E', text: '#16A34A' },
  seasonal:    { label: 'Seasonal',     dot: '#F59E0B', text: '#D97706' },
  contract:    { label: 'Contract',     dot: '#60A5FA', text: '#3B82F6' },
  unavailable: { label: 'Unavailable',  dot: '#D1D5DB', text: '#9CA3AF' },
}

const FILTER_TABS = [
  { key: '',             label: 'All'             },
  { key: 'farmer',       label: 'Farmers'         },
  { key: 'worker',       label: 'Workers'         },
  { key: 'trucker',      label: 'Transport'       },
  { key: 'applicator',   label: 'Custom Work'     },
  { key: 'professional', label: 'Professionals'   },
]

const SORT_OPTIONS = [
  { key: 'recent',     label: 'Recently added' },
  { key: 'rating',     label: 'Top rated'      },
  { key: 'experience', label: 'Most experience' },
]

function DiscoverContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeType, setActiveType] = useState(searchParams.get('type') ?? '')
  const [sortBy, setSortBy] = useState('recent')
  const [showSort, setShowSort] = useState(false)
  const [province, setProvince] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [availability, setAvailability] = useState('')

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeType) params.set('type', activeType)
      if (search)     params.set('search', search)
      if (province)   params.set('province', province)
      if (availability) params.set('availability', availability)
      const res = await fetch(`/api/connect360/profiles?${params.toString()}`)
      const data = await res.json()
      let list: Provider[] = data.profiles ?? []

      // Client-side sort
      if (sortBy === 'rating') {
        list = list.sort((a, b) => (Number(b.avg_rating) || 0) - (Number(a.avg_rating) || 0))
      } else if (sortBy === 'experience') {
        list = list.sort((a, b) => (b.years_experience || 0) - (a.years_experience || 0))
      }

      setProviders(list)
    } catch {
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [activeType, search, province, availability, sortBy])

  useEffect(() => {
    const t = setTimeout(fetchProviders, 300)
    return () => clearTimeout(t)
  }, [fetchProviders])

  const activeSortLabel = SORT_OPTIONS.find(s => s.key === sortBy)?.label ?? 'Sort'
  const hasActiveFilters = province || availability

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-20"
        style={{ backgroundColor: '#F7F5F0', paddingBottom: 8 }}>

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
            {/* Sort */}
            <div className="relative">
              <button
                onClick={() => setShowSort(s => !s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0D1520',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                }}>
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
            {/* Filter button */}
            <button
              onClick={() => setShowFilters(s => !s)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: hasActiveFilters ? '#C9A84C' : '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}>
              <SlidersHorizontal size={16}
                style={{ color: hasActiveFilters ? '#FFFFFF' : '#0D1520' }} />
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
            style={{
              backgroundColor: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              height: 48,
            }}>
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

        {/* Filter chips */}
        <div className="flex gap-2 px-5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none' }}>
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
              {/* Province */}
              <div>
                <label className="text-[10px] font-semibold tracking-wide uppercase mb-1.5 block"
                  style={{ color: '#8A9BB0' }}>Province</label>
                <div className="relative">
                  <select
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                    className="w-full appearance-none text-sm rounded-xl px-3 py-2.5 pr-8 outline-none"
                    style={{
                      backgroundColor: '#F7F5F0',
                      color: '#0D1520',
                      border: '1px solid #EEE9E0',
                    }}>
                    <option value="">All</option>
                    {['AB','BC','MB','NB','NL','NS','ON','PE','QC','SK'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: '#8A9BB0' }} />
                </div>
              </div>
              {/* Availability */}
              <div>
                <label className="text-[10px] font-semibold tracking-wide uppercase mb-1.5 block"
                  style={{ color: '#8A9BB0' }}>Availability</label>
                <div className="relative">
                  <select
                    value={availability}
                    onChange={e => setAvailability(e.target.value)}
                    className="w-full appearance-none text-sm rounded-xl px-3 py-2.5 pr-8 outline-none"
                    style={{
                      backgroundColor: '#F7F5F0',
                      color: '#0D1520',
                      border: '1px solid #EEE9E0',
                    }}>
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
              <button
                onClick={() => { setProvince(''); setAvailability('') }}
                className="mt-3 text-xs font-semibold"
                style={{ color: '#EF4444' }}>
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Provider list */}
      <div className="px-5 pt-4 pb-6 space-y-3">
        {loading ? (
          // Skeleton cards
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full p-4 rounded-2xl animate-pulse"
              style={{ backgroundColor: '#FFFFFF', height: 96 }} />
          ))
        ) : providers.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#FDF8EE' }}>
              <Users size={28} style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>No providers found</h3>
            <p className="text-sm" style={{ color: '#8A9BB0' }}>
              Try adjusting your search or filters
            </p>
            {(search || activeType || hasActiveFilters) && (
              <button
                onClick={() => { setSearch(''); setActiveType(''); setProvince(''); setAvailability('') }}
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
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
                  overflow: 'hidden',
                  opacity: isClosed ? 0.5 : 1,
                }}>
                <div className="flex items-start gap-4 p-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    {p.photo_url
                      ? <img src={p.photo_url} className="w-14 h-14 rounded-2xl object-cover" alt="" />
                      : <Icon size={22} style={{ color: cfg.color }} />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-sm leading-tight truncate"
                          style={{ color: '#0D1520' }}>{name}</div>
                        <div className="text-xs mt-0.5 font-medium"
                          style={{ color: '#C9A84C' }}>{cfg.label}</div>
                      </div>
                      {/* Availability badge */}
                      {isClosed ? (
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5 px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                          <span className="text-[10px] font-semibold" style={{ color: '#9CA3AF' }}>Closed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                          <div className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: avail.dot }} />
                          <span className="text-[10px] font-semibold"
                            style={{ color: avail.text }}>{avail.label}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {location && (
                        <span className="flex items-center gap-1 text-xs"
                          style={{ color: '#8A9BB0' }}>
                          <MapPin size={10} /> {location}
                        </span>
                      )}
                      {rating && (
                        <span className="flex items-center gap-1 text-xs font-semibold"
                          style={{ color: '#D97706' }}>
                          <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} />
                          {rating}
                          {p.review_count ? (
                            <span className="font-normal" style={{ color: '#8A9BB0' }}>
                              ({p.review_count})
                            </span>
                          ) : null}
                        </span>
                      )}
                      {p.years_experience ? (
                        <span className="text-xs" style={{ color: '#8A9BB0' }}>
                          {p.years_experience}yr exp
                        </span>
                      ) : null}
                      {p.verified_at && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>

                    {/* Bio preview */}
                    {p.bio && (
                      <p className="text-xs mt-2 line-clamp-1"
                        style={{ color: '#8A9BB0' }}>{p.bio}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F7F5F0' }}>
        <div className="space-y-3 px-5 w-full pt-32">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full h-24 rounded-2xl animate-pulse"
              style={{ backgroundColor: '#FFFFFF' }} />
          ))}
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  )
}