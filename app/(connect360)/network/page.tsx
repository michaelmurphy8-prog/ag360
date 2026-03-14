'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, Sprout, Users, Briefcase,
  MapPin, Star, Phone, Mail, MessageCircle,
  Bookmark, UserCheck, Search, RefreshCw,
  ChevronRight, UserPlus, Check, X, Clock
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
  avg_rating?: number
  availability: string
  phone?: string
  email?: string
}

interface PendingRequest {
  id: string
  status: string
  message?: string
  created_at: string
  profile_id: string
  type: string
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  base_city?: string
  base_province?: string
  availability: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Custom Transport', icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { label: 'Custom Work',      icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  worker:       { label: 'Farm Worker',      icon: Users,     color: '#C9A84C', bg: '#FDF8EE' },
  professional: { label: 'Professional',     icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

const AVAIL_CONFIG: Record<string, { dot: string; text: string }> = {
  immediate:   { dot: '#22C55E', text: '#16A34A' },
  seasonal:    { dot: '#F59E0B', text: '#D97706' },
  contract:    { dot: '#60A5FA', text: '#3B82F6' },
  unavailable: { dot: '#D1D5DB', text: '#9CA3AF' },
}

type Tab = 'saved' | 'connected' | 'requests'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  return `${days}d ago`
}

export default function NetworkPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('requests')
  const [saved, setSaved] = useState<Provider[]>([])
  const [connected, setConnected] = useState<Provider[]>([])
  const [pending, setPending] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [responding, setResponding] = useState<string | null>(null)

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [savedRes, connectedRes, pendingRes] = await Promise.all([
        fetch(`/api/connect360/saved?c360_uid=${localStorage.getItem('c360_uid') ?? ''}`).then(r => r.json()),
        fetch('/api/connect360/requests?status=accepted').then(r => r.json()),
        fetch('/api/connect360/requests?incoming=true&status=pending').then(r => r.json()),
      ])

      // Saved profiles
      const savedIds: string[] = savedRes.saved_ids ?? []
      if (savedIds.length > 0) {
        const profiles = await Promise.all(
          savedIds.map(id =>
            fetch(`/api/connect360/profiles/${id}`)
              .then(r => r.json())
              .then(d => d.profile ?? d)
              .catch(() => null)
          )
        )
        setSaved(profiles.filter(Boolean))
      } else {
        setSaved([])
      }

