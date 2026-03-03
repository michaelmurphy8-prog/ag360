import * as XLSX from "xlsx";
import { TEMPLATE_CONFIGS, type ImportType, type TemplateColumn } from "./template-generator";

// ─── Types ────────────────────────────────────────────────────────────

export interface ParsedRow {
  rowIndex: number; // original row number in spreadsheet (1-based, excluding header)
  data: Record<string, string | number | null>;
  raw: Record<string, unknown>;
}

export interface ParseResult {
  rows: ParsedRow[];
  headers: string[];
  matchedHeaders: Record<string, string>; // original header → matched key
  unmatchedHeaders: string[];
  totalRows: number;
  emptyRowsSkipped: number;
}

// ─── Header Fuzzy Matching ────────────────────────────────────────────

const HEADER_ALIASES: Record<string, string[]> = {
  field_name: ["field name", "field", "fieldname", "field_name", "name", "land", "quarter name"],
  acres: ["acres", "total acres", "field acres", "size", "ac"],
  crop_type: ["crop type", "crop", "croptype", "crop_type", "commodity"],
  variety: ["variety", "var", "seed variety", "cultivar"],
  seeded_acres: ["seeded acres", "seeded", "seeded_acres", "planted acres"],
  quarter: ["quarter", "qtr", "lld quarter", "lld_quarter"],
  section: ["section", "sec", "lld section", "lld_section"],
  township: ["township", "twp", "lld township", "lld_township"],
  range: ["range", "rge", "rng", "lld range", "lld_range"],
  meridian: ["meridian", "mer", "lld meridian", "lld_meridian", "w"],
  latitude: ["latitude", "lat", "gps lat"],
  longitude: ["longitude", "lng", "lon", "long", "gps lon", "gps long"],
  province: ["province", "prov", "state"],
  notes: ["notes", "note", "comments", "comment", "memo"],
  seeding_date: ["seeding date", "seeding_date", "seed date", "plant date", "planted date", "date seeded"],
  seed_rate: ["seed rate", "seed_rate", "seed rate (lbs/ac)", "rate", "lbs/ac", "seed rate lbs/ac"],
  seed_cost: ["seed cost", "seed_cost", "seed cost ($/acre)", "cost/ac", "$/ac", "seed cost $/acre"],
  bushels: ["bushels", "bu", "total bushels", "yield", "production"],
  moisture: ["moisture", "moist", "moisture %", "mc"],
  grade: ["grade", "grd", "quality"],
  date: ["date", "harvest date", "load date", "transaction date", "expense date"],
  destination: ["destination", "dest", "bin", "elevator", "delivery to"],
  category: ["category", "cat", "expense type", "type", "cost category"],
  description: ["description", "desc", "details", "item"],
  amount: ["amount", "amt", "total", "cost", "total amount", "$", "dollars"],
  vendor: ["vendor", "supplier", "company", "sold by", "purchased from"],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .replace(/[*_\-\.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchHeader(rawHeader: string, columns: TemplateColumn[]): string | null {
  const normalized = normalizeHeader(rawHeader);

  // Direct match on column key
  for (const col of columns) {
    if (normalized === col.key || normalized === col.header.toLowerCase()) {
      return col.key;
    }
  }

  // Alias match
  for (const col of columns) {
    const aliases = HEADER_ALIASES[col.key] || [];
    if (aliases.includes(normalized)) {
      return col.key;
    }
  }

  // Fuzzy: check if the header contains the key or vice versa
  for (const col of columns) {
    if (normalized.includes(col.key) || col.key.includes(normalized.replace(/ /g, "_"))) {
      return col.key;
    }
  }

  return null;
}

// ─── Value Parsing ────────────────────────────────────────────────────

export function parseNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;

  const str = String(value)
    .replace(/[$,\s]/g, "")
    .replace(/^\((.+)\)$/, "-$1"); // handle (123) as negative

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

export function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  // SheetJS may return a serial date number
  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const str = String(value).trim();

  // Try native Date parsing for most formats
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2100) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Manual: DD-MMM-YYYY (e.g., 15-May-2026)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const dmy = str.match(/^(\d{1,2})[\-\/\s]([A-Za-z]{3,9})[\-\/\s,]?\s*(\d{4})$/);
  if (dmy) {
    const mon = monthMap[dmy[2].substring(0, 3).toLowerCase()];
    if (mon) return `${dmy[3]}-${mon}-${dmy[1].padStart(2, "0")}`;
  }

  return null;
}

export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim();
}

// ─── Crop Type Normalization ──────────────────────────────────────────

