// app/api/inventory/holdings/route.ts
// Now reads/writes from bins table — single source of truth with Bin Map

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// GET — all bins for user (Holdings view)
export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const holdings = await sql`
    SELECT
      b.id,
      b.bin_name        AS location,
      b.crop,
      b.current_bu      AS quantity_bu,
      b.capacity_bu,
      b.grade,
      b.moisture_pct    AS moisture,
      b.estimated_price,
      b.notes,
      y.yard_name,
      b.updated_at
    FROM bins b
    LEFT JOIN bin_yards y ON y.id = b.yard_id
    WHERE b.user_id = ${userId}
    ORDER BY y.yard_name ASC, b.bin_name ASC
  `

  // KPI rollup
  const totalBu    = holdings.reduce((s, h) => s + Number(h.quantity_bu  || 0), 0)
  const totalValue = holdings.reduce((s, h) => s + Number(h.quantity_bu  || 0) * Number(h.estimated_price || 0), 0)

  return NextResponse.json({ success: true, holdings, totalBu, totalValue })
}

// POST — add a new bin (shows up in both Holdings + Bin Map)
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { bin_name, yard_id, crop, quantity_bu, capacity_bu, grade, moisture, estimated_price, notes } = await req.json()

  if (!bin_name || !crop || quantity_bu == null) {
    return NextResponse.json({ error: 'Missing required fields: bin_name, crop, quantity_bu' }, { status: 400 })
  }

  // Default yard_id to user's first yard if not provided
  let resolvedYardId = yard_id
  if (!resolvedYardId) {
    const yards = await sql`SELECT id FROM bin_yards WHERE user_id = ${userId} LIMIT 1`
    resolvedYardId = yards[0]?.id ?? null
  }

  const result = await sql`
    INSERT INTO bins (
      user_id, yard_id, bin_name, bin_type,
      crop, current_bu, capacity_bu,
      grade, moisture_pct, estimated_price, notes
    ) VALUES (
      ${userId}, ${resolvedYardId}, ${bin_name}, 'grain_bin',
      ${crop}, ${quantity_bu}, ${capacity_bu ?? quantity_bu},
      ${grade ?? '#1'}, ${moisture ?? null}, ${estimated_price ?? null}, ${notes ?? null}
    )
    RETURNING *
  `

  return NextResponse.json({ success: true, holding: result[0] })
}

// PATCH — update a bin
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, bin_name, crop, quantity_bu, capacity_bu, grade, moisture, estimated_price, notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const result = await sql`
    UPDATE bins SET
      bin_name        = COALESCE(${bin_name ?? null}, bin_name),
      crop            = COALESCE(${crop ?? null}, crop),
      current_bu      = COALESCE(${quantity_bu ?? null}, current_bu),
      capacity_bu     = COALESCE(${capacity_bu ?? null}, capacity_bu),
      grade           = COALESCE(${grade ?? null}, grade),
      moisture_pct    = COALESCE(${moisture ?? null}, moisture_pct),
      estimated_price = COALESCE(${estimated_price ?? null}, estimated_price),
      notes           = ${notes ?? null},
      updated_at      = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `

  return NextResponse.json({ success: true, holding: result[0] })
}

// DELETE — remove bin entirely (disappears from both Holdings + Bin Map)
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await sql`DELETE FROM bins WHERE id = ${id} AND user_id = ${userId}`

  return NextResponse.json({ success: true })
}