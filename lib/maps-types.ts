// lib/maps-types.ts
// Shared types, constants, and helpers for Maps Command Center

/* ───── Types ──────────────────────────────────────────── */
export interface FieldRow {
  id: string; field_name: string; acres: number;
  lld_quarter: string; lld_section: number; lld_township: number;
  lld_range: number; lld_meridian: number; lld_province: string;
  crop_id: string | null; crop_year: number | null; crop_type: string | null;
  variety: string | null; seeded_acres: number | null;
  expected_yield_bu_ac: number | null; crop_status: string | null;
  budget_total: number; actual_total: number;
  budget_revenue: number; actual_revenue: number;
  boundary: any | null; boundary_acres: number | null;
}

export interface KPIs {
  totalFields: number; totalAcres: number; seededAcres: number;
  seededCount: number; unseededCount: number;
  totalBudgetCost: number; totalActualCost: number;
  totalBudgetRevenue: number; totalActualRevenue: number;
  costVariance: number; avgCostPerAcre: number;
  netMarginActual: number; netMarginBudget: number;
}

export interface FieldWithCoords extends FieldRow {
  latitude: number; longitude: number;
}

export interface YardMarker {
  id: string; yard_name: string; latitude: number; longitude: number;
  bin_count: number; total_capacity_bu: number; total_stored_bu: number;
}

export interface WeatherPoint {
  latitude: number; longitude: number; temperature: number;
  windspeed: number; precipitation: number;
}

export type ColorMode = "crop" | "status" | "margin" | "budget";
export type MapStyleKey = "satellite" | "dark" | "terrain";

/* ───── Constants ──────────────────────────────────────── */
export const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa",
};

export const STATUS_COLORS: Record<string, string> = {
  planned: "#94A3B8", seeded: "#60A5FA", growing: "#4ADE80", harvested: "#FBBF24",
};

export const MAP_STYLES: Record<MapStyleKey, string> = {
  satellite: "mapbox://styles/mapbox/satellite-streets-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
};

/* ───── Formatters ─────────────────────────────────────── */
export function fmt(n: number) {
  return n.toLocaleString("en-CA", { maximumFractionDigits: 0 });
}

export function fmtD(n: number) {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ───── Color helpers ──────────────────────────────────── */
export function getFieldColor(f: FieldWithCoords, mode: ColorMode): string {
  if (mode === "crop") return f.crop_type ? CROP_COLORS[f.crop_type] || "#9ca3af" : "#475569";
  if (mode === "status") return STATUS_COLORS[f.crop_status || "planned"] || "#94A3B8";
  if (mode === "margin") {
    const m = (parseFloat(String(f.actual_revenue)) || 0) - (parseFloat(String(f.actual_total)) || 0);
    return m > 50000 ? "#22c55e" : m > 20000 ? "#4ade80" : m > 0 ? "#86efac" : m > -10000 ? "#fbbf24" : "#ef4444";
  }
  const act = parseFloat(String(f.actual_total)) || 0;
  const bud = parseFloat(String(f.budget_total)) || 1;
  const pct = (act / bud) * 100;
  return pct <= 75 ? "#22c55e" : pct <= 90 ? "#4ade80" : pct <= 100 ? "#fbbf24" : "#ef4444";
}

/* ───── Geometry helpers ───────────────────────────────── */
export function getBoundaryCentroid(boundary: any): { lng: number; lat: number } | null {
  if (!boundary?.geometry?.coordinates?.[0]) return null;
  const coords = boundary.geometry.coordinates[0];
  let sumLng = 0, sumLat = 0;
  for (const c of coords) { sumLng += c[0]; sumLat += c[1]; }
  return { lng: sumLng / coords.length, lat: sumLat / coords.length };
}

export function getFieldPosition(field: FieldWithCoords): { lng: number; lat: number } {
  const centroid = getBoundaryCentroid(field.boundary);
  return centroid || { lng: field.longitude, lat: field.latitude };
}

export function getFieldMargin(field: FieldWithCoords): number {
  return (parseFloat(String(field.actual_revenue)) || 0) - (parseFloat(String(field.actual_total)) || 0);
}