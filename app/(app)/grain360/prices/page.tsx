'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, Star, RefreshCw, Clock } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'

type FuturesQuote = {
  symbol: string
  name: string
  lastPrice: number
  priceChange: number
  percentChange: number
  tradeTime: string
  unitCode: string
  currency: 'CAD' | 'USD'
}

type CashBid = {
  id: string
  commodity: string
  location: string
  cashPrice: number
  basis: number
  deliveryStart: string
  deliveryEnd: string
}

type PricesData = {
  success: boolean
  source: string
  lastUpdated: string
  futures: FuturesQuote[]
  cashBids: CashBid[]
}

type WatchlistItem = {
  symbol: string
  label: string
  type: string
  commodity?: string
  location_id?: string
}

type HistoryPoint = {
  date: string
  price: number
}

type CanolaLocalBid = {
  id: number
  elevator: string
  cash_price: number
  delivery_month: string | null
  notes: string | null
  updated_at: string
}

type StatCanPoint = {
  date: string
  price: number
}

type StatCanData = {
  success: boolean
  source: string
  label: string
  note: string
  points: StatCanPoint[]
}

const COMMODITY_GROUPS = [
  { label: 'Canola', symbols: ['WC*1', 'WC*2', 'WC*3'], primarySymbol: 'WC*1' },
  { label: 'Wheat', symbols: ['ZW*1'], primarySymbol: 'ZW*1' },
  { label: 'Corn', symbols: ['ZC*1'], primarySymbol: 'ZC*1' },
  { label: 'Cattle', symbols: ['LE*1', 'GF*1'], primarySymbol: 'LE*1' },
  { label: 'Diesel', symbols: ['HO*1'], primarySymbol: 'HO*1' },
]

const CURRENCY_MAP: Record<string, 'CAD' | 'USD'> = {
  'WC*1': 'CAD', 'WC*2': 'CAD', 'WC*3': 'CAD',
  'ZW*1': 'USD', 'ZC*1': 'USD',
  'LE*1': 'USD', 'GF*1': 'USD',
  'HO*1': 'USD',
}

function getUnitLabel(unitCode: string, displayCurrency: 'CAD' | 'USD', symbolCurrency: 'CAD' | 'USD') {
  const converted = symbolCurrency === 'USD' && displayCurrency === 'CAD'
  const prefix = converted ? 'CAD' : symbolCurrency
  const units: Record<string, string> = {
    MT: `${prefix}/MT`, BU: `${prefix}/bu`,
    CWT: `${prefix}/cwt`, GAL: `${prefix}/gal`,
  }
  return units[unitCode] ?? unitCode
}

function convertPrice(price: number, symbolCurrency: 'CAD' | 'USD', displayCurrency: 'CAD' | 'USD', fxRate: number) {
  if (symbolCurrency === 'USD' && displayCurrency === 'CAD') return price * fxRate
  return price
}

