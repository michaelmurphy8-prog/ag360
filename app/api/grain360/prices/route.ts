import { NextResponse } from 'next/server'
import { getPricesData } from '@/lib/prices-data'

export async function GET() {
  try {
    return NextResponse.json(getPricesData())
  } catch (error) {
    console.error('Prices API error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}