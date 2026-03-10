'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, CheckCircle, MapPin, Truck, Sprout,
  Users, Globe, Phone, Mail, Building2, Calendar,
  Wheat, RefreshCw, AlertCircle, Shield, FileText
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────
interface ConnectProfile {
  id: string
  type: string
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
  availability: string
  verified_at?: string
  created_at: string
  cv_url?: string
  operations_experience?: string[]
  equipment_brands?: string[]
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trucker:    { label: 'Custom Trucker',    icon: Truck,   color: 'text-blue-400' },
  applicator: { label: 'Custom Applicator', icon: Sprout,  color: 'text-green-400' },
  worker:     { label: 'Seasonal Worker',   icon: Users,   color: 'text-amber-400' },
  farmer:     { label: 'Farmer',            icon: Globe,   color: 'text-ag-accent' },
}

const AVAILABILITY_LABELS: Record<string, string> = {
  immediate:   'Available Now',
  seasonal:    'Seasonal',
  contract:    'Contract',
  unavailable: 'Unavailable',
}

const AVAILABILITY_COLORS: Record<string, string> = {
  immediate:   'text-green-400 bg-green-400/10 border-green-400/20',
  seasonal:    'text-amber-400 bg-amber-400/10 border-amber-400/20',
  contract:    'text-blue-400 bg-blue-400/10 border-blue-400/20',
  unavailable: 'text-ag-muted bg-[var(--ag-bg-hover)] border-[var(--ag-border)]',
}

