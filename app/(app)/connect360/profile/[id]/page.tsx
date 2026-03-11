'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  ChevronLeft, CheckCircle, MapPin, Truck, Sprout,
  Users, Globe, Phone, Mail, Building2, Calendar,
  Wheat, RefreshCw, AlertCircle, Shield, FileText,
  Briefcase, BadgeCheck, Languages, Scale, Star, ThumbsUp, Flag, Camera
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
  // Professional fields
  professional_sub_type?: string
  licence_verified?: boolean
  services_offered?: string[]
  languages_spoken?: string[]
  remote_service?: boolean
  countries_served?: string[]
  worker_origin_countries?: string[]
  // Worker sponsorship fields
  seeking_tfw_sponsorship?: boolean
  seeking_h2a_sponsorship?: boolean
  citizenship_country?: string
  available_from?: string
  available_to?: string
  clerk_user_id?: string
}

// ─── Constants ────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trucker:    { label: 'Custom Trucker',    icon: Truck,   color: 'text-blue-400' },
  applicator: { label: 'Custom Applicator', icon: Sprout,  color: 'text-green-400' },
  worker:     { label: 'Seasonal Worker',   icon: Users,   color: 'text-amber-400' },
  farmer:     { label: 'Farmer',            icon: Globe,   color: 'text-ag-accent' },
  professional: { label: 'Professional Services', icon: Briefcase, color: 'text-purple-400' },
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
  const { userId } = useAuth()

  const [profile, setProfile] = useState<ConnectProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [togglingAvailability, setTogglingAvailability] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const isOwner = !!(userId && profile?.clerk_user_id && userId === profile.clerk_user_id)
  const [revealedContact, setRevealedContact] = useState<{ phone?: string; email?: string } | null>(null)

  // Reviews
  const [reviews, setReviews] = useState<any[]>([])
  const [reviewTotal, setReviewTotal] = useState(0)
  const [reviewAverage, setReviewAverage] = useState<number | null>(null)
  const [wouldRehireCount, setWouldRehireCount] = useState(0)
  const [myReview, setMyReview] = useState<any | null>(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewHoverRating, setReviewHoverRating] = useState(0)
  const [reviewBody, setReviewBody] = useState('')
  const [reviewHireType, setReviewHireType] = useState('')
  const [reviewSeasonYear, setReviewSeasonYear] = useState(new Date().getFullYear())
  const [reviewWouldRehire, setReviewWouldRehire] = useState<boolean | null>(null)
  const [reviewSaving, setReviewSaving] = useState(false)

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

  useEffect(() => {
    fetch(`/api/connect360/reviews?profile_id=${id}`)
      .then(r => r.json())
      .then(data => {
        setReviews(data.reviews ?? [])
        setReviewTotal(data.total ?? 0)
        setReviewAverage(data.average ?? null)
        setWouldRehireCount(data.would_rehire_count ?? 0)
      })
      .catch(() => {})
  }, [id])

  useEffect(() => {
    fetch('/api/connect360/reviews')
      .then(r => r.json())
      .then(data => {
        const mine = (data.reviews ?? []).find((r: any) => r.profile_id === id)
        if (mine) {
          setMyReview(mine)
          setReviewRating(mine.rating)
          setReviewBody(mine.body ?? '')
          setReviewHireType(mine.hire_type ?? '')
          setReviewSeasonYear(mine.season_year ?? new Date().getFullYear())
          setReviewWouldRehire(mine.would_rehire ?? null)
        }
      })
      .catch(() => {})
  }, [id])

  async function handleSubmitReview() {
    if (!reviewRating) return
    setReviewSaving(true)
    try {
      const res = await fetch('/api/connect360/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_id: id,
          rating: reviewRating,
          review_body: reviewBody,
          hire_type: reviewHireType,
          season_year: reviewSeasonYear,
          would_rehire: reviewWouldRehire,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMyReview(data.review)
        setShowReviewForm(false)
        // Refresh aggregate
        fetch(`/api/connect360/reviews?profile_id=${id}`)
          .then(r => r.json())
          .then(d => {
            setReviews(d.reviews ?? [])
            setReviewTotal(d.total ?? 0)
            setReviewAverage(d.average ?? null)
            setWouldRehireCount(d.would_rehire_count ?? 0)
          })
      }
    } catch {
    } finally {
      setReviewSaving(false)
    }
  }

  async function handleReport() {
    if (!reportReason.trim()) return
    setReportSending(true)
    try {
      await fetch('/api/connect360/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile?.id, reason: reportReason }),
      })
      setReportSent(true)
      setTimeout(() => setShowReportModal(false), 2000)
    } catch {
    } finally {
      setReportSending(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingPhoto(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('profile_id', profile.id)
      const res = await fetch('/api/connect360/upload-photo', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) setProfile(p => p ? { ...p, photo_url: data.url } : p)
    } catch {
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleToggleAvailability() {
    if (!profile) return
    setTogglingAvailability(true)
    const next = profile.availability === 'unavailable' ? 'immediate' : 'unavailable'
    try {
      const res = await fetch(`/api/connect360/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability: next }),
      })
      if (res.ok) setProfile(p => p ? { ...p, availability: next } : p)
    } catch {
    } finally {
      setTogglingAvailability(false)
    }
  }

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
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-accent)' }}>
              {profile.photo_url
                ? <img src={profile.photo_url} className="w-16 h-16 rounded-xl object-cover" alt="" />
                : initials}
            </div>
            {isOwner && (
              <label className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)' }}
                title="Change photo">
                {uploadingPhoto
                  ? <RefreshCw size={10} className="animate-spin" />
                  : <Camera size={10} />}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
            )}
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
              {(profile.available_from || profile.available_to) && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-ag-muted"
                  style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                  {profile.available_from
                    ? new Date(profile.available_from + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })
                    : '?'}
                  {' – '}
                  {profile.available_to
                    ? new Date(profile.available_to + 'T00:00:00').toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Open'}
                </span>
              )}
              {isOwner && (
                <button
                  onClick={handleToggleAvailability}
                  disabled={togglingAvailability}
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all"
                  style={profile.availability === 'unavailable'
                    ? { borderColor: 'rgba(74,222,128,0.3)', color: 'rgb(74,222,128)', backgroundColor: 'rgba(74,222,128,0.1)' }
                    : { borderColor: 'rgba(248,113,113,0.3)', color: 'rgb(248,113,113)', backgroundColor: 'rgba(248,113,113,0.1)' }}>
                  {togglingAvailability ? '...' : profile.availability === 'unavailable' ? '✓ Mark Available' : 'Mark as Hired'}
                </button>
              )}
              {profile.open_to_relocation && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/20">
                  Open to Relocate
                </span>
              )}
              {profile.licence_verified && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border text-purple-400 bg-purple-400/10 border-purple-400/20">
                  <BadgeCheck size={9} /> Licence Verified
                </span>
              )}
              {profile.seeking_tfw_sponsorship && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-sky-400 bg-sky-400/10 border-sky-400/20">
                  Open to TFW Sponsorship
                </span>
              )}
              {profile.seeking_h2a_sponsorship && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-sky-400 bg-sky-400/10 border-sky-400/20">
                  Open to H-2A Sponsorship
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
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 text-[11px] text-ag-dim hover:text-red-400 transition-colors mt-2"
          >
            <Flag size={11} /> Report this listing
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 space-y-4"
            style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-ag-primary flex items-center gap-2">
                <Flag size={14} className="text-red-400" /> Report Listing
              </h3>
              <button onClick={() => setShowReportModal(false)} className="text-ag-muted hover:text-ag-primary">✕</button>
            </div>
            {reportSent ? (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle size={14} /> Report submitted. Thank you.
              </div>
            ) : (
              <>
                <p className="text-xs text-ag-muted">Describe the issue with this listing. AG360 staff will review within 48 hours.</p>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border text-sm text-ag-primary outline-none"
                  style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-input)' }}>
                  <option value="">Select a reason...</option>
                  <option value="fake_listing">Fake or fraudulent listing</option>
                  <option value="wrong_info">Incorrect information</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="scam">Suspected scam</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={handleReport}
                  disabled={!reportReason || reportSending}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{ backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)', opacity: !reportReason ? 0.5 : 1 }}>
                  {reportSending ? 'Submitting...' : 'Submit Report'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Professional Services */}
      {profile.type === 'professional' && (profile.professional_sub_type || profile.services_offered?.length || profile.languages_spoken?.length) && (
        <Section title="Professional Services">
          <div className="space-y-4">
            {/* Sub-type + licence */}
            <div className="grid grid-cols-2 gap-3">
              {profile.professional_sub_type && (
                <Stat
                  label="Specialization"
                  value={
                    ({
                      immigration_consultant: 'Immigration Consultant (RCIC)',
                      ag_accountant:          'Ag Accountant / Tax Advisor',
                      crop_consultant:        'Crop Consultant',
                      agrologist:             'Agrologist (P.Ag)',
                      recruitment_agency:     'Farm Recruitment Agency',
                      farm_lawyer:            'Agricultural Lawyer',
                      ag_insurance:           'Ag Insurance Broker',
                      farm_lender:            'Farm Lender / Financial Advisor',
                      veterinarian:           'Veterinarian / Herd Health',
                      environmental:          'Environmental Consultant',
                    } as Record<string, string>)[profile.professional_sub_type] ?? profile.professional_sub_type
                  }
                />
              )}
              {profile.remote_service !== undefined && (
                <Stat label="Service Mode" value={profile.remote_service ? 'Remote & In-Person' : 'In-Person Only'} />
              )}
            </div>

            {/* Countries served */}
            {profile.countries_served && profile.countries_served.length > 0 && (
              <div>
                <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Countries Served</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.countries_served.map(c => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-text-secondary)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Services offered */}
            {profile.services_offered && profile.services_offered.length > 0 && (
              <div>
                <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Services Offered</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.services_offered.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'rgba(167,139,250,0.3)', backgroundColor: 'rgba(167,139,250,0.08)', color: '#A78BFA' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            {profile.languages_spoken && profile.languages_spoken.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs text-ag-muted uppercase tracking-wide mb-2">
                  <Languages size={11} /> Languages
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.languages_spoken.map(l => (
                    <span key={l} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-text-secondary)' }}>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Worker origin countries (immigration only) */}
            {profile.professional_sub_type === 'immigration_consultant' && profile.worker_origin_countries && profile.worker_origin_countries.length > 0 && (
              <div>
                <div className="text-xs text-ag-muted uppercase tracking-wide mb-2">Worker Origin Countries</div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.worker_origin_countries.map(c => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-full border"
                      style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)', color: 'var(--ag-text-secondary)' }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Legal disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-lg border text-xs text-ag-muted"
              style={{ borderColor: 'rgba(167,139,250,0.2)', backgroundColor: 'rgba(167,139,250,0.04)' }}>
              <Scale size={11} className="mt-0.5 flex-shrink-0 text-purple-400" />
              <span>Professional service listings are for informational purposes only. AG360 does not provide legal, financial, or agronomic advice. Always verify credentials independently before engaging services.</span>
            </div>
          </div>
        </Section>
      )}

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

      {/* Reviews */}
      <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--ag-bg-card)', borderColor: 'var(--ag-border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-[10px] font-bold text-ag-secondary uppercase tracking-[1.5px] mb-1">Reviews</h2>
            {reviewAverage !== null ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} fill={s <= Math.round(Number(reviewAverage)) ? 'var(--ag-accent)' : 'transparent'}
                      className={s <= Math.round(Number(reviewAverage)) ? 'text-ag-accent' : 'text-ag-dim'} />
                  ))}
                </div>
                <span className="text-sm font-bold text-ag-primary">{Number(reviewAverage).toFixed(1)}</span>
                <span className="text-xs text-ag-muted">· {reviewTotal} review{reviewTotal !== 1 ? 's' : ''}</span>
                {wouldRehireCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-400 ml-1">
                    <ThumbsUp size={11} /> {wouldRehireCount} would rehire
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-ag-muted">No reviews yet</p>
            )}
          </div>
          {connected && (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all"
              style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-secondary)' }}>
              {myReview ? 'Edit Review' : '+ Leave a Review'}
            </button>
          )}
        </div>

        {/* Review form */}
        {showReviewForm && connected && (
          <div className="mb-4 p-4 rounded-xl border space-y-3"
            style={{ borderColor: 'var(--ag-accent-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] font-mono font-semibold text-ag-muted mb-2">Rating *</div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(s => (
                  <button key={s}
                    onClick={() => setReviewRating(s)}
                    onMouseEnter={() => setReviewHoverRating(s)}
                    onMouseLeave={() => setReviewHoverRating(0)}>
                    <Star size={22}
                      fill={(reviewHoverRating || reviewRating) >= s ? 'var(--ag-accent)' : 'transparent'}
                      className={(reviewHoverRating || reviewRating) >= s ? 'text-ag-accent' : 'text-ag-dim'} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] font-mono font-semibold text-ag-muted mb-1">Hire Type</div>
                <select value={reviewHireType} onChange={e => setReviewHireType(e.target.value)}
                  className="w-full bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:outline-none">
                  <option value="">Select...</option>
                  {['Seeding', 'Spraying', 'Harvest', 'Trucking', 'General Labour', 'Professional Service', 'Other'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[1.5px] font-mono font-semibold text-ag-muted mb-1">Season Year</div>
                <select value={reviewSeasonYear} onChange={e => setReviewSeasonYear(Number(e.target.value))}
                  className="w-full bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:outline-none">
                  {[2026,2025,2024,2023,2022].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] font-mono font-semibold text-ag-muted mb-1">Comments</div>
              <textarea value={reviewBody} onChange={e => setReviewBody(e.target.value)} rows={3}
                placeholder="Showed up on time, great equipment, would hire again..."
                className="w-full bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary placeholder-ag-dim focus:outline-none resize-none" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[1.5px] font-mono font-semibold text-ag-muted mb-2">Would you rehire?</div>
              <div className="flex gap-2">
                {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                  <button key={String(opt.val)} onClick={() => setReviewWouldRehire(opt.val)}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={reviewWouldRehire === opt.val
                      ? { backgroundColor: 'var(--ag-accent)', color: 'var(--ag-bg-primary)', borderColor: 'var(--ag-accent)' }
                      : { borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)' }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowReviewForm(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border"
                style={{ borderColor: 'var(--ag-border)', color: 'var(--ag-text-muted)' }}>
                Cancel
              </button>
              <button onClick={handleSubmitReview} disabled={!reviewRating || reviewSaving}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all"
                style={{ backgroundColor: reviewRating ? 'var(--ag-accent)' : 'var(--ag-bg-hover)',
                  color: reviewRating ? 'var(--ag-bg-primary)' : 'var(--ag-text-dim)',
                  opacity: reviewSaving ? 0.6 : 1 }}>
                {reviewSaving ? <RefreshCw size={12} className="animate-spin" /> : <Star size={12} />}
                {myReview ? 'Update Review' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}

        {/* Review list */}
        {reviews.length === 0 ? (
          <p className="text-xs text-ag-muted text-center py-4">
            {connected ? 'Be the first to leave a review.' : 'Connect with this provider to leave a review.'}
          </p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r: any) => (
              <div key={r.id} className="p-3 rounded-xl border"
                style={{ borderColor: 'var(--ag-border)', backgroundColor: 'var(--ag-bg-hover)' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={11}
                        fill={s <= r.rating ? 'var(--ag-accent)' : 'transparent'}
                        className={s <= r.rating ? 'text-ag-accent' : 'text-ag-dim'} />
                    ))}
                    <span className="text-[11px] font-bold text-ag-primary ml-1">{r.rating}/5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.would_rehire && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        <ThumbsUp size={9} /> Would rehire
                      </span>
                    )}
                    <span className="text-[10px] text-ag-muted">
                      {r.hire_type && `${r.hire_type} · `}{r.season_year}
                    </span>
                  </div>
                </div>
                {r.body && <p className="text-xs text-ag-muted leading-relaxed">{r.body}</p>}
                <p className="text-[10px] text-ag-dim mt-1.5">
                  {r.reviewer_farm ?? 'Verified Farmer'} · {new Date(r.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

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