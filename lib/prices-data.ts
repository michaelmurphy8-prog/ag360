export type FuturesQuote = {
  symbol: string
  name: string
  lastPrice: number
  priceChange: number
  percentChange: number
  tradeTime: string
  unitCode: string
}

export type CashBid = {
  id: string
  commodity: string
  location: string
  cashPrice: number
  basis: number
  deliveryStart: string
  deliveryEnd: string
}

export type PricesPayload = {
  success: boolean
  source: string
  lastUpdated: string
  futures: FuturesQuote[]
  cashBids: CashBid[]
}

export function getPricesData(): PricesPayload {
  return {
    success: true,
    source: 'mock',
    lastUpdated: new Date().toISOString(),
    futures: [
      { symbol: 'WC*1', name: 'Canola Nov 2025', lastPrice: 614.50, priceChange: 3.20, percentChange: 0.52, tradeTime: new Date().toISOString(), unitCode: 'MT' },
      { symbol: 'WC*2', name: 'Canola Jan 2026', lastPrice: 621.80, priceChange: 2.90, percentChange: 0.47, tradeTime: new Date().toISOString(), unitCode: 'MT' },
      { symbol: 'WC*3', name: 'Canola Mar 2026', lastPrice: 628.10, priceChange: 2.50, percentChange: 0.40, tradeTime: new Date().toISOString(), unitCode: 'MT' },
      { symbol: 'ZW*1', name: 'Chicago Wheat Dec 2025', lastPrice: 541.25, priceChange: -1.75, percentChange: -0.32, tradeTime: new Date().toISOString(), unitCode: 'BU' },
      { symbol: 'ZC*1', name: 'Corn Dec 2025', lastPrice: 438.50, priceChange: 1.25, percentChange: 0.29, tradeTime: new Date().toISOString(), unitCode: 'BU' },
      { symbol: 'LE*1', name: 'Live Cattle Dec 2025', lastPrice: 189.75, priceChange: 0.85, percentChange: 0.45, tradeTime: new Date().toISOString(), unitCode: 'CWT' },
      { symbol: 'GF*1', name: 'Feeder Cattle Jan 2026', lastPrice: 261.30, priceChange: -0.55, percentChange: -0.21, tradeTime: new Date().toISOString(), unitCode: 'CWT' },
      { symbol: 'HO*1', name: 'Diesel / Heating Oil Dec 2025', lastPrice: 2.487, priceChange: 0.032, percentChange: 1.30, tradeTime: new Date().toISOString(), unitCode: 'GAL' },
    ],
    cashBids: [
      { id: 'viterra-swift-current-canola', commodity: 'Canola', location: 'Viterra Swift Current', cashPrice: 13.42, basis: -1.08, deliveryStart: '2025-11-01T12:00:00Z', deliveryEnd: '2025-11-30T12:00:00Z' },
      { id: 'cargill-moose-jaw-canola', commodity: 'Canola', location: 'Cargill Moose Jaw', cashPrice: 13.38, basis: -1.12, deliveryStart: '2025-11-01T12:00:00Z', deliveryEnd: '2025-11-30T12:00:00Z' },
      { id: 'viterra-regina-wheat', commodity: 'Wheat', location: 'Viterra Regina', cashPrice: 7.85, basis: -0.65, deliveryStart: '2025-11-01T12:00:00Z', deliveryEnd: '2025-11-30T12:00:00Z' },
      { id: 'parrish-heimbecker-saskatoon-canola', commodity: 'Canola', location: 'Parrish & Heimbecker Saskatoon', cashPrice: 13.45, basis: -1.05, deliveryStart: '2025-11-01T12:00:00Z', deliveryEnd: '2025-11-30T12:00:00Z' },
      { id: 'richardson-pioneer-swift-current-peas', commodity: 'Peas', location: 'Richardson Pioneer Swift Current', cashPrice: 8.20, basis: -0.45, deliveryStart: '2025-11-01T12:00:00Z', deliveryEnd: '2025-11-30T12:00:00Z' },
    ],
  }
}