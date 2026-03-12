'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ArrowLeft, Send, RefreshCw, MessageCircle,
  Truck, Sprout, Users, Briefcase, Search
} from 'lucide-react'

interface Thread {
  profile_id: string
  thread_id: string
  first_name: string
  last_name: string
  business_name?: string
  photo_url?: string
  type: string
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
  read_at?: string
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  trucker:      { icon: Truck,     color: '#C9A84C', bg: '#FDF8EE' },
  applicator:   { icon: Sprout,    color: '#C9A84C', bg: '#FDF8EE' },
  worker:       { icon: Users,     color: '#C9A84C', bg: '#FDF8EE' },
  professional: { icon: Briefcase, color: '#C9A84C', bg: '#FDF8EE' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  if (hrs < 24) return `${hrs}h`
  return `${days}d`
}

export default function MessagesPage() {
  const router = useRouter()
  const { user } = useUser()
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null)
  const [statusLoading, setStatusLoading] = useState(false)
  // Fetch inbox
  useEffect(() => {
    fetchThreads()
    const interval = setInterval(fetchThreads, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchThreads() {
    try {
      const res = await fetch('/api/connect360/messages')
      const data = await res.json()
      setThreads(data.threads ?? [])
    } catch {} finally {
      setLoading(false)
    }
  }

  // Fetch messages for active thread
  useEffect(() => {
    if (!activeThread) return
    fetchMessages()
    checkConnection()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [activeThread])

  async function checkConnection() {
    if (!activeThread) return
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/connect360/requests?profile_id=${activeThread.profile_id}`)
      const data = await res.json()
      setConnectionStatus(data.status ?? null)
    } catch {} finally {
      setStatusLoading(false)
    }
  }

  async function fetchMessages() {
    if (!activeThread) return
    setChatLoading(true)
    try {
      const res = await fetch(`/api/connect360/messages?profile_id=${activeThread.profile_id}`)
      const data = await res.json()
      setMessages(data.messages ?? [])
    } catch {} finally {
      setChatLoading(false)
    }
  }

  async function handleSend() {
    if (!chatInput.trim() || !activeThread) return
    setChatSending(true)
    const body = chatInput.trim()
    setChatInput('')
    try {
      const res = await fetch('/api/connect360/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: activeThread.profile_id, body }),
      })
      const data = await res.json()
      setMessages(m => [...m, data.message])
      // Update thread preview
      setThreads(ts => ts.map(t =>
        t.profile_id === activeThread.profile_id
          ? { ...t, last_message: body, last_message_at: new Date().toISOString(), unread_count: 0 }
          : t
      ))
    } catch {} finally {
      setChatSending(false)
    }
  }

  const filtered = threads.filter(t => {
    const name = t.business_name || `${t.first_name} ${t.last_name}`
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0)
  // ── CHAT VIEW ──
  if (activeThread) {
    const cfg = TYPE_CONFIG[activeThread.type] ?? TYPE_CONFIG.worker
    const Icon = cfg.icon
    const name = activeThread.business_name || `${activeThread.first_name} ${activeThread.last_name}`

    return (
      <div className="flex flex-col h-screen" style={{ backgroundColor: '#F7F5F0' }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-12 pb-4"
          style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #EEE9E0', flexShrink: 0 }}>
          <button onClick={() => { setActiveThread(null); setMessages([]) }}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: '#F7F5F0' }}>
            <ArrowLeft size={18} style={{ color: '#0D1520' }} />
          </button>
          {/* Avatar */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: cfg.bg }}>
            {activeThread.photo_url
              ? <img src={activeThread.photo_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
              : <Icon size={16} style={{ color: cfg.color }} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm truncate" style={{ color: '#0D1520' }}>{name}</div>
            <div className="text-xs" style={{ color: '#8A9BB0' }}>Connected</div>
          </div>
          <button onClick={() => router.push(`/profile/${activeThread.profile_id}`)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: '#F7F5F0', color: '#C9A84C' }}>
            Profile
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {chatLoading && messages.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <RefreshCw size={20} className="animate-spin" style={{ color: '#C9A84C' }} />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle size={32} style={{ color: '#C9A84C', marginBottom: 12 }} />
              <p className="text-sm font-semibold" style={{ color: '#0D1520' }}>Start the conversation</p>
              <p className="text-xs mt-1" style={{ color: '#8A9BB0' }}>Send a message to {name}</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const isMine = m.sender_id === user?.id
              return (
                <div key={m.id ?? i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[78%]">
                    <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={{
                        backgroundColor: isMine ? '#C9A84C' : '#FFFFFF',
                        color: isMine ? '#FFFFFF' : '#0D1520',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                        borderBottomRightRadius: isMine ? 4 : 16,
                        borderBottomLeftRadius: isMine ? 16 : 4,
                      }}>
                      {m.body}
                    </div>
                    <div className={`text-[10px] mt-1 ${isMine ? 'text-right' : 'text-left'}`}
                      style={{ color: '#B0A898' }}>
                      {timeAgo(m.created_at)}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input — locked unless accepted */}
        {connectionStatus !== 'accepted' && !statusLoading && (
          <div className="px-5 pt-3 pb-2 flex-shrink-0">
            <div className="w-full py-3 px-4 rounded-2xl flex items-center gap-3"
              style={{ backgroundColor: '#FDF8EE', border: '1px solid rgba(201,168,76,0.2)' }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div>
                <div className="text-xs font-bold" style={{ color: '#C9A84C' }}>Connection required</div>
                <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                  {connectionStatus === 'pending'
                    ? 'Your request is pending — messaging unlocks when accepted'
                    : 'Send a connection request to start messaging'}
                </div>
              </div>
            </div>
          </div>
        )}
        {connectionStatus !== 'accepted' && !statusLoading ? (
          <div className="px-5 pt-3 flex-shrink-0"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #EEE9E0',
            }}>
            <div className="w-full py-3 px-4 rounded-2xl flex items-center gap-3"
              style={{ backgroundColor: '#FDF8EE', border: '1px solid rgba(201,168,76,0.2)' }}>
              <span style={{ fontSize: 18 }}>🔒</span>
              <div>
                <div className="text-xs font-bold" style={{ color: '#C9A84C' }}>Connection required</div>
                <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                  {connectionStatus === 'pending'
                    ? 'Your request is pending — messaging unlocks when accepted'
                    : 'Send a connection request to start messaging'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 pt-3"
            style={{
              paddingBottom: 'max(env(safe-area-inset-bottom), 20px)',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #EEE9E0',
              flexShrink: 0,
            }}>
            <div className="flex items-center gap-3">
              <input
                className="flex-1 px-4 py-3 rounded-2xl text-sm outline-none"
                style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}
                placeholder="Write a message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
              <button onClick={handleSend}
                disabled={chatSending || !chatInput.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{
                  backgroundColor: chatInput.trim() ? '#C9A84C' : '#EEE9E0',
                }}>
                {chatSending
                  ? <RefreshCw size={14} className="animate-spin" style={{ color: '#FFFFFF' }} />
                  : <Send size={14} style={{ color: chatInput.trim() ? '#FFFFFF' : '#B0A898' }} />}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── INBOX VIEW ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 12 }}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Messages</h1>
          {totalUnread > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
              {totalUnread} new
            </span>
          )}
        </div>
        <p className="text-xs" style={{ color: '#8A9BB0' }}>
          {threads.length} conversation{threads.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      {threads.length > 0 && (
        <div className="px-5 mb-4">
          <div className="flex items-center gap-3 px-4 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', height: 44 }}>
            <Search size={15} style={{ color: '#B0A898' }} />
            <input
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#0D1520' }}
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="px-5 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse"
              style={{ backgroundColor: '#FFFFFF' }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#FDF8EE' }}>
              <MessageCircle size={28} style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>
              No messages yet
            </h3>
            <p className="text-sm mb-5" style={{ color: '#8A9BB0' }}>
              Connect with a provider to start a conversation
            </p>
            <button onClick={() => router.push('/discover')}
              className="px-5 py-2.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
              Browse providers
            </button>
          </div>
        ) : (
          filtered.map(thread => {
            const cfg = TYPE_CONFIG[thread.type] ?? TYPE_CONFIG.worker
            const Icon = cfg.icon
            const name = thread.business_name || `${thread.first_name} ${thread.last_name}`
            const hasUnread = thread.unread_count > 0

            return (
              <button key={thread.profile_id}
                onClick={() => setActiveThread(thread)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-95"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: hasUnread
                    ? '0 2px 16px rgba(201,168,76,0.15)'
                    : '0 2px 12px rgba(0,0,0,0.06)',
                  border: hasUnread ? '1px solid rgba(201,168,76,0.2)' : '1px solid transparent',
                }}>
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: cfg.bg }}>
                    {thread.photo_url
                      ? <img src={thread.photo_url} className="w-12 h-12 rounded-2xl object-cover" alt="" />
                      : <Icon size={20} style={{ color: cfg.color }} />}
                  </div>
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
                      {thread.unread_count}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm truncate"
                      style={{ color: '#0D1520', fontWeight: hasUnread ? 700 : 600 }}>
                      {name}
                    </span>
                    <span className="text-[10px] flex-shrink-0 ml-2"
                      style={{ color: hasUnread ? '#C9A84C' : '#B0A898', fontWeight: hasUnread ? 700 : 400 }}>
                      {timeAgo(thread.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs truncate"
                    style={{ color: hasUnread ? '#4A5568' : '#8A9BB0', fontWeight: hasUnread ? 500 : 400 }}>
                    {thread.last_message || 'Start a conversation'}
                  </p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}