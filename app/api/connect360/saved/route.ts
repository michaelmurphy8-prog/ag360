import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { auth } from '@clerk/nextjs/server'

const sql = neon(process.env.DATABASE_URL!)

// GET — fetch all saved profiles for this tenant
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    const { userId } = await auth()
    if (!tenantId && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const saved = await sql`
      SELECT
        s.id AS saved_id, s.profile_id, s.label, s.created_at AS saved_at,
        cp.first_name, cp.last_name, cp.type, cp.business_name,
        cp.photo_url, cp.base_city, cp.base_province, cp.base_country,
        cp.availability, cp.verified_at, cp.years_experience,
        cp.professional_sub_type,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(r.id)::int AS review_count
      FROM connect_saved s
      JOIN connect_profiles cp ON cp.id = s.profile_id
      LEFT JOIN connect_reviews r ON r.profile_id = cp.id
      WHERE (${tenantId ? sql`s.tenant_id = ${tenantId}` : sql`s.clerk_user_id = ${userId}`})
      GROUP BY s.id, s.profile_id, s.label, s.created_at,
               cp.first_name, cp.last_name, cp.type, cp.business_name,
               cp.photo_url, cp.base_city, cp.base_province, cp.base_country,
               cp.availability, cp.verified_at, cp.years_experience,
               cp.professional_sub_type
      ORDER BY s.created_at DESC
    `
    const savedIds = saved.map((s: any) => s.profile_id)
    return NextResponse.json({ saved, saved_ids: savedIds })
  } catch (err) {
    console.error('GET /api/connect360/saved error:', err)
    return NextResponse.json({ error: 'Failed to load saved' }, { status: 500 })
  }
}

// POST — save a provider
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    const { userId } = await auth()
    if (!tenantId && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { profile_id, label } = await req.json()
    if (!profile_id) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })
    const result = await sql`
      INSERT INTO connect_saved (tenant_id, clerk_user_id, profile_id, label)
      VALUES (${tenantId ?? null}, ${userId ?? null}, ${profile_id}, ${label ?? 'My Crew'})
      ON CONFLICT (tenant_id, profile_id)
      DO UPDATE SET label = EXCLUDED.label
      RETURNING *
    `
    return NextResponse.json({ success: true, saved: result[0] })
  } catch (err) {
    console.error('POST /api/connect360/saved error:', err)
    return NextResponse.json({ error: 'Failed to save provider' }, { status: 500 })
  }
}

// DELETE — unsave a provider
export async function DELETE(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    const { userId } = await auth()
    if (!tenantId && !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { profile_id } = await req.json()
    if (!profile_id) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })
    await sql`
      DELETE FROM connect_saved
      WHERE profile_id = ${profile_id}
      AND (${tenantId ? sql`tenant_id = ${tenantId}` : sql`clerk_user_id = ${userId}`})
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/connect360/saved error:', err)
    return NextResponse.json({ error: 'Failed to unsave provider' }, { status: 500 })
  }
}