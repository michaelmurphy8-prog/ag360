import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ success: false, error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  try {
    const records = await sql`
      SELECT * FROM agronomy_seeding_log
      WHERE tenant_id = ${tenantId}
      ORDER BY seeding_date DESC
    `
    return NextResponse.json({ success: true, records })
  } catch (err) {
    console.error('Seeding log GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ success: false, error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  try {
    const { crop, seeding_date, acres, field_name, notes } = await req.json()
    if (!crop || !seeding_date) {
      return NextResponse.json({ success: false, error: 'crop and seeding_date are required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO agronomy_seeding_log (tenant_id, crop, seeding_date, acres, field_name, notes)
      VALUES (${tenantId}, ${crop}, ${seeding_date}, ${acres ?? null}, ${field_name ?? null}, ${notes ?? null})
      RETURNING *
    `
    return NextResponse.json({ success: true, record: result[0] })
  } catch (err) {
    console.error('Seeding log POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save record' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ success: false, error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  try {
    const { id } = await req.json()
    await sql`
      DELETE FROM agronomy_seeding_log
      WHERE id = ${id} AND tenant_id = ${tenantId}
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Seeding log DELETE error:', err)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}