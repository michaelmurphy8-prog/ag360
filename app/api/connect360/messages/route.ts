import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { auth } from '@clerk/nextjs/server'
import { getC360Auth } from '@/lib/connect360-auth'

const sql = neon(process.env.DATABASE_URL!)

// Generate consistent thread_id from two tenant IDs (sorted so A↔B = B↔A)
function threadId(a: string, b: string) {
  return [a, b].sort().join('::')
}

// GET — fetch messages for a thread with a specific profile owner
// ?profile_id=X  (the connect_profile being chatted with)
export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    const { userId } = await auth()
    const senderId = tenantId ?? userId
    if (!senderId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profile_id')

    if (!profileId) {
      // Return all threads with unread counts (for inbox)
      const threads = await sql`
        SELECT DISTINCT ON (m.thread_id)
          m.thread_id,
          m.profile_id,
          m.sender_id,
          m.recipient_id,
          m.body AS last_message,
          m.created_at AS last_message_at,
          cp.first_name, cp.last_name, cp.business_name, cp.photo_url, cp.type,
          COUNT(unread.id)::int AS unread_count
        FROM connect_messages m
        JOIN connect_profiles cp ON cp.id = m.profile_id
        LEFT JOIN connect_messages unread
          ON unread.thread_id = m.thread_id
          AND unread.recipient_id = ${tenantId}
          AND unread.read_at IS NULL
        WHERE m.sender_id = ${senderId} OR m.recipient_id = ${senderId}
        GROUP BY m.thread_id, m.profile_id, m.sender_id, m.recipient_id,
                 m.body, m.created_at, cp.first_name, cp.last_name,
                 cp.business_name, cp.photo_url, cp.type
        ORDER BY m.thread_id, m.created_at DESC
      `
      return NextResponse.json({ threads })
    }

    // Fetch the profile to get its owner tenant_id
    const [profile] = await sql`
      SELECT clerk_user_id FROM connect_profiles WHERE id = ${profileId}
    `
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const otherTenantId = profile.clerk_user_id
    if (!otherTenantId) return NextResponse.json({ error: 'Provider not registered' }, { status: 400 })

    // Verify connection exists
    const [connection] = await sql`
      SELECT id FROM connect_requests
      WHERE (clerk_user_id = ${senderId} AND connect_profile_id = ${profileId})
         OR (clerk_user_id = ${otherTenantId} AND connect_profile_id IN (
           SELECT id FROM connect_profiles WHERE clerk_user_id = ${senderId}
         ))
      LIMIT 1
    `
    if (!connection) return NextResponse.json({ error: 'Not connected' }, { status: 403 })

    const tid = threadId(senderId, otherTenantId)

    const messages = await sql`
      SELECT id, sender_id, body, attachment_url, attachment_name, attachment_type, read_at, created_at
      FROM connect_messages
      WHERE thread_id = ${tid}
      ORDER BY created_at ASC
    `

    // Mark incoming messages as read
    await sql`
      UPDATE connect_messages
      SET read_at = NOW()
      WHERE thread_id = ${tid}
        AND recipient_id = ${senderId}
        AND read_at IS NULL
    `

    return NextResponse.json({ messages, thread_id: tid })
  } catch (err) {
    console.error('GET /api/connect360/messages error:', err)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}

// POST — send a message
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    const { userId } = await auth()
    const senderId = tenantId ?? userId
    if (!senderId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { profile_id, body, attachment_url, attachment_name, attachment_type } = await req.json()
    if (!profile_id || (!body?.trim() && !attachment_url)) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Get recipient tenant_id from profile
    const [profile] = await sql`
      SELECT clerk_user_id FROM connect_profiles WHERE id = ${profile_id}
    `
    if (!profile?.clerk_user_id) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }

    const recipientId = profile.clerk_user_id
    const tid = threadId(senderId, recipientId)
    const [message] = await sql`
      INSERT INTO connect_messages (thread_id, sender_id, recipient_id, profile_id, body, attachment_url, attachment_name, attachment_type)
      VALUES (${tid}, ${senderId}, ${recipientId}, ${profile_id}, ${body?.trim() ?? null}, ${attachment_url ?? null}, ${attachment_name ?? null}, ${attachment_type ?? null})
      RETURNING id, sender_id, body, attachment_url, attachment_name, attachment_type, read_at, created_at
    `

    return NextResponse.json({ success: true, message })
  } catch (err) {
    console.error('POST /api/connect360/messages error:', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}