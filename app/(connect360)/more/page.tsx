'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import {
  User, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Star, Bookmark, FileText,
  Globe, Info, MessageSquare, Briefcase,
  Home, Tractor, Truck, Users, Sprout, CheckCircle, Clock, XCircle, Fingerprint, UserX, Trash2
} from 'lucide-react'

interface ConnectProfile {
  id: string
  type: string
  status: string
  first_name: string
  last_name: string
  business_name?: string
  avg_rating?: number
  review_count?: number
  photo_url?: string
}

interface MenuRow {
  icon: React.ElementType
  label: string
  sublabel?: string
  action?: () => void
  badge?: string | number
  danger?: boolean
  soon?: boolean
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

  const [c360Email, setC360Email] = useState<string | null>(null)
  useEffect(() => {
    const stored = localStorage.getItem('c360_email')
    if (stored) setC360Email(stored)
    // Only fetch profile if signed into Connect360
    if (!stored) {
      setProfile(null)
      setProfileLoading(false)
      return
    }
    const url = `/api/connect360/profiles?my_profile=true&c360_email=${encodeURIComponent(stored)}`
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.profile?.id) setProfile(d.profile) })
      .finally(() => setProfileLoading(false))
  }, [])

  async function handlePasskeySetup() {
    try {
      await user?.createPasskey()
      alert('Face ID / Touch ID set up successfully!')
    } catch (err: any) {
      alert(err?.errors?.[0]?.message ?? 'Setup failed. Please try again.')
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    await fetch('/api/connect360/session', { method: 'DELETE' })
    localStorage.removeItem('c360_email')
    localStorage.removeItem('c360_uid')
    localStorage.removeItem('c360_first_name')
    try { await signOut({ redirectUrl: '/auth' }) } catch {}
    // Force redirect in case Clerk doesn't cooperate
    setTimeout(() => { window.location.href = '/auth' }, 500)
  }
async function handleDeleteAccount() {
    const confirmed = window.confirm('Are you sure you want to delete your account? This will permanently remove your profile, connections, messages, and all data. This cannot be undone.')
    if (!confirmed) return
    const doubleConfirm = window.confirm('This is permanent. Delete your Connect360 account?')
    if (!doubleConfirm) return
    try {
      const profileId = profile?.id
      if (profileId) {
        await fetch(`/api/connect360/profiles/${profileId}`, { method: 'DELETE' })
      }
      await fetch('/api/connect360/session', { method: 'DELETE' })
      localStorage.removeItem('c360_email')
      localStorage.removeItem('c360_uid')
      localStorage.removeItem('c360_first_name')
      try { await signOut({ redirectUrl: '/auth' }) } catch {}
      window.location.href = '/auth'
    } catch {
      alert('Failed to delete account. Please contact hello@ag360.farm')
    }
  }
  const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : (user?.fullName || user?.firstName || 'Your Account')
  const email = c360Email ?? user?.primaryEmailAddress?.emailAddress ?? ''
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
        { icon: Fingerprint, label: 'Face ID / Touch ID', sublabel: 'Set up biometric sign in', soon: true },
        { icon: Shield, label: 'Privacy & safety', action: () => router.push('/privacy-safety') },
        { icon: UserX, label: 'Hidden from', sublabel: 'Control who can see your profile', action: () => router.push('/hidden-from') },
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
        { icon: Trash2, label: 'Delete account', sublabel: 'Permanently remove your account', action: handleDeleteAccount, danger: true },
      ],
    },
  ]

  return (
    <div className="min-h-screen pb-28" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Sign-out overlay — covers AG360 flash */}
      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)' }}>
          <div className="text-2xl font-black tracking-tight mb-3" style={{ color: '#FFFFFF' }}>
            Connect<span style={{ color: '#C9A84C' }}>360</span>
          </div>
          <div className="text-xs" style={{ color: '#8A9BB0' }}>Signing out...</div>
        </div>
      )}

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
          onClick={() => router.push(profile ? `/profile/${profile.id}` : '/register')}
          className="w-full text-left rounded-2xl overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Top row — avatar + identity */}
          <div className="flex items-center gap-4 p-4 pb-3">
            {profile?.photo_url || user?.imageUrl ? (
              <img src={profile?.photo_url ?? user?.imageUrl} className="w-14 h-14 rounded-2xl object-cover flex-shrink-0" alt="" />
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
          </div>
          {/* Stats strip — only when profile exists */}
          {profile && (
            <div className="flex items-center border-t mx-4 py-3 gap-0"
              style={{ borderColor: '#F0EDE8' }}>
              <div className="flex-1 text-center">
                <div className="text-base font-black" style={{ color: '#0D1520' }}>
                  {profile.avg_rating ? Number(profile.avg_rating).toFixed(1) : '—'}
                </div>
                <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#B0A898' }}>Rating</div>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: '#F0EDE8' }} />
              <div className="flex-1 text-center">
                <div className="text-base font-black" style={{ color: '#0D1520' }}>
                  {profile.review_count ?? 0}
                </div>
                <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#B0A898' }}>Reviews</div>
              </div>
              <div className="w-px h-8" style={{ backgroundColor: '#F0EDE8' }} />
              <div className="flex-1 text-center">
                <div className="text-base font-black" style={{ color: '#C9A84C' }}>
                  {TYPE_LABELS[profile.type] ?? profile.type}
                </div>
                <div className="text-[10px] mt-0.5 font-medium" style={{ color: '#B0A898' }}>Type</div>
              </div>
            </div>
          )}
          {/* No profile CTA */}
          {!profile && !profileLoading && (
            <div className="mx-4 mb-4 px-4 py-2.5 rounded-xl text-center text-xs font-bold"
              style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
              Register as a provider →
            </div>
          )}
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