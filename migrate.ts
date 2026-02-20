import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_watchlist (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_user_id TEXT NOT NULL,
      symbol TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      commodity TEXT,
      location_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(clerk_user_id, symbol)
    )
  `;
  console.log('✅ user_watchlist table created');
await sql`
  CREATE TABLE IF NOT EXISTS agronomy_seeding_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    crop TEXT NOT NULL,
    seeding_date DATE NOT NULL,
    acres NUMERIC(10,1),
    field_name TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`
console.log('Created agronomy_seeding_log table')
}

migrate().catch(console.error);