      setConnected(connectedRes.connections ?? [])
      setPending(pendingRes.requests ?? [])
    } catch {
      setSaved([])
      setConnected([])
      setPending([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsave(id: string) {
    setSaved(s => s.filter(p => p.id !== id))
    await fetch(`/api/connect360/saved?c360_uid=${localStorage.getItem('c360_uid') ?? ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id }),
    }).catch(() => {})
  }

  async function handleRespond(requestId: string, status: 'accepted' | 'declined') {
    setResponding(requestId)
    try {
      const res = await fetch('/api/connect360/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, status }),
      })
      if (res.ok) {
        setPending(p => p.filter(r => r.id !== requestId))
        if (status === 'accepted') {
          // Refresh connections
          const connRes = await fetch('/api/connect360/requests?status=accepted').then(r => r.json())
          setConnected(connRes.connections ?? [])
        }
      }
    } catch {} finally {
      setResponding(null)
    }
  }

  const savedFiltered = saved.filter(p => {
    const name = p.business_name || `${p.first_name} ${p.last_name}`
    return name.toLowerCase().includes(search.toLowerCase())
  })
  const connectedFiltered = connected.filter(p => {
    const name = p.business_name || `${p.first_name} ${p.last_name}`
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const TABS = [
    { key: 'requests',  label: 'Requests',    icon: Clock,      count: pending.length   },
    { key: 'connected', label: 'Connections', icon: UserCheck,  count: connected.length },
    { key: 'saved',     label: 'Saved',       icon: Bookmark,   count: saved.length     },
  ] as const

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 12 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>My Network</h1>
        <p className="text-xs" style={{ color: '#8A9BB0' }}>
          Requests, connections and saved providers
        </p>

        {/* 3-tab toggle */}
        <div className="flex rounded-2xl p-1 mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0D1520' : '#8A9BB0',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}>
                <Icon size={13} />
                {tab.label}
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{
                      backgroundColor: active
                        ? (tab.key === 'requests' ? '#EF4444' : '#0D1520')
                        : 'rgba(255,255,255,0.15)',
                      color: '#FFFFFF',
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search — only for saved/connected */}
      {(activeTab === 'saved' || activeTab === 'connected') && (
        (activeTab === 'saved' ? saved : connected).length > 0 && (
          <div className="px-5 mb-4">
            <div className="flex items-center gap-3 px-4 rounded-2xl"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 44 }}>
              <Search size={15} style={{ color: '#B0A898' }} />
              <input
                className="flex-1 text-sm bg-transparent outline-none"
                style={{ color: '#0D1520' }}
                placeholder={`Search ${activeTab}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        )
      )}

      {/* ── REQUESTS TAB ── */}
      {activeTab === 'requests' && (
        <div className="px-5 space-y-3 pb-8">
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFFFFF' }} />
            ))
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: '#FDF8EE' }}>
                <Clock size={28} style={{ color: '#C9A84C' }} />
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>No pending requests</h3>
              <p className="text-sm" style={{ color: '#8A9BB0' }}>
                Connection requests from other users will appear here
              </p>
            </div>
          ) : (
            pending.map(req => {
              const cfg = TYPE_CONFIG[req.type] ?? TYPE_CONFIG.worker
              const Icon = cfg.icon
              const name = req.business_name || `${req.first_name} ${req.last_name}`
              const isResponding = responding === req.id

              return (
                <div key={req.id} className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
                  {/* Profile row */}
                  <button onClick={() => router.push(`/profile/${req.profile_id}`)}
                    className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.bg }}>
                      {req.photo_url
                        ? <img src={req.photo_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                        : <Icon size={20} style={{ color: cfg.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm" style={{ color: '#0D1520' }}>{name}</div>
                      <div className="text-xs font-medium" style={{ color: '#C9A84C' }}>{cfg.label}</div>
                      {req.base_city && (
                        <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                          <MapPin size={9} />{req.base_city}{req.base_province ? `, ${req.base_province}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] flex-shrink-0" style={{ color: '#B0A898' }}>
                      {timeAgo(req.created_at)}
                    </div>
                  </button>

                  {/* Message preview */}
                  {req.message && (
                    <div className="px-4 pb-3">
                      <p className="text-xs italic leading-relaxed"
                        style={{ color: '#8A9BB0', borderLeft: '2px solid #EEE9E0', paddingLeft: 10 }}>
                        "{req.message}"
                      </p>
                    </div>
                  )}

                  {/* Accept / Decline */}
                  <div className="flex gap-2 px-4 pb-4">
                    <button
                      onClick={() => handleRespond(req.id, 'declined')}
                      disabled={!!isResponding}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: '#F7F5F0', color: '#8A9BB0', border: '1px solid #EEE9E0' }}>
                      {isResponding ? <RefreshCw size={13} className="animate-spin" /> : <><X size={13} /> Decline</>}
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'accepted')}
                      disabled={!!isResponding}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                      {isResponding ? <RefreshCw size={13} className="animate-spin" /> : <><Check size={13} /> Accept</>}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ── CONNECTED + SAVED TABS ── */}
      {(activeTab === 'connected' || activeTab === 'saved') && (
        <div className="px-5 space-y-3 pb-8">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFFFFF' }} />
            ))
          ) : (activeTab === 'saved' ? savedFiltered : connectedFiltered).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: '#FDF8EE' }}>
                {activeTab === 'saved'
                  ? <Bookmark size={28} style={{ color: '#C9A84C' }} />
                  : <UserPlus size={28} style={{ color: '#C9A84C' }} />}
              </div>
              <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>
                {activeTab === 'saved' ? 'No saved providers' : 'No connections yet'}
              </h3>
              <p className="text-sm mb-5" style={{ color: '#8A9BB0' }}>
                {activeTab === 'saved'
                  ? 'Bookmark providers to find them here'
                  : 'Accepted connection requests will appear here'}
              </p>
              <button onClick={() => router.push('/discover')}
                className="px-5 py-2.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                Browse providers
              </button>
            </div>
          ) : (
            (activeTab === 'saved' ? savedFiltered : connectedFiltered).map(p => {
              const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.worker
              const Icon = cfg.icon
              const avail = AVAIL_CONFIG[p.availability] ?? AVAIL_CONFIG.unavailable
              const name = p.business_name || `${p.first_name} ${p.last_name}`
              const rating = p.avg_rating ? Number(p.avg_rating).toFixed(1) : null
              const location = [p.base_city, p.base_province].filter(Boolean).join(', ')

              return (
                <div key={p.id} className="rounded-2xl overflow-hidden"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                  <button onClick={() => router.push(`/profile/${p.id}`)}
                    className="w-full flex items-center gap-4 p-4 text-left">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cfg.bg }}>
                      {p.photo_url
                        ? <img src={p.photo_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                        : <Icon size={20} style={{ color: cfg.color }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate" style={{ color: '#0D1520' }}>{name}</div>
                      <div className="text-xs font-medium mt-0.5" style={{ color: '#C9A84C' }}>{cfg.label}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {location && (
                          <span className="flex items-center gap-0.5 text-xs" style={{ color: '#8A9BB0' }}>
                            <MapPin size={10} /> {location}
                          </span>
                        )}
                        {rating && (
                          <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: '#D97706' }}>
                            <Star size={10} fill="#F59E0B" style={{ color: '#F59E0B' }} /> {rating}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: avail.dot }} />
                          <span style={{ color: avail.text }}>
                            {p.availability === 'immediate' ? 'Available' : p.availability}
                          </span>
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={16} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                  </button>

                  {/* Actions — connections only */}
                  {activeTab === 'connected' && (
                    <div className="flex items-center gap-2 px-4 pb-3">
                      {p.phone && (
                        <a href={`tel:${p.phone}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                          style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}>
                          <Phone size={13} /> Call
                        </a>
                      )}
                      {p.email && (
                        <a href={`mailto:${p.email}`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                          style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}>
                          <Mail size={13} /> Email
                        </a>
                      )}
                      <button onClick={() => router.push(`/messages?open=${p.id}`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                        <MessageCircle size={13} /> Message
                      </button>
                    </div>
                  )}

                  {/* Unsave — saved tab only */}
                  {activeTab === 'saved' && (
                    <div className="px-4 pb-3">
                      <button onClick={() => handleUnsave(p.id)}
                        className="w-full py-2 rounded-xl text-xs font-semibold"
                        style={{ backgroundColor: '#F7F5F0', color: '#8A9BB0' }}>
                        Remove from saved
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}