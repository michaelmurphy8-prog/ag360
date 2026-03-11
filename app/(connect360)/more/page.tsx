'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import {
  User, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Star, Bookmark, FileText,
  Globe, Info, MessageSquare, Briefcase
} from 'lucide-react'

interface MenuRow {
  icon: React.ElementType
  label: string
  sublabel?: string
  action: () => void
  badge?: string | number
  danger?: boolean
}

export default function MorePage() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    router.replace('/auth')
  }

  const name = user?.fullName || user?.firstName || 'Your Account'
  const email = user?.primaryEmailAddress?.emailAddress ?? ''
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const sections: { title: string; rows: MenuRow[] }[] = [
    {
      title: 'My Profile',
      rows: [
        {
          icon: User,
          label: 'Edit profile',
          sublabel: 'Update your Connect360 listing',
          action: () => router.push('/profile'),
        },
        {
          icon: Star,
          label: 'My reviews',
          sublabel: 'See what others are saying',
          action: () => router.push('/profile'),
        },
        {
          icon: Bookmark,
          label: 'Saved providers',
          action: () => router.push('/network'),
        },
        {
          icon: Briefcase,
          label: 'Active bids',
          sublabel: 'Bids you\'ve placed on job posts',
          action: () => router.push('/network?tab=bids'),
          badge: 'Soon',
        },
      ],
    },
    {
      title: 'Account',
      rows: [
        {
          icon: Bell,
          label: 'Notifications',
          sublabel: 'Manage alerts and messages',
          action: () => {},
          badge: 'Soon',
        },
        {
          icon: Shield,
          label: 'Privacy & safety',
          action: () => {},
          badge: 'Soon',
        },
        {
          icon: Globe,
          label: 'Language & region',
          action: () => {},
          badge: 'Soon',
        },
      ],
    },
    {
      title: 'Support',
      rows: [
        {
          icon: HelpCircle,
          label: 'Help center',
          action: () => window.open('mailto:hello@ag360.farm', '_blank'),
        },
        {
          icon: MessageSquare,
          label: 'Send feedback',
          action: () => window.open('mailto:hello@ag360.farm?subject=Connect360 Feedback', '_blank'),
        },
        {
          icon: FileText,
          label: 'Terms & privacy',
          action: () => window.open('https://ag360.farm', '_blank'),
        },
        {
          icon: Info,
          label: 'About Connect360',
          sublabel: 'Version 1.0 · For AG, by a farmer.',
          action: () => {},
        },
      ],
    },
    {
      title: '',
      rows: [
        {
          icon: LogOut,
          label: 'Sign out',
          action: handleSignOut,
          danger: true,
        },
      ],
    },
  ]

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <h1 className="text-2xl font-bold mb-4" style={{ color: '#0D1520' }}>More</h1>

        {/* Profile card */}
        <button
          onClick={() => router.push('/profile')}
          className="w-full flex items-center gap-4 p-4 rounded-2xl text-left"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Avatar */}
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
            <div className="mt-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                Connected member
              </span>
            </div>
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
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: row.danger ? '#FFF0F0' : '#F7F5F0',
                      }}>
                      <Icon size={16} style={{ color: row.danger ? '#EF4444' : '#C9A84C' }} />
                    </div>
                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold"
                        style={{ color: row.danger ? '#EF4444' : '#0D1520' }}>
                        {signingOut && row.danger ? 'Signing out...' : row.label}
                      </div>
                      {row.sublabel && (
                        <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>{row.sublabel}</div>
                      )}
                    </div>
                    {/* Badge or chevron */}
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
        <p className="text-xs" style={{ color: '#D1D5DB' }}>
          Connect360 · For AG, by a farmer.
        </p>
        <p className="text-[10px] mt-1" style={{ color: '#E2DDD8' }}>
          © {new Date().getFullYear()} AG360 Inc.
        </p>
      </div>
    </div>
  )
}