// ─── Main Component ───────────────────────────────────────────
export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [profile, setProfile] = useState<ConnectProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [revealedContact, setRevealedContact] = useState<{ phone?: string; email?: string } | null>(null)

  useEffect(() => {
    fetch(`/api/connect360/profiles/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.profile) setProfile(data.profile)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  // Check if already connected
  useEffect(() => {
    fetch('/api/connect360/requests')
      .then(r => r.json())
      .then(data => {
        const ids = new Set((data.requests ?? []).map((r: { profile_id: string }) => r.profile_id))
        if (ids.has(id)) setConnected(true)
      })
      .catch(() => {})
  }, [id])

  async function handleConnect() {
    setConnecting(true)
    try {
      const res = await fetch('/api/connect360/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connect_profile_id: id }),
      })
      const data = await res.json()
      if (data.success) {
        setConnected(true)
        setRevealedContact({
          phone: data.provider?.phone,
          email: data.provider?.email,
        })
      }
    } catch {
    } finally {
      setConnecting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw size={20} className="animate-spin text-ag-muted" />
    </div>
  )

  if (notFound || !profile) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <AlertCircle size={32} className="text-ag-muted opacity-40" />
      <p className="text-sm text-ag-muted">Provider not found or not yet approved.</p>
      <button onClick={() => router.push('/connect360')}
        className="px-4 py-2 rounded-lg text-sm border transition-all"
        style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
        Back to Connect360
      </button>
    </div>
  )

  const cfg = TYPE_CONFIG[profile.type] ?? TYPE_CONFIG.worker
  const Icon = cfg.icon
  const initials = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-5">

      {/* Back */}
      <button onClick={() => router.push('/connect360')}
        className="flex items-center gap-1.5 text-sm text-ag-muted hover:text-ag-primary transition-all">
        <ChevronLeft size={15} /> Back to Connect360
      </button>

      {/* Profile header card */}
      <div className="p-5 rounded-2xl border"
        style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
            style={{ backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-accent)' }}>
            {profile.photo_url
              ? <img src={profile.photo_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
              : initials}
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-lg font-bold text-ag-primary">
                {profile.first_name} {profile.last_name}
              </h1>
              {profile.verified_at && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-green-400 bg-green-400/10 border-green-400/20">
                  <CheckCircle size={9} /> AG360 Verified
                </span>
              )}
            </div>

            {profile.business_name && (
              <div className="flex items-center gap-1.5 text-sm text-ag-muted mb-2">
                <Building2 size={12} /> {profile.business_name}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${cfg.color}`}
                style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-border)' }}>
                <Icon size={9} /> {cfg.label}
              </span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${AVAILABILITY_COLORS[profile.availability] ?? ''}`}>
                {AVAILABILITY_LABELS[profile.availability] ?? profile.availability}
              </span>
              {profile.open_to_relocation && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/20">
                  Open to Relocate
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-1.5 text-sm text-ag-muted mt-4">
          <MapPin size={13} />
          <span>
            {[profile.base_city, profile.base_province, profile.base_country]
              .filter(Boolean).join(', ')}
          </span>
          {profile.service_radius_km && (
            <span className="text-ag-dim ml-1">· {profile.service_radius_km}km service radius</span>
          )}
        </div>

        {/* Work countries */}
        {profile.work_countries && profile.work_countries.length > 0 && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Globe size={12} className="text-ag-muted" />
            {profile.work_countries.map(c => (
              <span key={c} className="text-[10px] px-2 py-0.5 rounded border text-ag-muted"
                style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Connect button */}
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--ag-border)' }}>
          {connected && revealedContact ? (
            <div className="space-y-2 p-4 rounded-xl border"
              style={{ backgroundColor: 'var(--ag-bg-hover)', borderColor: 'var(--ag-accent-border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-green-400" />
                <span className="text-sm font-medium text-ag-primary">Connected — Contact Info</span>
              </div>
              {revealedContact.phone && (
                <a href={`tel:${revealedContact.phone}`}
                  className="flex items-center gap-2 text-sm text-ag-primary hover:text-[var(--ag-accent)] transition-all">
                  <Phone size={13} className="text-ag-accent" /> {revealedContact.phone}
                </a>
              )}
              {revealedContact.email && (
                <a href={`mailto:${revealedContact.email}`}
                  className="flex items-center gap-2 text-sm text-ag-primary hover:text-[var(--ag-accent)] transition-all">
                  <Mail size={13} className="text-ag-accent" /> {revealedContact.email}
                </a>
              )}
            </div>
          ) : connected ? (
            <div className="flex items-center gap-2 text-sm text-ag-muted">
              <CheckCircle size={14} className="text-green-400" />
              Already connected
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
            >
              {connecting
                ? <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
                : 'Connect — Reveal Contact Info'}
            </button>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <Section title="About">
          <p className="text-sm text-ag-muted leading-relaxed">{profile.bio}</p>
        </Section>
      )}

      {/* Experience */}
      <Section title="Experience">
        <div className="grid grid-cols-2 gap-3">
          {profile.years_experience !== undefined && profile.years_experience !== null && (
            <Stat label="Years Experience" value={`${profile.years_experience} years`} />
          )}
          {profile.licence_number && (
            <Stat label={profile.type === 'applicator' ? 'Pesticide Licence' : 'Commercial Licence'}
              value={`${profile.licence_number}${profile.licence_province ? ` (${profile.licence_province})` : ''}`} />
          )}
          {profile.insurance_confirmed && (
            <div className="flex items-center gap-2 text-sm">
              <Shield size={13} className="text-green-400" />
              <span className="text-ag-muted">Insurance Confirmed</span>
            </div>
          )}
        </div>

        {profile.equipment_owned && (
          <div className="mt-3">
            <div className="text-xs text-ag-muted uppercase tracking-wide mb-1.5">Equipment</div>
            <p className="text-sm text-ag-primary">{profile.equipment_owned}</p>
          </div>
        )}

        {profile.crops_experienced && profile.crops_experienced.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Crops</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.crops_experienced.map(crop => (
                <span key={crop} className="text-xs px-2.5 py-1 rounded-full border"
                  style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-text-secondary)' }}>
                  {crop}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.operations_experience && profile.operations_experience.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Operations Experience</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.operations_experience.map(exp => (
                <span key={exp} className="text-xs px-2.5 py-1 rounded-full border"
                  style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-text-secondary)' }}>
                  {exp}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.equipment_brands && profile.equipment_brands.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Equipment Brands</div>
            <div className="flex flex-wrap gap-1.5">
              {profile.equipment_brands.map(brand => (
                <span key={brand} className="text-xs px-2.5 py-1 rounded-full border"
                  style={{ borderColor: 'rgba(212,175,55,0.3)', backgroundColor: 'rgba(212,175,55,0.08)', color: 'var(--ag-accent)' }}>
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* CV Download */}
      {profile.cv_url && (
        <div className="p-5 rounded-2xl border"
          style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
          <h2 className="font-mono text-[10px] font-bold text-ag-secondary uppercase tracking-[1.5px] mb-3">
            CV / Résumé
          </h2>
          <a
            href={profile.cv_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border transition-all hover:border-[var(--ag-accent-border)]"
            style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}
          >
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--ag-bg-card)' }}>
              <FileText size={16} className="text-ag-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ag-primary">Download CV</div>
              <div className="text-xs text-ag-muted truncate">{profile.cv_url.split('/').pop()}</div>
            </div>
            <span className="text-xs text-ag-muted px-2 py-1 rounded border"
              style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
              Open
            </span>
          </a>
        </div>
      )}

      {/* Verification note */}
      {profile.verified_at && (
        <div className="flex items-start gap-2 p-3 rounded-lg border text-xs text-ag-muted"
          style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-card)' }}>
          <CheckCircle size={12} className="text-green-400 mt-0.5 flex-shrink-0" />
          <span>
            This provider has been manually verified by AG360.
            Verified {new Date(profile.verified_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}.
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl border"
      style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
      <h2 className="font-mono text-[10px] font-bold text-ag-secondary uppercase tracking-[1.5px] mb-3">
        {title}
      </h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-ag-muted uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-medium text-ag-primary">{value}</div>
    </div>
  )
}