'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Minus, Star, RefreshCw, Clock } from 'lucide-react'

type FuturesQuote = {
  symbol: string
  name: string
  lastPrice: number
  priceChange: number
  percentChange: number
  tradeTime: string
  unitCode: string
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

const COMMODITY_GROUPS = [
  { label: 'Canola', symbols: ['WC*1', 'WC*2', 'WC*3'] },
  { label: 'Wheat', symbols: ['ZW*1'] },
  { label: 'Corn', symbols: ['ZC*1'] },
  { label: 'Cattle', symbols: ['LE*1', 'GF*1'] },
  { label: 'Diesel', symbols: ['HO*1'] },
]

const UNIT_LABELS: Record<string, string> = {
  MT: '$/MT',
  BU: '¢/bu',
  CWT: '$/cwt',
  GAL: '$/gal',
}

function formatPrice(price: number, unitCode: string) {
  if (unitCode === 'GAL') return price.toFixed(3)
  return price.toFixed(2)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function ChangeIndicator({ change, percent }: { change: number; percent: number }) {
  if (change > 0) return (
    <span className="flex items-center gap-1 text-emerald-400 font-medium">
      <TrendingUp size={14} />
      +{change.toFixed(3)} ({percent.toFixed(2)}%)
    </span>
  )
  if (change < 0) return (
    <span className="flex items-center gap-1 text-red-400 font-medium">
      <TrendingDown size={14} />
      {change.toFixed(3)} ({percent.toFixed(2)}%)
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-gray-400 font-medium">
      <Minus size={14} />
      0.000 (0.00%)
    </span>
  )
}

export default function PricesPage() {
  const [data, setData] = useState<PricesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [favourites, setFavourites] = useState<Set<string>>(new Set())
  const [activeCommodity, setActiveCommodity] = useState('Canola')

  // ── Fetch prices
  async function fetchPrices(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch('/api/grain360/prices')
      const json = await res.json()
      if (json.success) {
        setData(json)
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

  // ── Fetch watchlist from database
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/grain360/watchlist')
      const json = await res.json()
      if (json.success) {
        const symbols = new Set<string>(json.watchlist.map((i: WatchlistItem) => i.symbol))
        setFavourites(symbols)
      }
    } catch {
      console.error('Failed to load watchlist')
    }
  }, [])

  useEffect(() => {
    fetchPrices()
    fetchWatchlist()
    const interval = setInterval(() => fetchPrices(), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchWatchlist])

  // ── Toggle favourite — optimistic UI + persist to DB
  async function toggleFavourite(
    symbol: string,
    label: string,
    type: 'futures' | 'cash',
    commodity?: string,
    location_id?: string
  ) {
    const isFav = favourites.has(symbol)

    // Optimistic update
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
      // Revert optimistic update on failure
      setFavourites(prev => {
        const next = new Set(prev)
        isFav ? next.add(symbol) : next.delete(symbol)
        return next
      })
    }
  }

  const activeSymbols = COMMODITY_GROUPS.find(g => g.label === activeCommodity)?.symbols ?? []
  const activeFutures = data?.futures.filter(f => activeSymbols.includes(f.symbol)) ?? []
  const activeCashBids = data?.cashBids.filter(b => b.commodity.toLowerCase() === activeCommodity.toLowerCase()) ?? []
  const favouriteFutures = data?.futures.filter(f => favourites.has(f.symbol)) ?? []
  const favouriteCashBids = data?.cashBids.filter(b => favourites.has(b.id)) ?? []
  const hasFavourites = favouriteFutures.length > 0 || favouriteCashBids.length > 0

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-[#7A8A6A] text-sm animate-pulse">Loading prices...</div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="text-red-400 text-sm">{error}</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0f1117] text-white p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Market Prices</h1>
          <p className="text-sm text-[#7A8A6A] mt-0.5">Futures & Saskatchewan cash bids</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1.5 text-xs text-[#7A8A6A]">
              <Clock size={12} />
              Updated {formatTime(data.lastUpdated)}
              {data.source === 'mock' && (
                <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px] font-medium">
                  DEMO
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => fetchPrices(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1f2e] hover:bg-[#222840] border border-[#2a3040] rounded-lg text-xs text-[#7A8A6A] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Favourites Watchlist */}
      {hasFavourites && (
        <div className="bg-[#1a1f2e] border border-[#F5C842]/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star size={14} className="text-[#F5C842] fill-[#F5C842]" />
            <span className="text-sm font-semibold text-[#F5C842]">Watchlist</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {favouriteFutures.map(f => (
              <div key={f.symbol} className="bg-[#0f1117] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#7A8A6A]">{f.symbol}</span>
                  <button onClick={() => toggleFavourite(f.symbol, f.name, 'futures')}>
                    <Star size={12} className="text-[#F5C842] fill-[#F5C842]" />
                  </button>
                </div>
                <div className="text-base font-bold">{formatPrice(f.lastPrice, f.unitCode)}</div>
                <ChangeIndicator change={f.priceChange} percent={f.percentChange} />
              </div>
            ))}
            {favouriteCashBids.map(b => (
              <div key={b.id} className="bg-[#0f1117] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-[#7A8A6A] truncate">{b.location}</span>
                  <button onClick={() => toggleFavourite(b.id, b.location, 'cash', b.commodity, b.id)}>
                    <Star size={12} className="text-[#F5C842] fill-[#F5C842]" />
                  </button>
                </div>
                <div className="text-base font-bold">${b.cashPrice.toFixed(2)}/bu</div>
                <span className="text-xs text-[#7A8A6A]">Basis {b.basis.toFixed(2)}</span>
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
                : 'bg-[#1a1f2e] text-[#7A8A6A] hover:bg-[#222840] border border-[#2a3040]'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Futures Table */}
      <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#2a3040]">
          <h2 className="text-sm font-semibold text-white">{activeCommodity} — Futures</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3040] text-[#7A8A6A] text-xs">
                <th className="text-left px-4 py-3 font-medium">Contract</th>
                <th className="text-right px-4 py-3 font-medium">Last</th>
                <th className="text-right px-4 py-3 font-medium">Change</th>
                <th className="text-right px-4 py-3 font-medium">Unit</th>
                <th className="text-right px-4 py-3 font-medium">Watch</th>
              </tr>
            </thead>
            <tbody>
              {activeFutures.map((f, i) => (
                <tr
                  key={f.symbol}
                  className={`border-b border-[#2a3040]/50 hover:bg-[#222840] transition-colors ${
                    i === activeFutures.length - 1 ? 'border-0' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{f.name}</div>
                    <div className="text-xs text-[#7A8A6A]">{f.symbol}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-white">
                    {formatPrice(f.lastPrice, f.unitCode)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChangeIndicator change={f.priceChange} percent={f.percentChange} />
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[#7A8A6A]">
                    {UNIT_LABELS[f.unitCode] ?? f.unitCode}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => toggleFavourite(f.symbol, f.name, 'futures')}>
                      <Star
                        size={15}
                        className={favourites.has(f.symbol)
                          ? 'text-[#F5C842] fill-[#F5C842]'
                          : 'text-[#7A8A6A] hover:text-[#F5C842]'
                        }
                      />
                    </button>
                  </td>
                </tr>
              ))}
              {activeFutures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#7A8A6A] text-sm">
                    No futures data for {activeCommodity}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Bids Table */}
      {activeCashBids.length > 0 && (
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a3040]">
            <h2 className="text-sm font-semibold text-white">{activeCommodity} — Saskatchewan Cash Bids</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a3040] text-[#7A8A6A] text-xs">
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
                    className={`border-b border-[#2a3040]/50 hover:bg-[#222840] transition-colors ${
                      i === activeCashBids.length - 1 ? 'border-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white">{b.location}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">
                      ${b.cashPrice.toFixed(2)}/bu
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      b.basis >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {b.basis >= 0 ? '+' : ''}{b.basis.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[#7A8A6A]">
                      {new Date(b.deliveryStart).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                      {' – '}
                      {new Date(b.deliveryEnd).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleFavourite(b.id, b.location, 'cash', b.commodity, b.id)}>
                        <Star
                          size={15}
                          className={favourites.has(b.id)
                            ? 'text-[#F5C842] fill-[#F5C842]'
                            : 'text-[#7A8A6A] hover:text-[#F5C842]'
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
        <div className="bg-[#1a1f2e] border border-[#2a3040] rounded-xl px-4 py-8 text-center text-[#7A8A6A] text-sm">
          No Saskatchewan cash bids available for {activeCommodity}
        </div>
      )}

    </div>
  )
}