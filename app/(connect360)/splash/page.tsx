'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

export default function SplashPage() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const [phase, setPhase] = useState<'nodes' | 'wordmark' | 'tagline' | 'done'>('nodes')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('wordmark'), 800)
    const t2 = setTimeout(() => setPhase('tagline'), 1600)
    const t3 = setTimeout(() => setPhase('done'), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  useEffect(() => {
    if (phase === 'done') {
      const hasSession = localStorage.getItem('c360_uid')
      if (userId || hasSession) {
        router.replace('/home')
      } else if (isLoaded) {
        router.replace('/auth')
      }
    }
  }, [phase, isLoaded, userId, router])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#080D14' }}>

      {/* Animated connection nodes */}
      <div className="relative flex items-center justify-center mb-10"
        style={{ width: 120, height: 40 }}>
        {/* Left node */}
        <div className="absolute rounded-full transition-all duration-700"
          style={{
            width: 14, height: 14,
            backgroundColor: '#C9A84C',
            left: phase === 'nodes' ? 0 : 16,
            opacity: phase === 'nodes' ? 0 : 1,
            boxShadow: '0 0 20px rgba(201,168,76,0.6)',
            transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        {/* Connecting line */}
        <div className="absolute rounded-full transition-all duration-500"
          style={{
            height: 2,
            backgroundColor: '#C9A84C',
            width: phase === 'nodes' ? 0 : 88,
            left: 16,
            opacity: phase === 'nodes' ? 0 : 0.4,
            transition: 'all 0.5s ease 0.3s',
          }} />
        {/* Right node */}
        <div className="absolute rounded-full transition-all duration-700"
          style={{
            width: 10, height: 10,
            backgroundColor: '#F0F4F8',
            right: phase === 'nodes' ? 0 : 16,
            opacity: phase === 'nodes' ? 0 : 1,
            boxShadow: '0 0 12px rgba(240,244,248,0.3)',
            transition: 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s',
          }} />
      </div>

      {/* Wordmark */}
      <div className="text-center mb-3 transition-all duration-700"
        style={{
          opacity: phase === 'nodes' ? 0 : 1,
          transform: phase === 'nodes' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'all 0.7s ease',
        }}>
        <div className="text-4xl font-bold tracking-tight"
          style={{ letterSpacing: '-0.02em' }}>
          <span style={{ color: '#F0F4F8' }}>Connect</span>
          <span style={{ color: '#C9A84C' }}>360</span>
        </div>
      </div>

      {/* Gold divider */}
      <div className="mb-4 transition-all duration-500"
        style={{
          width: phase === 'nodes' || phase === 'wordmark' ? 0 : 48,
          height: 1,
          backgroundColor: '#C9A84C',
          opacity: 0.6,
          transition: 'all 0.5s ease 0.2s',
        }} />

      {/* Tagline */}
      <div className="transition-all duration-700"
        style={{
          opacity: phase === 'tagline' || phase === 'done' ? 1 : 0,
          transform: phase === 'tagline' || phase === 'done' ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.6s ease',
        }}>
        <p className="text-xs tracking-[0.3em] uppercase font-medium"
          style={{ color: '#4A5568' }}>
          For AG, by a farmer.
        </p>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{
              backgroundColor: '#C9A84C',
              opacity: 0.4,
              animationDelay: `${i * 0.2}s`,
            }} />
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[10px] tracking-widest uppercase"
          style={{ color: '#1A2535' }}>
          The Ultimate AG Network
        </p>
      </div>
    </div>
  )
}