// lib/import-engine.ts
// AG360 Universal Import Engine
// Brand-aware column mapping + CSV parsing for any OEM

// ============================================================
// BRAND DEFINITIONS
// ============================================================
export const BRANDS = [
  { id: "john_deere", name: "John Deere", color: "#367C2B", icon: "🟢" },
  { id: "case_ih", name: "Case IH", color: "#BE1E2D", icon: "🔴" },
  { id: "new_holland", name: "New Holland", color: "#0033A0", icon: "🔵" },
  { id: "fendt", name: "Fendt", color: "#6B8E23", icon: "🟤" },
  { id: "massey_ferguson", name: "Massey Ferguson", color: "#CC0000", icon: "🔴" },
  { id: "claas", name: "CLAAS", color: "#8CC63F", icon: "🟢" },
  { id: "steyr", name: "Steyr", color: "#E74C3C", icon: "🟠" },
  { id: "kubota", name: "Kubota", color: "#F58220", icon: "🟠" },
  { id: "versatile", name: "Versatile", color: "#FFD700", icon: "🟡" },
  { id: "ag_leader", name: "Ag Leader", color: "#1B4D7E", icon: "🔵" },
  { id: "trimble", name: "Trimble", color: "#003C71", icon: "🔵" },
  { id: "climate_fieldview", name: "Climate FieldView", color: "#00B27A", icon: "🟢" },
  { id: "other", name: "Other / Generic CSV", color: "#6B7280", icon: "📄" },
] as const;

export type BrandId = (typeof BRANDS)[number]["id"];

// ============================================================
// DATA TYPES
// ============================================================
export const DATA_TYPES = [
  { id: "harvest", name: "Harvest", icon: "🌾", desc: "Yield, moisture, variety performance" },
  { id: "seeding", name: "Seeding / Planting", icon: "🌱", desc: "Seed rates, varieties, planted area" },
  { id: "application", name: "Spraying / Spreading", icon: "💧", desc: "Chemical, fertilizer, manure application" },
  { id: "tillage", name: "Tillage", icon: "🚜", desc: "Field prep, depth, residue management" },
  { id: "forage", name: "Haying / Forage", icon: "🌿", desc: "Mowing, raking, baling, swathing" },
  { id: "equipment", name: "Equipment / Machine", icon: "⚙️", desc: "Fuel, hours, utilization, productivity" },
] as const;

export type DataTypeId = (typeof DATA_TYPES)[number]["id"];

// ============================================================
// TARGET FIELD DEFINITIONS PER DATA TYPE
// ============================================================
export interface TargetField {
  key: string;
  label: string;
  required: boolean;
  dbColumn: string; // actual database column name
}

