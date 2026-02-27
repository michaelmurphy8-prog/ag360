export const CROP_COLORS: Record<string, string> = {
  canola: "#F5A623",
  "cwrs wheat": "#D4513D",
  wheat: "#D4513D",
  durum: "#D97706",
  barley: "#2DABB1",
  peas: "#4A7C59",
  lentils: "#C96B3C",
  oats: "#5B7BA5",
  flax: "#8B5BA5",
  soybeans: "#7A8A3C",
  corn: "#E8D44D",
};

// Consistent order for legends and donuts
export const CROP_ORDER = [
  "canola", "cwrs wheat", "wheat", "durum", "barley",
  "peas", "lentils", "oats", "flax", "soybeans", "corn",
];

export function getCropColor(crop: string): string {
  return CROP_COLORS[crop.toLowerCase()] || "#6B7280";
}

// Bushel to metric tonne conversion factors (bu per MT)
export const BU_PER_MT: Record<string, number> = {
  canola: 44.092,
  "cwrs wheat": 36.744,
  wheat: 36.744,
  durum: 36.744,
  barley: 45.93,
  peas: 36.744,
  lentils: 36.744,
  oats: 64.842,
  flax: 39.368,
  soybeans: 36.744,
  corn: 39.368,
};

export function buToMt(bu: number, crop: string): number {
  const factor = BU_PER_MT[crop.toLowerCase()] || 36.744;
  return Math.round((bu / factor) * 100) / 100;
}

export function mtToBu(mt: number, crop: string): number {
  const factor = BU_PER_MT[crop.toLowerCase()] || 36.744;
  return Math.round(mt * factor);
}