'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Truck, Sprout, Users, Briefcase,
  MapPin, Star, Phone, Mail, MessageCircle,
  Bookmark, UserCheck, Search, RefreshCw,
  ChevronRight, UserPlus
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

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Trucker',      icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { label: 'Applicator',   icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  worker:       { label: 'Worker',       icon: Users,     color: '#C9A84C', bg: '#FDF8EE' },
  professional: { label: 'Professional', icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

const AVAIL_CONFIG: Record<string, { dot: string; text: string }> = {
  immediate:   { dot: '#22C55E', text: '#16A34A' },
  seasonal:    { dot: '#F59E0B', text: '#D97706' },
  contract:    { dot: '#60A5FA', text: '#3B82F6' },
  unavailable: { dot: '#D1D5DB', text: '#9CA3AF' },
}

type Tab = 'saved' | 'connected'

export default function NetworkPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('saved')
  const [saved, setSaved] = useState<Provider[]>([])
  const [connected, setConnected] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [savedRes, connectedRes] = await Promise.all([
        fetch('/api/connect360/saved').then(r => r.json()),
        fetch('/api/connect360/requests?status=accepted').then(r => r.json()),
      ])

      // Fetch full profiles for saved IDs
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
    } catch {
      setSaved([])
      setConnected([])
    } finally {
      setLoading(false)
    }
  }

  async function handleUnsave(id: string) {
    setSaved(s => s.filter(p => p.id !== id))
    await fetch('/api/connect360/saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: id }),
    }).catch(() => {})
  }

  const list = activeTab === 'saved' ? saved : connected
  const filtered = list.filter(p => {
    const name = p.business_name || `${p.first_name} ${p.last_name}`
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 12 }}>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#FFFFFF' }}>My Network</h1>
        <p className="text-xs" style={{ color: '#8A9BB0' }}>
          Your saved providers and active connections
        </p>
      </div>

      {/* Tab toggle */}
      <div className="px-5 mb-4">
        <div className="flex rounded-2xl p-1"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {([
            { key: 'saved',     label: 'Saved',      icon: Bookmark,   count: saved.length     },
            { key: 'connected', label: 'Connections', icon: UserCheck,  count: connected.length },
          ] as const).map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#0D1520' : 'transparent',
                  color: active ? '#FFFFFF' : '#8A9BB0',
                  boxShadow: active ? '0 2px 8px rgba(13,21,32,0.2)' : 'none',
                }}>
                <Icon size={15} />
                {tab.label}
                {tab.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: active ? 'rgba(255,255,255,0.2)' : '#F7F5F0',
                      color: active ? '#FFFFFF' : '#8A9BB0',
                    }}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      {list.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex items-center gap-3 px-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 44 }}>
            <Search size={15} style={{ color: '#B0A898' }} />
            <input
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#0D1520' }}
              placeholder={`Search ${activeTab === 'saved' ? 'saved' : 'connections'}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Provider list */}
      <div className="px-5 space-y-3 pb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse"
              style={{ backgroundColor: '#FFFFFF' }} />
          ))
        ) : filtered.length === 0 ? (
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
                : 'Connect with providers to build your network'}
            </p>
            <button onClick={() => router.push('/discover')}
              className="px-5 py-2.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
              Browse providers
            </button>
          </div>
        ) : (
          filtered.map(p => {
            const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.worker
            const Icon = cfg.icon
            const avail = AVAIL_CONFIG[p.availability] ?? AVAIL_CONFIG.unavailable
            const name = p.business_name || `${p.first_name} ${p.last_name}`
            const rating = p.avg_rating ? Number(p.avg_rating).toFixed(1) : null
            const location = [p.base_city, p.base_province].filter(Boolean).join(', ')

            return (
              <div key={p.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {/* Main row */}
                <button
                  onClick={() => router.push(`/profile/${p.id}`)}
                  className="w-full flex items-center gap-4 p-4 text-left">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    {p.photo_url
                      ? <img src={p.photo_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                      : <Icon size={20} style={{ color: cfg.color }} />}
                  </div>
                  {/* Info */}
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
                        <span className="flex items-center gap-0.5 text-xs font-semibold"
                          style={{ color: '#D97706' }}>
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

                {/* Action row — only for connections */}
                {activeTab === 'connected' && (
                  <div className="flex items-center gap-2 px-4 pb-3 pt-0">
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
                    <button
                      onClick={() => router.push(`/messages?open=${p.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
                      style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
                      <MessageCircle size={13} /> Message
                    </button>
                  </div>
                )}

                {/* Unsave button — only for saved */}
                {activeTab === 'saved' && (
                  <div className="px-4 pb-3">
                    <button
                      onClick={() => handleUnsave(p.id)}
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
    </div>
  )
}