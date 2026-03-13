import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const result = await sql`
      SELECT cp.*,
        ROUND(AVG(cr.rating)::numeric, 1) as avg_rating,
        COUNT(cr.id)::int as review_count
      FROM connect_profiles cp
      LEFT JOIN connect_reviews cr ON cr.profile_id = cp.id
      WHERE cp.id = ${id}
      GROUP BY cp.id
    `
    if (!result[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(result[0])
  } catch (err) {
    console.error('GET profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const { photo_url } = body
    if (photo_url) {
      await sql`UPDATE connect_profiles SET photo_url = ${photo_url} WHERE id = ${id}`
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
