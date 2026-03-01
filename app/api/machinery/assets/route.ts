import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);

  const assets = await sql`
    SELECT
      id, name, make, model, year,
      "serialNumber", "currentValue", "purchasePrice",
      "assetType", "assetClass", status,
      "hoursTotal", "kmTotal", "nextService", notes
    FROM "Asset"
    WHERE "orgId" = ${userId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ success: true, assets });
}
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const sql = neon(process.env.DATABASE_URL!);
  const body = await req.json();

  const {
    make, model, year, serial_number, purchase_value, current_value,
    asset_type, asset_class, status, hours_km, km_total, next_service_hours_km, notes,
    warranty_expiry, warranty_notes, dealer_name, dealer_phone,
  } = body;

  if (!make || !model || !year) {
    return NextResponse.json({ error: 'Make, model, and year required' }, { status: 400 });
  }

  const name = `${make} ${model}`;
  const [asset] = await sql`
    INSERT INTO "Asset" (
      "id", "orgId", "name", "type", "make", "model", "year", "serialNumber",
      "purchasePrice", "currentValue", "status", "hoursTotal", "kmTotal", "nextService", "notes",
      "warrantyExpiry", "warrantyNotes", "dealerName", "dealerPhone",
      "assetClass", "assetType", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid()::text, ${userId}, ${name}, ${(asset_type || 'fixed').toUpperCase()},
      ${make}, ${model}, ${parseInt(year)}, ${serial_number || null},
      ${purchase_value ? parseFloat(purchase_value) : null}, ${current_value ? parseFloat(current_value) : null},
      ${status || 'ACTIVE'}, ${hours_km ? parseFloat(hours_km) : null}, ${km_total ? parseFloat(km_total) : null},
      ${next_service_hours_km || null}, ${notes || null},
      ${warranty_expiry || null}, ${warranty_notes || null}, ${dealer_name || null}, ${dealer_phone || null},
      ${asset_class || 'other'}, ${asset_type || 'fixed'}, NOW(), NOW()
    ) RETURNING *
  `;

  return NextResponse.json({ success: true, asset });
}