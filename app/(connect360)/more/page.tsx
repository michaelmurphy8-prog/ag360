'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import {
  User, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Star, Bookmark, FileText,
  Globe, Info, MessageSquare, Briefcase,
  Home, Tractor, Truck, Users, Sprout, CheckCircle, Clock, XCircle
} from 'lucide-react'

interface ConnectProfile {
  id: string
  type: string
  status: string
  first_name: string
  last_name: string
  business_name?: string
}

interface MenuRow {
  icon: React.ElementType
  label: string
  sublabel?: string
  action: () => void
  badge?: string | number
  danger?: boolean
}

const TYPE_LABELS: Record<string, string> = {
  farmer: 'Farmer', worker: 'Worker', trucker: 'Custom Transport',
  applicator: 'Custom Work', professional: 'Professional',
}
const TYPE_ICONS: Record<string, React.ElementType> = {
  farmer: Tractor, worker: Users, trucker: Truck,
  applicator: Sprout, professional: Briefcase,
}

export default function MorePage() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [signingOut, setSigningOut] = useState(false)
  const [profile, setProfile] = useState<ConnectProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    fetch('/api/connect360/profiles?my_profile=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.id) setProfile(d) })
      .finally(() => setProfileLoading(false))
  }, [])

  async function handleSignOut() {
    setSigningOut(true)
    await signOut({ redirectUrl: '/auth' })
  }

  const name = user?.fullName || user?.firstName || 'Your Account'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const ProfileIcon = profile ? (TYPE_ICONS[profile.type] ?? User) : User

  function StatusBadge() {
    if (profileLoading) return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{ backgroundColor: '#F7F5F0', color: '#B0A898' }}>Loading...</span>
    )
    if (!profile) return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{ backgroundColor: '#FFF3CD', color: '#D97706' }}>
        No profile — Register
      </span>
    )
    const configs: Record<string, { bg: string; color: string; label: string; Icon: React.ElementType }> = {
      approved: { bg: '#F0FDF4', color: '#16A34A', label: `${TYPE_LABELS[profile.type] ?? profile.type} · Active`, Icon: CheckCircle },
      pending:  { bg: '#FFF7ED', color: '#D97706', label: 'Profile pending review', Icon: Clock },
      rejected: { bg: '#FFF0F0', color: '#EF4444', label: 'Profile not approved', Icon: XCircle },
    }
    const cfg = configs[profile.status] ?? configs.pending
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
        <cfg.Icon size={9} />
        {cfg.label}
      </span>
    )
  }

  const profileRows: MenuRow[] = [
    {
      icon: User,
      label: profile ? 'Edit profile' : 'Create profile',
      sublabel: profile ? 'Update your Connect360 listing' : 'Join the Connect360 network',
      action: () => router.push(profile ? '/profile' : '/register'),
    },
    {
          icon: Bookmark,
          label: 'Saved providers',
          sublabel: 'Providers you\'ve bookmarked',
          action: () => router.push('/network?tab=saved'),
        },
        {
          icon: Star,
          label: 'My reviews',
          sublabel: 'See what others are saying',
          action: () => router.push('/profile'),
          badge: 'Soon' as const,
        },
      ...(profile?.type === 'farmer' ? [{
        icon: Briefcase,
        label: 'My job posts',
        sublabel: 'Manage jobs you\'ve posted',
        action: () => router.push('/jobs?tab=mine'),
      }] : [{
        icon: Briefcase,
        label: 'My applications',
        sublabel: 'Jobs you\'ve applied to',
        action: () => router.push('/jobs?tab=applied'),
      }]),
  ]

  const sections: { title: string; rows: MenuRow[] }[] = [
    { title: 'My Profile', rows: profileRows },
    {
      title: 'Account',
      rows: [
        { icon: Bell, label: 'Notifications', sublabel: 'Manage alerts and messages', action: () => router.push('/notifications') },
        { icon: Shield, label: 'Privacy & safety', action: () => router.push('/privacy-safety') },
        { icon: Globe, label: 'Language & region', action: () => router.push('/language-region') },
      ],
    },
    {
      title: 'Support',
      rows: [
        { icon: HelpCircle, label: 'Help center', action: () => window.open('mailto:hello@ag360.farm', '_blank') },
        { icon: MessageSquare, label: 'Send feedback', action: () => window.open('mailto:hello@ag360.farm?subject=Connect360 Feedback', '_blank') },
        { icon: FileText, label: 'Terms & privacy', action: () => router.push('/terms-privacy') },
        { icon: Info, label: 'About Connect360', sublabel: 'Version 1.0 · For AG, by a farmer.', action: () => router.push('/about') },
      ],
    },
    {
      title: '',
      rows: [
        { icon: LogOut, label: 'Sign out', action: handleSignOut, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 4 }}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>More</h1>
          <button onClick={() => router.push('/home')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#FFFFFF' }}>
            <Home size={12} /> Home
          </button>
        </div>

        {/* Profile card */}
        <button
          onClick={() => router.push(profile ? '/profile' : '/register')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" alt="" />
          ) : (
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-lg font-bold"
              style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-base truncate" style={{ color: '#0D1520' }}>{name}</div>
            <div className="text-xs truncate mt-0.5" style={{ color: '#8A9BB0' }}>{email}</div>
            <div className="mt-1.5"><StatusBadge /></div>
          </div>
          <ChevronRight size={16} style={{ color: '#D1D5DB', flexShrink: 0 }} />
        </button>
      </div>

      {/* Menu sections */}
      <div className="px-5 space-y-4">
        {sections.map((section, si) => (
          <div key={si}>
            {section.title && (
              <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
                style={{ color: '#B0A898' }}>
                {section.title}
              </div>
            )}
            <div className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              {section.rows.map((row, ri) => {
                const Icon = row.icon
                return (
                  <button key={ri}
                    onClick={row.action}
                    disabled={signingOut && row.danger}
                    className="w-full flex items-center gap-4 px-4 text-left transition-all active:bg-gray-50"
                    style={{
                      minHeight: 56,
                      borderBottom: ri < section.rows.length - 1 ? '1px solid #F3F0EB' : 'none',
                    }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: row.danger ? '#FFF0F0' : '#F7F5F0' }}>
                      <Icon size={16} style={{ color: row.danger ? '#EF4444' : '#C9A84C' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold"
                        style={{ color: row.danger ? '#EF4444' : '#0D1520' }}>
                        {signingOut && row.danger ? 'Signing out...' : row.label}
                      </div>
                      {row.sublabel && (
                        <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>{row.sublabel}</div>
                      )}
                    </div>
                    {row.badge ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: '#F7F5F0', color: '#B0A898' }}>
                        {row.badge}
                      </span>
                    ) : !row.danger && (
                      <ChevronRight size={14} style={{ color: '#D1D5DB', flexShrink: 0 }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center mt-8 px-5">
        <p className="text-xs" style={{ color: '#D1D5DB' }}>Connect360 · For AG, by a farmer.</p>
        <p className="text-[10px] mt-1" style={{ color: '#E2DDD8' }}>© {new Date().getFullYear()} AG360 Inc.</p>
      </div>
    </div>
  )
}