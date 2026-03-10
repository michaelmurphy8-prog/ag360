'use client'

import { useState, useEffect } from 'react'
import {
  Shield, CheckCircle, XCircle, RefreshCw,
  MapPin, Mail, Building2, Truck, Sprout,
  Users, Globe, ChevronDown, AlertCircle,
  Briefcase, BadgeCheck, ExternalLink, Languages
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
  licence_verified?: boolean
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
  // Professional
  professional_sub_type?: string
  services_offered?: string[]
  languages_spoken?: string[]
  remote_service?: boolean
  countries_served?: string[]
  worker_origin_countries?: string[]
  // Worker sponsorship
  seeking_tfw_sponsorship?: boolean
  seeking_h2a_sponsorship?: boolean
  citizenship_country?: string
}

interface StatusCount {
  status: string
  count: string
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trucker:      { label: 'Custom Trucker',        icon: Truck,     color: 'text-blue-400' },
  applicator:   { label: 'Custom Applicator',     icon: Sprout,    color: 'text-green-400' },
  worker:       { label: 'Seasonal Worker',       icon: Users,     color: 'text-amber-400' },
  farmer:       { label: 'Farmer',                icon: Globe,     color: 'text-ag-accent' },
  professional: { label: 'Professional Services', icon: Briefcase, color: 'text-purple-400' },
}

const PROFESSIONAL_SUB_LABELS: Record<string, string> = {
  immigration_consultant: 'Immigration Consultant',
  ag_accountant: 'Ag Accountant',
  crop_consultant: 'Crop Consultant',
}

// Registry URLs for licence verification per sub-type
const LICENCE_REGISTRY: Record<string, { label: string; url: string }> = {
  immigration_consultant: {
    label: 'Verify at CICC (college-ic.ca)',
    url: 'https://college-ic.ca/protecting-the-public/find-an-immigration-consultant',
  },
  ag_accountant: {
    label: 'Verify at CPA Canada',
    url: 'https://www.cpacanada.ca/en/members-area/find-a-cpa',
  },
  crop_consultant: {
    label: 'Verify at Agrology.ca',
    url: 'https://www.agrology.ca',
  },
}

const STATUS_TABS = ['pending', 'approved', 'rejected', 'suspended']

