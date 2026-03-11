import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { Resend } from 'resend'

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile_id, reason } = await req.json()
    if (!profile_id || !reason) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Upsert — one report per tenant per profile
    await sql`
      INSERT INTO connect_reports (tenant_id, profile_id, reason)
      VALUES (${tenantId}, ${profile_id}, ${reason})
      ON CONFLICT (tenant_id, profile_id)
      DO UPDATE SET reason = EXCLUDED.reason, created_at = NOW()
    `

    // Fetch profile name for email
    const [profile] = await sql`
      SELECT first_name, last_name, type FROM connect_profiles WHERE id = ${profile_id}
    `

    // Notify admin — fire and forget
    try {
      await resend.emails.send({
        from: 'AG360 <hello@ag360.farm>',
        to: 'mike@ag360.farm',
        subject: `Connect360 Report — ${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`,
        html: `
          <p><strong>A provider listing has been reported.</strong></p>
          <table style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
            <tr><td style="padding:6px 12px 6px 0;color:#94a3b8;">Profile</td><td>${profile?.first_name ?? ''} ${profile?.last_name ?? ''} (${profile?.type ?? ''})</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#94a3b8;">Profile ID</td><td>${profile_id}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#94a3b8;">Reported by tenant</td><td>${tenantId}</td></tr>
            <tr><td style="padding:6px 12px 6px 0;color:#94a3b8;">Reason</td><td>${reason}</td></tr>
          </table>
          <p><a href="https://ag360.farm/connect360/admin">Review in Admin Queue →</a></p>
        `,
      })
    } catch {}

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/connect360/reports error:', err)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}

// GET — admin only, view all reports
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ADMIN_CLERK_ID = process.env.NEXT_PUBLIC_ADMIN_CLERK_ID
    if (tenantId !== ADMIN_CLERK_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const reports = await sql`
      SELECT r.*, cp.first_name, cp.last_name, cp.type
      FROM connect_reports r
      JOIN connect_profiles cp ON cp.id = r.profile_id
      ORDER BY r.created_at DESC
    `
    return NextResponse.json({ reports })
  } catch (err) {
    console.error('GET /api/connect360/reports error:', err)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}