export const TARGET_FIELDS: Record<DataTypeId, TargetField[]> = {
  harvest: [
    { key: "field_name", label: "Field Name", required: true, dbColumn: "external_field_name" },
    { key: "crop", label: "Crop", required: true, dbColumn: "crop" },
    { key: "variety", label: "Variety", required: false, dbColumn: "variety" },
    { key: "area_harvested_ac", label: "Area Harvested (ac)", required: true, dbColumn: "area_harvested_ac" },
    { key: "dry_yield_bu_per_ac", label: "Dry Yield (bu/ac)", required: true, dbColumn: "dry_yield_bu_per_ac" },
    { key: "total_dry_yield_bu", label: "Total Dry Yield (bu)", required: false, dbColumn: "total_dry_yield_bu" },
    { key: "moisture_pct", label: "Moisture (%)", required: false, dbColumn: "moisture_pct" },
    { key: "harvest_start_date", label: "Harvest Date", required: false, dbColumn: "harvest_start_date" },
    { key: "productivity_ac_per_hr", label: "Productivity (ac/hr)", required: false, dbColumn: "productivity_ac_per_hr" },
    { key: "test_weight_lbs_per_bu", label: "Test Weight (lbs/bu)", required: false, dbColumn: "test_weight_lbs_per_bu" },
    { key: "protein_pct", label: "Protein (%)", required: false, dbColumn: "protein_pct" },
  ],
  seeding: [
    { key: "field_name", label: "Field Name", required: true, dbColumn: "external_field_name" },
    { key: "crop", label: "Crop", required: true, dbColumn: "crop" },
    { key: "variety", label: "Variety", required: false, dbColumn: "variety" },
    { key: "area_seeded_ac", label: "Area Seeded (ac)", required: true, dbColumn: "area_seeded_ac" },
    { key: "seeding_date", label: "Seeding Date", required: false, dbColumn: "seeding_date" },
    { key: "seed_rate", label: "Seed Rate", required: false, dbColumn: "seed_rate" },
    { key: "total_applied", label: "Total Applied", required: false, dbColumn: "total_applied" },
    { key: "target_depth_in", label: "Target Depth (in)", required: false, dbColumn: "target_depth_in" },
    { key: "productivity_ac_per_hr", label: "Productivity (ac/hr)", required: false, dbColumn: "productivity_ac_per_hr" },
  ],
  application: [
    { key: "field_name", label: "Field Name", required: true, dbColumn: "external_field_name" },
    { key: "product_name", label: "Product Name", required: true, dbColumn: "product_name" },
    { key: "product_type", label: "Product Type", required: false, dbColumn: "product_type" },
    { key: "area_applied_ac", label: "Area Applied (ac)", required: true, dbColumn: "area_applied_ac" },
    { key: "rate", label: "Application Rate", required: false, dbColumn: "rate" },
    { key: "rate_unit", label: "Rate Unit", required: false, dbColumn: "rate_unit" },
    { key: "total_applied", label: "Total Applied", required: false, dbColumn: "total_applied" },
    { key: "application_date", label: "Application Date", required: false, dbColumn: "application_date" },
    { key: "productivity_ac_per_hr", label: "Productivity (ac/hr)", required: false, dbColumn: "productivity_ac_per_hr" },
  ],
  tillage: [
    { key: "field_name", label: "Field Name", required: true, dbColumn: "external_field_name" },
    { key: "area_ac", label: "Area (ac)", required: true, dbColumn: "area_ac" },
    { key: "target_depth_in", label: "Target Depth (in)", required: false, dbColumn: "target_depth_in" },
    { key: "actual_depth_in", label: "Actual Depth (in)", required: false, dbColumn: "actual_depth_in" },
    { key: "tillage_date", label: "Tillage Date", required: false, dbColumn: "tillage_date" },
    { key: "operation_type", label: "Operation Type", required: false, dbColumn: "operation_type" },
    { key: "productivity_ac_per_hr", label: "Productivity (ac/hr)", required: false, dbColumn: "productivity_ac_per_hr" },
    { key: "speed_mph", label: "Speed (mph)", required: false, dbColumn: "speed_mph" },
  ],
  forage: [
    { key: "field_name", label: "Field Name", required: true, dbColumn: "external_field_name" },
    { key: "operation_type", label: "Operation (mow/rake/bale)", required: true, dbColumn: "operation_type" },
    { key: "crop", label: "Crop/Forage Type", required: false, dbColumn: "crop" },
    { key: "cutting_number", label: "Cutting #", required: false, dbColumn: "cutting_number" },
    { key: "area_ac", label: "Area (ac)", required: true, dbColumn: "area_ac" },
    { key: "operation_date", label: "Date", required: false, dbColumn: "operation_date" },
    { key: "bale_count", label: "Bale Count", required: false, dbColumn: "bale_count" },
    { key: "bale_weight_lbs", label: "Bale Weight (lbs)", required: false, dbColumn: "bale_weight_lbs" },
    { key: "moisture_pct", label: "Moisture (%)", required: false, dbColumn: "moisture_pct" },
    { key: "total_tonnage", label: "Total Tonnage", required: false, dbColumn: "total_tonnage" },
  ],
  equipment: [
    { key: "equipment_name", label: "Equipment Name", required: true, dbColumn: "name" },
    { key: "engine_hours_period", label: "Engine Hours (Period)", required: false, dbColumn: "engine_hours_period" },
    { key: "fuel_consumed_gal", label: "Fuel Consumed (gal)", required: false, dbColumn: "fuel_consumed_gal" },
    { key: "avg_fuel_rate_gal_per_hr", label: "Avg Fuel Rate (gal/hr)", required: false, dbColumn: "avg_fuel_rate_gal_per_hr" },
    { key: "productivity_ac_per_hr", label: "Productivity (ac/hr)", required: false, dbColumn: "productivity_ac_per_hr" },
    { key: "working_pct", label: "Working %", required: false, dbColumn: "working_pct" },
    { key: "idle_pct", label: "Idle %", required: false, dbColumn: "idle_pct" },
  ],
};

