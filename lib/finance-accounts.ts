// lib/finance-accounts.ts
// Pre-loaded Chart of Accounts for Canadian Prairie Agriculture
// Matches QuickBooks/Sage category structure with ag-specific detail

export interface AccountSeed {
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  sub_type: string;
  normal_balance: "debit" | "credit";
  description: string;
  field_allocatable: boolean;
  sort_order: number;
}

export const PRAIRIE_CHART_OF_ACCOUNTS: AccountSeed[] = [
  // ═══════════════════════════════════════
  // ASSETS (1000–1999)
  // ═══════════════════════════════════════
  { code: "1000", name: "Cash — Operating", account_type: "asset", sub_type: "bank", normal_balance: "debit", description: "Main farm operating bank account", field_allocatable: false, sort_order: 1 },
  { code: "1010", name: "Cash — Savings", account_type: "asset", sub_type: "bank", normal_balance: "debit", description: "Farm savings / reserve account", field_allocatable: false, sort_order: 2 },
  { code: "1100", name: "Accounts Receivable", account_type: "asset", sub_type: "receivable", normal_balance: "debit", description: "Grain sales, custom work, other amounts owed to farm", field_allocatable: false, sort_order: 3 },
  { code: "1200", name: "Grain Inventory — On Hand", account_type: "asset", sub_type: "inventory", normal_balance: "debit", description: "Value of grain in bins at cost or market", field_allocatable: true, sort_order: 4 },
  { code: "1210", name: "Input Inventory — Seed", account_type: "asset", sub_type: "inventory", normal_balance: "debit", description: "Seed inventory on hand", field_allocatable: false, sort_order: 5 },
  { code: "1220", name: "Input Inventory — Chemical", account_type: "asset", sub_type: "inventory", normal_balance: "debit", description: "Herbicide, fungicide, insecticide on hand", field_allocatable: false, sort_order: 6 },
  { code: "1230", name: "Input Inventory — Fertilizer", account_type: "asset", sub_type: "inventory", normal_balance: "debit", description: "Fertilizer on hand", field_allocatable: false, sort_order: 7 },
  { code: "1240", name: "Prepaid Inputs", account_type: "asset", sub_type: "prepaid", normal_balance: "debit", description: "Inputs purchased for next crop year", field_allocatable: false, sort_order: 8 },
  { code: "1300", name: "Fuel Inventory", account_type: "asset", sub_type: "inventory", normal_balance: "debit", description: "Diesel, gasoline on hand", field_allocatable: false, sort_order: 9 },
  { code: "1500", name: "Land", account_type: "asset", sub_type: "fixed", normal_balance: "debit", description: "Owned farmland at cost", field_allocatable: false, sort_order: 10 },
  { code: "1510", name: "Buildings & Grain Storage", account_type: "asset", sub_type: "fixed", normal_balance: "debit", description: "Bins, shops, sheds, quonsets", field_allocatable: false, sort_order: 11 },
  { code: "1520", name: "Equipment & Machinery", account_type: "asset", sub_type: "fixed", normal_balance: "debit", description: "Tractors, combines, sprayers, seeders", field_allocatable: false, sort_order: 12 },
  { code: "1530", name: "Trucks & Vehicles", account_type: "asset", sub_type: "fixed", normal_balance: "debit", description: "Farm trucks, pickups, ATVs", field_allocatable: false, sort_order: 13 },
  { code: "1590", name: "Accumulated Depreciation", account_type: "asset", sub_type: "contra", normal_balance: "credit", description: "Accumulated depreciation on all fixed assets", field_allocatable: false, sort_order: 14 },

  // ═══════════════════════════════════════
  // LIABILITIES (2000–2999)
  // ═══════════════════════════════════════
  { code: "2000", name: "Accounts Payable", account_type: "liability", sub_type: "payable", normal_balance: "credit", description: "Bills owed to suppliers, dealers, custom operators", field_allocatable: false, sort_order: 20 },
  { code: "2010", name: "Credit Card", account_type: "liability", sub_type: "payable", normal_balance: "credit", description: "Farm credit card balance", field_allocatable: false, sort_order: 21 },
  { code: "2100", name: "Operating Line of Credit", account_type: "liability", sub_type: "short_term", normal_balance: "credit", description: "Farm operating loan / LOC", field_allocatable: false, sort_order: 22 },
  { code: "2200", name: "Equipment Loans", account_type: "liability", sub_type: "long_term", normal_balance: "credit", description: "Loans on machinery and equipment", field_allocatable: false, sort_order: 23 },
  { code: "2300", name: "Land Mortgage", account_type: "liability", sub_type: "long_term", normal_balance: "credit", description: "Mortgage on owned farmland", field_allocatable: false, sort_order: 24 },
  { code: "2400", name: "Deferred Grain Revenue", account_type: "liability", sub_type: "deferred", normal_balance: "credit", description: "Grain contracts signed but not yet delivered", field_allocatable: true, sort_order: 25 },
  { code: "2500", name: "GST/HST Payable", account_type: "liability", sub_type: "tax", normal_balance: "credit", description: "GST collected on sales", field_allocatable: false, sort_order: 26 },

  // ═══════════════════════════════════════
  // EQUITY (3000–3999)
  // ═══════════════════════════════════════
  { code: "3000", name: "Owner's Equity", account_type: "equity", sub_type: "equity", normal_balance: "credit", description: "Owner's capital / equity in the farm", field_allocatable: false, sort_order: 30 },
  { code: "3100", name: "Retained Earnings", account_type: "equity", sub_type: "retained", normal_balance: "credit", description: "Accumulated net income from prior years", field_allocatable: false, sort_order: 31 },
  { code: "3200", name: "Owner's Draw", account_type: "equity", sub_type: "draw", normal_balance: "debit", description: "Personal withdrawals from the farm", field_allocatable: false, sort_order: 32 },

  // ═══════════════════════════════════════
  // REVENUE (4000–4999)
  // ═══════════════════════════════════════
  { code: "4000", name: "Grain Sales — Wheat", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "All wheat sales (HRW, HRS, CPS, Durum)", field_allocatable: true, sort_order: 40 },
  { code: "4010", name: "Grain Sales — Canola", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Canola sales", field_allocatable: true, sort_order: 41 },
  { code: "4020", name: "Grain Sales — Barley", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Barley sales (feed and malt)", field_allocatable: true, sort_order: 42 },
  { code: "4030", name: "Grain Sales — Oats", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Oat sales", field_allocatable: true, sort_order: 43 },
  { code: "4040", name: "Grain Sales — Peas", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Pea sales (yellow, green)", field_allocatable: true, sort_order: 44 },
  { code: "4050", name: "Grain Sales — Lentils", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Lentil sales (red, green, large green)", field_allocatable: true, sort_order: 45 },
  { code: "4060", name: "Grain Sales — Flax", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Flax sales", field_allocatable: true, sort_order: 46 },
  { code: "4070", name: "Grain Sales — Soybeans", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Soybean sales", field_allocatable: true, sort_order: 47 },
  { code: "4080", name: "Grain Sales — Other Crops", account_type: "revenue", sub_type: "grain_sales", normal_balance: "credit", description: "Mustard, chickpeas, canaryseed, etc.", field_allocatable: true, sort_order: 48 },
  { code: "4200", name: "Crop Insurance Proceeds", account_type: "revenue", sub_type: "insurance", normal_balance: "credit", description: "SCIC / AFSC crop insurance claims", field_allocatable: true, sort_order: 49 },
  { code: "4300", name: "Government Payments", account_type: "revenue", sub_type: "government", normal_balance: "credit", description: "AgriStability, AgriInvest, ad hoc payments", field_allocatable: false, sort_order: 50 },
  { code: "4400", name: "Custom Work Revenue", account_type: "revenue", sub_type: "other_revenue", normal_balance: "credit", description: "Income from custom combining, spraying, hauling for others", field_allocatable: false, sort_order: 51 },
  { code: "4500", name: "Land Rent Revenue", account_type: "revenue", sub_type: "other_revenue", normal_balance: "credit", description: "Income from renting out owned land", field_allocatable: true, sort_order: 52 },
  { code: "4600", name: "Livestock Revenue", account_type: "revenue", sub_type: "livestock", normal_balance: "credit", description: "Cattle, hog, poultry sales", field_allocatable: false, sort_order: 53 },
  { code: "4900", name: "Other Farm Revenue", account_type: "revenue", sub_type: "other_revenue", normal_balance: "credit", description: "Miscellaneous farm income", field_allocatable: false, sort_order: 54 },

  // ═══════════════════════════════════════
  // EXPENSES (5000–5999) — COST OF PRODUCTION
  // ═══════════════════════════════════════
  { code: "5000", name: "Seed", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Seed purchases — all crops", field_allocatable: true, sort_order: 60 },
  { code: "5010", name: "Seed Treatment", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Seed treatment products", field_allocatable: true, sort_order: 61 },
  { code: "5100", name: "Fertilizer — Nitrogen", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Urea, anhydrous ammonia, UAN, ESN", field_allocatable: true, sort_order: 62 },
  { code: "5110", name: "Fertilizer — Phosphorus", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "MAP, DAP, 11-52-0", field_allocatable: true, sort_order: 63 },
  { code: "5120", name: "Fertilizer — Potassium", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Potash (0-0-60)", field_allocatable: true, sort_order: 64 },
  { code: "5130", name: "Fertilizer — Sulphur", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Ammonium sulphate, elemental S", field_allocatable: true, sort_order: 65 },
  { code: "5140", name: "Fertilizer — Micronutrients", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Boron, zinc, copper, etc.", field_allocatable: true, sort_order: 66 },
  { code: "5150", name: "Fertilizer — Application", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Custom fertilizer spreading / application fees", field_allocatable: true, sort_order: 67 },
  { code: "5200", name: "Herbicide", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Pre-seed, in-crop, pre-harvest herbicides", field_allocatable: true, sort_order: 68 },
  { code: "5210", name: "Fungicide", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Foliar and seed-applied fungicides", field_allocatable: true, sort_order: 69 },
  { code: "5220", name: "Insecticide", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Insecticides — spray and seed treatment", field_allocatable: true, sort_order: 70 },
  { code: "5230", name: "Adjuvants & Surfactants", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Spray adjuvants, surfactants, water conditioners", field_allocatable: true, sort_order: 71 },
  { code: "5240", name: "Desiccant / Pre-Harvest", account_type: "expense", sub_type: "crop_input", normal_balance: "debit", description: "Glyphosate, Reglone, Heat for pre-harvest", field_allocatable: true, sort_order: 72 },
  { code: "5300", name: "Custom Spraying", account_type: "expense", sub_type: "custom_work", normal_balance: "debit", description: "Aerial or ground custom spray application", field_allocatable: true, sort_order: 73 },
  { code: "5310", name: "Custom Combining", account_type: "expense", sub_type: "custom_work", normal_balance: "debit", description: "Custom harvest services", field_allocatable: true, sort_order: 74 },
  { code: "5320", name: "Custom Seeding", account_type: "expense", sub_type: "custom_work", normal_balance: "debit", description: "Custom seeding services", field_allocatable: true, sort_order: 75 },
  { code: "5330", name: "Custom Trucking", account_type: "expense", sub_type: "custom_work", normal_balance: "debit", description: "Grain hauling — custom or commercial", field_allocatable: true, sort_order: 76 },
  { code: "5400", name: "Crop Insurance Premiums", account_type: "expense", sub_type: "insurance", normal_balance: "debit", description: "SCIC / AFSC crop insurance premiums", field_allocatable: true, sort_order: 77 },
  { code: "5410", name: "Hail Insurance", account_type: "expense", sub_type: "insurance", normal_balance: "debit", description: "Hail insurance premiums", field_allocatable: true, sort_order: 78 },
  { code: "5500", name: "Grain Drying", account_type: "expense", sub_type: "grain_handling", normal_balance: "debit", description: "Natural gas, propane for grain drying", field_allocatable: true, sort_order: 79 },
  { code: "5510", name: "Grain Cleaning & Grading", account_type: "expense", sub_type: "grain_handling", normal_balance: "debit", description: "Cleaning, grading, blending costs", field_allocatable: true, sort_order: 80 },
  { code: "5520", name: "Elevator Fees & Check-offs", account_type: "expense", sub_type: "grain_handling", normal_balance: "debit", description: "Elevator charges, CWB check-off, canola council levy", field_allocatable: true, sort_order: 81 },

  // ═══════════════════════════════════════
  // EXPENSES (6000–6999) — OPERATING
  // ═══════════════════════════════════════
  { code: "6000", name: "Fuel — Diesel", account_type: "expense", sub_type: "fuel", normal_balance: "debit", description: "Farm diesel purchases", field_allocatable: true, sort_order: 90 },
  { code: "6010", name: "Fuel — Gasoline", account_type: "expense", sub_type: "fuel", normal_balance: "debit", description: "Farm gasoline purchases", field_allocatable: false, sort_order: 91 },
  { code: "6020", name: "Oil, Grease & Filters", account_type: "expense", sub_type: "fuel", normal_balance: "debit", description: "Lubricants, filters, DEF", field_allocatable: false, sort_order: 92 },
  { code: "6100", name: "Equipment Repairs", account_type: "expense", sub_type: "equipment", normal_balance: "debit", description: "Parts and repair costs for farm equipment", field_allocatable: false, sort_order: 93 },
  { code: "6110", name: "Truck & Vehicle Repairs", account_type: "expense", sub_type: "equipment", normal_balance: "debit", description: "Parts and repair for trucks and vehicles", field_allocatable: false, sort_order: 94 },
  { code: "6120", name: "Building & Bin Repairs", account_type: "expense", sub_type: "equipment", normal_balance: "debit", description: "Maintenance on buildings, bins, yards", field_allocatable: false, sort_order: 95 },
  { code: "6200", name: "Land Rent / Lease", account_type: "expense", sub_type: "land", normal_balance: "debit", description: "Cash rent on rented farmland", field_allocatable: true, sort_order: 96 },
  { code: "6210", name: "Property Taxes", account_type: "expense", sub_type: "land", normal_balance: "debit", description: "Municipal property taxes on owned land", field_allocatable: true, sort_order: 97 },
  { code: "6300", name: "Wages & Salaries", account_type: "expense", sub_type: "labour", normal_balance: "debit", description: "Employee wages — full-time and seasonal", field_allocatable: false, sort_order: 98 },
  { code: "6310", name: "Employee Benefits", account_type: "expense", sub_type: "labour", normal_balance: "debit", description: "CPP, EI, WCB, health benefits", field_allocatable: false, sort_order: 99 },
  { code: "6320", name: "Contract Labour", account_type: "expense", sub_type: "labour", normal_balance: "debit", description: "Seasonal contract workers, LMIA workers", field_allocatable: false, sort_order: 100 },
  { code: "6400", name: "Utilities", account_type: "expense", sub_type: "overhead", normal_balance: "debit", description: "Power, natural gas, water for farm buildings", field_allocatable: false, sort_order: 101 },
  { code: "6410", name: "Communications", account_type: "expense", sub_type: "overhead", normal_balance: "debit", description: "Phone, internet, GPS subscriptions", field_allocatable: false, sort_order: 102 },
  { code: "6420", name: "Farm Insurance — General", account_type: "expense", sub_type: "insurance", normal_balance: "debit", description: "Farm property, liability, umbrella insurance", field_allocatable: false, sort_order: 103 },
  { code: "6430", name: "Professional Fees", account_type: "expense", sub_type: "overhead", normal_balance: "debit", description: "Accountant, lawyer, consultant fees", field_allocatable: false, sort_order: 104 },
  { code: "6440", name: "Office & Admin", account_type: "expense", sub_type: "overhead", normal_balance: "debit", description: "Office supplies, software, subscriptions", field_allocatable: false, sort_order: 105 },
  { code: "6500", name: "Interest — Operating Loan", account_type: "expense", sub_type: "interest", normal_balance: "debit", description: "Interest on operating line of credit", field_allocatable: false, sort_order: 106 },
  { code: "6510", name: "Interest — Equipment Loans", account_type: "expense", sub_type: "interest", normal_balance: "debit", description: "Interest on equipment financing", field_allocatable: false, sort_order: 107 },
  { code: "6520", name: "Interest — Land Mortgage", account_type: "expense", sub_type: "interest", normal_balance: "debit", description: "Interest on land mortgage", field_allocatable: false, sort_order: 108 },
  { code: "6600", name: "Depreciation", account_type: "expense", sub_type: "depreciation", normal_balance: "debit", description: "Annual depreciation on fixed assets", field_allocatable: false, sort_order: 109 },
  { code: "6900", name: "Other Farm Expenses", account_type: "expense", sub_type: "other", normal_balance: "debit", description: "Miscellaneous farm expenses", field_allocatable: false, sort_order: 110 },
];