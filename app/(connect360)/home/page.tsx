'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Truck, Sprout, Users, Briefcase, Tractor,
  ArrowRight, Star, MapPin, Bell,
  Sunrise, Sun, Moon, ChevronRight
} from 'lucide-react'

interface Stats {
  total: number
  countries: number
  types: { farmer: number; trucker: number; applicator: number; worker: number; professional: number }
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
  availability: string
}

const TYPE_CONFIG: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  bg: string
}> = {
  farmer:       { label: 'Farmer',                    icon: Tractor,   color: '#16A34A', bg: '#F0FDF4' },
  worker:       { label: 'Full Time & Seasonal Worker', icon: Users,    color: '#D97706', bg: '#FFF7ED' },
  trucker:      { label: 'Custom Transport',           icon: Truck,     color: '#3B82F6', bg: '#EFF6FF' },
  applicator:   { label: 'Custom Work',                icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  professional: { label: 'Professional Services',      icon: Briefcase, color: '#8B5CF6', bg: '#F5F3FF' },
}

const AVAIL_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  immediate:   { label: 'Available now', color: '#16A34A', dot: '#22C55E' },
  seasonal:    { label: 'Seasonal',      color: '#D97706', dot: '#F59E0B' },
  contract:    { label: 'Contract',      color: '#3B82F6', dot: '#60A5FA' },
  unavailable: { label: 'Unavailable',   color: '#9CA3AF', dot: '#D1D5DB' },
}

function GreetingIcon() {
  const h = new Date().getHours()
  if (h < 12) return <Sunrise size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
  if (h < 17) return <Sun size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
  return <Moon size={14} style={{ color: 'rgba(255,255,255,0.45)' }} />
}

