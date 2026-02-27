// lib/crop-colors.ts
// Platform-wide source of truth for crop names, colors, and conversions

export const CROP_COLORS: Record<string, string> = {
  "hrs wheat": "#D4513D",
  "durum": "#B45309",        // Darkened from #D97706 to separate from Canola
  "canola": "#F5A623",
  "barley": "#2DABB1",
  "oats": "#5B7BA5",
  "flax": "#8B5BA5",
  "large green lentils": "#8B6914",
  "small green lentils": "#6B8E23",
  "small red lentils": "#C94C4C",
  "peas": "#4A7C59",
  "chickpeas": "#D4A76A",
  "mustard": "#E4C94C",
  // Legacy aliases — kept for backward compatibility with existing data
  "cwrs wheat": "#D4513D",
  "wheat": "#D4513D",
  "lentils": "#8B6914",      // Maps to Large Green as default
  "soybeans": "#7A8A3C",
  "corn": "#E8D44D",
};

// Canonical crop list — use this for dropdowns, forms, and validation
export const CANONICAL_CROPS = [
  "HRS Wheat",
  "Durum",
  "Canola",
  "Barley",
  "Oats",
  "Flax",
  "Large Green Lentils",
  "Small Green Lentils",
  "Small Red Lentils",
  "Peas",
  "Chickpeas",
  "Mustard",
];

// Consistent order for legends and donuts
export const CROP_ORDER = [
  "hrs wheat", "durum", "canola", "barley", "oats", "flax",
  "large green lentils", "small green lentils", "small red lentils",
  "peas", "chickpeas", "mustard",
];

export function getCropColor(crop: string): string {
  return CROP_COLORS[crop.toLowerCase()] || "#6B7280";
}

// Bushel to metric tonne conversion factors (bu per MT)
export const BU_PER_MT: Record<string, number> = {
  "hrs wheat": 36.744,
  "durum": 36.744,
  "canola": 44.092,
  "barley": 45.93,
  "oats": 64.842,
  "flax": 39.368,
  "large green lentils": 36.744,
  "small green lentils": 36.744,
  "small red lentils": 36.744,
  "peas": 36.744,
  "chickpeas": 36.744,
  "mustard": 44.092,
  // Legacy aliases
  "cwrs wheat": 36.744,
  "wheat": 36.744,
  "lentils": 36.744,
  "soybeans": 36.744,
  "corn": 39.368,
};

export function buToMt(bu: number, crop: string): number {
  const factor = BU_PER_MT[crop.toLowerCase()] || 36.744;
  return Math.round((bu / factor) * 100) / 100;
}

export function mtToBu(mt: number, crop: string): number {
  const factor = BU_PER_MT[crop.toLowerCase()] || 36.744;
  return Math.round(mt * factor);
}