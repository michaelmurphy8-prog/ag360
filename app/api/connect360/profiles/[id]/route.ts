import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

// GET — full profile detail (approved profiles only for public view)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const result = await sql`
      SELECT
        id, type, status, first_name, last_name, email, phone,
        photo_url, business_name, business_number,
        insurance_confirmed, licence_number, licence_province,
        base_province, base_city, base_country,
        service_radius_km, open_to_relocation, work_countries,
        bio, years_experience, equipment_owned,
        crops_experienced, availability, available_from, available_to,
        verified_at, created_at, clerk_user_id, cv_url,
        operations_experience, equipment_brands,
        professional_sub_type, services_offered, languages_spoken,
        remote_service, countries_served, licence_verified,
        seeking_tfw_sponsorship, seeking_h2a_sponsorship,
        citizenship_country
      FROM connect_profiles
      WHERE id = ${id} AND status = 'approved'
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ profile: result[0] })
  } catch (err) {
    console.error('GET /api/connect360/profiles/[id] error:', err)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

// PATCH — provider updates their own profile
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  try {
    const body = await req.json()
    const {
      phone, photo_url, business_name, business_number,
      insurance_confirmed, licence_number, licence_province,
      base_province, base_city, base_country,
      service_radius_km, open_to_relocation, work_countries,
      bio, years_experience, equipment_owned,
      crops_experienced, availability,
      available_from, available_to, cv_url,
    } = body

    const result = await sql`
      UPDATE connect_profiles SET
        phone = COALESCE(${phone ?? null}, phone),
        photo_url = COALESCE(${photo_url ?? null}, photo_url),
        business_name = COALESCE(${business_name ?? null}, business_name),
        business_number = COALESCE(${business_number ?? null}, business_number),
        insurance_confirmed = COALESCE(${insurance_confirmed ?? null}, insurance_confirmed),
        licence_number = COALESCE(${licence_number ?? null}, licence_number),
        licence_province = COALESCE(${licence_province ?? null}, licence_province),
        base_province = COALESCE(${base_province ?? null}, base_province),
        base_city = COALESCE(${base_city ?? null}, base_city),
        base_country = COALESCE(${base_country ?? null}, base_country),
        service_radius_km = COALESCE(${service_radius_km ?? null}, service_radius_km),
        open_to_relocation = COALESCE(${open_to_relocation ?? null}, open_to_relocation),
        work_countries = COALESCE(${work_countries ?? null}, work_countries),
        bio = COALESCE(${bio ?? null}, bio),
        years_experience = COALESCE(${years_experience ?? null}, years_experience),
        equipment_owned = COALESCE(${equipment_owned ?? null}, equipment_owned),
        crops_experienced = COALESCE(${crops_experienced ?? null}, crops_experienced),
        availability = COALESCE(${availability ?? null}, availability),
        available_from = COALESCE(${available_from ?? null}, available_from),
        available_to = COALESCE(${available_to ?? null}, available_to),
        cv_url = COALESCE(${cv_url ?? null}, cv_url),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, updated_at
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile: result[0] })
  } catch (err) {
    console.error('PATCH /api/connect360/profiles/[id] error:', err)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}