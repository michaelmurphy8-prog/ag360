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

await sql`
  CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    settlement_number TEXT,
    terminal_name TEXT,
    terminal_location TEXT,
    issue_date DATE,
    payment_date DATE,
    payment_method TEXT,
    crop TEXT,
    grade TEXT,
    contract_number TEXT,
    total_loads INTEGER,
    price_per_mt NUMERIC(12,2),
    total_unload_weight_mt NUMERIC(14,3),
    total_dockage_mt NUMERIC(14,3),
    total_net_weight_mt NUMERIC(14,3),
    total_bushels NUMERIC(14,2),
    gross_payable NUMERIC(14,2),
    total_adjustments NUMERIC(14,2),
    net_payable NUMERIC(14,2),
    avg_dockage_pct NUMERIC(6,3),
    avg_moisture_pct NUMERIC(6,3),
    status TEXT DEFAULT 'parsed',
    pdf_filename TEXT,
    flags JSONB DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('Created settlements table');

await sql`
  CREATE TABLE IF NOT EXISTS settlement_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    line_number INTEGER,
    delivery_number TEXT,
    receipt_number TEXT,
    cper_number TEXT,
    delivery_date DATE,
    contract_number TEXT,
    shipment_number TEXT,
    commodity TEXT,
    grade TEXT,
    unload_weight_mt NUMERIC(12,3),
    dockage_pct NUMERIC(6,3),
    dockage_mt NUMERIC(12,3),
    dry_loss_pct NUMERIC(6,3),
    dry_loss_mt NUMERIC(12,3),
    net_weight_mt NUMERIC(12,3),
    net_bushels NUMERIC(12,2),
    moisture_pct NUMERIC(6,3),
    price_per_mt NUMERIC(12,2),
    gross_amount NUMERIC(14,2),
    handling NUMERIC(12,2),
    gst NUMERIC(12,2),
    levy NUMERIC(12,2),
    dkg_value NUMERIC(12,2),
    other_deductions NUMERIC(12,2),
    net_payable_line NUMERIC(14,2),
    grain_load_id UUID,
    flags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`;
console.log('Created settlement_lines table');

}
migrate().catch(console.error);