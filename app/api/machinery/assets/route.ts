import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  const { orgId } = await auth();
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sql = neon(process.env.DATABASE_URL!);

  const assets = await sql`
    SELECT
      id, name, make, model, year,
      "serialNumber", "currentValue", "purchasePrice",
      "assetType", "assetClass", status,
      "hoursTotal", "nextService", notes
    FROM "Asset"
    WHERE "orgId" = ${orgId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ success: true, assets });
}