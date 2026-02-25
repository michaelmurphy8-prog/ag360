import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await sql`
    SELECT * FROM scout_entries
    WHERE clerk_user_id = ${userId}
    ORDER BY date DESC, created_at DESC
  `
  return NextResponse.json({ entries: rows })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { date, field_name, crop, growth_stage, issue_type, severity, symptoms, notes, recommendation } = body

  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

  const rows = await sql`
    INSERT INTO scout_entries (clerk_user_id, date, field_name, crop, growth_stage, issue_type, severity, symptoms, notes, recommendation)
    VALUES (${userId}, ${date}, ${field_name || null}, ${crop || null}, ${growth_stage || null}, ${issue_type || null}, ${severity || null}, ${symptoms || null}, ${notes || null}, ${recommendation || null})
    RETURNING *
  `
  return NextResponse.json({ entry: rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, date, field_name, crop, growth_stage, issue_type, severity, symptoms, notes, recommendation } = body

  if (!id) return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })

  const rows = await sql`
    UPDATE scout_entries
    SET date = ${date}, field_name = ${field_name || null}, crop = ${crop || null},
        growth_stage = ${growth_stage || null}, issue_type = ${issue_type || null},
        severity = ${severity || null}, symptoms = ${symptoms || null},
        notes = ${notes || null}, recommendation = ${recommendation || null},
        updated_at = NOW()
    WHERE id = ${id} AND clerk_user_id = ${userId}
    RETURNING *
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ entry: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })

  await sql`
    DELETE FROM scout_entries
    WHERE id = ${id} AND clerk_user_id = ${userId}
  `
  return NextResponse.json({ success: true })
}