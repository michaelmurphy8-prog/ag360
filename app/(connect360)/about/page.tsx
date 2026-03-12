'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Tractor } from 'lucide-react'

export default function AboutPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-8" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <ChevronLeft size={16} color="#FFFFFF" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>About Connect360</h1>
        </div>

        {/* Logo block */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: '#C9A84C' }}>
            <Tractor size={30} color="#FFFFFF" />
          </div>
          <div className="text-2xl font-black tracking-tight" style={{ color: '#FFFFFF' }}>Connect360</div>
          <div className="text-sm mt-1" style={{ color: '#C9A84C' }}>For AG, by a farmer.</div>
          <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Version 1.0 · Part of AG360</div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Origin story */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#0D1520' }}>Why we built this</h2>
          <div className="space-y-3 text-xs leading-relaxed" style={{ color: '#4B5563' }}>
            <p>
              Every harvest season, farmers across the world face the same problem — not enough time, not enough hands, and no good way to find the right people fast. You'd ask around at the coffee shop, post in a Facebook group, or rely on word of mouth that may or may not come through before the combine needs to roll.
            </p>
            <p>
              Connect360 wasn't built in a boardroom or designed by someone who learned about farming from a Google search. It was built by a caring <span className="font-semibold" style={{ color: '#0D1520' }}>Farmer</span> in Saskatchewan, Canada — on the same land it was meant to serve.
            </p>
            <p>
              We know what it's like to need a Class 1 driver at 6am. We know what it's like to be three weeks from seeding and still short a good operator. We know what it feels like when the right connection — the right person — shows up at the right time and makes everything click.
            </p>
            <p>
              That's the gap Connect360 fills. Not another generic job board. Not another app built by a tech company that has never smelled a freshly cut canola field. A real platform, built by people who live this — for the farmers, workers, truckers, agronomists, and service providers who keep agriculture moving.
            </p>
            <p style={{ color: '#C9A84C', fontWeight: 600 }}>
              For AG, by a farmer. That's not a tagline. It's a commitment.
            </p>
          </div>
        </div>

        {/* Stats/mission */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#0D1520' }}>Our mission</h2>
          <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
            To build the most trusted agricultural network in the world — where every farmer can find the right people, and every person in agriculture can find their place. We're starting on the Canadian prairies and we're not stopping there.
          </p>
        </div>

        {/* Contact */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: '#0D1520' }}>Get in touch</h2>
          <div className="space-y-1.5">
            {[
              { label: 'General inquiries', value: 'hello@ag360.farm' },
              { label: 'Website', value: 'ag360.farm' },
              { label: 'Based in', value: 'Swift Current, SK, Canada' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs" style={{ color: '#9CA3AF' }}>{row.label}</span>
                <span className="text-xs font-semibold" style={{ color: '#0D1520' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-[10px]" style={{ color: '#B0A898' }}>
          © {new Date().getFullYear()} AG360 Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}