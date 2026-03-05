import yahooFinance from 'yahoo-finance2'
import { neon } from '@neondatabase/serverless'

export type FuturesQuote = {
  symbol: string
  name: string
  lastPrice: number
  priceChange: number
  percentChange: number
  tradeTime: string
  unitCode: string
  source: 'live' | 'manual'
  staleSince?: string // ISO string — for canola bid freshness
}

export type CashBid = {
  id: string
  commodity: string
  location: string
  cashPrice: number
  basis: number
  deliveryStart: string
  deliveryEnd: string
  source: 'live' | 'manual'
}

export type PricesPayload = {
  success: boolean
  source: string
  lastUpdated: string
  futures: FuturesQuote[]
  cashBids: CashBid[]
}

export type PriceHistoryPoint = {
  date: string
  price: number
}

// ─── Yahoo Finance symbol map ─────────────────────────────────
const YAHOO_SYMBOLS: { yahoo: string; ag360: string; name: string; unitCode: string }[] = [
  { yahoo: 'ZW=F',  ag360: 'ZW*1', name: 'Chicago Wheat',        unitCode: 'BU'  },
  { yahoo: 'ZC=F',  ag360: 'ZC*1', name: 'Corn',                 unitCode: 'BU'  },
  { yahoo: 'HO=F',  ag360: 'HO*1', name: 'Diesel / Heating Oil', unitCode: 'GAL' },
  { yahoo: 'LE=F',  ag360: 'LE*1', name: 'Live Cattle',          unitCode: 'CWT' },
  { yahoo: 'GF=F',  ag360: 'GF*1', name: 'Feeder Cattle',        unitCode: 'CWT' },
  { yahoo: 'CAD=X', ag360: 'CAD',  name: 'CAD/USD',              unitCode: 'FX'  },
]

// ─── Canola fallback (used only when user has no bids entered) ─
const CANOLA_FALLBACK: FuturesQuote[] = [
  { symbol: 'WC*1', name: 'Canola — call your elevator', lastPrice: 614.50, priceChange: 0, percentChange: 0, tradeTime: new Date().toISOString(), unitCode: 'MT', source: 'manual' },
  { symbol: 'WC*2', name: 'Canola Jan 2026',              lastPrice: 621.80, priceChange: 0, percentChange: 0, tradeTime: new Date().toISOString(), unitCode: 'MT', source: 'manual' },
  { symbol: 'WC*3', name: 'Canola Mar 2026',              lastPrice: 628.10, priceChange: 0, percentChange: 0, tradeTime: new Date().toISOString(), unitCode: 'MT', source: 'manual' },
]

// ─── Static cash bids (manual — no free API for SK cash bids) ─
const CASH_BIDS_STATIC: CashBid[] = [
  { id: 'viterra-swift-current-canola',         commodity: 'Canola', location: 'Viterra Swift Current',             cashPrice: 13.42, basis: -1.08, deliveryStart: '2026-03-01T12:00:00Z', deliveryEnd: '2026-03-31T12:00:00Z', source: 'manual' },
  { id: 'cargill-moose-jaw-canola',             commodity: 'Canola', location: 'Cargill Moose Jaw',                 cashPrice: 13.38, basis: -1.12, deliveryStart: '2026-03-01T12:00:00Z', deliveryEnd: '2026-03-31T12:00:00Z', source: 'manual' },
  { id: 'viterra-regina-wheat',                 commodity: 'Wheat',  location: 'Viterra Regina',                   cashPrice: 7.85,  basis: -0.65, deliveryStart: '2026-03-01T12:00:00Z', deliveryEnd: '2026-03-31T12:00:00Z', source: 'manual' },
  { id: 'parrish-heimbecker-saskatoon-canola',  commodity: 'Canola', location: 'Parrish & Heimbecker Saskatoon',   cashPrice: 13.45, basis: -1.05, deliveryStart: '2026-03-01T12:00:00Z', deliveryEnd: '2026-03-31T12:00:00Z', source: 'manual' },
  { id: 'richardson-pioneer-swift-peas',        commodity: 'Peas',   location: 'Richardson Pioneer Swift Current', cashPrice: 8.20,  basis: -0.45, deliveryStart: '2026-03-01T12:00:00Z', deliveryEnd: '2026-03-31T12:00:00Z', source: 'manual' },
]

// ─── Build canola quotes from user's local bids ───────────────
// Takes the 3 most recent bids (sorted by updated_at desc) and maps them
// to WC*1, WC*2, WC*3. If fewer than 3 bids exist, fills gaps with 0-price placeholders.
type LocalBidRow = {
  id: number
  elevator: string
  cash_price: string | number
  delivery_month: string | null
  updated_at: string
}

function buildCanolaFromBids(bids: LocalBidRow[]): FuturesQuote[] {
  const slots = [
    { symbol: 'WC*1', suffix: '' },
    { symbol: 'WC*2', suffix: ' (2nd bid)' },
    { symbol: 'WC*3', suffix: ' (3rd bid)' },
  ]

  return slots.map((slot, i) => {
    const bid = bids[i]
    if (!bid) {
      return {
        symbol: slot.symbol,
        name: 'Canola — call your elevator',
        lastPrice: 0,
        priceChange: 0,
        percentChange: 0,
        tradeTime: new Date().toISOString(),
        unitCode: 'MT',
        source: 'manual' as const,
      }
    }

    const deliveryLabel = bid.delivery_month
      ? ` · ${bid.delivery_month}`
      : ''
    const name = `Canola — ${bid.elevator}${deliveryLabel}`

    // Convert $/bu to $/MT if price looks like $/bu (< 100)
    // Canola $/bu is typically 12–18, $/MT is typically 550–700
    const rawPrice = Number(bid.cash_price)
    const priceInMt = rawPrice < 100 ? rawPrice * 44.0924 : rawPrice

    return {
      symbol: slot.symbol,
      name,
      lastPrice: parseFloat(priceInMt.toFixed(2)),
      priceChange: 0,
      percentChange: 0,
      tradeTime: bid.updated_at,
      unitCode: 'MT',
      source: 'manual' as const,
      staleSince: bid.updated_at,
    }
  })
}