function formatPrice(price: number, unitCode: string) {
  if (unitCode === 'GAL') return price.toFixed(3)
  return price.toFixed(2)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

function ChangeIndicator({ change, percent }: { change: number; percent: number }) {
  if (change > 0) return (
    <span className="flex items-center gap-1 text-emerald-600 font-medium">
      <TrendingUp size={14} />+{change.toFixed(3)} ({percent.toFixed(2)}%)
    </span>
  )
  if (change < 0) return (
    <span className="flex items-center gap-1 text-red-500 font-medium">
      <TrendingDown size={14} />{change.toFixed(3)} ({percent.toFixed(2)}%)
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[#7A8A7C] font-medium">
      <Minus size={14} />0.000 (0.00%)
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-[#E4E7E0] rounded-lg px-3 py-2 shadow-md text-xs">
        <p className="text-[#7A8A7C] mb-0.5">{label}</p>
        <p className="font-bold text-[#222527]">{payload[0].value.toFixed(2)}</p>
      </div>
    )
  }
  return null
}

export default function PricesPage() {
  const [data, setData] = useState<PricesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favourites, setFavourites] = useState<Set<string>>(new Set())
  const [activeCommodity, setActiveCommodity] = useState('Canola')
  const [displayCurrency, setDisplayCurrency] = useState<'CAD' | 'USD'>('CAD')
  const [fxRate, setFxRate] = useState<number>(1.3650)
  const [fxSource, setFxSource] = useState<string>('fallback')
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [canolaLocalBids, setCanolaLocalBids] = useState<CanolaLocalBid[]>([])
  const [statcanData, setStatcanData] = useState<StatCanData | null>(null)
  const [statcanLoading, setStatcanLoading] = useState(false)
  const [bidForm, setBidForm] = useState({ elevator: '', cash_price: '', delivery_month: '', notes: '' })
  const [bidFormOpen, setBidFormOpen] = useState(false)
  const [bidSaving, setBidSaving] = useState(false)

  async function fetchPrices(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/grain360/prices')
      const json = await res.json()
      if (json.success) {
        setData({
          ...json,
          futures: json.futures.map((f: FuturesQuote) => ({
            ...f,
            currency: CURRENCY_MAP[f.symbol] ?? 'USD',
          })),
        })
        setError(null)
      } else {
        setError('Failed to load prices')
      }
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function fetchFX() {
    try {
      const res = await fetch('/api/grain360/fx')
      const json = await res.json()
      if (json.success) {
        setFxRate(json.rate)
        setFxSource(json.source)
      }
    } catch {
      console.error('FX fetch failed')
    }
  }

  async function fetchHistory(symbol: string) {
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/grain360/prices/history?symbol=${encodeURIComponent(symbol)}`)
      const json = await res.json()
      if (json.success) setHistory(json.history)
    } catch {
      console.error('Failed to fetch history')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function fetchCanolaLocalBids() {
    try {
      const res = await fetch('/api/grain360/canola-bids')
      const json = await res.json()
      if (json.success) setCanolaLocalBids(json.bids)
    } catch { console.error('Failed to fetch canola bids') }
  }

  async function fetchStatcan() {
    setStatcanLoading(true)
    try {
      const res = await fetch('/api/grain360/statcan')
      const json = await res.json()
      if (json.success) setStatcanData(json)
    } catch { console.error('StatCan fetch failed') }
    finally { setStatcanLoading(false) }
  }

  async function saveLocalBid() {
    if (!bidForm.elevator || !bidForm.cash_price) return
    setBidSaving(true)
    try {
      await fetch('/api/grain360/canola-bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elevator: bidForm.elevator,
          cash_price: parseFloat(bidForm.cash_price),
          delivery_month: bidForm.delivery_month || null,
          notes: bidForm.notes || null,
        }),
      })
      setBidForm({ elevator: '', cash_price: '', delivery_month: '', notes: '' })
      setBidFormOpen(false)
      fetchCanolaLocalBids()
    } catch { console.error('Failed to save bid') }
    finally { setBidSaving(false) }
  }

  async function deleteLocalBid(id: number) {
    try {
      await fetch(`/api/grain360/canola-bids?id=${id}`, { method: 'DELETE' })
      setCanolaLocalBids(prev => prev.filter(b => b.id !== id))
    } catch { console.error('Failed to delete bid') }
  }

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/grain360/watchlist')
      const json = await res.json()
      if (json.success) {
        setFavourites(new Set<string>(json.watchlist.map((i: WatchlistItem) => i.symbol)))
      }
    } catch {
      console.error('Failed to load watchlist')
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    fetchFX()
    fetchWatchlist()
    fetchCanolaLocalBids()
    fetchStatcan()
    const interval = setInterval(() => fetchPrices(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWatchlist])

  useEffect(() => {
    const group = COMMODITY_GROUPS.find(g => g.label === activeCommodity)
    if (group) fetchHistory(group.primarySymbol)
  }, [activeCommodity])

  async function toggleFavourite(
    symbol: string, label: string,
    type: 'futures' | 'cash', commodity?: string, location_id?: string
  ) {
    const isFav = favourites.has(symbol)
    setFavourites(prev => {
      const next = new Set(prev)
      isFav ? next.delete(symbol) : next.add(symbol)
      return next
    })
    try {
      if (isFav) {
        await fetch('/api/grain360/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol }),
        })
      } else {
        await fetch('/api/grain360/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, label, type, commodity, location_id }),
        })
      }
    } catch {
      setFavourites(prev => {
        const next = new Set(prev)
        isFav ? next.add(symbol) : next.delete(symbol)
        return next
      })
    }
  }

  const activeGroup = COMMODITY_GROUPS.find(g => g.label === activeCommodity)
  const activeSymbols = activeGroup?.symbols ?? []
  const activeFutures = data?.futures.filter(f => activeSymbols.includes(f.symbol)) ?? []
  const activeCashBids = data?.cashBids.filter(b => b.commodity.toLowerCase() === activeCommodity.toLowerCase()) ?? []
  const favouriteFutures = data?.futures.filter(f => favourites.has(f.symbol)) ?? []
  const favouriteCashBids = data?.cashBids.filter(b => favourites.has(b.id)) ?? []
  const hasFavourites = favouriteFutures.length > 0 || favouriteCashBids.length > 0

  const chartData = history.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
    price: displayCurrency === 'CAD' && CURRENCY_MAP[activeGroup?.primarySymbol ?? ''] === 'USD'
      ? parseFloat((h.price * fxRate).toFixed(2))
      : h.price,
  }))

  const chartMin = chartData.length > 0 ? Math.min(...chartData.map(d => d.price)) * 0.98 : 0
  const chartMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.price)) * 1.02 : 0

  if (loading) return (
    <div className="min-h-screen bg-[#F9FAF8] flex items-center justify-center">
      <div className="text-[#7A8A7C] text-sm animate-pulse">Loading prices...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#F9FAF8] flex items-center justify-center">
      <div className="text-red-500 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9FAF8] text-[#222527] p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Market Prices</h1>
          <p className="text-sm text-[#7A8A7C] mt-0.5">Futures & Saskatchewan cash bids</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-white border border-[#E4E7E0] rounded-lg p-1">
            <button
              onClick={() => setDisplayCurrency('CAD')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                displayCurrency === 'CAD' ? 'bg-[#4A7C59] text-white' : 'text-[#7A8A7C] hover:text-[#222527]'
              }`}
            >CAD</button>
            <button
              onClick={() => setDisplayCurrency('USD')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                displayCurrency === 'USD' ? 'bg-[#4A7C59] text-white' : 'text-[#7A8A7C] hover:text-[#222527]'
              }`}
            >USD</button>
          </div>
          <div className="text-xs text-[#7A8A7C] bg-white border border-[#E4E7E0] px-3 py-1.5 rounded-lg">
            1 USD = {fxRate.toFixed(4)} CAD
            {fxSource === 'fallback' && <span className="ml-1 text-yellow-600">(est.)</span>}
          </div>
          {data && (
            <div className="flex items-center gap-1.5 text-xs text-[#7A8A7C]">
              <Clock size={12} />
              Updated {formatTime(data.lastUpdated)}
              {data.source === 'mock' && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded text-[10px] font-medium">
                  DEMO
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => fetchPrices(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#F5F5F3] border border-[#E4E7E0] rounded-lg text-xs text-[#7A8A7C] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Favourites Watchlist */}
      {hasFavourites && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-yellow-400 fill-yellow-400" />
            <span className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Watchlist</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {favouriteFutures.map(f => {
              const symCurrency = f.currency ?? CURRENCY_MAP[f.symbol] ?? 'USD'
              const displayPrice = convertPrice(f.lastPrice, symCurrency, displayCurrency, fxRate)
              const displayChange = convertPrice(f.priceChange, symCurrency, displayCurrency, fxRate)
              return (
                <div key={f.symbol} className="bg-[#F9FAF8] rounded-lg p-3 border border-[#E4E7E0]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#7A8A7C]">{f.symbol}</span>
                    <button onClick={() => toggleFavourite(f.symbol, f.name, 'futures')}>
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    </button>
                  </div>
                  <div className="text-base font-bold text-[#222527]">{formatPrice(displayPrice, f.unitCode)}</div>
                  <ChangeIndicator change={displayChange} percent={f.percentChange} />
                </div>
              )
            })}
            {favouriteCashBids.map(b => (
              <div key={b.id} className="bg-[#F9FAF8] rounded-lg p-3 border border-[#E4E7E0]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#7A8A7C] truncate">{b.location}</span>
                  <button onClick={() => toggleFavourite(b.id, b.location, 'cash', b.commodity, b.id)}>
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                  </button>
                </div>
                <div className="text-base font-bold text-[#222527]">${b.cashPrice.toFixed(2)}/bu</div>
                <span className="text-xs text-[#7A8A7C]">Basis {b.basis.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commodity Tabs */}
      <div className="flex gap-2 flex-wrap">
        {COMMODITY_GROUPS.map(g => (
          <button
            key={g.label}
            onClick={() => setActiveCommodity(g.label)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCommodity === g.label
                ? 'bg-[#4A7C59] text-white'
                : 'bg-white text-[#7A8A7C] hover:bg-[#F5F5F3] hover:text-[#222527] border border-[#E4E7E0]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Futures Table */}
      <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E4E7E0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#222527]">{activeCommodity} — Futures</h2>
          {activeFutures[0]?.currency === 'USD' && (
            <span className="text-xs text-[#7A8A7C]">
              Source: USD · {displayCurrency === 'CAD' ? `converted @ ${fxRate.toFixed(4)}` : 'showing USD'}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7E0] text-[#7A8A7C] text-xs">
                <th className="text-left px-4 py-3 font-medium">Contract</th>
                <th className="text-right px-4 py-3 font-medium">Last</th>
                <th className="text-right px-4 py-3 font-medium">Change</th>
                <th className="text-right px-4 py-3 font-medium">Unit</th>
                <th className="text-right px-4 py-3 font-medium">Watch</th>
              </tr>
            </thead>
            <tbody>
              {activeFutures.map((f, i) => {
                const symCurrency = f.currency ?? CURRENCY_MAP[f.symbol] ?? 'USD'
                const displayPrice = convertPrice(f.lastPrice, symCurrency, displayCurrency, fxRate)
                const displayChange = convertPrice(f.priceChange, symCurrency, displayCurrency, fxRate)
                return (
                  <tr
                    key={f.symbol}
                    className={`border-b border-[#E4E7E0]/50 hover:bg-[#F5F5F3] transition-colors ${
                      i === activeFutures.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#222527]">{f.name}</div>
                      <div className="text-xs text-[#7A8A7C]">{f.symbol}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#222527]">
                      {formatPrice(displayPrice, f.unitCode)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChangeIndicator change={displayChange} percent={f.percentChange} />
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#7A8A7C]">
                      {getUnitLabel(f.unitCode, displayCurrency, symCurrency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleFavourite(f.symbol, f.name, 'futures')}>
                        <Star
                          size={15}
                          className={favourites.has(f.symbol)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-[#7A8A7C] hover:text-yellow-400'
                          }
                        />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {activeFutures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#7A8A7C] text-sm">
                    No futures data for {activeCommodity}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Canola Panel — Manual Bids + StatCan Trend (only on Canola tab) */}
      {activeCommodity === 'Canola' && (
        <div className="grid grid-cols-2 gap-4">

          {/* Manual Bid Entry */}
          <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E4E7E0] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-[#222527]">My Canola Bids</h2>
                <p className="text-xs text-[#7A8A7C] mt-0.5">Enter your elevator call each morning</p>
              </div>
              <button
                onClick={() => setBidFormOpen(v => !v)}
                className="text-xs font-semibold px-3 py-1.5 bg-[#4A7C59] text-white rounded-lg hover:bg-[#3d6b4a] transition-colors"
              >
                {bidFormOpen ? 'Cancel' : '+ Add Bid'}
              </button>
            </div>

            {bidFormOpen && (
              <div className="px-4 py-4 border-b border-[#E4E7E0] bg-[#F9FAF8] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Elevator / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Viterra Swift Current"
                      value={bidForm.elevator}
                      onChange={e => setBidForm(f => ({ ...f, elevator: e.target.value }))}
                      className="w-full text-sm border border-[#E4E7E0] rounded-lg px-3 py-2 bg-white text-[#222527] placeholder-[#7A8A7C] focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Cash Price (CAD/bu)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 13.42"
                      value={bidForm.cash_price}
                      onChange={e => setBidForm(f => ({ ...f, cash_price: e.target.value }))}
                      className="w-full text-sm border border-[#E4E7E0] rounded-lg px-3 py-2 bg-white text-[#222527] placeholder-[#7A8A7C] focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Delivery Month (optional)</label>
                    <input
                      type="month"
                      value={bidForm.delivery_month}
                      onChange={e => setBidForm(f => ({ ...f, delivery_month: e.target.value }))}
                      className="w-full text-sm border border-[#E4E7E0] rounded-lg px-3 py-2 bg-white text-[#222527] focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#7A8A7C] font-medium block mb-1">Notes (optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. basis -1.08"
                      value={bidForm.notes}
                      onChange={e => setBidForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full text-sm border border-[#E4E7E0] rounded-lg px-3 py-2 bg-white text-[#222527] placeholder-[#7A8A7C] focus:outline-none focus:border-[#4A7C59]"
                    />
                  </div>
                </div>
                <button
                  onClick={saveLocalBid}
                  disabled={bidSaving || !bidForm.elevator || !bidForm.cash_price}
                  className="w-full py-2 bg-[#4A7C59] text-white text-sm font-semibold rounded-lg hover:bg-[#3d6b4a] transition-colors disabled:opacity-50"
                >
                  {bidSaving ? 'Saving...' : 'Save Bid'}
                </button>
              </div>
            )}

            <div className="divide-y divide-[#E4E7E0]">
              {canolaLocalBids.length === 0 && !bidFormOpen && (
                <div className="px-4 py-8 text-center text-[#7A8A7C] text-sm">
                  <p className="font-medium mb-1">No bids entered yet</p>
                  <p className="text-xs">Call your elevator and enter today&apos;s canola cash bid above</p>
                </div>
              )}
              {canolaLocalBids.map(bid => {
                const hoursAgo = Math.floor((new Date().getTime() - new Date(bid.updated_at).getTime()) / (1000 * 60 * 60))
                const isStale = hoursAgo > 12
                return (
                  <div key={bid.id} className="px-4 py-3 flex items-center justify-between hover:bg-[#F9FAF8]">
                    <div>
                      <p className="text-sm font-semibold text-[#222527]">{bid.elevator}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {bid.delivery_month && (
                          <span className="text-xs text-[#7A8A7C]">{bid.delivery_month}</span>
                        )}
                        {bid.notes && (
                          <span className="text-xs text-[#7A8A7C]">· {bid.notes}</span>
                        )}
                        <span className={`text-[10px] font-medium ${isStale ? 'text-yellow-600' : 'text-emerald-600'}`}>
                          · {hoursAgo === 0 ? 'Updated just now' : `${hoursAgo}h ago`}{isStale ? ' ⚠ Update today' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[#222527]">${Number(bid.cash_price).toFixed(2)}</span>
                      <span className="text-xs text-[#7A8A7C]">CAD/bu</span>
                      <button
                        onClick={() => deleteLocalBid(bid.id)}
                        className="text-[#7A8A7C] hover:text-red-500 transition-colors text-xs"
                      >✕</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* StatCan Canola Trend */}
          <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-[#E4E7E0]">
              <h2 className="text-sm font-semibold text-[#222527]">
                {statcanData?.label ?? 'SK Canola Price Trend'}
              </h2>
              <p className="text-xs text-[#7A8A7C] mt-0.5">
                {statcanData?.source === 'statcan'
                  ? 'Statistics Canada · Monthly average · Open data'
                  : 'Indicative trend · StatCan data loading'}
              </p>
            </div>
            <div className="p-4">
              {statcanLoading ? (
                <div className="h-48 flex items-center justify-center text-[#7A8A7C] text-sm animate-pulse">
                  Loading StatCan data...
                </div>
              ) : statcanData && statcanData.points.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart
                      data={statcanData.points}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="statcanGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4E7E0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#7A8A7C' }}
                        tickLine={false}
                        axisLine={false}
                        interval={2}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: '#7A8A7C' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => `$${v}`}
                        width={50}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#4A7C59"
                        strokeWidth={2}
                        fill="url(#statcanGradient)"
                        dot={false}
                        activeDot={{ r: 4, fill: '#4A7C59', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-3 pt-3 border-t border-[#E4E7E0] flex items-center justify-between">
                    <p className="text-[10px] text-[#7A8A7C]">{statcanData.note}</p>
                    {statcanData.source === 'statcan' && (
                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        LIVE
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-48 flex items-center justify-center text-[#7A8A7C] text-sm">
                  No trend data available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Price History Chart */}
      <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E4E7E0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#222527]">
            {activeCommodity} — 6 Month Price History
          </h2>
          <span className="text-xs text-[#7A8A7C]">
            {activeGroup?.primarySymbol} · {displayCurrency}
          </span>
        </div>
        <div className="p-4">
          {historyLoading ? (
            <div className="h-48 flex items-center justify-center text-[#7A8A7C] text-sm animate-pulse">
              Loading chart...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A7C59" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4A7C59" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E7E0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#7A8A7C' }}
                  tickLine={false}
                  axisLine={false}
                  interval={19}
                />
                <YAxis
                  domain={[chartMin, chartMax]}
                  tick={{ fontSize: 11, fill: '#7A8A7C' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.toFixed(0)}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#4A7C59"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#4A7C59', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Cash Bids Table */}
      {activeCashBids.length > 0 && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[#E4E7E0]">
            <h2 className="text-sm font-semibold text-[#222527]">{activeCommodity} — Saskatchewan Cash Bids</h2>
            <p className="text-xs text-[#7A8A7C] mt-0.5">Always quoted in CAD</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E4E7E0] text-[#7A8A7C] text-xs">
                  <th className="text-left px-4 py-3 font-medium">Elevator</th>
                  <th className="text-right px-4 py-3 font-medium">Cash Price</th>
                  <th className="text-right px-4 py-3 font-medium">Basis</th>
                  <th className="text-right px-4 py-3 font-medium">Delivery</th>
                  <th className="text-right px-4 py-3 font-medium">Watch</th>
                </tr>
              </thead>
              <tbody>
                {activeCashBids.map((b, i) => (
                  <tr
                    key={b.id}
                    className={`border-b border-[#E4E7E0]/50 hover:bg-[#F5F5F3] transition-colors ${
                      i === activeCashBids.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-[#222527]">{b.location}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#222527]">
                      ${b.cashPrice.toFixed(2)}/bu
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      b.basis >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {b.basis >= 0 ? '+' : ''}{b.basis.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#7A8A7C]">
                      {new Date(b.deliveryStart).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(b.deliveryEnd).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleFavourite(b.id, b.location, 'cash', b.commodity, b.id)}>
                        <Star
                          size={15}
                          className={favourites.has(b.id)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-[#7A8A7C] hover:text-yellow-400'
                          }
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeCashBids.length === 0 && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl px-4 py-8 text-center text-[#7A8A7C] text-sm shadow-sm">
          No Saskatchewan cash bids available for {activeCommodity}
        </div>
      )}

    </div>
  )
}