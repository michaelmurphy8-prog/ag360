import { NextResponse } from 'next/server';
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
      "hoursTotal", "nextService", notes
    FROM "Asset"
    WHERE "orgId" = ${userId}
    ORDER BY "createdAt" DESC
  `;

  return NextResponse.json({ success: true, assets });
}