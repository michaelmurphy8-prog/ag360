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
      // Incoming requests — current user is the provider being requested
      const incoming = searchParams.get('incoming') === 'true'
      if (incoming) {
        const requests = await sql`
          SELECT
            cr.id, cr.status, cr.message, cr.created_at,
            cp.id AS profile_id, cp.type, cp.first_name, cp.last_name,
            cp.business_name, cp.photo_url,
            cp.base_city, cp.base_province, cp.availability
          FROM connect_requests cr
          JOIN connect_profiles cp ON cp.id = cr.connect_profile_id
          WHERE cp.clerk_user_id = ${userId}
          ${statusFilter ? sql`AND cr.status = ${statusFilter}` : sql``}
          ORDER BY cr.created_at DESC
        `
        return NextResponse.json({ requests })
      }
      // Outgoing — requests the current user has sent
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
      VALUES (${tenantId ?? null}, ${userId ?? null}, ${connect_profile_id}, ${message ?? null}, 'pending')
      RETURNING id, status, created_at
    `

    // Email notification to provider — fire and forget
    try {
      const [farm] = await sql`
        SELECT farm_name FROM farm_profiles WHERE tenant_id = ${tenantId} LIMIT 1
      `
      const farmName = farm?.farm_name ?? 'A farmer'
      const senderName = `${provider[0].first_name} ${provider[0].last_name}`.trim()

      // Check recipient notification prefs
      const [recipientPrefs] = await sql`
        SELECT notification_prefs FROM connect_profiles
        WHERE id = ${connect_profile_id} LIMIT 1
      `
      const prefs = recipientPrefs?.notification_prefs ?? {}
      const shouldEmail = prefs.enabled === true && prefs.connect_requests !== false

      if (shouldEmail && provider[0].email) {
        await resend.emails.send({
          from: 'Connect360 <hello@ag360.farm>',
          to: provider[0].email,
          subject: `${farmName} sent you a connect request on Connect360`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;background:#F7F5F0;padding:24px;border-radius:16px;">

              <!-- Header -->
              <div style="background:linear-gradient(160deg,#0A1018 0%,#162030 100%);border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
                <div style="font-size:22px;font-weight:900;color:#FFFFFF;letter-spacing:-0.5px;">Connect<span style="color:#C9A84C;">360</span></div>
                <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">For AG, by a farmer.</div>
              </div>

              <!-- Body -->
              <div style="background:#FFFFFF;border-radius:12px;padding:24px;margin-bottom:16px;">
                <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0D1520;">You have a new connect request</p>
                <p style="margin:0 0 16px;font-size:14px;color:#4B5563;line-height:1.6;">
                  <strong style="color:#0D1520;">${farmName}</strong> wants to connect with you on Connect360.
                </p>
                ${message ? `
                <div style="background:#F7F5F0;border-left:3px solid #C9A84C;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:16px;">
                  <p style="margin:0;font-size:13px;color:#4B5563;font-style:italic;">"${message}"</p>
                </div>` : ''}
                <a href="https://connect360.ag360.farm/network"
                  style="display:inline-block;background:#C9A84C;color:#FFFFFF;font-size:13px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                  View Request →
                </a>
              </div>

              <!-- Footer -->
              <p style="text-align:center;font-size:11px;color:#B0A898;margin:0;">
                Connect360 · AG360 Inc. · Swift Current, SK<br/>
                <a href="https://ag360.farm" style="color:#C9A84C;text-decoration:none;">ag360.farm</a>
              </p>
            </div>
          `,
        })
      }
    } catch (emailErr) {
      console.error('Connect request email failed:', emailErr)
    }

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
// PATCH — accept or decline a connection request (recipient only)
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { request_id, status } = await req.json()
    if (!request_id || !['accepted', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Verify the current user is the provider being requested
    const result = await sql`
      UPDATE connect_requests cr
      SET status = ${status}
      FROM connect_profiles cp
      WHERE cr.id = ${request_id}
        AND cr.connect_profile_id = cp.id
        AND cp.clerk_user_id = ${userId}
      RETURNING cr.id, cr.status, cr.clerk_user_id
    `
    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    }
    return NextResponse.json({ success: true, request: result[0] })
  } catch (err) {
    console.error('PATCH /api/connect360/requests error:', err)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}