function greetingText() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function GraticuleGrid() {
  const width = 720
  const height = 200
  const cx = width / 2   // globe center x
  const cy = height / 2  // globe center y
  const rx = width / 2   // horizontal radius
  const ry = height / 2  // vertical radius
  const lines: React.ReactNode[] = []

  // Latitude lines — ellipses that get flatter toward poles
  for (let lat = -75; lat <= 75; lat += 15) {
    const y = cy - (lat / 90) * ry
    // Width of ellipse shrinks toward poles using cos projection
    const rowRx = rx * Math.cos((lat * Math.PI) / 180)
    const isBold = lat === 0
    lines.push(
      <ellipse
        key={`lat-${lat}`}
        cx={cx} cy={y}
        rx={rowRx} ry={ry * 0.04}
        fill="none"
        stroke="#C9A84C"
        strokeWidth={isBold ? 1.0 : 0.5}
      />
    )
  }

  // Longitude lines — ellipses rotated to simulate meridians on a globe
  const lonCount = 12
  for (let i = 0; i < lonCount; i++) {
    const angle = (i / lonCount) * 180 // 0–180 degrees rotation
    const isBold = i === 0 || i === lonCount / 2
    lines.push(
      <ellipse
        key={`lon-${i}`}
        cx={cx} cy={cy}
        rx={rx * 0.18}
        ry={ry}
        fill="none"
        stroke="#C9A84C"
        strokeWidth={isBold ? 1.0 : 0.5}
        transform={`rotate(${angle}, ${cx}, ${cy})`}
      />
    )
  }

  // Outer circle — the globe edge
  lines.push(
    <ellipse
      key="globe-edge"
      cx={cx} cy={cy}
      rx={rx} ry={ry}
      fill="none"
      stroke="#C9A84C"
      strokeWidth="1.0"
    />
  )

  return <g>{lines}</g>
}
export default function Connect360HomePage() {
  const router = useRouter()
  const { user } = useUser()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<RecentProvider[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetch('/api/connect360/public-stats')
      .then(r => r.json()).then(setStats).catch(() => {})
    fetch('/api/connect360/profiles?limit=4')
      .then(r => r.json()).then(d => setRecent(d.profiles ?? [])).catch(() => {})
    fetch('/api/connect360/messages')
      .then(r => r.json())
      .then(d => {
        const total = (d.threads ?? []).reduce((s: number, t: any) => s + (t.unread_count ?? 0), 0)
        setUnreadCount(total)
      }).catch(() => {})
  }, [])

  const [firstName, setFirstName] = useState('there')
  useEffect(() => {
    const stored = localStorage.getItem('c360_first_name')
    if (stored) { setFirstName(stored); return }
    const email = localStorage.getItem('c360_email')
    const emailFirst = email ? email.split('@')[0].split('.')[0] : null
    const emailFirstCap = emailFirst ? emailFirst.charAt(0).toUpperCase() + emailFirst.slice(1) : null
    setFirstName(stored ?? user?.firstName ?? emailFirstCap ?? 'there')
  }, [user])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* ── HERO ── */}
      <div style={{
        background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)',
        borderBottomLeftRadius: 36,
        borderBottomRightRadius: 36,
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Animated world map */}
        <div style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
          <style>{`
            @keyframes drift {
              0%   { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
            .world-drift {
              animation: drift 60s linear infinite;
              will-change: transform;
            }
          `}</style>
          <svg
            className="world-drift"
            viewBox="0 0 1440 200"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '200%',
              height: '100%',
              opacity: 0.18,
            }}
            preserveAspectRatio="xMidYMid slice"
          >
            <GraticuleGrid />
            <g transform="translate(720, 0)">
              <GraticuleGrid />
            </g>
          </svg>
        {/* Orbiting satellite */}
          <div style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 12px) + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.35,
          }}>
            <style>{`
              @keyframes satellite-float {
                0%   { transform: translateX(-50%) translateY(0px) rotate(0deg); }
                50%  { transform: translateX(-50%) translateY(-4px) rotate(4deg); }
                100% { transform: translateX(-50%) translateY(0px) rotate(0deg); }
              }
              .satellite {
                animation: satellite-float 6s ease-in-out infinite;
                transform-origin: center;
              }
            `}</style>
            <svg className="satellite" width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="13" y="13" width="10" height="10" rx="2" fill="#C9A84C" opacity="0.9" />
              <line x1="18" y1="13" x2="18" y2="7" stroke="#C9A84C" strokeWidth="1.2" />
              <circle cx="18" cy="6" r="1.5" fill="#C9A84C" />
              <rect x="3" y="15" width="8" height="6" rx="1" fill="none" stroke="#C9A84C" strokeWidth="1" />
              <line x1="7" y1="15" x2="7" y2="21" stroke="#C9A84C" strokeWidth="0.6" />
              <line x1="11" y1="18" x2="13" y2="18" stroke="#C9A84C" strokeWidth="1" />
              <rect x="25" y="15" width="8" height="6" rx="1" fill="none" stroke="#C9A84C" strokeWidth="1" />
              <line x1="29" y1="15" x2="29" y2="21" stroke="#C9A84C" strokeWidth="0.6" />
              <line x1="23" y1="18" x2="25" y2="18" stroke="#C9A84C" strokeWidth="1" />
              <circle cx="18" cy="28" r="1" fill="#C9A84C" opacity="0.5" />
              <circle cx="18" cy="32" r="0.7" fill="#C9A84C" opacity="0.25" />
            </svg>
          </div>
          {/* Second satellite — right side */}
          <div style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 12px) + 40px)',
            right: '18%',
            opacity: 0.2,
          }}>
            <style>{`
              @keyframes satellite-float-2 {
                0%   { transform: translateY(0px) rotate(0deg); }
                50%  { transform: translateY(-3px) rotate(-3deg); }
                100% { transform: translateY(0px) rotate(0deg); }
              }
              .satellite-2 {
                animation: satellite-float-2 8s ease-in-out infinite;
                transform-origin: center;
              }
            `}</style>
            <svg className="satellite-2" width="24" height="24" viewBox="0 0 36 36" fill="none">
              <rect x="13" y="13" width="10" height="10" rx="2" fill="#C9A84C" opacity="0.9" />
              <line x1="18" y1="13" x2="18" y2="7" stroke="#C9A84C" strokeWidth="1.2" />
              <circle cx="18" cy="6" r="1.5" fill="#C9A84C" />
              <rect x="3" y="15" width="8" height="6" rx="1" fill="none" stroke="#C9A84C" strokeWidth="1" />
              <line x1="7" y1="15" x2="7" y2="21" stroke="#C9A84C" strokeWidth="0.6" />
              <line x1="11" y1="18" x2="13" y2="18" stroke="#C9A84C" strokeWidth="1" />
              <rect x="25" y="15" width="8" height="6" rx="1" fill="none" stroke="#C9A84C" strokeWidth="1" />
              <line x1="29" y1="15" x2="29" y2="21" stroke="#C9A84C" strokeWidth="0.6" />
              <line x1="23" y1="18" x2="25" y2="18" stroke="#C9A84C" strokeWidth="1" />
            </svg>
          </div>
        </div>
        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pb-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 56px)' }}>
            <div>
              <p className="text-[11px] mb-1 flex items-center gap-1.5 font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}>
                {greetingText()}
              </p>
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>
                {firstName}
              </h1>
            </div>
            {unreadCount > 0 && (
              <button onClick={() => router.push('/messages')}
                className="relative w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <Bell size={18} style={{ color: '#FFFFFF' }} />
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center"
                  style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
                  {unreadCount}
                </span>
              </button>
            )}
          </div>

          {/* Stats card */}
          <div className="mx-5 mb-7 rounded-2xl p-4"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(8px)',
            }}>
            <div className="grid grid-cols-4">
              {[
                { label: 'Farmers',   count: stats?.types.farmer     ?? 0 },
                { label: 'Workers',   count: stats?.types.worker     ?? 0 },
                { label: 'Transport', count: stats?.types.trucker    ?? 0 },
                { label: 'Custom',    count: stats?.types.applicator ?? 0 },
              ].map((s, i) => (
                <div key={s.label}
                  className="text-center px-1 py-1"
                  style={{
                    borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  }}>
                  <div className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>
                    {s.count}
                  </div>
                  <div className="text-[8px] font-semibold tracking-wide uppercase mt-1 leading-tight"
                    style={{ color: '#C9A84C' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 flex items-center justify-between"
              style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {stats?.total ?? 0} users · {stats?.countries ?? 0} countries
              </span>
              <button onClick={() => router.push('/discover')}
                className="flex items-center gap-1 text-xs font-semibold"
                style={{ color: '#C9A84C' }}>
                Browse all <ArrowRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-5 pt-6 space-y-6">

        {/* Find by type */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: '#0D1520' }}>Find by type</h2>
          </div>
          <div className="flex flex-col gap-2">
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon
              const count = stats?.types[key as keyof typeof stats.types]
              const isFarmer = key === 'farmer'
              return (
                <button key={key}
                  onClick={() => router.push(`/discover?type=${key}`)}
                  className="w-full p-4 rounded-2xl text-left transition-all active:scale-95"
                  style={{
                    backgroundColor: '#FFFFFF',
                    boxShadow: isFarmer
                      ? '0 0 0 2px rgba(201,168,76,0.25), 0 4px 24px rgba(201,168,76,0.2)'
                      : '0 2px 12px rgba(0,0,0,0.06)',
                    border: isFarmer ? '2px solid rgba(201,168,76,0.4)' : '1px solid #EEE9E0',
                  }}>
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: isFarmer ? '#FDF8EE' : '#F7F5F0' }}>
                      <Icon size={20} style={{ color: isFarmer ? '#C9A84C' : '#8A9BB0' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: '#0D1520' }}>{cfg.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                        {count !== undefined ? `${count} available` : '—'}
                      </div>
                    </div>
                    {isFarmer ? (
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                        Connect Now →
                      </div>
                    ) : (
                      <ChevronRight size={16} style={{ color: '#B0A898', flexShrink: 0 }} />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

                {/* Register CTA */}
        <button onClick={() => router.push('/register')}
          className="w-full p-5 rounded-2xl flex items-center justify-between transition-all active:scale-95 mb-4"
          style={{
            background: 'linear-gradient(135deg, #0A1018 0%, #162030 100%)',
            boxShadow: '0 4px 20px rgba(10,16,24,0.25)',
          }}>
          <div className="text-left">
            <div className="text-sm font-bold mb-0.5" style={{ color: '#FFFFFF' }}>
              List your services
            </div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Register as a provider · Start Connecting
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#C9A84C' }}>
            <ArrowRight size={16} color="#fff" />
          </div>
        </button>

      </div>
    </div>
  )
}