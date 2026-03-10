import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

// GET — farmer views their own connection requests
export async function GET(req: NextRequest) {
  const { tenantId } = await getTenantAuth()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const requests = await sql`
      SELECT
        cr.id, cr.status, cr.message, cr.created_at,
        cp.id AS profile_id, cp.type, cp.first_name, cp.last_name,
        cp.business_name, cp.phone, cp.email, cp.photo_url,
        cp.base_city, cp.base_province, cp.base_country,
        cp.availability, cp.verified_at
      FROM connect_requests cr
      JOIN connect_profiles cp ON cp.id = cr.connect_profile_id
      WHERE cr.tenant_id = ${tenantId}
      ORDER BY cr.created_at DESC
    `

    return NextResponse.json({ requests })
  } catch (err) {
    console.error('GET /api/connect360/requests error:', err)
    return NextResponse.json({ error: 'Failed to load requests' }, { status: 500 })
  }
}

// POST — farmer sends a connection request to a provider
export async function POST(req: NextRequest) {
  const { tenantId } = await getTenantAuth()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { connect_profile_id, message } = body

    if (!connect_profile_id) {
      return NextResponse.json({ error: 'Missing connect_profile_id' }, { status: 400 })
    }

    // Verify provider exists and is approved
    const provider = await sql`
      SELECT id, first_name, last_name, email, phone, business_name
      FROM connect_profiles
      WHERE id = ${connect_profile_id} AND status = 'approved'
    `

    if (provider.length === 0) {
      return NextResponse.json({ error: 'Provider not found or not approved' }, { status: 404 })
    }

    // Check for duplicate request
    const existing = await sql`
      SELECT id FROM connect_requests
      WHERE tenant_id = ${tenantId}
      AND connect_profile_id = ${connect_profile_id}
    `

    if (existing.length > 0) {
      // Return existing request + provider info (already connected)
      return NextResponse.json({
        success: true,
        already_connected: true,
        provider: provider[0],
      })
    }

    // Create the connection request
    const result = await sql`
      INSERT INTO connect_requests (tenant_id, connect_profile_id, message, status)
      VALUES (${tenantId}, ${connect_profile_id}, ${message ?? null}, 'accepted')
      RETURNING id, status, created_at
    `

    // Return provider contact info immediately (direct reveal model)
    return NextResponse.json({
      success: true,
      already_connected: false,
      request: result[0],
      provider: provider[0],
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/connect360/requests error:', err)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}