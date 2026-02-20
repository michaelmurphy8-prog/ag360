import { NextResponse } from 'next/server'

type FXResponse = {
  success: boolean
  rate: number
  base: string
  quote: string
  source: string
  lastUpdated: string
}

// Simple in-memory cache — refreshes every 60 minutes
let cache: { rate: number; fetchedAt: number } | null = null
const CACHE_TTL = 60 * 60 * 1000 // 60 minutes

export async function GET(): Promise<NextResponse<FXResponse>> {
  try {
    // Return cached rate if still fresh
    if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        rate: cache.rate,
        base: 'USD',
        quote: 'CAD',
        source: 'bank-of-canada',
        lastUpdated: new Date(cache.fetchedAt).toISOString(),
      })
    }

    // Bank of Canada public API — no key required
    const res = await fetch(
      'https://www.bankofcanada.ca/valet/observations/FXUSDCAD/json?recent=1',
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) throw new Error('Bank of Canada API unavailable')

    const data = await res.json()
    const observations = data?.observations
    if (!observations || observations.length === 0) throw new Error('No FX data returned')

    const rate = parseFloat(observations[0].FXUSDCAD.v)
    if (isNaN(rate)) throw new Error('Invalid rate value')

    // Update cache
    cache = { rate, fetchedAt: Date.now() }

    return NextResponse.json({
      success: true,
      rate,
      base: 'USD',
      quote: 'CAD',
      source: 'bank-of-canada',
      lastUpdated: new Date().toISOString(),
    })
  } catch (err) {
    console.error('FX rate fetch failed:', err)

    // Fallback to a reasonable hardcoded rate if API fails
    return NextResponse.json({
      success: true,
      rate: 1.3650,
      base: 'USD',
      quote: 'CAD',
      source: 'fallback',
      lastUpdated: new Date().toISOString(),
    })
  }
}