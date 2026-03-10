import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'

const sql = neon(process.env.DATABASE_URL!)

// Mike's Clerk user ID — only this account can access admin routes
const ADMIN_CLERK_ID = 'user_3AfgiCDtz0gHx4WMcLx4bBtrSIY'

async function requireAdmin() {
  const { userId } = await auth()
  if (userId !== ADMIN_CLERK_ID) return false
  return true
}

// GET — pending verification queue
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'pending'

  try {
    const profiles = await sql`
      SELECT
        id, type, status, first_name, last_name, email, phone,
        photo_url, business_name, business_number,
        insurance_confirmed, licence_number, licence_province,
        base_province, base_city, base_country,
        service_radius_km, open_to_relocation, work_countries,
        bio, years_experience, equipment_owned,
        crops_experienced, operations_experience, equipment_brands,
        worldwide, cv_url, availability,
        verified_at, verified_by, created_at
      FROM connect_profiles
      WHERE status = ${status}
      ORDER BY created_at ASC
    `

    const counts = await sql`
      SELECT status, COUNT(*) as count
      FROM connect_profiles
      GROUP BY status
    `

    return NextResponse.json({ profiles, counts })
  } catch (err) {
    console.error('GET /api/connect360/admin error:', err)
    return NextResponse.json({ error: 'Failed to load queue' }, { status: 500 })
  }
}

// PATCH — approve or reject a provider
export async function PATCH(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { id, action, rejection_reason } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 })
    }

    if (!['approve', 'reject', 'suspend'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const newStatus =
      action === 'approve' ? 'approved' :
      action === 'reject' ? 'rejected' : 'suspended'

    const result = await sql`
      UPDATE connect_profiles SET
        status = ${newStatus},
        verified_at = ${action === 'approve' ? new Date().toISOString() : null},
        verified_by = ${action === 'approve' ? 'mike@ag360.farm' : null},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, status, first_name, last_name, email, verified_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      action,
      profile: result[0],
    })
  } catch (err) {
    console.error('PATCH /api/connect360/admin error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}