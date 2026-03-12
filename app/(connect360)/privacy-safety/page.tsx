'use client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Trash2, UserX, FileText, Shield, AlertTriangle } from 'lucide-react'

export default function PrivacySafetyPage() {
  const router = useRouter()

  const rows = [
    {
      icon: FileText,
      label: 'Privacy Policy',
      sublabel: 'How we collect and use your data',
      action: () => router.push('/terms-privacy'),
    },
    {
      icon: Trash2,
      label: 'Request Data Deletion',
      sublabel: 'Ask us to delete your personal data',
      action: () => window.open('mailto:hello@ag360.farm?subject=Data Deletion Request&body=Please delete all personal data associated with my account.', '_blank'),
    },
    {
      icon: UserX,
      label: 'Delete My Account',
      sublabel: 'Permanently remove your account and profile',
      action: () => window.open('mailto:hello@ag360.farm?subject=Account Deletion Request&body=Please permanently delete my Connect360 account and all associated data.', '_blank'),
      danger: true,
    },
  ]

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
          <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Privacy & Safety</h1>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: '#FDF8EE', border: '1px solid #F5E6C8' }}>
          <Shield size={18} style={{ color: '#C9A84C', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: '#92703A' }}>
            Your privacy matters. We collect only what's needed to run the platform and never sell your data to third parties. All profile information is visible only to other Connect360 members.
          </p>
        </div>

        {/* Rows */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1" style={{ color: '#B0A898' }}>Your Data</div>
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {rows.map((row, i) => {
              const Icon = row.icon
              return (
                <button key={i} onClick={row.action}
                  className="w-full flex items-center gap-4 px-4 text-left transition-all active:bg-gray-50"
                  style={{
                    minHeight: 60,
                    borderBottom: i < rows.length - 1 ? '1px solid #F3F0EB' : 'none',
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: row.danger ? '#FFF0F0' : '#F7F5F0' }}>
                    <Icon size={15} style={{ color: row.danger ? '#EF4444' : '#C9A84C' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: row.danger ? '#EF4444' : '#0D1520' }}>{row.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>{row.sublabel}</div>
                  </div>
                  <ChevronLeft size={14} style={{ color: '#D1D5DB', flexShrink: 0, transform: 'rotate(180deg)' }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Warning note */}
        <div className="flex items-start gap-3 p-4 rounded-2xl"
          style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <AlertTriangle size={16} style={{ color: '#F97316', flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs leading-relaxed" style={{ color: '#9A3412' }}>
            Account deletion is permanent and cannot be undone. All your profile data, connections, messages, and job history will be removed. Requests are processed within 7 business days.
          </p>
        </div>
      </div>
    </div>
  )
}