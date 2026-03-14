import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getC360Auth } from '@/lib/connect360-auth'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

// GET — fetch my block list
export async function GET() {
  try {
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const c360_uid_param = req.nextUrl?.searchParams?.get('c360_uid')
    const userId = ag360Id ?? c360.userId ?? c360_uid_param
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [me] = await sql`
      SELECT id FROM connect_profiles WHERE clerk_user_id = ${userId}
    `
    if (!me) return NextResponse.json({ blocks: [] })

    const blocks = await sql`
      SELECT b.id, b.blocked_profile_id, b.created_at,
        cp.first_name, cp.last_name, cp.business_name, cp.type
      FROM connect_blocks b
      JOIN connect_profiles cp ON cp.id = b.blocked_profile_id
      WHERE b.blocker_profile_id = ${me.id}
      ORDER BY b.created_at DESC
    `
    return NextResponse.json({ blocks })
  } catch (err) {
    console.error('GET /api/connect360/blocks error:', err)
    return NextResponse.json({ error: 'Failed to load blocks' }, { status: 500 })
  }
}

// POST — block a profile
export async function POST(req: NextRequest) {
  try {
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const c360_uid_param = req.nextUrl?.searchParams?.get('c360_uid')
    const userId = ag360Id ?? c360.userId ?? c360_uid_param
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { blocked_profile_id } = await req.json()
    if (!blocked_profile_id) return NextResponse.json({ error: 'Missing blocked_profile_id' }, { status: 400 })

    const [me] = await sql`
      SELECT id FROM connect_profiles WHERE clerk_user_id = ${userId}
    `
    if (!me) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (me.id === blocked_profile_id) return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 })

    await sql`
      INSERT INTO connect_blocks (blocker_profile_id, blocked_profile_id)
      VALUES (${me.id}, ${blocked_profile_id})
      ON CONFLICT DO NOTHING
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/connect360/blocks error:', err)
    return NextResponse.json({ error: 'Failed to block' }, { status: 500 })
  }
}

// DELETE — unblock a profile
export async function DELETE(req: NextRequest) {
  try {
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const c360_uid_param = req.nextUrl?.searchParams?.get('c360_uid')
    const userId = ag360Id ?? c360.userId ?? c360_uid_param
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { blocked_profile_id } = await req.json()

    const [me] = await sql`
      SELECT id FROM connect_profiles WHERE clerk_user_id = ${userId}
    `
    if (!me) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    await sql`
      DELETE FROM connect_blocks
      WHERE blocker_profile_id = ${me.id}
      AND blocked_profile_id = ${blocked_profile_id}
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/connect360/blocks error:', err)
    return NextResponse.json({ error: 'Failed to unblock' }, { status: 500 })
  }
}