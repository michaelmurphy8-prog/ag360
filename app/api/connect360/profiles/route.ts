import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'

const sql = neon(process.env.DATABASE_URL!)

// GET — browse approved profiles + seeded directory entries
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // trucker | applicator | worker | farmer
  const province = searchParams.get('province')
  const country = searchParams.get('country')
  const radius = searchParams.get('radius') // km — reserved for future geo query
  const openToRelocation = searchParams.get('open_to_relocation')
  const availability = searchParams.get('availability')
  const search = searchParams.get('search') // name / business name search

  try {
    let profiles = await sql`
      SELECT
        id, type, first_name, last_name, business_name,
        photo_url, bio, years_experience, equipment_owned,
        crops_experienced, availability, base_province,
        base_city, base_country, service_radius_km,
        open_to_relocation, work_countries,
        licence_province, verified_at, created_at
      FROM connect_profiles
      WHERE status = 'approved'
        AND (${type}::text IS NULL OR type = ${type})
        AND (${province}::text IS NULL OR base_province = ${province})
        AND (${country}::text IS NULL OR base_country = ${country} OR ${country} = ANY(work_countries))
        AND (${openToRelocation}::text IS NULL OR open_to_relocation = ${openToRelocation === 'true'})
        AND (${availability}::text IS NULL OR availability = ${availability})
        AND (${search}::text IS NULL OR
          LOWER(first_name || ' ' || last_name) LIKE ${'%' + (search?.toLowerCase() ?? '') + '%'} OR
          LOWER(COALESCE(business_name, '')) LIKE ${'%' + (search?.toLowerCase() ?? '') + '%'}
        )
      ORDER BY verified_at DESC NULLS LAST, created_at DESC
    `

    // Also pull seeded directory entries
    let directory = await sql`
      SELECT
        id, type, business_name, contact_name,
        phone, email, province, city, country,
        service_radius_km, description, verified,
        'directory' AS source
      FROM connect_directory
      WHERE verified = true
        AND (${type}::text IS NULL OR type = ${type})
        AND (${province}::text IS NULL OR province = ${province})
        AND (${country}::text IS NULL OR country = ${country})
      ORDER BY business_name ASC
    `

    return NextResponse.json({
      profiles: profiles.map(p => ({ ...p, source: 'profile' })),
      directory,
      total: profiles.length + directory.length,
    })
  } catch (err) {
    console.error('GET /api/connect360/profiles error:', err)
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 })
  }
}

// POST — register as a provider (creates pending profile)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      clerk_user_id,
      type,
      first_name,
      last_name,
      email,
      phone,
      photo_url,
      business_name,
      business_number,
      insurance_confirmed,
      licence_number,
      licence_province,
      base_province,
      base_city,
      base_country,
      service_radius_km,
      open_to_relocation,
      work_countries,
      bio,
      years_experience,
      equipment_owned,
      crops_experienced,
      availability,
    } = body

    if (!type || !first_name || !last_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const valid = ['trucker', 'applicator', 'worker', 'farmer']
    if (!valid.includes(type)) {
      return NextResponse.json({ error: 'Invalid provider type' }, { status: 400 })
    }

    const existing = await sql`
      SELECT id FROM connect_profiles WHERE email = ${email}
    `
    if (existing.length > 0) {
      return NextResponse.json({ error: 'A profile with this email already exists' }, { status: 409 })
    }

    const result = await sql`
      INSERT INTO connect_profiles (
        clerk_user_id, type, first_name, last_name, email, phone,
        photo_url, business_name, business_number, insurance_confirmed,
        licence_number, licence_province, base_province, base_city,
        base_country, service_radius_km, open_to_relocation,
        work_countries, bio, years_experience, equipment_owned,
        crops_experienced, availability, status
      ) VALUES (
        ${clerk_user_id ?? null}, ${type}, ${first_name}, ${last_name},
        ${email}, ${phone ?? null}, ${photo_url ?? null},
        ${business_name ?? null}, ${business_number ?? null},
        ${insurance_confirmed ?? false}, ${licence_number ?? null},
        ${licence_province ?? null}, ${base_province ?? null},
        ${base_city ?? null}, ${base_country ?? 'Canada'},
        ${service_radius_km ?? 250}, ${open_to_relocation ?? false},
        ${work_countries ?? ['Canada']}, ${bio ?? null},
        ${years_experience ?? null}, ${equipment_owned ?? null},
        ${crops_experienced ?? []}, ${availability ?? 'immediate'},
        'pending'
      )
      RETURNING id, status, created_at
    `

    return NextResponse.json({
      success: true,
      profile: result[0],
      message: 'Your profile has been submitted and is pending verification.',
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/connect360/profiles error:', err)
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
  }
}