// ============================================================
// BRAND-SPECIFIC COLUMN PATTERNS
// Known column headers per brand → AG360 field key
// ============================================================
const BRAND_PATTERNS: Record<string, Record<string, Record<string, string>>> = {
  john_deere: {
    harvest: {
      "Field": "field_name", "Crop": "crop", "Variety": "variety",
      "Area Harvested": "area_harvested_ac", "Dry Yield": "dry_yield_bu_per_ac",
      "Total Dry Yield": "total_dry_yield_bu", "Moisture": "moisture_pct",
      "Productivity": "productivity_ac_per_hr",
    },
    seeding: {
      "Field": "field_name", "Crop": "crop", "Variety": "variety",
      "Area Seeded": "area_seeded_ac", "Total Applied (By Mass)": "total_applied",
      "Productivity": "productivity_ac_per_hr",
    },
    application: {
      "Field": "field_name", "Product": "product_name",
      "Area Applied": "area_applied_ac", "Applied Rate": "rate",
      "Total Applied": "total_applied", "Productivity": "productivity_ac_per_hr",
    },
    tillage: {
      "Field": "field_name", "Area Applied": "area_ac",
      "Target Depth": "target_depth_in", "Productivity": "productivity_ac_per_hr",
    },
  },
  case_ih: {
    harvest: {
      "FieldName": "field_name", "CropType": "crop", "VarietyName": "variety",
      "HarvestedArea": "area_harvested_ac", "AvgYield_BuAc": "dry_yield_bu_per_ac",
      "TotalYield_Bu": "total_dry_yield_bu", "AvgMoisture": "moisture_pct",
    },
    seeding: {
      "FieldName": "field_name", "CropType": "crop", "VarietyName": "variety",
      "PlantedArea": "area_seeded_ac", "SeedRate": "seed_rate",
    },
  },
  new_holland: {
    harvest: {
      "Field Name": "field_name", "Crop Type": "crop", "Variety Name": "variety",
      "Harvested Area (ac)": "area_harvested_ac", "Avg Yield (bu/ac)": "dry_yield_bu_per_ac",
      "Total Yield (bu)": "total_dry_yield_bu", "Avg Moisture (%)": "moisture_pct",
    },
  },
  climate_fieldview: {
    harvest: {
      "field_name": "field_name", "crop": "crop", "variety": "variety",
      "area_acres": "area_harvested_ac", "yield_bu_ac": "dry_yield_bu_per_ac",
      "moisture_percent": "moisture_pct",
    },
    seeding: {
      "field_name": "field_name", "crop": "crop", "variety": "variety",
      "area_acres": "area_seeded_ac", "rate_seeds_ac": "seed_rate",
    },
  },
};

// ============================================================
// REGEX AUTO-DETECT PATTERNS (brand-agnostic fallback)
// ============================================================
interface AutoPattern {
  regex: RegExp;
  mapsTo: string;
}

