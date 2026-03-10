'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Globe, Search, Filter, MapPin, Truck, Sprout,
  Users, ChevronDown, CheckCircle, Clock, Phone,
  Mail, Building2, Star, RefreshCw, UserPlus, X, Shield,
  Briefcase, Calendar, Wheat, ChevronRight, Plus
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
type ProviderType = 'trucker' | 'applicator' | 'worker' | 'farmer' | 'all'
type Availability = 'immediate' | 'seasonal' | 'contract' | 'unavailable' | 'all'

interface ConnectProfile {
  id: string
  source: 'profile'
  type: ProviderType
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  bio?: string
  years_experience?: number
  equipment_owned?: string
  crops_experienced?: string[]
  availability: Availability
  base_province?: string
  base_city?: string
  base_country: string
  service_radius_km?: number
  open_to_relocation: boolean
  work_countries?: string[]
  verified_at?: string
}

interface DirectoryEntry {
  id: string
  source: 'directory'
  type: string
  business_name: string
  contact_name?: string
  phone?: string
  email?: string
  province?: string
  city?: string
  country: string
  service_radius_km?: number
  description?: string
  verified: boolean
}

type AnyProvider = ConnectProfile | DirectoryEntry

interface ConnectBid {
  id: string
  farm_name: string
  contact_name: string
  contact_phone?: string
  contact_email: string
  province?: string
  city?: string
  country: string
  bid_type: 'worker' | 'applicator' | 'trucker'
  title: string
  description?: string
  acres?: number
  crop_types?: string[]
  equipment_required?: string
  start_date?: string
  end_date?: string
  duration_notes?: string
  pay_rate?: string
  housing_provided: boolean
  meals_provided: boolean
  status: string
  created_at: string
  expires_at: string
}

interface ConnectedProvider {
  profile_id: string
  first_name?: string
  last_name?: string
  business_name?: string
  phone?: string
  email?: string
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trucker:    { label: 'Custom Trucker',    icon: Truck,   color: 'text-blue-400' },
  applicator: { label: 'Custom Applicator', icon: Sprout,  color: 'text-green-400' },
  worker:     { label: 'Seasonal Worker',   icon: Users,   color: 'text-amber-400' },
  farmer:     { label: 'Farmer',            icon: Globe,   color: 'text-ag-accent' },
}

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate: 'Available Now',
  seasonal:  'Seasonal',
  contract:  'Contract',
  unavailable: 'Unavailable',
}

const AVAILABILITY_COLORS: Record<string, string> = {
  immediate:   'text-green-400 bg-green-400/10 border-green-400/20',
  seasonal:    'text-amber-400 bg-amber-400/10 border-amber-400/20',
  contract:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  unavailable: 'text-ag-muted bg-[var(--ag-bg-hover)] border-[var(--ag-border)]',
}

const PROVINCES = ['All', 'SK', 'AB', 'MB', 'BC', 'ON', 'Other']
const COUNTRIES = ['All', 'Canada', 'USA', 'International']

