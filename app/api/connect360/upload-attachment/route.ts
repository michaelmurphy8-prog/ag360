import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { auth } from '@clerk/nextjs/server'
import { getC360Auth } from '@/lib/connect360-auth'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
]
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']

export async function POST(req: NextRequest) {
  try {
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const userId = ag360Id ?? c360.userId
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ error: 'Invalid file type. PDF, DOC, DOCX, JPG, PNG allowed.' }, { status: 400 })

    const filename = `connect360/attachments/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const blob = await put(filename, file, { access: 'public', contentType: file.type })

    return NextResponse.json({
      success: true,
      url: blob.url,
      name: file.name,
      type: file.type,
      size: file.size,
    })
  } catch (err) {
    console.error('POST /api/connect360/upload-attachment error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}