const AUTO_PATTERNS: Record<string, AutoPattern[]> = {
  harvest: [
    { regex: /^field$|field.?name|feld/i, mapsTo: "field_name" },
    { regex: /^crop$|crop.?type|frucht/i, mapsTo: "crop" },
    { regex: /variety|sorte|hybrid/i, mapsTo: "variety" },
    { regex: /area.*harvest|harvest.*area|fläche/i, mapsTo: "area_harvested_ac" },
    { regex: /dry.?yield|avg.?yield|ertrag/i, mapsTo: "dry_yield_bu_per_ac" },
    { regex: /total.*yield|yield.*total/i, mapsTo: "total_dry_yield_bu" },
    { regex: /moisture|moist|feuchte/i, mapsTo: "moisture_pct" },
    { regex: /harvest.*date|date.*harvest/i, mapsTo: "harvest_start_date" },
    { regex: /productivity|ac.*hr/i, mapsTo: "productivity_ac_per_hr" },
    { regex: /test.?weight/i, mapsTo: "test_weight_lbs_per_bu" },
    { regex: /protein/i, mapsTo: "protein_pct" },
  ],
  seeding: [
    { regex: /^field$|field.?name/i, mapsTo: "field_name" },
    { regex: /^crop$|crop.?type/i, mapsTo: "crop" },
    { regex: /variety|hybrid/i, mapsTo: "variety" },
    { regex: /area.*seed|seed.*area|planted.*area/i, mapsTo: "area_seeded_ac" },
    { regex: /seed.*date|plant.*date|date.*seed/i, mapsTo: "seeding_date" },
    { regex: /seed.*rate|plant.*rate|population/i, mapsTo: "seed_rate" },
    { regex: /total.*applied|applied.*total/i, mapsTo: "total_applied" },
    { regex: /depth/i, mapsTo: "target_depth_in" },
    { regex: /productivity/i, mapsTo: "productivity_ac_per_hr" },
  ],
  application: [
    { regex: /^field$|field.?name/i, mapsTo: "field_name" },
    { regex: /product|chemical|input/i, mapsTo: "product_name" },
    { regex: /type|category/i, mapsTo: "product_type" },
    { regex: /area.*appl|appl.*area/i, mapsTo: "area_applied_ac" },
    { regex: /^rate$|app.*rate|spray.*rate/i, mapsTo: "rate" },
    { regex: /total.*appl|appl.*total/i, mapsTo: "total_applied" },
    { regex: /appl.*date|date.*appl|spray.*date/i, mapsTo: "application_date" },
    { regex: /productivity/i, mapsTo: "productivity_ac_per_hr" },
  ],
  tillage: [
    { regex: /^field$|field.?name/i, mapsTo: "field_name" },
    { regex: /^area$|area.*ac|acres/i, mapsTo: "area_ac" },
    { regex: /target.*depth/i, mapsTo: "target_depth_in" },
    { regex: /actual.*depth/i, mapsTo: "actual_depth_in" },
    { regex: /till.*date|date/i, mapsTo: "tillage_date" },
    { regex: /operation|type/i, mapsTo: "operation_type" },
    { regex: /speed/i, mapsTo: "speed_mph" },
    { regex: /productivity/i, mapsTo: "productivity_ac_per_hr" },
  ],
  forage: [
    { regex: /^field$|field.?name/i, mapsTo: "field_name" },
    { regex: /operation|type|activity/i, mapsTo: "operation_type" },
    { regex: /^crop$|forage.*type/i, mapsTo: "crop" },
    { regex: /cutting|cut.*#/i, mapsTo: "cutting_number" },
    { regex: /^area$|acres/i, mapsTo: "area_ac" },
    { regex: /date/i, mapsTo: "operation_date" },
    { regex: /bale.*count|count.*bale|bales/i, mapsTo: "bale_count" },
    { regex: /bale.*weight|weight.*bale/i, mapsTo: "bale_weight_lbs" },
    { regex: /moisture/i, mapsTo: "moisture_pct" },
    { regex: /tonnage|tons|tonnes/i, mapsTo: "total_tonnage" },
  ],
  equipment: [
    { regex: /equipment|machine|unit/i, mapsTo: "equipment_name" },
    { regex: /engine.*hours|hours.*period/i, mapsTo: "engine_hours_period" },
    { regex: /fuel.*consumed|consumed.*fuel/i, mapsTo: "fuel_consumed_gal" },
    { regex: /fuel.*rate.*hr|avg.*fuel.*rate/i, mapsTo: "avg_fuel_rate_gal_per_hr" },
    { regex: /productivity/i, mapsTo: "productivity_ac_per_hr" },
    { regex: /working|utilization/i, mapsTo: "working_pct" },
    { regex: /idle/i, mapsTo: "idle_pct" },
  ],
};

// ============================================================
// AUTO-MAP COLUMNS
// Pass 1: exact brand match, Pass 2: regex fallback
// ============================================================
export function autoMapColumns(
  headers: string[],
  dataType: DataTypeId,
  provider?: BrandId
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();

  // Pass 1: Brand-specific exact match
  if (provider && BRAND_PATTERNS[provider]?.[dataType]) {
    const brandMap = BRAND_PATTERNS[provider][dataType];
    for (const h of headers) {
      if (brandMap[h] && !used.has(brandMap[h])) {
        mapping[h] = brandMap[h];
        used.add(brandMap[h]);
      }
    }
  }

  // Pass 2: Regex auto-detect for unmapped headers
  const patterns = AUTO_PATTERNS[dataType] || [];
  for (const h of headers) {
    if (mapping[h]) continue;
    for (const p of patterns) {
      if (p.regex.test(h) && !used.has(p.mapsTo)) {
        mapping[h] = p.mapsTo;
        used.add(p.mapsTo);
        break;
      }
    }
  }

  return mapping;
}

// ============================================================
// CSV PARSER — handles commas in quotes, trims whitespace
// ============================================================
export function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const values = parseCSVLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = (values[i] || "").trim();
      });
      return row;
    });

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ============================================================
// FIELD MATCHING — fuzzy match external names to AG360 fields
// ============================================================
export function fuzzyMatchFields(
  externalNames: string[],
  ag360Fields: { id: string; name: string }[]
): Record<string, string> {
  const mapping: Record<string, string> = {};

  for (const ext of externalNames) {
    // Pass 1: exact match (case-insensitive)
    const exact = ag360Fields.find(
      (f) => f.name.toLowerCase() === ext.toLowerCase()
    );
    if (exact) {
      mapping[ext] = exact.id;
      continue;
    }

    // Pass 2: contains match
    const contains = ag360Fields.find(
      (f) =>
        f.name.toLowerCase().includes(ext.toLowerCase()) ||
        ext.toLowerCase().includes(f.name.toLowerCase())
    );
    if (contains) {
      mapping[ext] = contains.id;
    }
  }

  return mapping;
}

