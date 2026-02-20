import { NextRequest, NextResponse } from 'next/server'
import { getPriceHistory } from '@/lib/prices-data'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Missing symbol parameter' },
      { status: 400 }
    )
  }

  const history = getPriceHistory(symbol)

  return NextResponse.json({
    success: true,
    symbol,
    source: 'mock',
    history,
  })
}