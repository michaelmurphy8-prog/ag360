import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// GET — fetch all watchlist items for the current user
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT * FROM user_watchlist
    WHERE clerk_user_id = ${userId}
    ORDER BY created_at ASC
  `

  return NextResponse.json({ success: true, watchlist: rows })
}

// POST — add an item to the watchlist
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { symbol, label, type, commodity, location_id } = body

  if (!symbol || !label || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO user_watchlist (clerk_user_id, symbol, label, type, commodity, location_id)
    VALUES (${userId}, ${symbol}, ${label}, ${type}, ${commodity ?? null}, ${location_id ?? null})
    ON CONFLICT (clerk_user_id, symbol) DO NOTHING
    RETURNING *
  `

  return NextResponse.json({ success: true, item: rows[0] })
}

// DELETE — remove an item from the watchlist
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol } = await req.json()

  if (!symbol) {
    return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })
  }

  await sql`
    DELETE FROM user_watchlist
    WHERE clerk_user_id = ${userId} AND symbol = ${symbol}
  `

  return NextResponse.json({ success: true })
}