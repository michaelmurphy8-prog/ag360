'use client'
import { ClerkProvider } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Compass, Users, MessageCircle, Briefcase, Grid3X3, Home } from 'lucide-react'
const TABS = [
  { href: '/discover', icon: Compass,       label: 'Discover'  },
  { href: '/jobs',     icon: Briefcase,     label: 'Jobs'      },
  { href: '/messages', icon: MessageCircle, label: 'Messages'  },
  { href: '/network',  icon: Users,         label: 'Network'   },
  { href: '/more',     icon: Grid3X3,       label: 'More'      },
]

const NO_TAB_ROUTES = ['/splash', '/auth', '/register']
const NO_HOME_BUTTON = ['/splash', '/auth', '/register', '/home', '/jobs', '/more', '/notifications', '/privacy-safety', '/language-region', '/terms-privacy', '/about']

export default function Connect360Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  // Sync localStorage session to server cookie on every page load
  useEffect(() => {
    const email = localStorage.getItem('c360_email')
    const uid = localStorage.getItem('c360_uid')
    if (email && uid) {
      fetch('/api/connect360/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId: uid }),
      }).catch(() => {})
    }
  }, [])
const [networkBadge, setNetworkBadge] = useState(0)
  const [messageBadge, setMessageBadge] = useState(0)
  useEffect(() => {
    const uid = localStorage.getItem('c360_uid')
    if (!uid) return
    // Pending incoming requests
    fetch(`/api/connect360/requests?incoming=true&status=pending&c360_uid=${uid}`)
      .then(r => r.ok ? r.json() : { requests: [] })
      .then(d => setNetworkBadge(d.requests?.length ?? 0))
      .catch(() => {})
    // Unread messages
    fetch(`/api/connect360/messages?c360_uid=${uid}`)
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setMessageBadge((d.threads ?? []).reduce((s: number, t: any) => s + (t.unread_count ?? 0), 0)))
      .catch(() => {})
  }, [pathname])

  const showTabs = !NO_TAB_ROUTES.some(r => pathname.includes(r))
  const showHomeButton = !NO_HOME_BUTTON.some(r => pathname.includes(r))

  function isActive(href: string) {
    return pathname.includes(href.replace('/', ''))
  }

  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_CONNECT360_PUBLISHABLE_KEY!}>
    <div
      className="flex flex-col min-h-screen max-w-md mx-auto relative"
      style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}
    >
      <main className={`flex-1 overflow-y-auto ${showTabs ? 'pb-24' : ''}`}>
        {children}
      </main>
      {showHomeButton && (
        <button
  onClick={() => router.push('/home')}
  className="fixed right-4 z-50 flex items-center gap-1.5 px-3 py-2 rounded-full"
  style={{
    top: 'calc(env(safe-area-inset-top, 16px) + 4px)',
    backgroundColor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            color: '#FFFFFF',
            border: '1px solid rgba(255,255,255,0.18)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          }}>
          <Home size={13} />
          <span className="text-[11px] font-bold">Home</span>
        </button>
      )}

      {showTabs && (
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex items-center justify-around px-4"
          style={{
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #EEE9E0',
            paddingTop: 10,
            paddingBottom: 'max(env(safe-area-inset-bottom), 14px)',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = isActive(tab.href)
            const badge = tab.href === '/network' ? networkBadge
              : tab.href === '/messages' ? messageBadge
              : 0
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center gap-1 px-3 transition-all relative"
                style={{ color: active ? '#C9A84C' : '#B0A898' }}
              >
                <div className="relative">
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1"
                      style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold tracking-wide">
                  {tab.label}
                </span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
    </ClerkProvider>
  )
}