// ─── Main Component ───────────────────────────────────────────
export default function Connect360AdminPage() {
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

  // Licence-only verification — does NOT change approval status, updates in-place
  async function handleLicenceVerify(id: string) {
    setActioningId(id)
    try {
      const res = await fetch('/api/connect360/admin', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'verify_licence' }),
      })
      const data = await res.json()
      if (data.success) {
        setProfiles(prev => prev.map(p => p.id === id ? { ...p, licence_verified: true } : p))
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
            <button key={tab} onClick={() => setActiveTab(tab)}
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
            const isProfessional = profile.type === 'professional'
            const registry = isProfessional && profile.professional_sub_type
              ? LICENCE_REGISTRY[profile.professional_sub_type]
              : null

            return (
              <div key={profile.id} className="rounded-xl border overflow-hidden transition-all"
                style={{
                  backgroundColor: 'var(--ag-bg-card)',
                  borderColor: isProfessional ? 'rgba(168,85,247,0.25)' : 'var(--ag-border)',
                }}>

                {/* Row */}
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{ backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-accent)' }}>
                    {profile.photo_url
                      ? <img src={profile.photo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                      : `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-ag-primary">
                        {profile.first_name} {profile.last_name}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
                        style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
                        <Icon size={9} />
                        {isProfessional && profile.professional_sub_type
                          ? PROFESSIONAL_SUB_LABELS[profile.professional_sub_type] ?? cfg.label
                          : cfg.label}
                      </span>
                      {/* Licence verified badge */}
                      {isProfessional && profile.licence_verified && (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/25">
                          <BadgeCheck size={9} /> Licence Verified
                        </span>
                      )}
                      {isProfessional && !profile.licence_verified && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-amber-400 bg-amber-400/10 border-amber-400/25">
                          Licence Unverified
                        </span>
                      )}
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

                  <div className="text-[10px] text-ag-muted text-right flex-shrink-0 hidden md:block">
                    {new Date(profile.created_at).toLocaleDateString('en-CA')}
                  </div>

                  <button onClick={() => setExpandedId(expanded ? null : profile.id)}
                    className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-all flex-shrink-0">
                    <ChevronDown size={14} className={`text-ag-muted transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4"
                    style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>

                    {/* ── Professional licence block ── */}
                    {isProfessional && (
                      <div className="p-3 rounded-lg border space-y-3"
                        style={{ borderColor: 'rgba(168,85,247,0.25)', backgroundColor: 'rgba(168,85,247,0.05)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-purple-400">
                            Licence Verification
                          </span>
                          {profile.licence_verified ? (
                            <span className="flex items-center gap-1 text-[10px] text-purple-400">
                              <BadgeCheck size={12} /> Verified
                            </span>
                          ) : (
                            <button
                              onClick={() => handleLicenceVerify(profile.id)}
                              disabled={actioning}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                              style={{ backgroundColor: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}>
                              {actioning
                                ? <RefreshCw size={11} className="animate-spin" />
                                : <BadgeCheck size={11} />}
                              Mark Licence Verified
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <div className="text-ag-muted mb-0.5">Service Type</div>
                            <div className="text-ag-primary">
                              {PROFESSIONAL_SUB_LABELS[profile.professional_sub_type ?? ''] ?? profile.professional_sub_type ?? '—'}
                            </div>
                          </div>
                          <div>
                            <div className="text-ag-muted mb-0.5">Licence / Registration #</div>
                            <div className="text-ag-primary font-mono">
                              {profile.licence_number ?? <span className="text-ag-muted italic">Not provided</span>}
                            </div>
                          </div>
                          {profile.remote_service !== undefined && (
                            <div>
                              <div className="text-ag-muted mb-0.5">Remote / Virtual</div>
                              <div className={profile.remote_service ? 'text-green-400' : 'text-ag-muted'}>
                                {profile.remote_service ? 'Yes' : 'No'}
                              </div>
                            </div>
                          )}
                          {profile.countries_served && profile.countries_served.length > 0 && (
                            <div>
                              <div className="text-ag-muted mb-0.5">Countries Served</div>
                              <div className="text-ag-primary">{profile.countries_served.join(', ')}</div>
                            </div>
                          )}
                        </div>

                        {/* Registry link */}
                        {registry && profile.licence_number && (
                          <a href={registry.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs font-medium transition-all"
                            style={{ color: '#c084fc' }}>
                            <ExternalLink size={11} />
                            {registry.label}
                          </a>
                        )}

                        {/* Services */}
                        {profile.services_offered && profile.services_offered.length > 0 && (
                          <div>
                            <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1.5">Services Offered</div>
                            <div className="flex flex-wrap gap-1">
                              {profile.services_offered.map(s => (
                                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: 'rgba(168,85,247,0.3)', color: '#c084fc', backgroundColor: 'rgba(168,85,247,0.06)' }}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Languages */}
                        {profile.languages_spoken && profile.languages_spoken.length > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-ag-muted">
                            <Languages size={11} className="text-ag-muted flex-shrink-0" />
                            <span>{profile.languages_spoken.join(', ')}</span>
                          </div>
                        )}

                        {/* Worker origin countries — immigration only */}
                        {profile.professional_sub_type === 'immigration_consultant' &&
                          profile.worker_origin_countries && profile.worker_origin_countries.length > 0 && (
                          <div>
                            <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-1.5">Worker Origin Countries</div>
                            <div className="flex flex-wrap gap-1">
                              {profile.worker_origin_countries.map(c => (
                                <span key={c} className="text-[10px] px-2 py-0.5 rounded-full border"
                                  style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Standard fields ── */}
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
                      {/* Licence # for non-professional types */}
                      {!isProfessional && profile.licence_number && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Licence #</div>
                          <div className="text-ag-primary">
                            {profile.licence_number}
                            {profile.licence_province ? ` (${profile.licence_province})` : ''}
                          </div>
                        </div>
                      )}
                      {!isProfessional && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Insurance</div>
                          <div className={profile.insurance_confirmed ? 'text-green-400' : 'text-ag-muted'}>
                            {profile.insurance_confirmed ? '✓ Confirmed' : 'Not confirmed'}
                          </div>
                        </div>
                      )}
                      {profile.years_experience !== undefined && profile.years_experience !== null && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Experience</div>
                          <div className="text-ag-primary">{profile.years_experience} years</div>
                        </div>
                      )}
                      <div>
                        <div className="text-ag-muted mb-0.5">Service Radius</div>
                        <div className="text-ag-primary">
                          {profile.worldwide ? 'Worldwide' : `${profile.service_radius_km ?? 250} km`}
                        </div>
                      </div>
                      <div>
                        <div className="text-ag-muted mb-0.5">Base Country</div>
                        <div className="text-ag-primary">{profile.base_country}</div>
                      </div>
                      {!isProfessional && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Open to Relocate</div>
                          <div className={profile.open_to_relocation ? 'text-green-400' : 'text-ag-muted'}>
                            {profile.open_to_relocation ? 'Yes' : 'No'}
                          </div>
                        </div>
                      )}
                      {!isProfessional && profile.work_countries && profile.work_countries.length > 0 && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Work Countries</div>
                          <div className="text-ag-primary">{profile.work_countries.join(', ')}</div>
                        </div>
                      )}
                      {!isProfessional && (
                        <div>
                          <div className="text-ag-muted mb-0.5">Commercial Licence</div>
                          <div className={profile.holds_licence ? 'text-green-400' : 'text-ag-muted'}>
                            {profile.holds_licence
                              ? `${profile.driver_licence_type ?? 'Yes'}${profile.driver_licence_province ? ` — ${profile.driver_licence_province}` : ''}`
                              : 'None declared'}
                          </div>
                        </div>
                      )}
                      {/* Worker: TFW / H-2A sponsorship */}
                      {profile.type === 'worker' && (profile.seeking_tfw_sponsorship || profile.seeking_h2a_sponsorship) && (
                        <div className="col-span-2 md:col-span-3">
                          <div className="text-ag-muted mb-1">Sponsorship Required</div>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.seeking_tfw_sponsorship && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border text-sky-400 border-sky-400/30 bg-sky-400/08">
                                TFW (Canada)
                              </span>
                            )}
                            {profile.seeking_h2a_sponsorship && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full border text-sky-400 border-sky-400/30 bg-sky-400/08">
                                H-2A (USA)
                              </span>
                            )}
                            {profile.citizenship_country && (
                              <span className="text-[10px] text-ag-muted">· Citizenship: {profile.citizenship_country}</span>
                            )}
                          </div>
                        </div>
                      )}
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

                    {/* ── Action buttons ── */}
                    {activeTab === 'pending' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => handleAction(profile.id, 'approve')} disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                          style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}>
                          {actioning ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={13} />}
                          Approve
                        </button>
                        <button onClick={() => handleAction(profile.id, 'reject')} disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}

                    {activeTab === 'approved' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => handleAction(profile.id, 'suspend')} disabled={actioning}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all"
                          style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
                          <XCircle size={13} /> Suspend
                        </button>
                      </div>
                    )}

                    {activeTab === 'rejected' && (
                      <div className="flex items-center gap-2 pt-2">
                        <button onClick={() => handleAction(profile.id, 'approve')} disabled={actioning}
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