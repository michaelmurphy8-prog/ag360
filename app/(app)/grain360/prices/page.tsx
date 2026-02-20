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