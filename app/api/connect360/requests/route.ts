import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { auth } from '@clerk/nextjs/server'
import { Resend } from 'resend'
const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

// GET — farmer views their own connection requests
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profile_id')
  const statusFilter = searchParams.get('status')
  const { tenantId } = await getTenantAuth()

  // Standalone Connect360 users — fall back to Clerk userId
  if (!tenantId) {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try {
      // Check if a specific profile connection exists
      if (profileId) {
        const result = await sql`
          SELECT status FROM connect_requests
          WHERE clerk_user_id = ${userId}
          AND connect_profile_id = ${profileId}
          LIMIT 1
        `
        return NextResponse.json({ status: result[0]?.status ?? null })
      }
      // Return accepted connections with full profile data
      const connections = await sql`
        SELECT
          cr.id, cr.status, cr.created_at,
          cp.id AS profile_id, cp.type, cp.first_name, cp.last_name,
          cp.business_name, cp.phone, cp.email, cp.photo_url,
          cp.base_city, cp.base_province, cp.availability
        FROM connect_requests cr
        JOIN connect_profiles cp ON cp.id = cr.connect_profile_id
        WHERE cr.clerk_user_id = ${userId}
        ${statusFilter ? sql`AND cr.status = ${statusFilter}` : sql``}
        ORDER BY cr.created_at DESC
      `
      return NextResponse.json({ connections })
    } catch (err) {
      return NextResponse.json({ error: 'Failed to load connections' }, { status: 500 })
    }
  }

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
  const { userId } = await auth()
  if (!tenantId && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      WHERE (tenant_id = ${tenantId ?? null} OR clerk_user_id = ${userId ?? null})
      AND connect_profile_id = ${connect_profile_id}
    `
    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        already_connected: true,
        provider: provider[0],
      })
    }
    // Create the connection request
    const result = await sql`
      INSERT INTO connect_requests (tenant_id, clerk_user_id, connect_profile_id, message, status)
      VALUES (${tenantId ?? null}, ${userId ?? null}, ${connect_profile_id}, ${message ?? null}, 'accepted')
      RETURNING id, status, created_at
    `

    // Email notification to provider — fire and forget
    try {
      const [farm] = await sql`
        SELECT farm_name FROM farm_profiles WHERE tenant_id = ${tenantId} LIMIT 1
      `
      const farmName = farm?.farm_name ?? 'A farmer'
      if (provider[0].email) {
        await resend.emails.send({
          from: 'AG360 Connect360 <hello@ag360.farm>',
          to: provider[0].email,
          subject: `${farmName} connected with you on AG360 Connect360`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#d4af37;">New Connection on AG360 Connect360</h2>
              <p><strong>${farmName}</strong> has connected with your listing and can now see your contact details.</p>
              ${message ? `<p style="color:#94a3b8;font-style:italic;">"${message}"</p>` : ''}
              <p>Log in to <a href="https://ag360.farm/connect360" style="color:#d4af37;">AG360 Connect360</a> to view your connections and manage your profile.</p>
              <hr style="border-color:#1e293b;margin:24px 0;" />
              <p style="color:#64748b;font-size:12px;">AG360 — For the Farmer · ag360.farm</p>
            </div>
          `,
        })
      }
    } catch {}

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