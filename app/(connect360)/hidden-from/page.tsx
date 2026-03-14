'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, RefreshCw, X, Search, UserX } from 'lucide-react'

interface BlockedProfile {
  id: string
  blocked_profile_id: string
  first_name: string
  last_name: string
  business_name?: string
  type: string
  created_at: string
}

interface SearchProfile {
  id: string
  first_name: string
  last_name: string
  business_name?: string
  type: string
}

export default function HiddenFromPage() {
  const router = useRouter()
  const [blocks, setBlocks] = useState<BlockedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [blocking, setBlocking] = useState<string | null>(null)

  useEffect(() => { fetchBlocks() }, [])

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return }
    const t = setTimeout(() => doSearch(), 400)
    return () => clearTimeout(t)
  }, [search])

  async function fetchBlocks() {
    setLoading(true)
    try {
      const res = await fetch(`/api/connect360/blocks?c360_uid=${localStorage.getItem('c360_uid') ?? ''}`)
      const data = await res.json()
      setBlocks(data.blocks ?? [])
    } finally { setLoading(false) }
  }

  async function doSearch() {
    if (!search.trim()) return
    setSearching(true)
    try {
      const res = await fetch(`/api/connect360/profiles?search=${encodeURIComponent(search)}&limit=10`)
      const data = await res.json()
      const blockedIds = blocks.map(b => b.blocked_profile_id)
      setSearchResults((data.profiles ?? []).filter((p: SearchProfile) => !blockedIds.includes(p.id)))
    } finally { setSearching(false) }
  }

  async function handleBlock(profileId: string) {
    setBlocking(profileId)
    try {
      await fetch(`/api/connect360/blocks?c360_uid={localStorage.getItem('c360_uid') ?? ''`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_profile_id: profileId }),
      })
      setSearch('')
      setSearchResults([])
      await fetchBlocks()
    } finally { setBlocking(null) }
  }

  async function handleUnblock(blockedProfileId: string) {
    try {
      await fetch('/api/connect360/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked_profile_id: blockedProfileId }),
      })
      setBlocks(b => b.filter(x => x.blocked_profile_id !== blockedProfileId))
    } catch {}
  }

  const TYPE_LABEL: Record<string, string> = {
    farmer: 'Farmer', worker: 'Worker', trucker: 'Custom Transport',
    applicator: 'Custom Work', professional: 'Professional'
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>
      {/* Header */}
      <div className="px-5 pt-14 pb-6"
        style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
        <button onClick={() => router.back()} className="flex items-center gap-2 mb-4">
          <ArrowLeft size={18} color="rgba(255,255,255,0.7)" />
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Back</span>
        </button>
        <h1 className="text-xl font-bold text-white">Hidden From</h1>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          These users cannot see your profile or find you in search
        </p>
      </div>

      <div className="px-5 pt-5 pb-32 space-y-5">
        {/* Search to add */}
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#8A9BB0', letterSpacing: '0.06em' }}>
            HIDE YOUR PROFILE FROM
          </p>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B0A898' }} />
            <input
              className="w-full pl-9 pr-4 py-3 rounded-xl text-sm outline-none"
              style={{ backgroundColor: '#F7F5F0', color: '#0D1520' }}
              placeholder="Search by name or business..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {searching && (
            <div className="flex justify-center mt-3">
              <RefreshCw size={14} className="animate-spin" style={{ color: '#C9A84C' }} />
            </div>
          )}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: '#F7F5F0' }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>
                      {p.business_name || `${p.first_name} ${p.last_name}`}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </div>
                  </div>
                  <button
                    onClick={() => handleBlock(p.id)}
                    disabled={blocking === p.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold"
                    style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                    {blocking === p.id ? '...' : 'Hide'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current block list */}
        <div className="rounded-2xl p-4"
          style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#8A9BB0', letterSpacing: '0.06em' }}>
            CURRENTLY HIDDEN FROM ({blocks.length})
          </p>
          {loading ? (
            <div className="flex justify-center py-4">
              <RefreshCw size={14} className="animate-spin" style={{ color: '#C9A84C' }} />
            </div>
          ) : blocks.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2">
              <UserX size={28} style={{ color: '#D1C9BF' }} />
              <p className="text-sm" style={{ color: '#B0A898' }}>No one is hidden yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ backgroundColor: '#F7F5F0' }}>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#0D1520' }}>
                      {b.business_name || `${b.first_name} ${b.last_name}`}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                      {TYPE_LABEL[b.type] ?? b.type}
                    </div>
                  </div>
                  <button onClick={() => handleUnblock(b.blocked_profile_id)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: '#FFF0F0' }}>
                    <X size={14} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}