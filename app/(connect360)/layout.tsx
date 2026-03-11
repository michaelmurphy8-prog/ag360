'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { Compass, Users, MessageCircle, User, Grid3X3 } from 'lucide-react'

const TABS = [
  { href: '/home',     icon: Compass,       label: 'Discover',   match: ['/home', '/discover'] },
  { href: '/network',  icon: Users,         label: 'Network',    match: ['/network'] },
  { href: '/messages', icon: MessageCircle, label: 'Messages',   match: ['/messages'] },
  { href: '/profile',  icon: User,          label: 'Profile',    match: ['/profile'] },
  { href: '/more',     icon: Grid3X3,       label: 'More',       match: ['/more'] },
]

// Routes that should NOT show the bottom tab bar
const NO_TAB_ROUTES = ['/splash', '/auth', '/register']

export default function Connect360Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { userId, isLoaded } = useAuth()

  const showTabs = isLoaded && userId && !NO_TAB_ROUTES.some(r => pathname.includes(r))

  function isActive(tab: typeof TABS[0]) {
    return tab.match.some(m => pathname.includes(m))
  }

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto relative"
      style={{ backgroundColor: '#080D14', color: '#F0F4F8' }}>

      {/* Page content */}
      <main className={`flex-1 overflow-y-auto ${showTabs ? 'pb-20' : ''}`}>
        {children}
      </main>

      {/* Bottom tab bar */}
      {showTabs && (
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex items-center justify-around px-2 py-2"
          style={{
            backgroundColor: '#0A1020',
            borderTop: '1px solid #1A2535',
            paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
          }}>
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = isActive(tab)
            return (
              <button
                key={tab.href}
                onClick={() => router.push(tab.href)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[56px]"
                style={{ color: active ? '#C9A84C' : '#4A5568' }}>
                <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium tracking-wide">
                  {tab.label}
                </span>
                {active && (
                  <span className="w-1 h-1 rounded-full mt-0.5"
                    style={{ backgroundColor: '#C9A84C' }} />
                )}
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}