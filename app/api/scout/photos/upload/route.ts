import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { put } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_PHOTOS_PER_ENTRY = 3

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const scoutEntryId = formData.get('scout_entry_id') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!scoutEntryId) return NextResponse.json({ error: 'scout_entry_id is required' }, { status: 400 })

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, or WebP.' }, { status: 400 })
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 })
  }

  // Verify the scout entry belongs to this user
  const entryCheck = await sql`
    SELECT id FROM scout_entries
    WHERE id = ${scoutEntryId} AND clerk_user_id = ${userId}
  `
  if (entryCheck.length === 0) {
    return NextResponse.json({ error: 'Scout entry not found' }, { status: 404 })
  }

  // Check photo count limit
  const photoCount = await sql`
    SELECT COUNT(*) as count FROM scout_photos
    WHERE scout_entry_id = ${scoutEntryId}
  `
  if (Number(photoCount[0].count) >= MAX_PHOTOS_PER_ENTRY) {
    return NextResponse.json({ error: `Max ${MAX_PHOTOS_PER_ENTRY} photos per entry` }, { status: 400 })
  }

  // Upload to Vercel Blob
  const blob = await put(`scout/${userId}/${scoutEntryId}/${Date.now()}-${file.name}`, file, {
    access: 'public',
    contentType: file.type,
  })

  // Save to database
  const rows = await sql`
    INSERT INTO scout_photos (scout_entry_id, clerk_user_id, image_url, file_name, file_size, mime_type)
    VALUES (${scoutEntryId}, ${userId}, ${blob.url}, ${file.name}, ${file.size}, ${file.type})
    RETURNING *
  `

  return NextResponse.json({ photo: rows[0] }, { status: 201 })
}