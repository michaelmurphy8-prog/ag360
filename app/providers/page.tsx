'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import {
  Truck, Sprout, Users, Briefcase, Globe,
  CheckCircle, ArrowRight, Shield, Star, MapPin
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

const PROVIDER_TYPES = [
  {
    key: 'trucker',
    label: 'Custom Truckers',
    icon: Truck,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
    desc: 'Grain hauling, B-train, tandem, flat deck, and specialized ag transport across Western Canada.',
  },
  {
    key: 'applicator',
    label: 'Custom Applicators',
    icon: Sprout,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
    desc: 'Spraying, spreading, and precision application services for crop protection and fertility.',
  },
  {
    key: 'worker',
    label: 'Seasonal Workers',
    icon: Users,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
    desc: 'Experienced farm hands for seeding, harvest, livestock, and general operations.',
  },
  {
    key: 'professional',
    label: 'Professional Services',
    icon: Briefcase,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    desc: 'Agrologists, accountants, immigration consultants, lawyers, and ag insurance brokers.',
  },
]

const TRUST_POINTS = [
  { icon: Shield, text: 'All providers manually reviewed by AG360 staff' },
  { icon: CheckCircle, text: 'Licence verification for regulated professionals' },
  { icon: Star, text: 'Verified farmer reviews on every profile' },
  { icon: MapPin, text: 'Prairie-focused — SK, AB, MB and beyond' },
]

export default function ProvidersPage() {
  const router = useRouter()
  const { userId, isLoaded } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)

  // Redirect signed-in users straight to the full Connect360 experience
  useEffect(() => {
    if (isLoaded && userId) {
      router.replace('/connect360')
    }
  }, [isLoaded, userId, router])

  useEffect(() => {
    fetch('/api/connect360/public-stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  if (!isLoaded || (isLoaded && userId)) return null

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0f1a', color: '#e2e8f0' }}>

      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between"
        style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>
        <div>
          <span className="text-lg font-bold" style={{ color: '#d4af37' }}>AG</span>
          <span className="text-lg font-bold text-white">/360</span>
          <span className="ml-2 text-xs text-slate-400 font-medium tracking-wide">Connect360</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/login"
            className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">
            Sign In
          </a>
          <a href="/signup"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: '#d4af37', color: '#0a0f1a' }}>
            Get Started Free
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium mb-6"
          style={{ borderColor: 'rgba(212,175,55,0.3)', backgroundColor: 'rgba(212,175,55,0.08)', color: '#d4af37' }}>
          <Globe size={11} /> Western Canada's Ag Labour & Services Network
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
          Find the right people<br />
          <span style={{ color: '#d4af37' }}>for your operation.</span>
        </h1>
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Connect360 is a verified directory of custom truckers, applicators, seasonal workers,
          and professional services built exclusively for prairie farmers.
        </p>

        {/* Live stat bar */}
        {stats && stats.total > 0 && (
          <div className="inline-flex flex-wrap items-center justify-center gap-4 px-6 py-3 rounded-xl border mb-8 text-sm"
            style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>
            <span className="text-white font-semibold">{stats.total} verified providers</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{stats.provinces} provinces</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{stats.types.trucker} truckers</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{stats.types.worker} workers</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{stats.types.applicator} applicators</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="/signup"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 w-full sm:w-auto justify-center"
            style={{ backgroundColor: '#d4af37', color: '#0a0f1a' }}>
            Create Free Account <ArrowRight size={15} />
          </a>
          <a href="/login"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium border transition-all hover:border-slate-500 w-full sm:w-auto justify-center"
            style={{ borderColor: '#1e293b', color: '#94a3b8' }}>
            Sign In to Browse
          </a>
        </div>
      </section>

      {/* Provider type cards */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
          Who you'll find on Connect360
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROVIDER_TYPES.map(t => {
            const Icon = t.icon
            const count = stats?.types[t.key as keyof typeof stats.types]
            return (
              <div key={t.key}
                className={`p-5 rounded-xl border ${t.bg} ${t.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${t.bg} flex-shrink-0`}>
                    <Icon size={18} className={t.color} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm">{t.label}</h3>
                      {count !== undefined && count > 0 && (
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${t.bg} ${t.color} border ${t.border}`}>
                          {count} verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Trust section */}
      <section className="border-t border-b py-12"
        style={{ borderColor: '#1e293b', backgroundColor: '#0d1424' }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
            Built on trust
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TRUST_POINTS.map((pt, i) => {
              const Icon = pt.icon
              return (
                <div key={i} className="flex items-center gap-3">
                  <Icon size={16} style={{ color: '#d4af37' }} className="flex-shrink-0" />
                  <span className="text-sm text-slate-300">{pt.text}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to find your crew?</h2>
        <p className="text-slate-400 mb-8 text-sm">
          Free accounts get full access to browse, connect, and review providers across Western Canada.
        </p>
        <a href="/signup"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: '#d4af37', color: '#0a0f1a' }}>
          Create Free Account <ArrowRight size={15} />
        </a>
        <p className="text-xs text-slate-600 mt-4">Already have an account? <a href="/login" className="text-slate-400 hover:text-white transition-colors">Sign in →</a></p>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center"
        style={{ borderColor: '#1e293b' }}>
        <p className="text-xs text-slate-600">
          © {new Date().getFullYear()} AG/360 · For the Farmer ·{' '}
          <a href="https://ag360.farm" className="hover:text-slate-400 transition-colors">ag360.farm</a>
        </p>
      </footer>
    </div>
  )
}