import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
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
