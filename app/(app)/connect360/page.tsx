'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import {
  Globe, Search, Filter, MapPin, Truck, Sprout,
  Users, ChevronDown, CheckCircle, Clock, Phone,
  Mail, Building2, Star, RefreshCw, UserPlus, X, Shield
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