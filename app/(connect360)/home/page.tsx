'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Truck, Sprout, Users, Briefcase,
  ArrowRight, Star, MapPin, Bell, Bookmark,
  Sunrise, Sunset, Moon
} from 'lucide-react'

interface Stats {
  total: number
  provinces: number
  types: {
    trucker: number
    applicator: number
    worker: number
    professional: number
  }
}

interface RecentProvider {
  id: string
  type: string
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  base_city?: string
  base_province?: string
  avg_rating?: number
  review_count?: number
  availability: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { label: 'Trucker',      icon: Truck,      color: '#60A5FA', bg: 'rgba(96,165,250,0.1)' },
  applicator:   { label: 'Applicator',   icon: Sprout,     color: '#4ADE80', bg: 'rgba(74,222,128,0.1)' },
  worker:       { label: 'Worker',       icon: Users,      color: '#FBBF24', bg: 'rgba(251,191,36,0.1)' },
  professional: { label: 'Professional', icon: Briefcase,  color: '#C084FC', bg: 'rgba(192,132,252,0.1)' },
}

const AVAILABILITY_COLORS: Record<string, string> = {
  immediate:   '#2DD4A0',
  seasonal:    '#FBBF24',
  contract:    '#60A5FA',
  unavailable: '#4A5568',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function GreetingIcon() {
  const h = new Date().getHours()
  if (h < 12) return <Sunrise size={22} style={{ color: '#C9A84C' }} />
  if (h < 17) return <Sunset size={22} style={{ color: '#C9A84C' }} />
  return <Moon size={22} style={{ color: '#C9A84C' }} />
}

export default function Connect360HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentProvider[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Public stats
    fetch('/api/connect360/public-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})

    // Recent providers (first 6 approved)
    fetch('/api/connect360/profiles?limit=6')
      .then(r => r.json())
      .then(data => setRecent(data.profiles ?? []))
      .catch(() => {})

    // Saved count
    fetch('/api/connect360/saved')
      .then(r => r.json())
      .then(data => setSavedCount(data.saved_ids?.length ?? 0))
      .catch(() => {})

    // Unread messages
    fetch('/api/connect360/messages')
      .then(r => r.json())
      .then(data => {
        const total = (data.threads ?? []).reduce((s: number, t: any) => s + (t.unread_count ?? 0), 0)
        setUnreadCount(total)
      })
      .catch(() => {})
  }, [])

  const firstName = user?.firstName ?? 'Farmer'

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: '#0D1520' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm mb-0.5" style={{ color: '#4A5568' }}>{greeting()}</p>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#F0F4F8' }}>
              {firstName} <GreetingIcon />
            </h1>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {unreadCount > 0 && (
              <button onClick={() => router.push('/messages')}
                className="relative p-2 rounded-xl"
                style={{ backgroundColor: '#152030', border: '1px solid #1E3048' }}>
                <Bell size={18} style={{ color: '#C9A84C' }} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#C9A84C', color: '#080D14' }}>
                  {unreadCount}
                </span>
              </button>
            )}
            <button onClick={() => router.push('/network')}
              className="relative p-2 rounded-xl"
              style={{ backgroundColor: '#152030', border: '1px solid #1E3048' }}>
              <Bookmark size={18} style={{ color: savedCount > 0 ? '#C9A84C' : '#4A5568' }} />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#C9A84C', color: '#080D14' }}>
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="mx-5 mb-6 rounded-2xl p-4"
          style={{ backgroundColor: '#152030', border: '1px solid #1E3048' }}>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Truckers',      count: stats.types.trucker,      color: '#60A5FA' },
              { label: 'Applicators',   count: stats.types.applicator,   color: '#4ADE80' },
              { label: 'Workers',       count: stats.types.worker,       color: '#FBBF24' },
              { label: 'Professionals', count: stats.types.professional, color: '#C084FC' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.count}</div>
                <div className="text-[9px] leading-tight mt-0.5" style={{ color: '#4A5568' }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 flex items-center justify-between"
            style={{ borderTop: '1px solid #1A2535' }}>
            <span className="text-xs" style={{ color: '#4A5568' }}>
              {stats.total} verified providers · {stats.provinces} provinces
            </span>
            <button onClick={() => router.push('/discover')}
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: '#C9A84C' }}>
              Browse all <ArrowRight size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Quick filters */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>Find by type</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            const count = stats?.types[key as keyof typeof stats.types]
            return (
              <button key={key}
                onClick={() => router.push(`/discover?type=${key}`)}
                className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-95"
                style={{ backgroundColor: '#152030', border: '1px solid #1E3048' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cfg.bg }}>
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>{cfg.label}</div>
                  {count !== undefined && (
                    <div className="text-xs" style={{ color: '#4A5568' }}>{count} available</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Recently added */}
      {recent.length > 0 && (
        <div className="px-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold" style={{ color: '#F0F4F8' }}>Recently added</h2>
            <button onClick={() => router.push('/discover')}
              className="text-xs font-medium" style={{ color: '#C9A84C' }}>
              See all
            </button>
          </div>
          <div className="space-y-3">
            {recent.slice(0, 4).map(p => {
              const cfg = TYPE_CONFIG[p.type] ?? TYPE_CONFIG.worker
              const Icon = cfg.icon
              const name = p.business_name || `${p.first_name} ${p.last_name}`
              const avgRating = p.avg_rating ? Number(p.avg_rating) : null
              return (
                <button key={p.id}
                  onClick={() => router.push(`/profile/${p.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-95"
                  style={{ backgroundColor: '#152030', border: '1px solid #1E3048' }}>
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    {p.photo_url
                      ? <img src={p.photo_url} className="w-11 h-11 rounded-xl object-cover" alt="" />
                      : <Icon size={18} style={{ color: cfg.color }} />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate" style={{ color: '#F0F4F8' }}>{name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(p.base_city || p.base_province) && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: '#4A5568' }}>
                          <MapPin size={9} /> {[p.base_city, p.base_province].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {avgRating && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: '#FBBF24' }}>
                          <Star size={9} fill="#FBBF24" /> {avgRating}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Availability dot */}
                  <div className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: AVAILABILITY_COLORS[p.availability] ?? '#4A5568' }} />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Register CTA */}
      <div className="mx-5 mt-6">
        <button onClick={() => router.push('/register')}
          className="w-full p-4 rounded-2xl flex items-center justify-between transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)',
            border: '1px solid rgba(201,168,76,0.3)',
          }}>
          <div className="text-left">
            <div className="text-sm font-semibold" style={{ color: '#C9A84C' }}>List your services</div>
            <div className="text-xs mt-0.5" style={{ color: '#4A5568' }}>Register as a provider — free 30-day trial</div>
          </div>
          <ArrowRight size={16} style={{ color: '#C9A84C' }} />
        </button>
      </div>
    </div>
  )
}