import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'

const sql = neon(process.env.DATABASE_URL!)

const ADMIN_CLERK_ID = 'user_3AfgiCDtz0gHx4WMcLx4bBtrSIY'

// GET — fetch seeded directory entries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const province = searchParams.get('province')
  const country = searchParams.get('country')

  try {
    const entries = await sql`
      SELECT
        id, type, business_name, contact_name,
        phone, email, province, city, country,
        service_radius_km, description, verified, created_at
      FROM connect_directory
      WHERE verified = true
        AND (${type}::text IS NULL OR type = ${type})
        AND (${province}::text IS NULL OR province = ${province})
        AND (${country}::text IS NULL OR country = ${country})
      ORDER BY business_name ASC
    `

    return NextResponse.json({ entries, total: entries.length })
  } catch (err) {
    console.error('GET /api/connect360/directory error:', err)
    return NextResponse.json({ error: 'Failed to load directory' }, { status: 500 })
  }
}

// POST — admin seeds a new directory entry
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (userId !== ADMIN_CLERK_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      type, business_name, contact_name,
      phone, email, province, city, country,
      service_radius_km, description, verified,
    } = body

    if (!type || !business_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO connect_directory (
        type, business_name, contact_name, phone, email,
        province, city, country, service_radius_km,
        description, verified
      ) VALUES (
        ${type}, ${business_name}, ${contact_name ?? null},
        ${phone ?? null}, ${email ?? null},
        ${province ?? null}, ${city ?? null},
        ${country ?? 'Canada'}, ${service_radius_km ?? null},
        ${description ?? null}, ${verified ?? false}
      )
      RETURNING id, business_name, created_at
    `

    return NextResponse.json({
      success: true,
      entry: result[0],
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/connect360/directory error:', err)
    return NextResponse.json({ error: 'Failed to create directory entry' }, { status: 500 })
  }
}

// PATCH — admin toggles verified status on a directory entry
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (userId !== ADMIN_CLERK_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, verified } = body

    if (!id || verified === undefined) {
      return NextResponse.json({ error: 'Missing id or verified' }, { status: 400 })
    }

    const result = await sql`
      UPDATE connect_directory SET
        verified = ${verified}
      WHERE id = ${id}
      RETURNING id, business_name, verified
    `

    return NextResponse.json({ success: true, entry: result[0] })
  } catch (err) {
    console.error('PATCH /api/connect360/directory error:', err)
    return NextResponse.json({ error: 'Failed to update directory entry' }, { status: 500 })
  }
}