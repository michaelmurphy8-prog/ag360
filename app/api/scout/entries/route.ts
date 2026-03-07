import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const rows = await sql`
    SELECT * FROM scout_entries
    WHERE tenant_id = ${tenantId}
    ORDER BY date DESC, created_at DESC
  `
  return NextResponse.json({ entries: rows })
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const body = await req.json()
  const { date, field_name, crop, growth_stage, issue_type, severity, symptoms, notes, recommendation } = body
  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 })

  const rows = await sql`
    INSERT INTO scout_entries (
      tenant_id, date, field_name, crop, growth_stage,
      issue_type, severity, symptoms, notes, recommendation
    ) VALUES (
      ${tenantId}, ${date}, ${field_name || null}, ${crop || null}, ${growth_stage || null},
      ${issue_type || null}, ${severity || null}, ${symptoms || null}, ${notes || null}, ${recommendation || null}
    )
    RETURNING *
  `

  if (field_name) {
    await sql`
      INSERT INTO field_alerts (tenant_id, field_name, alert_type, message, severity)
      VALUES (
        ${tenantId},
        ${field_name},
        'scout_report',
        ${`Scout report filed: ${issue_type || "issue"} (${severity || "medium"}) on ${field_name}`},
        ${severity || "medium"}
      )
    `
  }

  return NextResponse.json({ entry: rows[0] }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

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
    WHERE id = ${id} AND tenant_id = ${tenantId}
    RETURNING *
  `
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ entry: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Entry ID is required' }, { status: 400 })

  await sql`DELETE FROM scout_entries WHERE id = ${id} AND tenant_id = ${tenantId}`
  return NextResponse.json({ success: true })
}