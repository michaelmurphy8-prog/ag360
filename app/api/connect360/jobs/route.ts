import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

// GET — fetch jobs feed
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const poster_type = searchParams.get('poster_type') // 'farm' | 'general'
  const provider_type = searchParams.get('provider_type')
  const province = searchParams.get('province')
  const my_jobs = searchParams.get('my_jobs') === 'true'

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const jobs = await sql`
      SELECT
        j.*,
        COUNT(a.id)::int AS application_count
      FROM connect_jobs j
      LEFT JOIN connect_job_applications a ON a.job_id = j.id
      WHERE j.status = 'open'
      ${my_jobs ? sql`AND j.clerk_user_id = ${userId}` : sql``}
      ${poster_type ? sql`AND j.poster_type = ${poster_type}` : sql``}
      ${provider_type ? sql`AND (j.provider_type_needed = ${provider_type} OR j.provider_type_needed = 'any')` : sql``}
      ${province ? sql`AND j.location_province = ${province}` : sql``}
      GROUP BY j.id
      ORDER BY j.created_at DESC
    `
    return NextResponse.json({ jobs })
  } catch (err) {
    console.error('GET /api/connect360/jobs error:', err)
    return NextResponse.json({ error: 'Failed to load jobs' }, { status: 500 })
  }
}

// POST — create a job
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { tenantId } = await getTenantAuth()

  try {
    const body = await req.json()
    const {
      poster_type, title, provider_type_needed, description,
      location_city, location_province, start_date, end_date,
      rate, rate_type
    } = body

    if (!title || !description || !poster_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO connect_jobs (
        clerk_user_id, tenant_id, poster_type, title,
        provider_type_needed, description,
        location_city, location_province,
        start_date, end_date, rate, rate_type
      ) VALUES (
        ${userId}, ${tenantId ?? null}, ${poster_type}, ${title},
        ${provider_type_needed ?? 'any'}, ${description},
        ${location_city ?? null}, ${location_province ?? null},
        ${start_date ?? null}, ${end_date ?? null},
        ${rate ?? null}, ${rate_type ?? 'negotiable'}
      )
      RETURNING *
    `
    return NextResponse.json({ job: result[0] })
  } catch (err) {
    console.error('POST /api/connect360/jobs error:', err)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

// PATCH — close/fill a job (owner only)
export async function PATCH(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { job_id, status } = await req.json()
    if (!job_id || !status) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const result = await sql`
      UPDATE connect_jobs SET status = ${status}
      WHERE id = ${job_id} AND clerk_user_id = ${userId}
      RETURNING id, status
    `
    if (result.length === 0) return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 })
    return NextResponse.json({ success: true, job: result[0] })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}