import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await getTenantAuth()
    if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const profileId = formData.get('profile_id') as string | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (!profileId) return NextResponse.json({ error: 'Missing profile_id' }, { status: 400 })

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. JPG, PNG, and WebP only.' }, { status: 400 })
    }

    // Verify ownership — clerk_user_id must match tenant
    const [profile] = await sql`
      SELECT id, clerk_user_id FROM connect_profiles WHERE id = ${profileId}
    `
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.clerk_user_id !== tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const filename = `connect360/photos/${profileId}-${Date.now()}.${ext}`
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    })

    // Update profile photo_url
    await sql`
      UPDATE connect_profiles SET photo_url = ${blob.url} WHERE id = ${profileId}
    `

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err) {
    console.error('POST /api/connect360/upload-photo error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}