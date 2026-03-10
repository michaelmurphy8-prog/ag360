'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Shield, CheckCircle, XCircle, Clock, RefreshCw,
  MapPin, Phone, Mail, Building2, Truck, Sprout,
  Users, Globe, ChevronDown, AlertCircle, Eye
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface ConnectProfile {
  id: string
  type: string
  status: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  photo_url?: string
  business_name?: string
  business_number?: string
  insurance_confirmed: boolean
  licence_number?: string
  licence_province?: string
  base_province?: string
  base_city?: string
  base_country: string
  service_radius_km?: number
  open_to_relocation: boolean
  work_countries?: string[]
  bio?: string
  years_experience?: number
  equipment_owned?: string
  crops_experienced?: string[]
  operations_experience?: string[]
  equipment_brands?: string[]
  worldwide?: boolean
  cv_url?: string
  holds_licence?: boolean
  driver_licence_type?: string
  driver_licence_province?: string
  availability: string
  verified_at?: string
  verified_by?: string
  created_at: string
}

interface StatusCount {
  status: string
  count: string
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trucker:    { label: 'Custom Trucker',    icon: Truck,   color: 'text-blue-400' },
  applicator: { label: 'Custom Applicator', icon: Sprout,  color: 'text-green-400' },
  worker:     { label: 'Seasonal Worker',   icon: Users,   color: 'text-amber-400' },
  farmer:     { label: 'Farmer',            icon: Globe,   color: 'text-ag-accent' },
}

const STATUS_TABS = ['pending', 'approved', 'rejected', 'suspended']

