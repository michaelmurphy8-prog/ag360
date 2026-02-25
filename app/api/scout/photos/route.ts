import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { del } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get('entryId')

  if (!entryId) return NextResponse.json({ error: 'entryId is required' }, { status: 400 })

  const rows = await sql`
    SELECT * FROM scout_photos
    WHERE scout_entry_id = ${entryId} AND clerk_user_id = ${userId}
    ORDER BY created_at ASC
  `
  return NextResponse.json({ photos: rows })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('id')

  if (!photoId) return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })

  // Get photo URL before deleting (to remove from Blob)
  const rows = await sql`
    SELECT image_url FROM scout_photos
    WHERE id = ${photoId} AND clerk_user_id = ${userId}
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from Vercel Blob
  try {
    await del(rows[0].image_url)
  } catch (e) {
    console.error('Blob delete failed:', e)
  }

  // Delete from database
  await sql`
    DELETE FROM scout_photos
    WHERE id = ${photoId} AND clerk_user_id = ${userId}
  `

  return NextResponse.json({ success: true })
}