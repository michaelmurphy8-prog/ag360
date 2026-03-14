import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { getTenantAuth } from '@/lib/tenant-auth'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'heic']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 })
    }

    // Validate type
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOC, and DOCX are allowed.' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const isImage = file.type.startsWith('image/')
const folder = isImage ? 'connect360/photos' : 'connect360/cv'
const filename = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const blob = await put(filename, file, {
      access: 'public',
      contentType: file.type,
    })

    return NextResponse.json({ success: true, url: blob.url })
  } catch (err) {
    console.error('POST /api/connect360/upload-cv error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}