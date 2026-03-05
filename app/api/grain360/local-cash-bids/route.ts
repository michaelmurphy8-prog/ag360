import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// GET — fetch all bids for user
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bids = await sql`
    SELECT id, company, location, commodity, cash_price, basis, delivery_month, notes, updated_at
    FROM local_cash_bids
    WHERE user_id = ${userId}
    ORDER BY company ASC, location ASC, commodity ASC, delivery_month ASC
  `

  return NextResponse.json({ success: true, bids })
}

// POST — create new bid
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { company, location, commodity, cash_price, basis, delivery_month, notes } = await req.json()

  if (!company || !location || !commodity || cash_price == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const result = await sql`
    INSERT INTO local_cash_bids 
      (user_id, company, location, commodity, cash_price, basis, delivery_month, notes, updated_at)
    VALUES 
      (${userId}, ${company}, ${location}, ${commodity}, ${cash_price},
       ${basis ?? null}, ${delivery_month ?? null}, ${notes ?? null}, NOW())
    RETURNING *
  `

  return NextResponse.json({ success: true, bid: result[0] })
}

// PATCH — update existing bid
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, company, location, commodity, cash_price, basis, delivery_month, notes } = await req.json()

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const result = await sql`
    UPDATE local_cash_bids SET
      company        = ${company},
      location       = ${location},
      commodity      = ${commodity},
      cash_price     = ${cash_price},
      basis          = ${basis ?? null},
      delivery_month = ${delivery_month ?? null},
      notes          = ${notes ?? null},
      updated_at     = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `

  return NextResponse.json({ success: true, bid: result[0] })
}

// DELETE — remove a bid
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await sql`
    DELETE FROM local_cash_bids
    WHERE id = ${id} AND user_id = ${userId}
  `

  return NextResponse.json({ success: true })
}