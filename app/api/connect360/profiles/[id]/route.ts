import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { auth } from '@clerk/nextjs/server'
import { getC360Auth, getC360Email } from '@/lib/connect360-auth'
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
    const { photo_url, first_name, last_name, phone, business_name, bio,
      base_city, base_province, base_country, service_radius_km, worldwide,
      open_to_relocation, work_countries, years_experience, website_url,
      equipment_owned, crops_experienced, operations_experience, equipment_brands,
      holds_licence, driver_licence_type, driver_licence_province,
      availability, available_from, available_to, farmer_sub_types,
      sponsorship_offered, languages_spoken, services_offered,
      provinces_served, countries_served, remote_service, worker_origin_countries,
    } = body

    // Build dynamic update
    const updates: Record<string, any> = {}
    if (photo_url !== undefined) updates.photo_url = photo_url
    if (first_name !== undefined) updates.first_name = first_name
    if (last_name !== undefined) updates.last_name = last_name
    if (phone !== undefined) updates.phone = phone
    if (business_name !== undefined) updates.business_name = business_name
    if (bio !== undefined) updates.bio = bio
    if (base_city !== undefined) updates.base_city = base_city
    if (base_province !== undefined) updates.base_province = base_province
    if (base_country !== undefined) updates.base_country = base_country
    if (service_radius_km !== undefined) updates.service_radius_km = service_radius_km
    if (worldwide !== undefined) updates.worldwide = worldwide
    if (open_to_relocation !== undefined) updates.open_to_relocation = open_to_relocation
    if (work_countries !== undefined) updates.work_countries = work_countries
    if (years_experience !== undefined) updates.years_experience = years_experience
    if (website_url !== undefined) updates.website_url = website_url
    if (equipment_owned !== undefined) updates.equipment_owned = equipment_owned
    if (crops_experienced !== undefined) updates.crops_experienced = crops_experienced
    if (operations_experience !== undefined) updates.operations_experience = operations_experience
    if (equipment_brands !== undefined) updates.equipment_brands = equipment_brands
    if (holds_licence !== undefined) updates.holds_licence = holds_licence
    if (driver_licence_type !== undefined) updates.driver_licence_type = driver_licence_type
    if (driver_licence_province !== undefined) updates.driver_licence_province = driver_licence_province
    if (availability !== undefined) updates.availability = availability
    if (available_from !== undefined) updates.available_from = available_from || null
    if (available_to !== undefined) updates.available_to = available_to || null
    if (farmer_sub_types !== undefined) updates.farmer_sub_types = farmer_sub_types
    if (sponsorship_offered !== undefined) updates.sponsorship_offered = sponsorship_offered
    if (languages_spoken !== undefined) updates.languages_spoken = languages_spoken
    if (services_offered !== undefined) updates.services_offered = services_offered
    if (provinces_served !== undefined) updates.provinces_served = provinces_served
    if (countries_served !== undefined) updates.countries_served = countries_served
    if (remote_service !== undefined) updates.remote_service = remote_service
    if (worker_origin_countries !== undefined) updates.worker_origin_countries = worker_origin_countries

    if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

    const setClauses = Object.keys(updates).map((k, i) => `${k} = $${i + 2}`).join(', ')
    const values = [id, ...Object.values(updates)]
    await sql.unsafe(`UPDATE connect_profiles SET ${setClauses} WHERE id = $1`, values)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { userId: ag360Id } = await auth()
    const c360 = await getC360Auth()
    const userId = ag360Id ?? c360.userId
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const profile = await sql`SELECT clerk_user_id, email FROM connect_profiles WHERE id = ${id}`
    if (!profile[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    
    const c360Email = await getC360Email()
    const isOwner = profile[0].clerk_user_id === userId || profile[0].email === c360Email
    if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Cascade delete
    await sql`DELETE FROM connect_jobs WHERE clerk_user_id = ${profile[0].clerk_user_id}`
    await sql`DELETE FROM connect_reviews WHERE profile_id = ${id}`
    await sql`DELETE FROM connect_requests WHERE profile_id = ${id} OR requester_profile_id = ${id}`
    await sql`DELETE FROM connect_saved WHERE profile_id = ${id}`
    await sql`DELETE FROM connect_profiles WHERE id = ${id}`

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE profile error:', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
