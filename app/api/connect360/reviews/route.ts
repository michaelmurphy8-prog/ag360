import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_CLERK_ID = 'user_3AfgiCDtz0gHx4WMcLx4bBtrSIY'

// GET — fetch reviews for a profile, or all reviews left by this tenant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const profileId = searchParams.get('profile_id')

  try {
    if (profileId) {
      // Public: fetch all reviews for a given provider profile
      const reviews = await sql`
        SELECT
          r.id, r.rating, r.body, r.hire_type, r.season_year,
          r.would_rehire, r.created_at,
          fp.farm_name AS reviewer_farm
        FROM connect_reviews r
        LEFT JOIN farm_profiles fp ON fp.tenant_id = r.tenant_id
        WHERE r.profile_id = ${profileId}
        ORDER BY r.created_at DESC
      `

      const agg = await sql`
        SELECT
          COUNT(*)::int AS total,
          ROUND(AVG(rating)::numeric, 1) AS average,
          COUNT(*) FILTER (WHERE would_rehire = true)::int AS would_rehire_count
        FROM connect_reviews
        WHERE profile_id = ${profileId}
      `

      return NextResponse.json({
        reviews,
        total: agg[0]?.total ?? 0,
        average: agg[0]?.average ?? null,
        would_rehire_count: agg[0]?.would_rehire_count ?? 0,
      })
    }

    // Tenant: fetch reviews this tenant has left
    const { tenantId } = await getTenantAuth()
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const reviews = await sql`
      SELECT r.*, cp.first_name, cp.last_name, cp.type AS provider_type
      FROM connect_reviews r
      JOIN connect_profiles cp ON cp.id = r.profile_id
      WHERE r.tenant_id = ${tenantId}
      ORDER BY r.created_at DESC
    `
    return NextResponse.json({ reviews })
  } catch (err) {
    console.error('GET /api/connect360/reviews error:', err)
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 })
  }
}

// POST — submit a review (must have an approved connect request for this profile)
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { profile_id, rating, review_body, hire_type, season_year, would_rehire } = body

    if (!profile_id || !rating) {
      return NextResponse.json({ error: 'Missing profile_id or rating' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    // Gate: must have a connect request for this profile
    const request = await sql`
      SELECT id FROM connect_requests
      WHERE tenant_id = ${tenantId}
        AND connect_profile_id = ${profile_id}
      LIMIT 1
    `
    if (request.length === 0) {
      return NextResponse.json(
        { error: 'You must connect with this provider before leaving a review' },
        { status: 403 }
      )
    }

    // Upsert — update if already reviewed, insert if not
    const result = await sql`
      INSERT INTO connect_reviews
        (tenant_id, profile_id, rating, body, hire_type, season_year, would_rehire)
      VALUES
        (${tenantId}, ${profile_id}, ${rating}, ${review_body ?? null},
         ${hire_type ?? null}, ${season_year ?? null}, ${would_rehire ?? null})
      ON CONFLICT (tenant_id, profile_id)
      DO UPDATE SET
        rating       = EXCLUDED.rating,
        body         = EXCLUDED.body,
        hire_type    = EXCLUDED.hire_type,
        season_year  = EXCLUDED.season_year,
        would_rehire = EXCLUDED.would_rehire,
        created_at   = NOW()
      RETURNING *
    `

    return NextResponse.json({ success: true, review: result[0] })
  } catch (err) {
    console.error('POST /api/connect360/reviews error:', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}

// DELETE — admin only, remove an abusive review
export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (userId !== ADMIN_CLERK_ID) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    await sql`DELETE FROM connect_reviews WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/connect360/reviews error:', err)
    return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
  }
}