const CROP_TYPES: Record<string, string> = {
  canola: "Canola",
  wheat: "Hard Red Spring Wheat",
  "hard red spring wheat": "Hard Red Spring Wheat",
  hrsw: "Hard Red Spring Wheat",
  "spring wheat": "Hard Red Spring Wheat",
  durum: "Durum",
  oats: "Oats",
  barley: "Barley",
  flax: "Flax",
  "lentils - red": "Lentils - Red",
  "red lentils": "Lentils - Red",
  "lentils - green": "Lentils - Green",
  "green lentils": "Lentils - Green",
  lentils: "Lentils - Red",
  "peas - yellow": "Peas - Yellow",
  "yellow peas": "Peas - Yellow",
  "peas - green": "Peas - Green",
  "green peas": "Peas - Green",
  peas: "Peas - Yellow",
  mustard: "Mustard",
  chickpeas: "Chickpeas",
  soybeans: "Soybeans",
  soy: "Soybeans",
  corn: "Corn",
  fallow: "Fallow",
};

export function normalizeCropType(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const key = String(value).trim().toLowerCase();
  return CROP_TYPES[key] || String(value).trim(); // return as-is if not in map (will show as warning)
}

export function isKnownCropType(value: string): boolean {
  return Object.values(CROP_TYPES).includes(value);
}

// ─── Expense Category Normalization ───────────────────────────────────

const EXPENSE_CATEGORIES: Record<string, string> = {
  seed: "seed",
  fertilizer: "fertilizer",
  fert: "fertilizer",
  chemical: "chemical",
  chem: "chemical",
  spray: "chemical",
  herbicide: "chemical",
  fungicide: "chemical",
  insecticide: "chemical",
  fuel: "fuel",
  gas: "fuel",
  diesel: "fuel",
  custom_work: "custom_work",
  "custom work": "custom_work",
  custom: "custom_work",
  land_rent: "land_rent",
  "land rent": "land_rent",
  rent: "land_rent",
  lease: "land_rent",
  insurance: "insurance",
  "crop insurance": "insurance",
  other: "other",
};

export function normalizeCategory(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const key = String(value).trim().toLowerCase();
  return EXPENSE_CATEGORIES[key] || "other";
}

export const VALID_CATEGORIES = ["seed", "fertilizer", "chemical", "fuel", "custom_work", "land_rent", "insurance", "other"];

// ─── Province Normalization ───────────────────────────────────────────

const PROVINCE_MAP: Record<string, string> = {
  sk: "SK", sask: "SK", saskatchewan: "SK",
  ab: "AB", alta: "AB", alberta: "AB",
  mb: "MB", man: "MB", manitoba: "MB",
  bc: "BC", "british columbia": "BC",
  on: "ON", ont: "ON", ontario: "ON",
};

export function normalizeProvince(value: unknown): string {
  if (value === null || value === undefined || value === "") return "SK";
  const key = String(value).trim().toLowerCase();
  return PROVINCE_MAP[key] || "SK";
}

// ─── Main Parse Function ──────────────────────────────────────────────

export function parseFile(buffer: ArrayBuffer, type: ImportType): ParseResult {
  const config = TEMPLATE_CONFIGS[type];

  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  // Use first sheet (skip Instructions if it exists)
  const sheetName = workbook.SheetNames.find((n) => n !== "Instructions") || workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rawData.length === 0) {
    return { rows: [], headers: [], matchedHeaders: {}, unmatchedHeaders: [], totalRows: 0, emptyRowsSkipped: 0 };
  }

  // Match headers
  const rawHeaders = Object.keys(rawData[0]);
  const matchedHeaders: Record<string, string> = {};
  const unmatchedHeaders: string[] = [];

  rawHeaders.forEach((rh) => {
    const matched = matchHeader(rh, config.columns);
    if (matched) {
      matchedHeaders[rh] = matched;
    } else {
      unmatchedHeaders.push(rh);
    }
  });

  // Parse rows
  const rows: ParsedRow[] = [];
  let emptyRowsSkipped = 0;

  rawData.forEach((rawRow, index) => {
    // Skip entirely empty rows
    const hasData = Object.values(rawRow).some((v) => v !== null && v !== undefined && String(v).trim() !== "");
    if (!hasData) {
      emptyRowsSkipped++;
      return;
    }

    const data: Record<string, string | number | null> = {};

    Object.entries(matchedHeaders).forEach(([rawKey, mappedKey]) => {
      const col = config.columns.find((c) => c.key === mappedKey);
      const rawValue = rawRow[rawKey];

      if (!col) {
        data[mappedKey] = normalizeText(rawValue);
        return;
      }

      switch (col.type) {
        case "number":
          data[mappedKey] = parseNumber(rawValue);
          break;
        case "date":
          data[mappedKey] = parseDate(rawValue);
          break;
        default:
          data[mappedKey] = normalizeText(rawValue);
      }
    });

    rows.push({
      rowIndex: index + 2, // 1-based, +1 for header row
      data,
      raw: rawRow,
    });
  });

  return {
    rows,
    headers: Object.values(matchedHeaders),
    matchedHeaders,
    unmatchedHeaders,
    totalRows: rawData.length,
    emptyRowsSkipped,
  };
}