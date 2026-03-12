'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronLeft, UserPlus, Megaphone, Briefcase, MessageSquare } from 'lucide-react'

interface NotifPrefs {
  enabled: boolean
  connect_requests: boolean
  messages: boolean
  job_activity: boolean
  platform_updates: boolean
}

const DEFAULT_PREFS: NotifPrefs = {
  enabled: false,
  connect_requests: true,
  messages: true,
  job_activity: true,
  platform_updates: true,
}

export default function NotificationsPage() {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/connect360/profiles?my_profile=true')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.notification_prefs) setPrefs({ ...DEFAULT_PREFS, ...d.notification_prefs }) })
  }, [])

  async function save(newPrefs: NotifPrefs) {
    setPrefs(newPrefs)
    setSaving(true)
    setSaved(false)
    await fetch('/api/connect360/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_prefs: newPrefs }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggle(key: keyof NotifPrefs) {
    const updated = { ...prefs, [key]: !prefs[key] }
    save(updated)
  }

  const notifRows = [
    { key: 'connect_requests' as const, icon: UserPlus, label: 'Connect Requests', sublabel: 'When someone wants to connect with you' },
    { key: 'messages' as const, icon: MessageSquare, label: 'Messages', sublabel: 'New messages from connections' },
    { key: 'job_activity' as const, icon: Briefcase, label: 'Job Activity', sublabel: 'Applications, new posts matching your profile' },
    { key: 'platform_updates' as const, icon: Megaphone, label: 'Platform Updates', sublabel: 'New features, announcements from AG360' },
  ]

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <ChevronLeft size={16} color="#FFFFFF" />
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Notifications</h1>
          {saving && <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>Saving...</span>}
          {saved && <span className="text-xs ml-auto" style={{ color: '#4ADE80' }}>Saved ✓</span>}
        </div>

        {/* Master toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl"
          style={{ backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: prefs.enabled ? '#FDF8EE' : '#F7F5F0' }}>
              <Bell size={18} style={{ color: prefs.enabled ? '#C9A84C' : '#9CA3AF' }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: '#0D1520' }}>Email Notifications</div>
              <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                {prefs.enabled ? 'Sending to your account email' : 'Currently off'}
              </div>
            </div>
          </div>
          {/* Toggle */}
          <button onClick={() => toggle('enabled')}
            className="relative flex-shrink-0"
            style={{ width: 44, height: 24 }}>
            <div className="absolute inset-0 rounded-full transition-all"
              style={{ backgroundColor: prefs.enabled ? '#C9A84C' : '#D1D5DB' }} />
            <div className="absolute top-0.5 rounded-full transition-all"
              style={{
                width: 20, height: 20,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                left: prefs.enabled ? 22 : 2,
                transition: 'left 0.15s ease',
              }} />
          </button>
        </div>
      </div>

      {/* Notification types */}
      {prefs.enabled && (
        <div className="px-5 mt-5">
          <div className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: '#B0A898' }}>Notify me about</div>
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            {notifRows.map((row, i) => {
              const Icon = row.icon
              const active = prefs[row.key]
              return (
                <div key={row.key}
                  className="flex items-center gap-4 px-4"
                  style={{
                    minHeight: 60,
                    borderBottom: i < notifRows.length - 1 ? '1px solid #F3F0EB' : 'none',
                  }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? '#FDF8EE' : '#F7F5F0' }}>
                    <Icon size={15} style={{ color: active ? '#C9A84C' : '#9CA3AF' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>{row.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#B0A898' }}>{row.sublabel}</div>
                  </div>
                  <button onClick={() => toggle(row.key)}
                    className="relative flex-shrink-0"
                    style={{ width: 36, height: 20 }}>
                    <div className="absolute inset-0 rounded-full transition-all"
                      style={{ backgroundColor: active ? '#C9A84C' : '#D1D5DB' }} />
                    <div className="absolute top-0.5 rounded-full"
                      style={{
                        width: 16, height: 16,
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                        left: active ? 18 : 2,
                        transition: 'left 0.15s ease',
                      }} />
                  </button>
                </div>
              )
            })}
          </div>
          <p className="text-xs mt-3 px-1" style={{ color: '#B0A898' }}>
            Notifications are sent to the email address associated with your account. Push notifications coming in a future update.
          </p>
        </div>
      )}

      {!prefs.enabled && (
        <div className="px-5 mt-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: '#F3F4F6' }}>
            <Bell size={28} style={{ color: '#D1D5DB' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#6B7280' }}>Notifications are off</p>
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Turn on above to receive email alerts for connect requests, messages, and more.</p>
        </div>
      )}
    </div>
  )
}