// ============================================================
// VALUE NORMALIZER — clean raw cell values to typed values
// ============================================================
export function normalizeValue(value: string, targetKey: string): string | number | null {
  if (!value || value === "---" || value === "N/A" || value === "n/a" || value === "-") {
    return null;
  }

  // Numeric fields
  const numericFields = [
    "area_harvested_ac", "dry_yield_bu_per_ac", "total_dry_yield_bu",
    "moisture_pct", "productivity_ac_per_hr", "test_weight_lbs_per_bu",
    "protein_pct", "area_seeded_ac", "seed_rate", "total_applied",
    "target_depth_in", "actual_depth_in", "area_applied_ac", "rate",
    "area_ac", "speed_mph", "fuel_rate_gal_per_ac", "bale_count",
    "bale_weight_lbs", "total_tonnage", "cutting_number",
    "engine_hours_period", "fuel_consumed_gal", "avg_fuel_rate_gal_per_hr",
    "working_pct", "idle_pct",
  ];

  if (numericFields.includes(targetKey)) {
    const cleaned = value.replace(/[,$%\s]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // Date fields
  const dateFields = [
    "harvest_start_date", "seeding_date", "application_date",
    "tillage_date", "operation_date",
  ];

  if (dateFields.includes(targetKey)) {
    // Try common formats
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0]; // YYYY-MM-DD
    }
    return value; // return raw if can't parse — let DB handle
  }

  return value.trim();
}

// ============================================================
// BUILD INSERT RECORDS — transforms parsed CSV rows into DB-ready objects
// ============================================================
export function buildInsertRecords(
  rows: Record<string, string>[],
  columnMapping: Record<string, string>,
  fieldMapping: Record<string, string>,
  dataType: DataTypeId
): Record<string, unknown>[] {
  return rows.map((row) => {
    const record: Record<string, unknown> = {};

    // Map each column using the user-confirmed mapping
    for (const [sourceCol, targetKey] of Object.entries(columnMapping)) {
      const rawValue = row[sourceCol];
      const normalized = normalizeValue(rawValue || "", targetKey);

      // Find the actual DB column name
      const targetField = TARGET_FIELDS[dataType]?.find((f) => f.key === targetKey);
      const dbCol = targetField?.dbColumn || targetKey;
      record[dbCol] = normalized;
    }

    // Resolve field_id from field mapping
    const fieldNameCol = Object.entries(columnMapping).find(([, v]) => v === "field_name");
    if (fieldNameCol) {
      const externalName = row[fieldNameCol[0]];
      record.field_id = fieldMapping[externalName] || null;
      record.external_field_name = externalName;
    }

    // Store the full raw row for future reference
    record.raw_data = row;

    return record;
  });
}

// ============================================================
// DB TABLE NAME PER DATA TYPE
// ============================================================
export function getTableName(dataType: DataTypeId): string {
  const map: Record<DataTypeId, string> = {
    harvest: "harvest_records",
    seeding: "seeding_records",
    application: "application_records",
    tillage: "tillage_records",
    forage: "forage_records",
    equipment: "equipment",
  };
  return map[dataType];
}