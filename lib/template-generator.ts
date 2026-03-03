import * as XLSX from "xlsx";

// ─── Column Definitions ───────────────────────────────────────────────

export interface TemplateColumn {
  header: string;
  key: string;
  required: boolean;
  type: "text" | "number" | "date";
  notes: string;
  example: string;
  width: number;
}

const FIELDS_COLUMNS: TemplateColumn[] = [
  { header: "Field Name", key: "field_name", required: true, type: "text", notes: "Unique name for this field", example: "Home Quarter", width: 20 },
  { header: "Acres", key: "acres", required: true, type: "number", notes: "Total field acres", example: "160", width: 10 },
  { header: "Crop Type", key: "crop_type", required: false, type: "text", notes: "e.g., Canola, Wheat, Lentils", example: "Canola", width: 16 },
  { header: "Variety", key: "variety", required: false, type: "text", notes: "Seed variety", example: "L233P", width: 14 },
  { header: "Seeded Acres", key: "seeded_acres", required: false, type: "number", notes: "Defaults to Acres if blank", example: "155", width: 14 },
  { header: "Quarter", key: "quarter", required: false, type: "text", notes: "NW, NE, SW, SE", example: "NW", width: 10 },
  { header: "Section", key: "section", required: false, type: "number", notes: "1-36", example: "12", width: 10 },
  { header: "Township", key: "township", required: false, type: "number", notes: "1-126", example: "36", width: 12 },
  { header: "Range", key: "range", required: false, type: "number", notes: "1-34", example: "5", width: 10 },
  { header: "Meridian", key: "meridian", required: false, type: "number", notes: "1-6 (W1-W6)", example: "3", width: 12 },
  { header: "Latitude", key: "latitude", required: false, type: "number", notes: "GPS decimal (alternative to LLD)", example: "52.1312", width: 14 },
  { header: "Longitude", key: "longitude", required: false, type: "number", notes: "GPS decimal (alternative to LLD)", example: "-106.6345", width: 14 },
  { header: "Province", key: "province", required: false, type: "text", notes: "SK, AB, MB (defaults to SK)", example: "SK", width: 10 },
  { header: "Notes", key: "notes", required: false, type: "text", notes: "Optional notes", example: "Rented from J. Smith", width: 24 },
];

const SEEDING_COLUMNS: TemplateColumn[] = [
  { header: "Field Name", key: "field_name", required: true, type: "text", notes: "Must match an existing field", example: "Home Quarter", width: 20 },
  { header: "Crop Type", key: "crop_type", required: true, type: "text", notes: "e.g., Canola, Wheat, Lentils", example: "Canola", width: 16 },
  { header: "Variety", key: "variety", required: false, type: "text", notes: "Seed variety", example: "L233P", width: 14 },
  { header: "Seeded Acres", key: "seeded_acres", required: false, type: "number", notes: "Defaults to field acres", example: "155", width: 14 },
  { header: "Seeding Date", key: "seeding_date", required: false, type: "date", notes: "YYYY-MM-DD or any common format", example: "2026-05-15", width: 14 },
  { header: "Seed Rate (lbs/ac)", key: "seed_rate", required: false, type: "number", notes: "Pounds per acre", example: "5.5", width: 18 },
  { header: "Seed Cost ($/acre)", key: "seed_cost", required: false, type: "number", notes: "Posts to expenses as seed category", example: "42.50", width: 18 },
];

const HARVEST_COLUMNS: TemplateColumn[] = [
  { header: "Field Name", key: "field_name", required: true, type: "text", notes: "Must match an existing field", example: "Home Quarter", width: 20 },
  { header: "Crop Type", key: "crop_type", required: true, type: "text", notes: "Crop harvested", example: "Canola", width: 16 },
  { header: "Bushels", key: "bushels", required: true, type: "number", notes: "Total bushels harvested", example: "6200", width: 12 },
  { header: "Moisture", key: "moisture", required: false, type: "number", notes: "% moisture at delivery", example: "9.5", width: 12 },
  { header: "Grade", key: "grade", required: false, type: "text", notes: "e.g., #1, #2, Sample", example: "#1", width: 10 },
  { header: "Date", key: "date", required: false, type: "date", notes: "Harvest date", example: "2025-09-20", width: 14 },
  { header: "Destination", key: "destination", required: false, type: "text", notes: "Bin name or elevator", example: "Bin 4", width: 18 },
];

const EXPENSES_COLUMNS: TemplateColumn[] = [
  { header: "Field Name", key: "field_name", required: true, type: "text", notes: "Must match an existing field", example: "Home Quarter", width: 20 },
  { header: "Category", key: "category", required: true, type: "text", notes: "seed, fertilizer, chemical, fuel, custom_work, land_rent, insurance, other", example: "fertilizer", width: 16 },
  { header: "Description", key: "description", required: false, type: "text", notes: "What was purchased/applied", example: "46-0-0 Urea", width: 24 },
  { header: "Amount", key: "amount", required: true, type: "number", notes: "Total $ amount", example: "8500.00", width: 14 },
  { header: "Date", key: "date", required: false, type: "date", notes: "Transaction date", example: "2026-04-10", width: 14 },
  { header: "Vendor", key: "vendor", required: false, type: "text", notes: "Supplier name", example: "Nutrien Ag Solutions", width: 22 },
];

