import type { ParsedRow } from "./import-parsers";
import {
  normalizeCropType,
  isKnownCropType,
  normalizeCategory,
  VALID_CATEGORIES,
} from "./import-parsers";
import type { ImportType } from "./template-generator";

// ─── Types ────────────────────────────────────────────────────────────

export type RowStatus = "valid" | "warning" | "error";

export interface ValidationMessage {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidatedRow {
  rowIndex: number;
  data: Record<string, string | number | null>;
  status: RowStatus;
  messages: ValidationMessage[];
  // For field matching (seeding/harvest/expenses)
  matchedFieldId?: string;
}

export interface ValidationResult {
  rows: ValidatedRow[];
  summary: {
    total: number;
    valid: number;
    warnings: number;
    errors: number;
  };
}

export interface ExistingField {
  id: string;
  field_name: string;
  acres: number | null;
}

// ─── Shared Validators ───────────────────────────────────────────────

function requireField(
  data: Record<string, string | number | null>,
  key: string,
  label: string,
  messages: ValidationMessage[]
): boolean {
  const val = data[key];
  if (val === null || val === undefined || (typeof val === "string" && val.trim() === "")) {
    messages.push({ field: key, message: `${label} is required`, severity: "error" });
    return false;
  }
  return true;
}

function requireNumber(
  data: Record<string, string | number | null>,
  key: string,
  label: string,
  messages: ValidationMessage[],
  options?: { min?: number; max?: number }
): boolean {
  const val = data[key];
  if (val === null || val === undefined) return false; // only check if present
  if (typeof val !== "number") {
    messages.push({ field: key, message: `${label} must be a number`, severity: "error" });
    return false;
  }
  if (options?.min !== undefined && val < options.min) {
    messages.push({ field: key, message: `${label} must be at least ${options.min}`, severity: "error" });
    return false;
  }
  if (options?.max !== undefined && val > options.max) {
    messages.push({ field: key, message: `${label} must be at most ${options.max}`, severity: "error" });
    return false;
  }
  return true;
}

function matchFieldName(
  fieldName: string | null,
  existingFields: ExistingField[],
  messages: ValidationMessage[]
): ExistingField | null {
  if (!fieldName) return null;

  const normalized = fieldName.toString().trim().toLowerCase();
  const match = existingFields.find(
    (f) => f.field_name.trim().toLowerCase() === normalized
  );

  if (!match) {
    messages.push({
      field: "field_name",
      message: `Field "${fieldName}" not found — will be skipped (create it first or check spelling)`,
      severity: "error",
    });
  }

  return match || null;
}

// ─── Fields Validator ─────────────────────────────────────────────────

function validateFieldsRow(
  row: ParsedRow,
  existingFieldNames: Set<string>,
  seenNames: Set<string>
): ValidatedRow {
  const messages: ValidationMessage[] = [];
  const { data } = row;

  // Required
  requireField(data, "field_name", "Field Name", messages);
  const hasAcres = requireField(data, "acres", "Acres", messages);
  if (hasAcres) requireNumber(data, "acres", "Acres", messages, { min: 0.1, max: 100000 });

  // Duplicate check
  const name = data.field_name ? String(data.field_name).trim().toLowerCase() : "";
  if (name && existingFieldNames.has(name)) {
    messages.push({ field: "field_name", message: `Field "${data.field_name}" already exists — will update instead of create`, severity: "warning" });
  }
  if (name && seenNames.has(name)) {
    messages.push({ field: "field_name", message: `Duplicate field name in this file — only the last row will be used`, severity: "warning" });
  }
  if (name) seenNames.add(name);

  // Optional number validations
  if (data.seeded_acres !== null) requireNumber(data, "seeded_acres", "Seeded Acres", messages, { min: 0 });
  if (data.section !== null) requireNumber(data, "section", "Section", messages, { min: 1, max: 36 });
  if (data.township !== null) requireNumber(data, "township", "Township", messages, { min: 1, max: 126 });
  if (data.range !== null) requireNumber(data, "range", "Range", messages, { min: 1, max: 34 });
  if (data.meridian !== null) requireNumber(data, "meridian", "Meridian", messages, { min: 1, max: 6 });
  if (data.latitude !== null) requireNumber(data, "latitude", "Latitude", messages, { min: 45, max: 60 });
  if (data.longitude !== null) requireNumber(data, "longitude", "Longitude", messages, { min: -140, max: -90 });

  // Quarter validation
  if (data.quarter) {
    const q = String(data.quarter).toUpperCase().trim();
    if (!["NW", "NE", "SW", "SE"].includes(q)) {
      messages.push({ field: "quarter", message: `Quarter must be NW, NE, SW, or SE`, severity: "error" });
    }
  }

  // Crop type warning
  if (data.crop_type) {
    const normalized = normalizeCropType(data.crop_type);
    if (normalized && !isKnownCropType(normalized)) {
      messages.push({ field: "crop_type", message: `"${data.crop_type}" is not a standard crop type — will import as-is`, severity: "warning" });
    }
  }

  const hasError = messages.some((m) => m.severity === "error");
  const hasWarning = messages.some((m) => m.severity === "warning");

  return {
    rowIndex: row.rowIndex,
    data: row.data,
    status: hasError ? "error" : hasWarning ? "warning" : "valid",
    messages,
  };
}

// ─── Seeding Validator ────────────────────────────────────────────────

function validateSeedingRow(row: ParsedRow, existingFields: ExistingField[]): ValidatedRow {
  const messages: ValidationMessage[] = [];
  const { data } = row;

  requireField(data, "field_name", "Field Name", messages);
  requireField(data, "crop_type", "Crop Type", messages);

  const match = data.field_name ? matchFieldName(String(data.field_name), existingFields, messages) : null;

  if (data.seeded_acres !== null) requireNumber(data, "seeded_acres", "Seeded Acres", messages, { min: 0 });
  if (data.seed_rate !== null) requireNumber(data, "seed_rate", "Seed Rate", messages, { min: 0 });
  if (data.seed_cost !== null) requireNumber(data, "seed_cost", "Seed Cost", messages, { min: 0 });

  if (data.crop_type) {
    const normalized = normalizeCropType(data.crop_type);
    if (normalized && !isKnownCropType(normalized)) {
      messages.push({ field: "crop_type", message: `"${data.crop_type}" is not a standard crop type`, severity: "warning" });
    }
  }

  const hasError = messages.some((m) => m.severity === "error");
  const hasWarning = messages.some((m) => m.severity === "warning");

  return {
    rowIndex: row.rowIndex,
    data: row.data,
    status: hasError ? "error" : hasWarning ? "warning" : "valid",
    messages,
    matchedFieldId: match?.id,
  };
}

// ─── Harvest Validator ────────────────────────────────────────────────

function validateHarvestRow(row: ParsedRow, existingFields: ExistingField[]): ValidatedRow {
  const messages: ValidationMessage[] = [];
  const { data } = row;

  requireField(data, "field_name", "Field Name", messages);
  requireField(data, "crop_type", "Crop Type", messages);
  const hasBu = requireField(data, "bushels", "Bushels", messages);
  if (hasBu) requireNumber(data, "bushels", "Bushels", messages, { min: 0 });

  const match = data.field_name ? matchFieldName(String(data.field_name), existingFields, messages) : null;

  if (data.moisture !== null) requireNumber(data, "moisture", "Moisture", messages, { min: 0, max: 50 });

  if (data.crop_type) {
    const normalized = normalizeCropType(data.crop_type);
    if (normalized && !isKnownCropType(normalized)) {
      messages.push({ field: "crop_type", message: `"${data.crop_type}" is not a standard crop type`, severity: "warning" });
    }
  }

  const hasError = messages.some((m) => m.severity === "error");
  const hasWarning = messages.some((m) => m.severity === "warning");

  return {
    rowIndex: row.rowIndex,
    data: row.data,
    status: hasError ? "error" : hasWarning ? "warning" : "valid",
    messages,
    matchedFieldId: match?.id,
  };
}

// ─── Expenses Validator ───────────────────────────────────────────────

function validateExpensesRow(row: ParsedRow, existingFields: ExistingField[]): ValidatedRow {
  const messages: ValidationMessage[] = [];
  const { data } = row;

  requireField(data, "field_name", "Field Name", messages);
  requireField(data, "category", "Category", messages);
  const hasAmt = requireField(data, "amount", "Amount", messages);
  if (hasAmt) requireNumber(data, "amount", "Amount", messages, { min: 0 });

  const match = data.field_name ? matchFieldName(String(data.field_name), existingFields, messages) : null;

  if (data.category) {
    const normalized = normalizeCategory(data.category);
    if (normalized && !VALID_CATEGORIES.includes(normalized)) {
      messages.push({ field: "category", message: `"${data.category}" is not a recognized category — will import as "other"`, severity: "warning" });
    }
  }

  const hasError = messages.some((m) => m.severity === "error");
  const hasWarning = messages.some((m) => m.severity === "warning");

  return {
    rowIndex: row.rowIndex,
    data: row.data,
    status: hasError ? "error" : hasWarning ? "warning" : "valid",
    messages,
    matchedFieldId: match?.id,
  };
}

// ─── Main Validate Function ──────────────────────────────────────────

export function validateRows(
  parsedRows: ParsedRow[],
  type: ImportType,
  existingFields: ExistingField[] = [],
  existingFieldNames: Set<string> = new Set()
): ValidationResult {
  const seenNames = new Set<string>();

  const rows = parsedRows.map((row) => {
    switch (type) {
      case "fields":
        return validateFieldsRow(row, existingFieldNames, seenNames);
      case "seeding":
        return validateSeedingRow(row, existingFields);
      case "harvest":
        return validateHarvestRow(row, existingFields);
      case "expenses":
        return validateExpensesRow(row, existingFields);
    }
  });

  return {
    rows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => r.status === "valid").length,
      warnings: rows.filter((r) => r.status === "warning").length,
      errors: rows.filter((r) => r.status === "error").length,
    },
  };
}