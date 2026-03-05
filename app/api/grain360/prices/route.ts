import { NextResponse } from 'next/server'
import { getPricesData } from '@/lib/prices-data'

export async function GET() {
  try {
    const data = await getPricesData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Prices API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}