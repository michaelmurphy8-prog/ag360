import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const records = await sql`
      SELECT * FROM agronomy_seeding_log
      WHERE clerk_user_id = ${userId}
      ORDER BY seeding_date DESC
    `
    return NextResponse.json({ success: true, records })
  } catch (err) {
    console.error('Seeding log GET error:', err)
    return NextResponse.json({ success: false, error: 'Failed to fetch records' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { crop, seeding_date, acres, field_name, notes } = await req.json()
    if (!crop || !seeding_date) {
      return NextResponse.json({ success: false, error: 'crop and seeding_date are required' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO agronomy_seeding_log (clerk_user_id, crop, seeding_date, acres, field_name, notes)
      VALUES (${userId}, ${crop}, ${seeding_date}, ${acres ?? null}, ${field_name ?? null}, ${notes ?? null})
      RETURNING *
    `
    return NextResponse.json({ success: true, record: result[0] })
  } catch (err) {
    console.error('Seeding log POST error:', err)
    return NextResponse.json({ success: false, error: 'Failed to save record' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const userId = req.headers.get('x-user-id')
  if (!userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await req.json()
    await sql`
      DELETE FROM agronomy_seeding_log
      WHERE id = ${id} AND clerk_user_id = ${userId}
    `
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Seeding log DELETE error:', err)
    return NextResponse.json({ success: false, error: 'Failed to delete record' }, { status: 500 })
  }
}