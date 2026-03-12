import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// Public endpoint — no auth required
// Returns aggregate counts only, zero PII
export async function GET() {
  try {
    const counts = await sql`
      SELECT type, COUNT(*)::int AS count
      FROM connect_profiles
      WHERE status = 'approved'
      GROUP BY type
    `

    const [total] = await sql`
      SELECT COUNT(*)::int AS total FROM connect_profiles WHERE status = 'approved'
    `

    const [countries] = await sql`
      SELECT COUNT(DISTINCT base_country)::int AS count
        FROM connect_profiles WHERE status = 'approved'
    `

    const typeCounts = counts.reduce((acc: Record<string, number>, row: any) => {
      acc[row.type] = row.count
      return acc
    }, {})

    return NextResponse.json({
      total: total?.total ?? 0,
      countries: countries?.count ?? 0,
      types: {
        trucker:      typeCounts.trucker      ?? 0,
        applicator:   typeCounts.applicator   ?? 0,
        worker:       typeCounts.worker       ?? 0,
        professional: typeCounts.professional ?? 0,
      }
    })
  } catch (err) {
    console.error('GET /api/connect360/public-stats error:', err)
    return NextResponse.json({ total: 0, countries: 0, types: {} })
  }
}