export const TEMPLATE_CONFIGS = {
  fields: { columns: FIELDS_COLUMNS, sheetName: "Fields", title: "AG360 — Fields Import Template" },
  seeding: { columns: SEEDING_COLUMNS, sheetName: "Seeding", title: "AG360 — Seeding Import Template" },
  harvest: { columns: HARVEST_COLUMNS, sheetName: "Harvest", title: "AG360 — Harvest Import Template" },
  expenses: { columns: EXPENSES_COLUMNS, sheetName: "Expenses", title: "AG360 — Expenses Import Template" },
} as const;

export type ImportType = keyof typeof TEMPLATE_CONFIGS;

// ─── Instruction Sheet Content ────────────────────────────────────────

function getInstructions(type: ImportType, columns: TemplateColumn[]): string[][] {
  const requiredCols = columns.filter((c) => c.required).map((c) => c.header);
  const optionalCols = columns.filter((c) => !c.required).map((c) => c.header);

  const cropList = "Canola, Hard Red Spring Wheat, Durum, Oats, Barley, Flax, Lentils - Red, Lentils - Green, Peas - Yellow, Peas - Green, Mustard, Chickpeas, Soybeans, Corn, Fallow";

  const rows: string[][] = [
    ["AG360 Import Instructions"],
    [""],
    ["How to use this template:"],
    ["1. Go to the data sheet tab and fill in your data starting in row 3 (row 2 is an example — delete it before importing)."],
    ["2. Required columns are marked with * in the header. All other columns are optional."],
    ["3. Save the file as .xlsx or .csv and upload it in AG360 under Operations > Import Data."],
    [""],
    ["Required columns: " + requiredCols.join(", ")],
    ["Optional columns: " + optionalCols.join(", ")],
    [""],
    ["Column Details:"],
  ];

  columns.forEach((col) => {
    rows.push(["  " + col.header + (col.required ? " *" : "") + "  —  " + col.notes + " (" + col.type + ")"]);
  });

  rows.push([""]);
  rows.push(["Tips:"]);

  if (type === "fields") {
    rows.push(["- Field Name must be unique — duplicates will be flagged."]);
    rows.push(["- You can use either LLD (Quarter/Section/Township/Range/Meridian) or GPS (Latitude/Longitude) for location."]);
    rows.push(["- If Crop Type is provided, a seeding record will also be created for the current crop year."]);
  }
  if (type === "seeding" || type === "harvest") {
    rows.push(["- Field Name must match an existing field in AG360 (case-insensitive)."]);
  }
  if (type === "expenses") {
    rows.push(["- Valid categories: seed, fertilizer, chemical, fuel, custom_work, land_rent, insurance, other"]);
  }

  rows.push(["- Recognized crop types: " + cropList]);
  rows.push(["- Dates can be YYYY-MM-DD, MM/DD/YYYY, DD-MMM-YYYY, or March 1, 2026."]);
  rows.push(["- Numbers can include commas and $ signs — they will be cleaned automatically."]);
  rows.push(["- Blank rows are skipped automatically."]);

  return rows;
}

// ─── Template Generator ───────────────────────────────────────────────

export function generateTemplate(type: ImportType): ArrayBuffer {
  const config = TEMPLATE_CONFIGS[type];
  const wb = XLSX.utils.book_new();

  // Data Sheet
  const headers = config.columns.map((c) => (c.required ? c.header + " *" : c.header));
  const exampleRow = config.columns.map((c) => c.example);

  const wsData = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = config.columns.map((c) => ({ wch: c.width }));

  // Style header row
  config.columns.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: "22C55E" } },
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
        alignment: { horizontal: "center" },
        border: { bottom: { style: "thin", color: { rgb: "16A34A" } } },
      };
    }
  });

  // Style example row
  config.columns.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 1, c: i });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        fill: { fgColor: { rgb: "FEF3C7" } },
        font: { italic: true, color: { rgb: "92400E" }, sz: 10 },
      };
    }
  });

  XLSX.utils.book_append_sheet(wb, ws, config.sheetName);

  // Instructions Sheet
  const instrData = getInstructions(type, config.columns);
  const instrWs = XLSX.utils.aoa_to_sheet(instrData);
  instrWs["!cols"] = [{ wch: 100 }];

  const titleCell = instrWs["A1"];
  if (titleCell) {
    titleCell.s = { font: { bold: true, sz: 14, color: { rgb: "22C55E" } } };
  }

  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return buf as ArrayBuffer;
}

export function downloadTemplate(type: ImportType) {
  const data = generateTemplate(type);
  const blob = new Blob([new Uint8Array(data as any)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "AG360_" + type + "_template.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}