// ─── Main fetch ───────────────────────────────────────────────
export async function getPricesData(userId?: string): Promise<PricesPayload> {
  const liveFutures: FuturesQuote[] = []

  // 1. Fetch live prices from Yahoo Finance
  try {
    const symbols = YAHOO_SYMBOLS.map(s => s.yahoo)
    const results = await yahooFinance.quote(symbols) as any[]
    const quotes = Array.isArray(results) ? results : [results]

    for (const quote of quotes as any[]) {
      const map = YAHOO_SYMBOLS.find(s => s.yahoo === quote.symbol)
      if (!map) continue
      liveFutures.push({
        symbol: map.ag360,
        name: map.name,
        lastPrice: quote.regularMarketPrice ?? 0,
        priceChange: quote.regularMarketChange ?? 0,
        percentChange: quote.regularMarketChangePercent ?? 0,
        tradeTime: quote.regularMarketTime
          ? new Date(quote.regularMarketTime).toISOString()
          : new Date().toISOString(),
        unitCode: map.unitCode,
        source: 'live',
      })
    }
  } catch (err) {
    console.error('Yahoo Finance fetch failed — falling back to static:', err)
  }

  // 2. Fetch user's canola bids from Neon (if userId provided)
  let canolaQuotes: FuturesQuote[] = CANOLA_FALLBACK

  if (userId && process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL)
      const bids = await sql`
        SELECT id, elevator, cash_price, delivery_month, updated_at
        FROM canola_local_bids
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC
        LIMIT 3
      ` as LocalBidRow[]

      if (bids.length > 0) {
        canolaQuotes = buildCanolaFromBids(bids)
      }
    } catch (err) {
      console.error('Canola bids fetch failed — using fallback:', err)
    }
  }

  // 3. Fill any gaps in live data with static fallback
  const liveSymbols = liveFutures.map(f => f.symbol)
  const staticFallbacks: FuturesQuote[] = [
    { symbol: 'ZW*1', name: 'Chicago Wheat',        lastPrice: 541.25, priceChange: -1.75, percentChange: -0.32, tradeTime: new Date().toISOString(), unitCode: 'BU',  source: 'manual' },
    { symbol: 'ZC*1', name: 'Corn',                 lastPrice: 438.50, priceChange:  1.25, percentChange:  0.29, tradeTime: new Date().toISOString(), unitCode: 'BU',  source: 'manual' },
    { symbol: 'HO*1', name: 'Diesel / Heating Oil', lastPrice:   2.487, priceChange: 0.032, percentChange:  1.30, tradeTime: new Date().toISOString(), unitCode: 'GAL', source: 'manual' },
    { symbol: 'LE*1', name: 'Live Cattle',           lastPrice: 189.75, priceChange:  0.85, percentChange:  0.45, tradeTime: new Date().toISOString(), unitCode: 'CWT', source: 'manual' },
    { symbol: 'GF*1', name: 'Feeder Cattle',         lastPrice: 261.30, priceChange: -0.55, percentChange: -0.21, tradeTime: new Date().toISOString(), unitCode: 'CWT', source: 'manual' },
  ]
  const gaps = staticFallbacks.filter(f => !liveSymbols.includes(f.symbol))

  return {
    success: true,
    source: liveFutures.length > 0 ? 'yahoo-finance' : 'static-fallback',
    lastUpdated: new Date().toISOString(),
    futures: [...canolaQuotes, ...liveFutures, ...gaps],
    cashBids: CASH_BIDS_STATIC,
  }
}

// ─── Price history ────────────────────────────────────────────
export async function getPriceHistory(symbol: string): Promise<PriceHistoryPoint[]> {
  const map = YAHOO_SYMBOLS.find(s => s.ag360 === symbol)

  if (map) {
    try {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - 180)

      const result = await yahooFinance.historical(map.yahoo, {
        period1: start.toISOString().split('T')[0],
        period2: end.toISOString().split('T')[0],
        interval: '1d',
      })

      return (result as any[])
        .filter((r: any) => r.close !== null)
        .map((r: any) => ({
          date: r.date.toISOString().split('T')[0],
          price: parseFloat((r.close ?? 0).toFixed(4)),
        }))
    } catch (err) {
      console.error(`Yahoo history fetch failed for ${symbol}:`, err)
    }
  }

  // Fallback mock history for canola (no Yahoo symbol available)
  const BASE_PRICES: Record<string, number> = {
    'WC*1': 598, 'WC*2': 605, 'WC*3': 611,
  }
  const base = BASE_PRICES[symbol] ?? 500
  let current = base
  const today = new Date()
  const points: PriceHistoryPoint[] = []

  for (let i = 179; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    if (date.getDay() === 0 || date.getDay() === 6) continue
    const change = (Math.random() - 0.48) * (base * 0.012)
    current = Math.max(base * 0.75, Math.min(base * 1.25, current + change))
    points.push({ date: date.toISOString().split('T')[0], price: parseFloat(current.toFixed(2)) })
  }

  return points
}