// ─── Main Page ────────────────────────────────────────────────
export default function Connect360Page() {
  const [providers, setProviders] = useState<AnyProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [provinceFilter, setProvinceFilter] = useState('All')
  const [countryFilter, setCountryFilter] = useState('All')
  const [availabilityFilter, setAvailabilityFilter] = useState('all')
  const [openToRelocation, setOpenToRelocation] = useState(false)
  const [search, setSearch] = useState('')
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [revealedProvider, setRevealedProvider] = useState<ConnectedProvider | null>(null)
  const [showRevealModal, setShowRevealModal] = useState(false)
  const [bids, setBids] = useState<ConnectBid[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [showBidsPanel, setShowBidsPanel] = useState(false)
  const [showPostBidModal, setShowPostBidModal] = useState(false)
  const { user, isLoaded } = useUser()
const isAdmin = isLoaded && [
  'user_3AfgiCDtz0gHx4WMcLx4bBtrSIY',
  'user_39r0Tki0JfZnYL77EIzhcrLexio',
].includes(user?.id ?? '')
  console.log('user id:', user?.id, 'isAdmin:', isAdmin)
  const fetchProviders = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (provinceFilter !== 'All') params.set('province', provinceFilter)
      if (countryFilter !== 'All') params.set('country', countryFilter)
      if (availabilityFilter !== 'all') params.set('availability', availabilityFilter)
      if (openToRelocation) params.set('open_to_relocation', 'true')
      if (search.trim()) params.set('search', search.trim())

      const res = await fetch(`/api/connect360/profiles?${params.toString()}`)
      const data = await res.json()

      const combined: AnyProvider[] = [
        ...(data.profiles ?? []),
        ...(data.directory ?? []),
      ]
      setProviders(combined)
    } catch {
      setProviders([])
    } finally {
      setLoading(false)
    }
  }, [typeFilter, provinceFilter, countryFilter, availabilityFilter, openToRelocation, search])

  useEffect(() => { fetchProviders() }, [fetchProviders])

  // Load bids
  useEffect(() => {
    if (!showBidsPanel) return
    setBidsLoading(true)
    fetch('/api/connect360/bids')
      .then(r => r.json())
      .then(data => setBids(data.bids ?? []))
      .catch(() => setBids([]))
      .finally(() => setBidsLoading(false))
  }, [showBidsPanel])

  // Load existing connections
  useEffect(() => {
    fetch('/api/connect360/requests')
      .then(r => r.json())
      .then(data => {
        const ids = new Set<string>(
          (data.requests ?? []).map((r: { profile_id: string }) => r.profile_id)
        )
        setConnectedIds(ids)
      })
      .catch(() => {})
  }, [])

  async function handleConnect(profileId: string) {
    setConnectingId(profileId)
    try {
      const res = await fetch('/api/connect360/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connect_profile_id: profileId }),
      })
      const data = await res.json()
      if (data.success) {
        setConnectedIds(prev => new Set([...prev, profileId]))
        setRevealedProvider(data.provider)
        setShowRevealModal(true)
      }
    } catch {
    } finally {
      setConnectingId(null)
    }
  }

  const totalApproved = providers.filter(p =>
    p.source === 'profile' ? !!(p as ConnectProfile).verified_at : (p as DirectoryEntry).verified
  ).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={20} className="text-[var(--ag-accent)]" />
            <h1 className="text-xl font-bold text-ag-primary">Connect360</h1>
          </div>
          <p className="text-sm text-ag-muted">
            Find verified truckers, applicators, and workers for your operation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a
              href="/connect360/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
              style={{
                borderColor: 'var(--ag-border)',
                color: 'var(--ag-text-secondary)',
                backgroundColor: 'var(--ag-bg-card)',
              }}
            >
              <Shield size={14} />
              Admin Queue
            </a>
          )}
          <a
            href="/connect360/register"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: 'var(--ag-accent)',
              color: 'var(--ag-bg-primary)',
            }}
          >
            <UserPlus size={14} />
            Register as Provider
          </a>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(TYPE_CONFIG).filter(([k]) => k !== 'farmer').map(([type, cfg]) => {
          const Icon = cfg.icon
          const count = providers.filter(p => p.type === type).length
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
              style={{
                backgroundColor: typeFilter === type ? 'var(--ag-bg-active)' : 'var(--ag-bg-card)',
                borderColor: typeFilter === type ? 'var(--ag-accent-border)' : 'var(--ag-border)',
              }}
            >
              <Icon size={16} className={cfg.color} />
              <div>
                <div className="text-lg font-bold text-ag-primary">{count}</div>
                <div className="text-[10px] text-ag-muted uppercase tracking-wide">{cfg.label}s</div>
              </div>
            </button>
          )
        })}

        {/* Bids card — gold */}
        <button
          onClick={() => setShowBidsPanel(true)}
          className="flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
          style={{
            backgroundColor: showBidsPanel ? 'rgba(212,175,55,0.08)' : 'var(--ag-bg-card)',
            borderColor: showBidsPanel ? 'rgba(212,175,55,0.4)' : 'var(--ag-border)',
          }}
        >
          <Briefcase size={16} style={{ color: 'var(--ag-accent)' }} />
          <div>
            <div className="text-lg font-bold" style={{ color: 'var(--ag-accent)' }}>
              {bids.length > 0 ? bids.length : '—'}
            </div>
            <div className="text-[10px] text-ag-muted uppercase tracking-wide">Active Bids</div>
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 p-4 rounded-xl border"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px] px-3 py-2 rounded-lg border"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}>
          <Search size={13} className="text-ag-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or business..."
            className="bg-transparent text-sm text-ag-primary placeholder:text-ag-muted outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')}><X size={12} className="text-ag-muted" /></button>
          )}
        </div>

        {/* Type */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm text-ag-primary outline-none"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}
        >
          <option value="all">All Types</option>
          <option value="trucker">Truckers</option>
          <option value="applicator">Applicators</option>
          <option value="worker">Workers</option>
        </select>

        {/* Province */}
        <select
          value={provinceFilter}
          onChange={e => setProvinceFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm text-ag-primary outline-none"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}
        >
          {PROVINCES.map(p => <option key={p} value={p}>{p === 'All' ? 'All Provinces' : p}</option>)}
        </select>

        {/* Country */}
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm text-ag-primary outline-none"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}
        >
          {COUNTRIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Countries' : c}</option>)}
        </select>

        {/* Availability */}
        <select
          value={availabilityFilter}
          onChange={e => setAvailabilityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border text-sm text-ag-primary outline-none"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}
        >
          <option value="all">Any Availability</option>
          <option value="immediate">Available Now</option>
          <option value="seasonal">Seasonal</option>
          <option value="contract">Contract</option>
        </select>

        {/* Open to relocation */}
        <button
          onClick={() => setOpenToRelocation(!openToRelocation)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all"
          style={{
            borderColor: openToRelocation ? 'var(--ag-accent-border)' : 'var(--ag-border)',
            backgroundColor: openToRelocation ? 'var(--ag-accent)/10' : 'var(--ag-bg-input)',
            color: openToRelocation ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
          }}
        >
          <Globe size={13} />
          Open to Relocation
        </button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="animate-spin text-ag-muted" />
        </div>
      ) : providers.length === 0 ? (
        <EmptyState typeFilter={typeFilter} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {providers.map(provider =>
            provider.source === 'profile' ? (
              <ProfileCard
                key={provider.id}
                provider={provider as ConnectProfile}
                connected={connectedIds.has(provider.id)}
                connecting={connectingId === provider.id}
                onConnect={handleConnect}
              />
            ) : (
              <DirectoryCard
                key={provider.id}
                entry={provider as DirectoryEntry}
              />
            )
          )}
        </div>
      )}

      {/* Bids slide-out panel */}
      {showBidsPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBidsPanel(false)} />
          <div className="relative w-full max-w-lg h-full flex flex-col border-l shadow-2xl overflow-hidden"
            style={{ backgroundColor: 'var(--ag-bg-primary)', borderColor: 'var(--ag-border)' }}>

            {/* Panel header */}
            <div className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: 'var(--ag-border)' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Briefcase size={16} style={{ color: 'var(--ag-accent)' }} />
                  <h2 className="font-bold text-ag-primary">Active Bids</h2>
                  {bids.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: 'var(--ag-accent)' }}>
                      {bids.length}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ag-muted">Farmers seeking workers, applicators & truckers</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowBidsPanel(false); setShowPostBidModal(true) }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
                >
                  <Plus size={12} /> Post a Bid
                </button>
                <button onClick={() => setShowBidsPanel(false)}>
                  <X size={16} className="text-ag-muted hover:text-ag-primary" />
                </button>
              </div>
            </div>

            {/* Bid type filter */}
            <div className="flex gap-2 px-5 py-3 border-b" style={{ borderColor: 'var(--ag-border)' }}>
              {['all', 'worker', 'applicator', 'trucker'].map(t => (
                <button key={t}
                  onClick={() => {
                    setBidsLoading(true)
                    fetch(`/api/connect360/bids${t !== 'all' ? `?bid_type=${t}` : ''}`)
                      .then(r => r.json())
                      .then(data => setBids(data.bids ?? []))
                      .catch(() => {})
                      .finally(() => setBidsLoading(false))
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium border transition-all capitalize"
                  style={{
                    borderColor: 'var(--ag-border)',
                    backgroundColor: 'var(--ag-bg-card)',
                    color: 'var(--ag-text-secondary)',
                  }}
                >
                  {t === 'all' ? 'All' : t === 'worker' ? 'Workers' : t === 'applicator' ? 'Applicators' : 'Truckers'}
                </button>
              ))}
            </div>

            {/* Bid list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {bidsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw size={18} className="animate-spin text-ag-muted" />
                </div>
              ) : bids.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Briefcase size={32} className="text-ag-muted mb-3 opacity-30" />
                  <p className="text-sm text-ag-muted">No active bids right now.</p>
                  <button
                    onClick={() => { setShowBidsPanel(false); setShowPostBidModal(true) }}
                    className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
                  >
                    Post the First Bid
                  </button>
                </div>
              ) : (
                bids.map(bid => (
                  <div key={bid.id} className="p-4 rounded-xl border transition-all hover:border-[var(--ag-accent-border)]"
                    style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>

                    {/* Bid header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-semibold text-sm text-ag-primary">{bid.title}</div>
                        <div className="text-xs text-ag-muted mt-0.5">{bid.farm_name}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border capitalize flex-shrink-0"
                        style={{
                          color: bid.bid_type === 'worker' ? '#f59e0b' : bid.bid_type === 'applicator' ? '#34d399' : '#60a5fa',
                          borderColor: bid.bid_type === 'worker' ? 'rgba(245,158,11,0.3)' : bid.bid_type === 'applicator' ? 'rgba(52,211,153,0.3)' : 'rgba(96,165,250,0.3)',
                          backgroundColor: bid.bid_type === 'worker' ? 'rgba(245,158,11,0.08)' : bid.bid_type === 'applicator' ? 'rgba(52,211,153,0.08)' : 'rgba(96,165,250,0.08)',
                        }}>
                        {bid.bid_type}
                      </span>
                    </div>

                    {/* Location + dates */}
                    <div className="flex flex-wrap gap-3 mb-2">
                      {(bid.city || bid.province) && (
                        <div className="flex items-center gap-1 text-xs text-ag-muted">
                          <MapPin size={10} />
                          {[bid.city, bid.province, bid.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                      {(bid.start_date || bid.duration_notes) && (
                        <div className="flex items-center gap-1 text-xs text-ag-muted">
                          <Calendar size={10} />
                          {bid.duration_notes ?? new Date(bid.start_date!).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                        </div>
                      )}
                      {bid.acres && (
                        <div className="flex items-center gap-1 text-xs text-ag-muted">
                          <Wheat size={10} /> {bid.acres.toLocaleString()} acres
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {bid.description && (
                      <p className="text-xs text-ag-muted line-clamp-2 mb-2">{bid.description}</p>
                    )}

                    {/* Perks */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {bid.pay_rate && (
                        <span className="text-[10px] px-2 py-0.5 rounded border text-ag-muted"
                          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                          💰 {bid.pay_rate}
                        </span>
                      )}
                      {bid.housing_provided && (
                        <span className="text-[10px] px-2 py-0.5 rounded border text-ag-muted"
                          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                          🏠 Housing
                        </span>
                      )}
                      {bid.meals_provided && (
                        <span className="text-[10px] px-2 py-0.5 rounded border text-ag-muted"
                          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                          🍽️ Meals
                        </span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex gap-2 pt-3 border-t" style={{ borderColor: 'var(--ag-border)' }}>
                      {bid.contact_phone && (
                        <a href={`tel:${bid.contact_phone}`}
                          className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium border transition-all hover:border-[var(--ag-accent-border)]"
                          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                          <Phone size={11} /> Call
                        </a>
                      )}
                      <a href={`mailto:${bid.contact_email}`}
                        className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-all"
                        style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
                        <Mail size={11} /> Email
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Bid Modal */}
      {showPostBidModal && (
        <PostBidModal
          onClose={() => setShowPostBidModal(false)}
          onSuccess={() => {
            setShowPostBidModal(false)
            setShowBidsPanel(true)
          }}
        />
      )}

      {/* Contact reveal modal */}
      {showRevealModal && revealedProvider !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 rounded-2xl border shadow-xl"
            style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-green-400" />
                <h3 className="font-bold text-ag-primary">Connected!</h3>
              </div>
              <button onClick={() => setShowRevealModal(false)}>
                <X size={16} className="text-ag-muted hover:text-ag-primary" />
              </button>
            </div>
            <p className="text-sm text-ag-muted mb-4">
              Here is the contact information for{' '}
              <span className="text-ag-primary font-medium">
                {revealedProvider?.business_name ||
              `${revealedProvider?.first_name} ${revealedProvider?.last_name}`}
              </span>
            </p>
            <div className="space-y-3 p-4 rounded-xl border"
              style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
              {revealedProvider?.phone && (
                <div className="flex items-center gap-3">
                  <Phone size={14} className="text-ag-accent" />
                  <a href={`tel:${revealedProvider.phone}`}
                    className="text-sm text-ag-primary hover:text-ag-accent">
                    {revealedProvider.phone}
                  </a>
                </div>
              )}
              {revealedProvider?.email && (
                <div className="flex items-center gap-3">
                  <Mail size={14} className="text-ag-accent" />
                  <a href={`mailto:${revealedProvider.email}`}
                    className="text-sm text-ag-primary hover:text-ag-accent">
                    {revealedProvider.email}
                  </a>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowRevealModal(false)}
              className="w-full mt-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Profile Card ─────────────────────────────────────────────
function ProfileCard({
  provider, connected, connecting, onConnect
}: {
  provider: ConnectProfile
  connected: boolean
  connecting: boolean
  onConnect: (id: string) => void
}) {
  const cfg = TYPE_CONFIG[provider.type] ?? TYPE_CONFIG.worker
  const Icon = cfg.icon
  const initials = `${provider.first_name[0]}${provider.last_name[0]}`.toUpperCase()

  return (
    <div className="flex flex-col p-4 rounded-xl border transition-all hover:border-[var(--ag-accent-border)]"
      style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-accent)' }}>
          {provider.photo_url
            ? <img src={provider.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ag-primary truncate">
            {provider.first_name} {provider.last_name}
          </div>
          {provider.business_name && (
            <div className="text-xs text-ag-muted truncate flex items-center gap-1">
              <Building2 size={10} /> {provider.business_name}
            </div>
          )}
        </div>
        {provider.verified_at && (
          <CheckCircle size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
        )}
      </div>

      {/* Type + availability badges */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
          style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
          <Icon size={9} /> {cfg.label}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${AVAILABILITY_COLORS[provider.availability] ?? ''}`}>
          {AVAILABILITY_LABELS[provider.availability] ?? provider.availability}
        </span>
        {provider.open_to_relocation && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/20">
            Open to Relocate
          </span>
        )}
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 text-xs text-ag-muted mb-2">
        <MapPin size={11} />
        <span>
          {[provider.base_city, provider.base_province, provider.base_country]
            .filter(Boolean).join(', ')}
        </span>
        {provider.service_radius_km && (
          <span className="text-ag-dim">· {provider.service_radius_km}km radius</span>
        )}
      </div>

      {/* Bio */}
      {provider.bio && (
        <p className="text-xs text-ag-muted line-clamp-2 mb-3">{provider.bio}</p>
      )}

      {/* Experience */}
      {provider.years_experience !== undefined && (
        <div className="text-xs text-ag-muted mb-3">
          <span className="text-ag-primary font-medium">{provider.years_experience}</span> years experience
        </div>
      )}

      {/* Work countries */}
      {provider.work_countries && provider.work_countries.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {provider.work_countries.map(c => (
            <span key={c} className="text-[9px] px-1.5 py-0.5 rounded border text-ag-muted"
              style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--ag-border)' }}>
        <a href={`/connect360/profile/${provider.id}`}
          className="flex-1 text-center py-2 rounded-lg text-xs font-medium border transition-all hover:border-[var(--ag-accent-border)]"
          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
          View Profile
        </a>
        <button
          onClick={() => !connected && onConnect(provider.id)}
          disabled={connected || connecting}
          className="flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: connected ? 'var(--ag-bg-hover)' : 'var(--ag-accent)',
            color: connected ? 'var(--ag-text-muted)' : 'var(--ag-bg-primary)',
            cursor: connected ? 'default' : 'pointer',
          }}
        >
          {connecting ? (
            <RefreshCw size={11} className="animate-spin" />
          ) : connected ? (
            <><CheckCircle size={11} /> Connected</>
          ) : (
            'Connect'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Directory Card ───────────────────────────────────────────
function DirectoryCard({ entry }: { entry: DirectoryEntry }) {
  const cfg = TYPE_CONFIG[entry.type] ?? TYPE_CONFIG.worker
  const Icon = cfg.icon

  return (
    <div className="flex flex-col p-4 rounded-xl border transition-all"
      style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'var(--ag-bg-hover)' }}>
          <Building2 size={16} className="text-ag-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ag-primary truncate">{entry.business_name}</div>
          {entry.contact_name && (
            <div className="text-xs text-ag-muted">{entry.contact_name}</div>
          )}
        </div>
        <span className="text-[9px] px-1.5 py-0.5 rounded border text-ag-muted"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
          Directory
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
          style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
          <Icon size={9} /> {cfg.label}
        </span>
      </div>

      {(entry.city || entry.province) && (
        <div className="flex items-center gap-1.5 text-xs text-ag-muted mb-2">
          <MapPin size={11} />
          <span>{[entry.city, entry.province, entry.country].filter(Boolean).join(', ')}</span>
        </div>
      )}

      {entry.description && (
        <p className="text-xs text-ag-muted line-clamp-2 mb-3">{entry.description}</p>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-2 mt-3 pt-3 border-t"
        style={{ borderColor: 'var(--ag-border)' }}>
        {entry.phone && (
          <a href={`tel:${entry.phone}`}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium border transition-all hover:border-[var(--ag-accent-border)]"
            style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
            <Phone size={11} /> Call
          </a>
        )}
        {entry.email && (
          <a href={`mailto:${entry.email}`}
            className="flex items-center gap-1.5 flex-1 justify-center py-2 rounded-lg text-xs font-medium transition-all"
            style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
            <Mail size={11} /> Email
          </a>
        )}
      </div>
    </div>
  )
}

// ─── Post Bid Modal ───────────────────────────────────────────
function PostBidModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    farm_name: '', contact_name: '', contact_phone: '', contact_email: '',
    city: '', province: '', country: 'Canada',
    bid_type: 'worker', title: '', description: '',
    acres: '', crop_types: [] as string[],
    equipment_required: '', start_date: '', end_date: '',
    duration_notes: '', pay_rate: '',
    housing_provided: false, meals_provided: false,
  })

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const CROPS = ['Canola', 'Wheat', 'Barley', 'Oats', 'Flax', 'Lentils', 'Peas', 'Soybeans', 'Corn', 'Other']

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch('/api/connect360/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, acres: form.acres ? parseInt(form.acres) : null }),
      })
      const data = await res.json()
      if (data.success) onSuccess()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = "w-full px-3 py-2.5 rounded-lg border text-sm text-ag-primary outline-none transition-all focus:border-[var(--ag-accent-border)]"
  const inputStyle = { borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }
  const labelClass = "block text-xs text-ag-muted mb-1.5 font-medium"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>

        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0"
          style={{ borderColor: 'var(--ag-border)' }}>
          <div>
            <h2 className="font-bold text-ag-primary">Post a Bid</h2>
            <p className="text-xs text-ag-muted mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose}><X size={16} className="text-ag-muted hover:text-ag-primary" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1.5 px-5 pt-4 flex-shrink-0">
          {[1, 2].map(s => (
            <div key={s} className="flex-1 h-1 rounded-full transition-all"
              style={{ backgroundColor: s <= step ? 'var(--ag-accent)' : 'var(--ag-border)' }} />
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={labelClass}>Farm Name *</label>
                  <input value={form.farm_name} onChange={e => set('farm_name', e.target.value)}
                    placeholder="Murphy Farms" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Your Name *</label>
                  <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)}
                    placeholder="Mike Murphy" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input value={form.contact_phone} onChange={e => set('contact_phone', e.target.value)}
                    placeholder="+1 306 555 0000" className={inputClass} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Email *</label>
                  <input value={form.contact_email} onChange={e => set('contact_email', e.target.value)}
                    placeholder="mike@farm.com" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input value={form.city} onChange={e => set('city', e.target.value)}
                    placeholder="Swift Current" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Province</label>
                  <select value={form.province} onChange={e => set('province', e.target.value)}
                    className={inputClass} style={inputStyle}>
                    <option value="">Select</option>
                    {['SK', 'AB', 'MB', 'BC', 'ON', 'Other'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Looking for *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v: 'worker', label: 'Worker', icon: '👷' },
                    { v: 'applicator', label: 'Applicator', icon: '🌿' },
                    { v: 'trucker', label: 'Trucker', icon: '🚛' },
                  ].map(({ v, label, icon }) => (
                    <button key={v} type="button"
                      onClick={() => set('bid_type', v)}
                      className="py-2.5 rounded-lg border text-xs font-medium transition-all"
                      style={{
                        borderColor: form.bid_type === v ? 'var(--ag-accent)' : 'var(--ag-border)',
                        backgroundColor: form.bid_type === v ? 'rgba(212,175,55,0.1)' : 'var(--ag-bg-hover)',
                        color: form.bid_type === v ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                      }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Job Title *</label>
                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder="Need combine operator for harvest" className={inputClass} style={inputStyle} />
              </div>

              <div>
                <label className={labelClass}>Description / Job Details</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} placeholder="Describe the work, conditions, expectations..."
                  className={inputClass} style={inputStyle} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Acres</label>
                  <input value={form.acres} onChange={e => set('acres', e.target.value)}
                    type="number" placeholder="5000" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Pay Rate</label>
                  <input value={form.pay_rate} onChange={e => set('pay_rate', e.target.value)}
                    placeholder="$25/hr or Competitive" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input value={form.start_date} onChange={e => set('start_date', e.target.value)}
                    type="date" className={inputClass} style={inputStyle} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input value={form.end_date} onChange={e => set('end_date', e.target.value)}
                    type="date" className={inputClass} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Duration Notes</label>
                  <input value={form.duration_notes} onChange={e => set('duration_notes', e.target.value)}
                    placeholder="Approx 3 weeks during harvest" className={inputClass} style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Equipment Required</label>
                  <input value={form.equipment_required} onChange={e => set('equipment_required', e.target.value)}
                    placeholder="Must have Class 1A, combine experience" className={inputClass} style={inputStyle} />
                </div>
              </div>

              {/* Crops */}
              <div>
                <label className={labelClass}>Crop Types</label>
                <div className="flex flex-wrap gap-1.5">
                  {CROPS.map(c => (
                    <button key={c} type="button"
                      onClick={() => set('crop_types', form.crop_types.includes(c)
                        ? form.crop_types.filter(x => x !== c)
                        : [...form.crop_types, c])}
                      className="px-2.5 py-1 rounded-full border text-xs transition-all"
                      style={{
                        borderColor: form.crop_types.includes(c) ? 'var(--ag-accent)' : 'var(--ag-border)',
                        backgroundColor: form.crop_types.includes(c) ? 'rgba(212,175,55,0.1)' : 'var(--ag-bg-hover)',
                        color: form.crop_types.includes(c) ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                      }}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Perks */}
              <div>
                <label className={labelClass}>Perks Included</label>
                <div className="flex gap-2">
                  {[
                    { k: 'housing_provided', label: '🏠 Housing' },
                    { k: 'meals_provided', label: '🍽️ Meals' },
                  ].map(({ k, label }) => (
                    <button key={k} type="button"
                      onClick={() => set(k, !form[k as keyof typeof form])}
                      className="px-3 py-2 rounded-lg border text-xs font-medium transition-all"
                      style={{
                        borderColor: form[k as keyof typeof form] ? 'var(--ag-accent)' : 'var(--ag-border)',
                        backgroundColor: form[k as keyof typeof form] ? 'rgba(212,175,55,0.1)' : 'var(--ag-bg-hover)',
                        color: form[k as keyof typeof form] ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t flex-shrink-0" style={{ borderColor: 'var(--ag-border)' }}>
          {step === 2 && (
            <button onClick={() => setStep(1)}
              className="px-4 py-2.5 rounded-lg border text-sm font-medium transition-all"
              style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
              Back
            </button>
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              disabled={!form.farm_name || !form.contact_name || !form.contact_email}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !form.title}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
              {submitting ? <><RefreshCw size={13} className="animate-spin" /> Posting...</> : 'Post Bid'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────
function EmptyState({ typeFilter }: { typeFilter: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Globe size={40} className="text-ag-muted mb-4 opacity-40" />
      <h3 className="font-semibold text-ag-primary mb-2">No providers found</h3>
      <p className="text-sm text-ag-muted max-w-sm">
        {typeFilter !== 'all'
          ? `No verified ${typeFilter}s match your current filters. Try adjusting your search.`
          : 'No verified providers match your current filters. Try adjusting your search or check back soon as new providers are added.'}
      </p>
      <a href="/connect360/register"
        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all"
        style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
        Register as a Provider
      </a>
    </div>
  )
}