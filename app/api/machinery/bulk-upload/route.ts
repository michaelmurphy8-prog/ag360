import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const VALID_ASSET_CLASSES = ['tractor','combine','header','sprayer','seeder','truck','auger','construction','implement','other'];
const VALID_ASSET_TYPES = ['fixed','variable'];
const VALID_STATUSES = ['ACTIVE','WATCH','DOWN','SOLD','RETIRED'];

export async function POST(req: NextRequest) {
  const { userId } = await auth();
if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);
  const { rows } = await req.json();

  const errors: string[] = [];
  const valid: typeof rows = [];

  rows.forEach((row: Record<string, string>, i: number) => {
    const rowNum = i + 2;
    if (!row.make?.trim())  { errors.push(`Row ${rowNum}: make is required`); return; }
    if (!row.model?.trim()) { errors.push(`Row ${rowNum}: model is required`); return; }
    if (!row.year || isNaN(Number(row.year))) { errors.push(`Row ${rowNum}: valid year is required`); return; }
    if (row.asset_class && !VALID_ASSET_CLASSES.includes(row.asset_class.toLowerCase())) {
      errors.push(`Row ${rowNum}: invalid asset_class "${row.asset_class}"`); return;
    }
    if (row.asset_type && !VALID_ASSET_TYPES.includes(row.asset_type.toLowerCase())) {
      errors.push(`Row ${rowNum}: asset_type must be "fixed" or "variable"`); return;
    }
    valid.push(row);
  });

  if (errors.length > 0) {
    return NextResponse.json({ success: false, errors }, { status: 400 });
  }

  let inserted = 0;
  for (const row of valid) {
    const status = (row.status?.toUpperCase() || 'ACTIVE');
    const validStatus = VALID_STATUSES.includes(status) ? status : 'ACTIVE';

    await sql`
      INSERT INTO "Asset" (
        id, "orgId", name, make, model, year,
        "serialNumber", "purchasePrice", "currentValue",
        "assetType", "assetClass", type, status,
        "hoursTotal", "nextService", notes,
        "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${userId},
        ${`${row.make.trim()} ${row.model.trim()}`},
        ${row.make.trim()},
        ${row.model.trim()},
        ${Number(row.year)},
        ${row.serial_number?.trim() || null},
        ${row.purchase_value ? Number(row.purchase_value) : null},
        ${row.current_value ? Number(row.current_value) : null},
        ${(row.asset_type || 'fixed').toLowerCase()},
${(row.asset_class || 'other').toLowerCase()},
${(row.asset_class || 'OTHER').toUpperCase()}::"AssetType",
${validStatus}::"AssetStatus",
        ${row.hours_km ? Number(row.hours_km) : null},
        ${row.next_service_hours_km?.trim() || null},
        ${row.notes?.trim() || null},
        NOW(), NOW()
      )
    `;
    inserted++;
  }

  return NextResponse.json({ success: true, inserted });
}