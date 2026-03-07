import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { del } from '@vercel/blob'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const { searchParams } = new URL(req.url)
  const entryId = searchParams.get('entryId')
  if (!entryId) return NextResponse.json({ error: 'entryId is required' }, { status: 400 })

  const rows = await sql`
    SELECT * FROM scout_photos
    WHERE scout_entry_id = ${entryId} AND tenant_id = ${tenantId}
    ORDER BY created_at ASC
  `
  return NextResponse.json({ photos: rows })
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const { searchParams } = new URL(req.url)
  const photoId = searchParams.get('id')
  if (!photoId) return NextResponse.json({ error: 'Photo ID is required' }, { status: 400 })

  const rows = await sql`
    SELECT image_url FROM scout_photos
    WHERE id = ${photoId} AND tenant_id = ${tenantId}
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await del(rows[0].image_url)
  } catch (e) {
    console.error('Blob delete failed:', e)
  }

  await sql`DELETE FROM scout_photos WHERE id = ${photoId} AND tenant_id = ${tenantId}`
  return NextResponse.json({ success: true })
}