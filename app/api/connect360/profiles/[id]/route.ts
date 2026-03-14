import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'
import { getC360Auth, getC360Email } from '@/lib/connect360-auth'
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT cp.*,
        ROUND(AVG(cr.rating)::numeric, 1) as avg_rating,
        COUNT(cr.id)::int as review_count
      FROM connect_profiles cp
      LEFT JOIN connect_reviews cr ON cr.profile_id = cp.id
      WHERE cp.id = ${id}
      GROUP BY cp.id
    `
    if (!result[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (err) {
    console.error('GET profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { photo_url } = body
    if (photo_url) {
      await sql`UPDATE connect_profiles SET photo_url = ${photo_url} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const userId = ag360Id ?? c360.userId
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const profile = await sql`SELECT clerk_user_id, email FROM connect_profiles WHERE id = ${id}`
    if (!profile[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    const c360Email = await getC360Email()
    const isOwner = profile[0].clerk_user_id === userId || profile[0].email === c360Email
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Cascade delete
    await sql`DELETE FROM connect_jobs WHERE clerk_user_id = ${profile[0].clerk_user_id}`
    await sql`DELETE FROM connect_reviews WHERE profile_id = ${id}`
    await sql`DELETE FROM connect_requests WHERE profile_id = ${id} OR requester_profile_id = ${id}`
    await sql`DELETE FROM connect_saved WHERE profile_id = ${id}`
    await sql`DELETE FROM connect_profiles WHERE id = ${id}`

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
