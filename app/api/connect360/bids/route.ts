import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

// GET — list active bids
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const bid_type = searchParams.get('bid_type')
  const province = searchParams.get('province')
  const country = searchParams.get('country')
  const start_date_from = searchParams.get('start_date_from')
  const mine = searchParams.get('mine') === 'true'

  let tenant_id: string | null = null
  if (mine) {
    try {
      const auth = await getTenantAuth()
      tenant_id = auth.tenantId ?? null
    } catch {}
  }

  try {
    const bids = await sql`
      SELECT *
      FROM connect_bids
      WHERE status = 'active'
        AND expires_at > NOW()
        AND (${bid_type}::text IS NULL OR bid_type = ${bid_type})
        AND (${province}::text IS NULL OR province = ${province})
        AND (${country}::text IS NULL OR country = ${country})
        AND (${start_date_from}::text IS NULL OR start_date >= ${start_date_from}::date)
        AND (${mine} = false OR tenant_id = ${tenant_id})
      ORDER BY created_at DESC
    `
    return NextResponse.json({ bids, total: bids.length })
  } catch (err) {
    console.error('GET /api/connect360/bids error:', err)
    return NextResponse.json({ error: 'Failed to load bids' }, { status: 500 })
  }
}

// POST — farmer posts a new bid
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      farm_name,
      contact_name,
      contact_phone,
      contact_email,
      province,
      city,
      country,
      bid_type,
      title,
      description,
      acres,
      crop_types,
      equipment_required,
      start_date,
      end_date,
      duration_notes,
      pay_rate,
      housing_provided,
      meals_provided,
    } = body

    if (!farm_name || !contact_name || !contact_email || !bid_type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const valid = ['worker', 'applicator', 'trucker']
    if (!valid.includes(bid_type)) {
      return NextResponse.json({ error: 'Invalid bid type' }, { status: 400 })
    }

    // Get tenant_id if logged in AG360 farmer
    let tenant_id: string | null = null
    try {
      const auth = await getTenantAuth()
      tenant_id = auth.tenantId ?? null
    } catch {}

    const result = await sql`
      INSERT INTO connect_bids (
        tenant_id, farm_name, contact_name, contact_phone, contact_email,
        province, city, country, bid_type, title, description,
        acres, crop_types, equipment_required, start_date, end_date,
        duration_notes, pay_rate, housing_provided, meals_provided
      ) VALUES (
        ${tenant_id}, ${farm_name}, ${contact_name}, ${contact_phone ?? null},
        ${contact_email}, ${province ?? null}, ${city ?? null},
        ${country ?? 'Canada'}, ${bid_type}, ${title}, ${description ?? null},
        ${acres ?? null}, ${crop_types ?? []}, ${equipment_required ?? null},
        ${start_date ?? null}, ${end_date ?? null}, ${duration_notes ?? null},
        ${pay_rate ?? null}, ${housing_provided ?? false}, ${meals_provided ?? false}
      )
      RETURNING *
    `

    return NextResponse.json({ success: true, bid: result[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/connect360/bids error:', err)
    return NextResponse.json({ error: 'Failed to post bid' }, { status: 500 })
  }
}

// DELETE — remove a bid
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await sql`DELETE FROM connect_bids WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/connect360/bids error:', err)
    return NextResponse.json({ error: 'Failed to delete bid' }, { status: 500 })
  }
}

// PATCH — status update OR full field edit (owner only)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, ...fields } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    // Status-only update
    if (status && !fields.title) {
      if (!['filled', 'expired', 'active'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      await sql`UPDATE connect_bids SET status = ${status} WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }

    // Full field update
    const {
      farm_name, contact_name, contact_phone, contact_email,
      province, city, country, bid_type, title, description,
      acres, crop_types, equipment_required, start_date, end_date,
      duration_notes, pay_rate, housing_provided, meals_provided,
    } = fields

    await sql`
      UPDATE connect_bids SET
        farm_name = ${farm_name},
        contact_name = ${contact_name},
        contact_phone = ${contact_phone ?? null},
        contact_email = ${contact_email},
        province = ${province ?? null},
        city = ${city ?? null},
        country = ${country ?? 'Canada'},
        bid_type = ${bid_type},
        title = ${title},
        description = ${description ?? null},
        acres = ${acres ?? null},
        crop_types = ${crop_types ?? []},
        equipment_required = ${equipment_required ?? null},
        start_date = ${start_date ?? null},
        end_date = ${end_date ?? null},
        duration_notes = ${duration_notes ?? null},
        pay_rate = ${pay_rate ?? null},
        housing_provided = ${housing_provided ?? false},
        meals_provided = ${meals_provided ?? false}
      WHERE id = ${id}
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('PATCH /api/connect360/bids error:', err)
    return NextResponse.json({ error: 'Failed to update bid' }, { status: 500 })
  }
}