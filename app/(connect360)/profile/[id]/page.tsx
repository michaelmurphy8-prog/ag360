'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ArrowLeft, Truck, Sprout, Users, Briefcase,
  MapPin, Star, Phone, Mail, MessageCircle,
  Bookmark, BookmarkCheck, Send, RefreshCw,
  Award, Calendar, Globe, Shield, ChevronRight,
  X, CheckCircle2, Flag
} from 'lucide-react'

interface Profile {
  id: string
  type: string
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  bio?: string
  base_city?: string
  base_province?: string
  base_country?: string
  phone?: string
  email?: string
  years_experience?: number
  availability: string
  available_from?: string
  available_to?: string
  equipment_brands?: string[]
  operations_experience?: string[]
  service_radius_km?: number
  worldwide?: boolean
  holds_licence?: boolean
  driver_licence_type?: string
  cv_url?: string
  avg_rating?: number
  review_count?: number
  verified_at?: string
  clerk_user_id?: string
}

interface Review {
  id: string
  rating: number
  comment?: string
  reviewer_name: string
  created_at: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Trucker',      icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { label: 'Applicator',   icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  worker:       { label: 'Worker',       icon: Users,     color: '#C9A84C', bg: '#FDF8EE' },
  professional: { label: 'Professional', icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

const AVAIL_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  immediate:   { label: 'Available now', dot: '#22C55E', text: '#16A34A', bg: '#F0FDF4' },
  seasonal:    { label: 'Seasonal',      dot: '#F59E0B', text: '#D97706', bg: '#FFFBEB' },
  contract:    { label: 'Contract',      dot: '#60A5FA', text: '#3B82F6', bg: '#EFF6FF' },
  unavailable: { label: 'Unavailable',   dot: '#D1D5DB', text: '#9CA3AF', bg: '#F9FAFB' },
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12}
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#D1D5DB' }} />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useUser()
  const id = params?.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [saved, setSaved] = useState(false)
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportSent, setReportSent] = useState(false)

  const isOwner = user && profile?.clerk_user_id === user.id

  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`/api/connect360/profiles/${id}`).then(r => r.json()),
      fetch(`/api/connect360/reviews?profile_id=${id}`).then(r => r.json()),
      fetch(`/api/connect360/saved`).then(r => r.json()),
      fetch(`/api/connect360/requests?profile_id=${id}`).then(r => r.json()).catch(() => ({ status: null })),
    ]).then(([profileData, reviewData, savedData, requestData]) => {
      setProfile(profileData.profile ?? profileData)
      setReviews(reviewData.reviews ?? [])
      setSaved((savedData.saved_ids ?? []).includes(id))
      setConnected(requestData.status === 'accepted')
    }).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  async function handleSave() {
    setSaved(s => !s)
    await fetch('/api/connect360/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id }),
    }).catch(() => {})
  }

  async function handleConnect() {
    setConnecting(true)
    try {
      await fetch('/api/connect360/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: id }),
      })
      setConnected(true)
    } catch {} finally {
      setConnecting(false)
    }
  }

  async function handleSendMessage() {
    if (!chatInput.trim()) return
    setChatSending(true)
    const body = chatInput.trim()
    setChatInput('')
    try {
      const res = await fetch('/api/connect360/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: id, body }),
      })
      const data = await res.json()
      setMessages(m => [...m, data.message])
    } catch {} finally {
      setChatSending(false)
    }
  }

  async function handleReport() {
    await fetch('/api/connect360/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id, reason: reportReason }),
    }).catch(() => {})
    setReportSent(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: '#F7F5F0' }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: '#C9A84C' }} />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ backgroundColor: '#F7F5F0' }}>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#0D1520' }}>Provider not found</h2>
        <button onClick={() => router.back()} className="text-sm" style={{ color: '#C9A84C' }}>
          Go back
        </button>
      </div>
    )
  }

  const cfg = TYPE_CONFIG[profile.type] ?? TYPE_CONFIG.worker
  const Icon = cfg.icon
  const avail = AVAIL_CONFIG[profile.availability] ?? AVAIL_CONFIG.unavailable
  const name = profile.business_name || `${profile.first_name} ${profile.last_name}`
  const rating = profile.avg_rating ? Number(profile.avg_rating) : null
  const location = [profile.base_city, profile.base_province, profile.base_country].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Hero photo / header */}
      <div style={{
        background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)',
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        paddingBottom: 28,
        position: 'relative',
      }}>
        {/* Nav row */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button onClick={() => router.back()}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <ArrowLeft size={18} style={{ color: '#FFFFFF' }} />
          </button>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <button onClick={() => setShowReport(true)}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Flag size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
              </button>
            )}
            <button onClick={handleSave}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: saved ? '#C9A84C' : 'rgba(255,255,255,0.1)' }}>
              {saved
                ? <BookmarkCheck size={16} style={{ color: '#FFFFFF' }} />
                : <Bookmark size={16} style={{ color: '#FFFFFF' }} />}
            </button>
            {isOwner && (
              <button onClick={() => router.push(`/edit/${profile.id}`)}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
                Edit
              </button>
            )}
          </div>
        </div>

        {/* Avatar + identity */}
        <div className="flex flex-col items-center text-center px-5">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-4 relative"
            style={{ backgroundColor: cfg.bg }}>
            {profile.photo_url
              ? <img src={profile.photo_url} className="w-24 h-24 rounded-3xl object-cover" alt="" />
              : <Icon size={36} style={{ color: cfg.color }} />}
            {profile.verified_at && (
              <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#22C55E', border: '2px solid #0A1018' }}>
                <Shield size={12} color="#fff" />
              </div>
            )}
          </div>
          <h1 className="text-xl font-bold mb-1" style={{ color: '#FFFFFF' }}>{name}</h1>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(201,168,76,0.2)', color: '#C9A84C' }}>
              {cfg.label}
            </span>
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ backgroundColor: avail.bg + '22', color: avail.text }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.dot }} />
              {avail.label}
            </span>
          </div>
          {location && (
            <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              <MapPin size={11} /> {location}
            </span>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex items-center justify-center gap-8 mt-5 px-5">
          {rating && (
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                {rating.toFixed(1)}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Rating
              </div>
            </div>
          )}
          {profile.review_count ? (
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                {profile.review_count}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Reviews
              </div>
            </div>
          ) : null}
          {profile.years_experience ? (
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                {profile.years_experience}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Yrs exp
              </div>
            </div>
          ) : null}
          {profile.service_radius_km ? (
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
                {profile.worldwide ? '∞' : `${profile.service_radius_km}`}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {profile.worldwide ? 'Worldwide' : 'km radius'}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-5 pb-8 space-y-4">

        {/* Bio */}
        {profile.bio && (
          <div className="p-4 rounded-2xl" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#4A5568' }}>{profile.bio}</p>
          </div>
        )}

        {/* Details card */}
        <div className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {profile.years_experience && (
            <div className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid #F7F5F0' }}>
              <Award size={16} style={{ color: '#C9A84C' }} />
              <span className="text-sm" style={{ color: '#0D1520' }}>
                {profile.years_experience} years experience
              </span>
            </div>
          )}
          {(profile.available_from || profile.available_to) && (
            <div className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid #F7F5F0' }}>
              <Calendar size={16} style={{ color: '#C9A84C' }} />
              <span className="text-sm" style={{ color: '#0D1520' }}>
                {profile.available_from} {profile.available_to ? `→ ${profile.available_to}` : ''}
              </span>
            </div>
          )}
          {profile.service_radius_km && (
            <div className="flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: '1px solid #F7F5F0' }}>
              <Globe size={16} style={{ color: '#C9A84C' }} />
              <span className="text-sm" style={{ color: '#0D1520' }}>
                {profile.worldwide ? 'Available worldwide' : `${profile.service_radius_km}km service radius`}
              </span>
            </div>
          )}
          {profile.holds_licence && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <Shield size={16} style={{ color: '#22C55E' }} />
              <span className="text-sm" style={{ color: '#0D1520' }}>
                {profile.driver_licence_type
                  ? `${profile.driver_licence_type} licence`
                  : 'Licensed'}
              </span>
            </div>
          )}
        </div>

        {/* Equipment */}
        {profile.equipment_brands && profile.equipment_brands.length > 0 && (
          <div className="p-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3"
              style={{ color: '#8A9BB0' }}>Equipment</h3>
            <div className="flex flex-wrap gap-2">
              {profile.equipment_brands.map(b => (
                <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Operations experience */}
        {profile.operations_experience && profile.operations_experience.length > 0 && (
          <div className="p-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h3 className="text-xs font-bold uppercase tracking-wide mb-3"
              style={{ color: '#8A9BB0' }}>Experience</h3>
            <div className="flex flex-wrap gap-2">
              {profile.operations_experience.map(e => (
                <span key={e} className="px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: '#F7F5F0', color: '#4A5568' }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {reviews.length > 0 && (
          <div className="p-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wide"
                style={{ color: '#8A9BB0' }}>Reviews</h3>
              {rating && <StarRow rating={rating} />}
            </div>
            <div className="space-y-3">
              {reviews.slice(0, 3).map(r => (
                <div key={r.id} className="pb-3" style={{ borderBottom: '1px solid #F7F5F0' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold" style={{ color: '#0D1520' }}>
                      {r.reviewer_name}
                    </span>
                    <StarRow rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="text-xs leading-relaxed" style={{ color: '#8A9BB0' }}>{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CV download */}
        {profile.cv_url && (
          <a href={profile.cv_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#FDF8EE' }}>
                <Award size={16} style={{ color: '#C9A84C' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#0D1520' }}>
                View Resume / CV
              </span>
            </div>
            <ChevronRight size={16} style={{ color: '#8A9BB0' }} />
          </a>
        )}

      </div>

      {/* Fixed bottom action bar */}
      {!isOwner && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-30 px-5"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
            paddingTop: 12,
            backgroundColor: '#F7F5F0',
            borderTop: '1px solid #EEE9E0',
          }}>
          {connected ? (
            <div className="flex gap-3">
              {profile.phone && (
                <a href={`tel:${profile.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: '#FFFFFF', color: '#0D1520', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <Phone size={15} /> Call
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
                  style={{ backgroundColor: '#FFFFFF', color: '#0D1520', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                  <Mail size={15} /> Email
                </a>
              )}
              <button onClick={() => setShowChat(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold"
                style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                <MessageCircle size={15} /> Message
              </button>
            </div>
          ) : (
            <button onClick={handleConnect} disabled={connecting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all"
              style={{
                backgroundColor: '#C9A84C',
                color: '#FFFFFF',
                boxShadow: '0 4px 20px rgba(201,168,76,0.4)',
                opacity: connecting ? 0.7 : 1,
              }}>
              {connecting
                ? <RefreshCw size={16} className="animate-spin" />
                : <><Send size={15} /> Request to Connect</>}
            </button>
          )}
        </div>
      )}

      {/* Chat panel */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: '#F7F5F0' }}>
          <div className="flex items-center gap-3 px-5 pt-12 pb-4"
            style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #EEE9E0' }}>
            <button onClick={() => setShowChat(false)}>
              <ArrowLeft size={20} style={{ color: '#0D1520' }} />
            </button>
            <div className="flex-1">
              <div className="font-bold text-sm" style={{ color: '#0D1520' }}>{name}</div>
              <div className="text-xs" style={{ color: '#8A9BB0' }}>Connected</div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => {
              const isMine = m.sender_id !== profile.clerk_user_id
              return (
                <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      backgroundColor: isMine ? '#C9A84C' : '#FFFFFF',
                      color: isMine ? '#FFFFFF' : '#0D1520',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    }}>
                    {m.body}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 pb-8 pt-3"
            style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EEE9E0' }}>
            <div className="flex gap-3 items-center">
              <input
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}
                placeholder="Write a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage} disabled={chatSending || !chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: chatInput.trim() ? '#C9A84C' : '#EEE9E0',
                }}>
                {chatSending
                  ? <RefreshCw size={14} className="animate-spin" style={{ color: '#FFFFFF' }} />
                  : <Send size={14} style={{ color: chatInput.trim() ? '#FFFFFF' : '#B0A898' }} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-md mx-auto rounded-t-3xl p-6"
            style={{ backgroundColor: '#FFFFFF' }}>
            {reportSent ? (
              <div className="text-center py-4">
                <CheckCircle2 size={40} style={{ color: '#22C55E', margin: '0 auto 12px' }} />
                <h3 className="font-bold text-base mb-1" style={{ color: '#0D1520' }}>Report submitted</h3>
                <p className="text-sm mb-4" style={{ color: '#8A9BB0' }}>Thanks for keeping Connect360 safe.</p>
                <button onClick={() => { setShowReport(false); setReportSent(false) }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold"
                  style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-base" style={{ color: '#0D1520' }}>Report provider</h3>
                  <button onClick={() => setShowReport(false)}>
                    <X size={20} style={{ color: '#8A9BB0' }} />
                  </button>
                </div>
                <div className="space-y-2 mb-5">
                  {['Fake profile', 'Inappropriate content', 'Spam', 'Fraudulent activity', 'Other'].map(r => (
                    <button key={r}
                      onClick={() => setReportReason(r)}
                      className="w-full text-left px-4 py-3 rounded-xl text-sm"
                      style={{
                        backgroundColor: reportReason === r ? '#FDF8EE' : '#F7F5F0',
                        color: reportReason === r ? '#C9A84C' : '#0D1520',
                        fontWeight: reportReason === r ? 700 : 400,
                        border: reportReason === r ? '1px solid #C9A84C' : '1px solid transparent',
                      }}>
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleReport}
                  disabled={!reportReason}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold"
                  style={{
                    backgroundColor: '#EF4444',
                    color: '#FFFFFF',
                    opacity: reportReason ? 1 : 0.4,
                  }}>
                  Submit Report
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}