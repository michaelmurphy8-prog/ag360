import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getTenantAuth } from '@/lib/tenant-auth'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

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
        cp.id, cp.type, cp.first_name, cp.last_name, cp.business_name,
        cp.photo_url, cp.bio, cp.years_experience, cp.equipment_owned,
        cp.crops_experienced, cp.availability, cp.base_province,
        cp.base_city, cp.base_country, cp.service_radius_km,
        cp.open_to_relocation, cp.work_countries,
        cp.licence_province, cp.licence_verified, cp.verified_at, cp.created_at,
        cp.professional_sub_type, cp.services_offered, cp.languages_spoken,
        cp.remote_service, cp.countries_served,
        cp.seeking_tfw_sponsorship, cp.seeking_h2a_sponsorship,
        cp.available_from, cp.available_to, cp.clerk_user_id,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(r.id)::int AS review_count
      FROM connect_profiles cp
      LEFT JOIN connect_reviews r ON r.profile_id = cp.id
      WHERE cp.status = 'approved'
        AND (${type}::text IS NULL OR cp.type = ${type})
        AND (${province}::text IS NULL OR cp.base_province = ${province})
        AND (${country}::text IS NULL OR cp.base_country = ${country} OR ${country} = ANY(cp.work_countries))
        AND (${openToRelocation}::text IS NULL OR cp.open_to_relocation = ${openToRelocation === 'true'})
        AND (${availability}::text IS NULL OR cp.availability = ${availability})
        AND (${search}::text IS NULL OR
          LOWER(cp.first_name || ' ' || cp.last_name) LIKE ${'%' + (search?.toLowerCase() ?? '') + '%'} OR
          LOWER(COALESCE(cp.business_name, '')) LIKE ${'%' + (search?.toLowerCase() ?? '') + '%'}
        )
      GROUP BY cp.id
      ORDER BY cp.verified_at DESC NULLS LAST, cp.created_at DESC
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
      cv_url,
      operations_experience,
      equipment_brands,
      worldwide,
      holds_licence,
      driver_licence_type,
      driver_licence_province,
      available_from,
      available_to,
    } = body

    if (!type || !first_name || !last_name || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const valid = ['trucker', 'applicator', 'worker', 'farmer', 'professional']
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
        crops_experienced, availability, cv_url,
        operations_experience, equipment_brands, worldwide,
        holds_licence, driver_licence_type, driver_licence_province,
        available_from, available_to, status
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
        ${cv_url ?? null},
        ${operations_experience ?? []}, ${equipment_brands ?? []},
        ${worldwide ?? false},
        ${holds_licence ?? false}, ${driver_licence_type ?? null},
        ${driver_licence_province ?? null},
        ${available_from ?? null}, ${available_to ?? null}, 'pending'
      )
      RETURNING id, status, created_at
    `

    // Admin email notification — fire and forget
    try {
      await resend.emails.send({
        from: 'AG360 <hello@ag360.farm>',
        to: 'mike@ag360.farm',
        subject: `New Connect360 Registration — ${first_name} ${last_name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f1117; color: #e2e8f0; padding: 32px; border-radius: 12px;">
            <h2 style="color: #d4af37; margin-top: 0;">New Provider Registration</h2>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${first_name} ${last_name}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Type</td><td style="padding: 8px 0; text-transform: capitalize;">${type}</td></tr>
              ${business_name ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Business</td><td style="padding: 8px 0;">${business_name}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; color: #94a3b8;">Location</td><td style="padding: 8px 0;">${[base_city, base_province, base_country].filter(Boolean).join(', ')}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Phone</td><td style="padding: 8px 0;">${phone ?? '—'}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
              <tr><td style="padding: 8px 0; color: #94a3b8;">Availability</td><td style="padding: 8px 0; text-transform: capitalize;">${availability ?? '—'}</td></tr>
            </table>
            <div style="margin-top: 28px;">
              <a href="https://ag360.farm/connect360/admin"
                style="background: #d4af37; color: #0f1117; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
                Review in Admin Queue →
              </a>
            </div>
            <p style="color: #475569; font-size: 12px; margin-top: 32px; margin-bottom: 0;">AG360 · ag360.farm</p>
          </div>
        `,
      })
    } catch (emailErr) {
      console.error('Admin notification email failed:', emailErr)
    }

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