// ─── Main Component ───────────────────────────────────────────
export default function Connect360AdminPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<ConnectProfile[]>([])
  const [counts, setCounts] = useState<StatusCount[]>([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [actioningId, setActioningId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function fetchQueue(status: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/connect360/admin?status=${status}`)
      if (res.status === 403) { setUnauthorized(true); return }
      const data = await res.json()
      setProfiles(data.profiles ?? [])
      setCounts(data.counts ?? [])
    } catch {
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQueue(activeTab) }, [activeTab])

  async function handleAction(id: string, action: 'approve' | 'reject' | 'suspend') {
    setActioningId(id)
    try {
      const res = await fetch('/api/connect360/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (data.success) {
        setProfiles(prev => prev.filter(p => p.id !== id))
        setCounts(prev => prev.map(c => {
          if (c.status === activeTab) return { ...c, count: String(Number(c.count) - 1) }
          if (action === 'approve' && c.status === 'approved') return { ...c, count: String(Number(c.count) + 1) }
          if (action === 'reject' && c.status === 'rejected') return { ...c, count: String(Number(c.count) + 1) }
          if (action === 'suspend' && c.status === 'suspended') return { ...c, count: String(Number(c.count) + 1) }
          return c
        }))
      }
    } catch {
    } finally {
      setActioningId(null)
    }
  }

  function getCount(status: string) {
    return counts.find(c => c.status === status)?.count ?? '0'
  }

  if (unauthorized) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <AlertCircle size={32} className="text-red-400 opacity-60" />
      <p className="text-sm text-ag-muted">Admin access only.</p>
    </div>
  )

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-[var(--ag-accent)]" />
          <div>
            <h1 className="text-lg font-bold text-ag-primary">Connect360 — Admin</h1>
            <p className="text-xs text-ag-muted">Provider verification queue</p>
          </div>
        </div>
        <button onClick={() => fetchQueue(activeTab)}
          className="p-2 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-all">
          <RefreshCw size={15} className="text-ag-muted" />
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => {
          const count = getCount(tab)
          const active = activeTab === tab
          return (
            <button key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all capitalize"
              style={{
                borderColor: active ? 'var(--ag-accent-border)' : 'var(--ag-border)',
                backgroundColor: active ? 'var(--ag-bg-active)' : 'var(--ag-bg-card)',
                color: active ? 'var(--ag-accent)' : 'var(--ag-text-secondary)',
              }}>
              {tab}
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  backgroundColor: active ? 'var(--ag-accent)' : 'var(--ag-bg-hover)',
                  color: active ? 'var(--ag-bg-primary)' : 'var(--ag-text-muted)',
                }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="animate-spin text-ag-muted" />
        </div>
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle size={32} className="text-ag-muted opacity-30 mb-3" />
          <p className="text-sm text-ag-muted capitalize">No {activeTab} profiles.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map(profile => {
            const cfg = TYPE_CONFIG[profile.type] ?? TYPE_CONFIG.worker
            const Icon = cfg.icon
            const expanded = expandedId === profile.id
            const actioning = actioningId === profile.id

            return (
              <div key={profile.id} className="rounded-xl border overflow-hidden transition-all"
                style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>

                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-accent)' }}>
                    {profile.photo_url
                      ? <img src={profile.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                      : `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ag-primary">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
                        style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
                        <Icon size={9} /> {cfg.label}
                      </span>
                    </div>
                    {profile.business_name && (
                      <div className="text-xs text-ag-muted flex items-center gap-1 mt-0.5">
                        <Building2 size={10} /> {profile.business_name}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-ag-muted">
                      <span className="flex items-center gap-1"><Mail size={10} />{profile.email}</span>
                      {profile.base_province && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />{profile.base_city}, {profile.base_province}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-[10px] text-ag-muted text-right flex-shrink-0 hidden md:block">
                    {new Date(profile.created_at).toLocaleDateString('en-CA')}
                  </div>

                  {/* Expand */}
                  <button onClick={() => setExpandedId(expanded ? null : profile.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-all flex-shrink-0">
                    <ChevronDown size={14} className={`text-ag-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3"
                    style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {profile.phone && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Phone</div>
                          <div className="text-ag-primary">{profile.phone}</div>
                        </div>
                      )}
                      {profile.business_number && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Business #</div>
                          <div className="text-ag-primary">{profile.business_number}</div>
                        </div>
                      )}
                      {profile.licence_number && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Licence #</div>
                          <div className="text-ag-primary">{profile.licence_number} ({profile.licence_province})</div>
                        </div>
                      )}
                      <div>
                        <div className="text-ag-muted mb-0.5">Insurance</div>
                        <div className={profile.insurance_confirmed ? 'text-green-400' : 'text-ag-muted'}>
                          {profile.insurance_confirmed ? '✓ Confirmed' : 'Not confirmed'}
                        </div>
                      </div>
                      {profile.years_experience !== undefined && profile.years_experience !== null && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Experience</div>
                          <div className="text-ag-primary">{profile.years_experience} years</div>
                        </div>
                      )}
                      <div>
                        <div className="text-ag-muted mb-0.5">Service Radius</div>
                        <div className="text-ag-primary">{profile.service_radius_km ?? 250} km</div>
                      </div>
                      <div>
                        <div className="text-ag-muted mb-0.5">Open to Relocate</div>
                        <div className={profile.open_to_relocation ? 'text-green-400' : 'text-ag-muted'}>
                          {profile.open_to_relocation ? 'Yes' : 'No'}
                        </div>
                      </div>
                      {profile.work_countries && profile.work_countries.length > 0 && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Work Countries</div>
                          <div className="text-ag-primary">{profile.work_countries.join(', ')}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-ag-muted mb-0.5">Base Country</div>
                        <div className="text-ag-primary">{profile.base_country}</div>
                      </div>
                      <div>
                        <div className="text-ag-muted mb-0.5">Commercial Licence</div>
                        <div className={profile.holds_licence ? 'text-green-400' : 'text-ag-muted'}>
                          {profile.holds_licence
                            ? `${profile.driver_licence_type ?? 'Yes'}${profile.driver_licence_province ? ` — ${profile.driver_licence_province}` : ''}`
                            : 'None declared'}
                        </div>
                      </div>
                      {profile.cv_url && (
                        <div className="col-span-2 md:col-span-3">
                          <div className="text-ag-muted mb-0.5">CV / Résumé</div>
                          <a href={profile.cv_url} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-[var(--ag-accent)] underline underline-offset-2">
                            Download CV
                          </a>
                        </div>
                      )}
                    </div>

                    {profile.bio && (
                      <div>
                        <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1">Bio</div>
                        <p className="text-xs text-ag-primary leading-relaxed">{profile.bio}</p>
                      </div>
                    )}

                    {profile.equipment_owned && (
                      <div>
                        <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1">Equipment</div>
                        <p className="text-xs text-ag-primary">{profile.equipment_owned}</p>
                      </div>
                    )}

                    {profile.crops_experienced && profile.crops_experienced.length > 0 && (
                      <div>
                        <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1.5">Crops</div>
                        <div className="flex flex-wrap gap-1">
                          {profile.crops_experienced.map(c => (
                            <span key={c} className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.operations_experience && profile.operations_experience.length > 0 && (
                      <div>
                        <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1.5">Operations Experience</div>
                        <div className="flex flex-wrap gap-1">
                          {profile.operations_experience.map(op => (
                            <span key={op} className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                              {op}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.equipment_brands && profile.equipment_brands.length > 0 && (
                      <div>
                        <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1.5">Equipment & Brand Experience</div>
                        <div className="flex flex-wrap gap-1">
                          {profile.equipment_brands.map(b => (
                            <span key={b} className="text-[10px] px-2 py-0.5 rounded-full border"
                              style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {activeTab === 'pending' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleAction(profile.id, 'approve')}
                          disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
                          {actioning
                            ? <RefreshCw size={12} className="animate-spin" />
                            : <CheckCircle size={13} />}
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(profile.id, 'reject')}
                          disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}

                    {activeTab === 'approved' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleAction(profile.id, 'suspend')}
                          disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                          <XCircle size={13} /> Suspend
                        </button>
                      </div>
                    )}

                    {activeTab === 'rejected' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleAction(profile.id, 'approve')}
                          disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
                          <CheckCircle size={13} /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}