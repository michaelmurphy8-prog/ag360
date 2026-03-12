import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'

const sql = neon(process.env.DATABASE_URL!)

// POST — apply to a job
export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { job_id, message } = await req.json()
    if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

    // Get the applicant's connect profile
    const profile = await sql`
      SELECT id FROM connect_profiles WHERE clerk_user_id = ${userId} LIMIT 1
    `
    if (profile.length === 0) {
      return NextResponse.json({ error: 'You need a Connect360 profile to apply' }, { status: 403 })
    }

    const result = await sql`
      INSERT INTO connect_job_applications (job_id, profile_id, clerk_user_id, message)
      VALUES (${job_id}, ${profile[0].id}, ${userId}, ${message ?? null})
      ON CONFLICT (job_id, profile_id) DO NOTHING
      RETURNING *
    `
    return NextResponse.json({ success: true, application: result[0] ?? null })
  } catch (err) {
    console.error('POST /api/connect360/jobs/apply error:', err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}

// GET — check if current user has applied to a job
export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const job_id = searchParams.get('job_id')
  if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

  try {
    const result = await sql`
      SELECT a.* FROM connect_job_applications a
      JOIN connect_profiles cp ON cp.id = a.profile_id
      WHERE a.job_id = ${job_id} AND cp.clerk_user_id = ${userId}
      LIMIT 1
    `
    return NextResponse.json({ applied: result.length > 0, application: result[0] ?? null })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to check application' }, { status: 500 })
  }
}