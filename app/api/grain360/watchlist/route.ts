import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const rows = await sql`
    SELECT * FROM user_watchlist
    WHERE tenant_id = ${tenantId}
    ORDER BY created_at ASC
  `
  return NextResponse.json({ success: true, watchlist: rows })
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const body = await req.json()
  const { symbol, label, type, commodity, location_id } = body

  if (!symbol || !label || !type) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const rows = await sql`
    INSERT INTO user_watchlist (tenant_id, symbol, label, type, commodity, location_id)
    VALUES (${tenantId}, ${symbol}, ${label}, ${type}, ${commodity ?? null}, ${location_id ?? null})
    ON CONFLICT (tenant_id, symbol) DO NOTHING
    RETURNING *
  `
  return NextResponse.json({ success: true, item: rows[0] })
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth()
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status })
  const { tenantId } = tenantAuth

  const { symbol } = await req.json()
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  await sql`
    DELETE FROM user_watchlist
    WHERE tenant_id = ${tenantId} AND symbol = ${symbol}
  `
  return NextResponse.json({ success: true })
}