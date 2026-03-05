import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const bids = await sql`
    SELECT * FROM canola_local_bids
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `
  return NextResponse.json({ success: true, bids })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const { elevator, cash_price, delivery_month, notes } = await req.json()
  if (!elevator || !cash_price) return NextResponse.json({ error: 'elevator and cash_price required' }, { status: 400 })
  const [bid] = await sql`
    INSERT INTO canola_local_bids (user_id, elevator, cash_price, delivery_month, notes)
    VALUES (${userId}, ${elevator}, ${cash_price}, ${delivery_month || null}, ${notes || null})
    RETURNING *
  `
  return NextResponse.json({ success: true, bid })
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const { id, elevator, cash_price, delivery_month, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await sql`
    UPDATE canola_local_bids
    SET elevator = ${elevator}, cash_price = ${cash_price},
        delivery_month = ${delivery_month || null}, notes = ${notes || null},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sql = neon(process.env.DATABASE_URL!)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await sql`DELETE FROM canola_local_bids WHERE id = ${id} AND user_id = ${userId}`
  return NextResponse.json({ success: true })
}