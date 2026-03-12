'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Globe, Check } from 'lucide-react'

const REGIONS = [
  { value: 'CA', label: 'Canada', flag: '🇨🇦', currency: 'CAD', dateFormat: 'MM/DD/YYYY' },
  { value: 'US', label: 'United States', flag: '🇺🇸', currency: 'USD', dateFormat: 'MM/DD/YYYY' },
  { value: 'AU', label: 'Australia', flag: '🇦🇺', currency: 'AUD', dateFormat: 'DD/MM/YYYY' },
  { value: 'NZ', label: 'New Zealand', flag: '🇳🇿', currency: 'NZD', dateFormat: 'DD/MM/YYYY' },
  { value: 'GB', label: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', dateFormat: 'DD/MM/YYYY' },
  { value: 'ZA', label: 'South Africa', flag: '🇿🇦', currency: 'ZAR', dateFormat: 'DD/MM/YYYY' },
  { value: 'AR', label: 'Argentina', flag: '🇦🇷', currency: 'ARS', dateFormat: 'DD/MM/YYYY' },
  { value: 'BR', label: 'Brazil', flag: '🇧🇷', currency: 'BRL', dateFormat: 'DD/MM/YYYY' },
  { value: 'UA', label: 'Ukraine', flag: '🇺🇦', currency: 'UAH', dateFormat: 'DD/MM/YYYY' },
  { value: 'OTHER', label: 'Other', flag: '🌍', currency: '—', dateFormat: 'DD/MM/YYYY' },
]

export default function LanguageRegionPage() {
  const router = useRouter()
  const [region, setRegion] = useState('CA')
  const [saved, setSaved] = useState(false)

  async function selectRegion(val: string) {
    setRegion(val)
    setSaved(false)
    await fetch('/api/connect360/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ region }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <ChevronLeft size={16} color="#FFFFFF" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Language & Region</h1>
          </div>
          {saved && <span className="text-xs" style={{ color: '#4ADE80' }}>Saved ✓</span>}
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Language */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: '#B0A898' }}>Language</div>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="flex items-center gap-4 px-4" style={{ minHeight: 56 }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#FDF8EE' }}>
                <Globe size={15} style={{ color: '#C9A84C' }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>English</div>
                <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>Default language</div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#F7F5F0', color: '#B0A898' }}>
                More languages coming soon
              </span>
            </div>
          </div>
        </div>

        {/* Region */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: '#B0A898' }}>Region</div>
          <p className="text-xs mb-3 px-1" style={{ color: '#B0A898' }}>
            Used for date formats and currency display across the platform.
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {REGIONS.map((r, i) => (
              <button key={r.value} onClick={() => selectRegion(r.value)}
                className="w-full flex items-center gap-4 px-4 text-left transition-all active:bg-gray-50"
                style={{
                  minHeight: 52,
                  borderBottom: i < REGIONS.length - 1 ? '1px solid #F3F0EB' : 'none',
                  backgroundColor: region === r.value ? '#FDFAF3' : '#FFFFFF',
                }}>
                <span className="text-xl flex-shrink-0">{r.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>{r.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>{r.currency} · {r.dateFormat}</div>
                </div>
                {region === r.value && <Check size={15} style={{ color: '#C9A84C', flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}