// ─── Types ────────────────────────────────────────────────────────────────────

export type SoilZone = 'Brown' | 'DarkBrown' | 'Black' | 'GreyWooded' | 'Peace' | 'Irrigated'

export type ZoneData = {
  yield: string
  price: string
  rev: string
  N: number
  P: number
  S: number
  K: number
  beY: string
  beP: string
}

export type Crop = {
  name: string
  cat: 'Cereal' | 'Oilseed' | 'Pulse'
  prov: string[]
  zones: Partial<Record<SoilZone, ZoneData>>
  rot: string
  insects: string[]
  diseases: string[]
  dNotes: string
  wNotes: string
  timings: string
  src: string
}

export type SprayProduct = {
  name: string
  rate: string
  grp: string
  notes: string
}

export type SprayRate = {
  pest: string
  crop: string
  products: SprayProduct[]
  src: string
}

export type InputCosts = {
  // Variable
  seed: number
  fert: number
  chem: number
  ins: number
  truck: number
  fuel: number
  mRep: number
  bRep: number
  cust: number
  lab: number
  util: number
  opInt: number
  // Fixed
  rent: number
  lic: number
  dep: number
  capInt: number
}

export type HerbicidePass = {
  pass: number
  label: string
  timing: string
  products: string
  targetWeeds: string
  crops: string
  notes: string
}

export type CommodityOutlook = {
  crop: string
  range10yr: string
  forecast5yr: string
  rating: string
  direction: '↑' | '↔' | '↗'
}

// ─── Province Source Routing ──────────────────────────────────────────────────

export const PROV_SOURCES: Record<string, { crop: string; prot: string; nutr: string }> = {
  AB: {
    crop: 'AB Cropping Alternatives 2025 (AgriProfit$)',
    prot: 'AB Crop Protection Guide 2025 (Alberta Grains)',
    nutr: 'AB Nutrient Management Planning Guide',
  },
  SK: {
    crop: 'SK Crop Planning Guide 2026 (SK Min. of Agriculture)',
    prot: 'SK Guide to Crop Protection 2025',
    nutr: 'SK Crop Planning Guide 2026',
  },
  MB: {
    crop: 'SK Crop Planning Guide 2026 (shared prairie data)',
    prot: 'MB Guide to Crop Protection 2025',
    nutr: 'SK Crop Planning Guide 2026 (shared prairie data)',
  },
}

// ─── Soil Zones by Province ───────────────────────────────────────────────────

export const ZONES_BY_PROVINCE: Record<string, SoilZone[]> = {
  AB: ['Brown', 'DarkBrown', 'Black', 'GreyWooded', 'Peace', 'Irrigated'],
  SK: ['Brown', 'DarkBrown', 'Black'],
  MB: ['Brown', 'DarkBrown', 'Black', 'GreyWooded'],
}

export const ZONE_LABELS: Record<SoilZone, string> = {
  Brown: 'Brown',
  DarkBrown: 'Dark Brown',
  Black: 'Black',
  GreyWooded: 'Grey-Wooded',
  Peace: 'Peace',
  Irrigated: 'Irrigated',
}

// ─── Crop Data ────────────────────────────────────────────────────────────────

export const CROPS: Crop[] = [
  {
    name: 'HRS Wheat', cat: 'Cereal', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '40 bu/ac', price: '$7.76', rev: '$310/ac', N: 50, P: 20, S: 0, K: 5, beY: '57 bu', beP: '$11.03' },
      DarkBrown: { yield: '44 bu/ac', price: '$7.76', rev: '$341/ac', N: 60, P: 25, S: 0, K: 5, beY: '56 bu', beP: '$9.79' },
      Black: { yield: '65 bu/ac', price: '$7.62', rev: '$495/ac', N: 80, P: 30, S: 0, K: 10, beY: '82 bu', beP: '$9.51' },
      GreyWooded: { yield: '58 bu/ac', price: '$7.62', rev: '$442/ac', N: 80, P: 25, S: 0, K: 10, beY: '75 bu', beP: '$9.80' },
      Peace: { yield: '56 bu/ac', price: '$7.62', rev: '$427/ac', N: 70, P: 25, S: 0, K: 5, beY: '68 bu', beP: '$9.22' },
      Irrigated: { yield: '96 bu/ac', price: '$7.76', rev: '$745/ac', N: 100, P: 40, S: 0, K: 5, beY: '129 bu', beP: '$10.42' },
    },
    rot: 'Break cereals to decompose residue. Avoid back-to-back wheat.',
    insects: ['Wheat midge', 'Cutworms', 'Aphids', 'Grasshoppers', 'Armyworms', 'Sawfly', 'Wireworms'],
    diseases: ['FHB', 'Leaf spot', 'Stripe rust', 'Leaf rust', 'Stem rust'],
    dNotes: 'Fungicide at FHB timing (early anthesis). Additional leaf disease spray if high pressure.',
    wNotes: 'Many herbicide options. Layering pre-seed burnoff + in-crop recommended.',
    timings: 'Pre-harv, Pre-seed, Soil, In-crop',
    src: 'AB Cropping Alt 2025; SK CPG 2026',
  },
  {
    name: 'CPS Wheat', cat: 'Cereal', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '42 bu/ac', price: '$7.35', rev: '$309/ac', N: 50, P: 20, S: 0, K: 5, beY: '60 bu', beP: '$10.38' },
      Black: { yield: '72 bu/ac', price: '$7.35', rev: '$529/ac', N: 80, P: 30, S: 0, K: 10, beY: '86 bu', beP: '$8.70' },
      GreyWooded: { yield: '70 bu/ac', price: '$7.35', rev: '$515/ac', N: 80, P: 25, S: 0, K: 10, beY: '78 bu', beP: '$8.14' },
      Peace: { yield: '65 bu/ac', price: '$7.35', rev: '$478/ac', N: 70, P: 25, S: 0, K: 5, beY: '71 bu', beP: '$8.03' },
    },
    rot: 'Break cereals. Diverse rotations preferred.',
    insects: ['Wheat midge', 'Cutworms', 'Aphids', 'Grasshoppers'],
    diseases: ['FHB', 'Leaf diseases'],
    dNotes: 'Single fungicide included at heading.',
    wNotes: 'Many herbicide options available.',
    timings: 'Pre-seed, In-crop',
    src: 'AB Cropping Alt 2025',
  },
  {
    name: 'Durum Wheat', cat: 'Cereal', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '42 bu/ac', price: '$8.71', rev: '$366/ac', N: 50, P: 20, S: 0, K: 5, beY: '52 bu', beP: '$10.62' },
      DarkBrown: { yield: '41 bu/ac', price: '$8.71', rev: '$357/ac', N: 60, P: 25, S: 0, K: 5, beY: '51 bu', beP: '$10.72' },
    },
    rot: 'Midge tolerant varieties recommended. Avoid back-to-back durum.',
    insects: ['Wheat midge', 'Cutworms', 'Aphids', 'Grasshoppers', 'Sawfly'],
    diseases: ['FHB', 'Leaf diseases'],
    dNotes: 'Single fungicide. Midge tolerant blends available.',
    wNotes: 'Fewer soil-applied options than CWRS.',
    timings: 'Pre-harv, Pre-seed, In-crop',
    src: 'AB Cropping Alt 2025; SK CPG 2026',
  },
  {
    name: 'Feed Barley', cat: 'Cereal', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '52 bu/ac', price: '$5.56', rev: '$289/ac', N: 60, P: 25, S: 0, K: 5, beY: '72 bu', beP: '$7.67' },
      DarkBrown: { yield: '63 bu/ac', price: '$5.56', rev: '$350/ac', N: 70, P: 25, S: 0, K: 5, beY: '73 bu', beP: '$6.41' },
      Black: { yield: '85 bu/ac', price: '$5.56', rev: '$473/ac', N: 80, P: 30, S: 0, K: 10, beY: '101 bu', beP: '$6.57' },
      GreyWooded: { yield: '78 bu/ac', price: '$5.56', rev: '$434/ac', N: 80, P: 30, S: 0, K: 10, beY: '95 bu', beP: '$6.72' },
      Peace: { yield: '76 bu/ac', price: '$5.56', rev: '$423/ac', N: 70, P: 25, S: 0, K: 5, beY: '87 bu', beP: '$6.33' },
    },
    rot: 'Competitive crop — suppresses weeds naturally.',
    insects: ['Cutworms', 'Aphids', 'Thrips', 'Grasshoppers', 'Armyworm', 'Wireworms'],
    diseases: ['FHB', 'Net blotch', 'Spot blotch'],
    dNotes: 'Fungicide based on field history and disease pressure.',
    wNotes: 'Competitive crop — can reduce herbicide applications.',
    timings: 'Pre-harv, Pre-seed, In-crop',
    src: 'AB Cropping Alt 2025; SK CPG 2026',
  },
  {
    name: 'Malt Barley', cat: 'Cereal', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '53 bu/ac', price: '$5.90', rev: '$313/ac', N: 50, P: 30, S: 10, K: 10, beY: '75 bu', beP: '$8.29' },
      DarkBrown: { yield: '63 bu/ac', price: '$5.90', rev: '$372/ac', N: 60, P: 30, S: 10, K: 15, beY: '77 bu', beP: '$7.20' },
      Black: { yield: '83 bu/ac', price: '$5.90', rev: '$490/ac', N: 70, P: 30, S: 10, K: 20, beY: '107 bu', beP: '$7.58' },
    },
    rot: 'Diverse rotations. Competitive crop.',
    insects: ['Cutworms', 'Aphids', 'Thrips', 'Grasshoppers', 'Armyworm'],
    diseases: ['FHB', 'Leaf diseases'],
    dNotes: 'Single fungicide included. Secure malt contract before seeding.',
    wNotes: 'Soil-applied for Group 1 resistant wild oats.',
    timings: 'Pre-harv, Pre-seed, Soil, In-crop',
    src: 'AB Cropping Alt 2025',
  },
  {
    name: 'Milling Oats', cat: 'Cereal', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '58 bu/ac', price: '$4.65', rev: '$270/ac', N: 50, P: 20, S: 0, K: 0, beY: '85 bu', beP: '$6.80' },
      DarkBrown: { yield: '75 bu/ac', price: '$4.65', rev: '$349/ac', N: 55, P: 20, S: 0, K: 0, beY: '83 bu', beP: '$5.13' },
      Black: { yield: '98 bu/ac', price: '$4.65', rev: '$456/ac', N: 70, P: 30, S: 0, K: 0, beY: '123 bu', beP: '$5.80' },
      GreyWooded: { yield: '94 bu/ac', price: '$4.65', rev: '$437/ac', N: 75, P: 25, S: 0, K: 0, beY: '114 bu', beP: '$5.64' },
      Peace: { yield: '99 bu/ac', price: '$4.65', rev: '$460/ac', N: 65, P: 20, S: 0, K: 0, beY: '105 bu', beP: '$4.91' },
    },
    rot: 'Very competitive — suppresses weeds. Good break crop.',
    insects: ['Cutworms', 'Aphids', 'Grasshoppers', 'Armyworm'],
    diseases: ['Crown rust', 'Leaf diseases'],
    dNotes: 'Some milling buyers prohibit pre-harvest glyphosate — check contract.',
    wNotes: 'Wild oats CANNOT be controlled in tame oats. Plan rotation accordingly.',
    timings: 'Pre-harv, Pre-seed, In-crop',
    src: 'AB Cropping Alt 2025',
  },
  {
    name: 'Canola', cat: 'Oilseed', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '30 bu/ac', price: '$13.04', rev: '$391/ac', N: 65, P: 25, S: 10, K: 10, beY: '39 bu', beP: '$16.69' },
      DarkBrown: { yield: '35 bu/ac', price: '$13.04', rev: '$456/ac', N: 75, P: 30, S: 15, K: 10, beY: '40 bu', beP: '$14.81' },
      Black: { yield: '46 bu/ac', price: '$13.04', rev: '$600/ac', N: 100, P: 40, S: 20, K: 15, beY: '53 bu', beP: '$14.78' },
      GreyWooded: { yield: '44 bu/ac', price: '$13.04', rev: '$574/ac', N: 100, P: 40, S: 20, K: 25, beY: '52 bu', beP: '$15.36' },
      Peace: { yield: '40 bu/ac', price: '$13.04', rev: '$522/ac', N: 85, P: 30, S: 15, K: 20, beY: '47 bu', beP: '$15.04' },
      Irrigated: { yield: '58 bu/ac', price: '$13.04', rev: '$756/ac', N: 110, P: 50, S: 20, K: 5, beY: '81 bu', beP: '$18.00' },
    },
    rot: '3-4 year rotation minimum. Critical for clubroot and blackleg management.',
    insects: ['Flea beetles', 'Cutworms', 'Lygus bugs', 'Seedpod weevil', 'Diamondback moth', 'Bertha armyworm', 'Grasshoppers'],
    diseases: ['Sclerotinia', 'Blackleg', 'Alternaria', 'Clubroot'],
    dNotes: 'Fungicide for sclerotinia at 20-50% bloom based on disease risk checklist.',
    wNotes: 'HT system dependent. Soil-active products for cleavers control.',
    timings: 'Pre-harv, Pre-seed, Soil, In-crop ×2, Desiccation',
    src: 'AB Cropping Alt 2025; SK CPG 2026',
  },
  {
    name: 'Field Peas', cat: 'Pulse', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '45 bu/ac', price: '$8.98', rev: '$404/ac', N: 5, P: 20, S: 0, K: 10, beY: '50 bu', beP: '$9.80' },
      DarkBrown: { yield: '48 bu/ac', price: '$8.98', rev: '$431/ac', N: 5, P: 20, S: 0, K: 10, beY: '50 bu', beP: '$9.24' },
      Black: { yield: '56 bu/ac', price: '$8.98', rev: '$503/ac', N: 5, P: 30, S: 0, K: 15, beY: '71 bu', beP: '$11.32' },
      GreyWooded: { yield: '50 bu/ac', price: '$8.98', rev: '$449/ac', N: 5, P: 25, S: 0, K: 15, beY: '65 bu', beP: '$11.56' },
      Peace: { yield: '50 bu/ac', price: '$8.98', rev: '$449/ac', N: 5, P: 20, S: 0, K: 15, beY: '58 bu', beP: '$10.28' },
    },
    rot: 'Extended rotations critical for aphanomyces root rot management.',
    insects: ['Wireworms', 'Cutworms', 'Lygus bugs', 'Pea aphid', 'Grasshoppers', 'Pea leaf weevil'],
    diseases: ['Mycosphaerella', 'Ascochyta', 'Aphanomyces root rot', 'White mould'],
    dNotes: 'Single fungicide for mycosphaerella. Apply based on disease risk at flowering.',
    wNotes: 'Control weeds 10-14 days after emergence. Limited in-crop options.',
    timings: 'Pre-harv, Pre-seed, Soil, In-crop, Desiccation',
    src: 'AB Cropping Alt 2025; SK CPG 2026',
  },
  {
    name: 'Red Lentils', cat: 'Pulse', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '28 bu/ac', price: '$0.30/lb', rev: '$336/ac', N: 5, P: 20, S: 0, K: 10, beY: '33 bu', beP: '$0.37/lb' },
      DarkBrown: { yield: '30 bu/ac', price: '$0.30/lb', rev: '$360/ac', N: 5, P: 20, S: 0, K: 10, beY: '33 bu', beP: '$0.34/lb' },
    },
    rot: 'Avoid lentil-on-lentil. Minimum 3-year rotation.',
    insects: ['Cutworms', 'Lygus bugs', 'Pea aphid', 'Grasshoppers'],
    diseases: ['Ascochyta', 'Stemphylium', 'Botrytis grey mould', 'Sclerotinia'],
    dNotes: 'Fungicide based on ascochyta risk. Two applications may be needed in high pressure years.',
    wNotes: 'Very limited herbicide options. Clean fields critical. Pre-seed burnoff essential.',
    timings: 'Pre-seed, In-crop, Desiccation',
    src: 'SK CPG 2026',
  },
  {
    name: 'Small Red Lentils', cat: 'Pulse', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '25 bu/ac', price: '$0.28/lb', rev: '$308/ac', N: 5, P: 20, S: 0, K: 10, beY: '31 bu', beP: '$0.35/lb' },
      DarkBrown: { yield: '28 bu/ac', price: '$0.28/lb', rev: '$338/ac', N: 5, P: 20, S: 0, K: 10, beY: '32 bu', beP: '$0.32/lb' },
    },
    rot: 'Minimum 3-year rotation. Avoid lentil-on-lentil.',
    insects: ['Cutworms', 'Lygus bugs', 'Pea aphid', 'Grasshoppers'],
    diseases: ['Ascochyta', 'Stemphylium', 'Botrytis grey mould', 'Sclerotinia'],
    dNotes: 'Fungicide based on ascochyta risk. Two applications may be needed in high pressure years.',
    wNotes: 'Very limited herbicide options. Clean fields critical. Pre-seed burnoff essential.',
    timings: 'Pre-seed, In-crop, Desiccation',
    src: 'SK CPG 2026',
  },
  {
    name: 'Large Green Lentils', cat: 'Pulse', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '26 bu/ac', price: '$0.32/lb', rev: '$358/ac', N: 5, P: 20, S: 0, K: 10, beY: '30 bu', beP: '$0.36/lb' },
      DarkBrown: { yield: '30 bu/ac', price: '$0.32/lb', rev: '$413/ac', N: 5, P: 20, S: 0, K: 10, beY: '32 bu', beP: '$0.33/lb' },
      Black: { yield: '32 bu/ac', price: '$0.32/lb', rev: '$440/ac', N: 5, P: 25, S: 0, K: 10, beY: '36 bu', beP: '$0.33/lb' },
    },
    rot: 'Minimum 3-year rotation. Susceptible to same diseases as red lentils.',
    insects: ['Cutworms', 'Lygus bugs', 'Pea aphid', 'Grasshoppers'],
    diseases: ['Ascochyta', 'Stemphylium', 'Botrytis grey mould', 'Sclerotinia'],
    dNotes: 'Similar disease package to red lentils. Fungicide timing critical at early flower.',
    wNotes: 'Very limited herbicide options. Pre-seed burnoff and clean seedbed essential.',
    timings: 'Pre-seed, In-crop, Desiccation',
    src: 'SK CPG 2026',
  },
  {
    name: 'Yellow Peas', cat: 'Pulse', prov: ['SK', 'MB', 'AB'],
    zones: {
      Brown: { yield: '42 bu/ac', price: '$8.50', rev: '$357/ac', N: 5, P: 20, S: 0, K: 10, beY: '48 bu', beP: '$9.60' },
      DarkBrown: { yield: '46 bu/ac', price: '$8.50', rev: '$391/ac', N: 5, P: 20, S: 0, K: 10, beY: '48 bu', beP: '$8.90' },
      Black: { yield: '54 bu/ac', price: '$8.50', rev: '$459/ac', N: 5, P: 30, S: 0, K: 15, beY: '68 bu', beP: '$10.90' },
      Peace: { yield: '48 bu/ac', price: '$8.50', rev: '$408/ac', N: 5, P: 20, S: 0, K: 15, beY: '56 bu', beP: '$9.90' },
    },
    rot: 'Extended rotations for aphanomyces. Same rotation considerations as field peas.',
    insects: ['Wireworms', 'Cutworms', 'Lygus bugs', 'Pea aphid', 'Grasshoppers', 'Pea leaf weevil'],
    diseases: ['Mycosphaerella', 'Ascochyta', 'Aphanomyces root rot', 'White mould'],
    dNotes: 'Same disease management as field peas. Fungicide at early flower for mycosphaerella.',
    wNotes: 'Control weeds 10-14 days after emergence. Limited in-crop options.',
    timings: 'Pre-harv, Pre-seed, Soil, In-crop, Desiccation',
    src: 'SK CPG 2026; AB Cropping Alt 2025',
  },
  {
    name: 'Chickpeas', cat: 'Pulse', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '28 bu/ac', price: '$0.38/lb', rev: '$570/ac', N: 5, P: 20, S: 0, K: 10, beY: '30 bu', beP: '$0.40/lb' },
      DarkBrown: { yield: '30 bu/ac', price: '$0.38/lb', rev: '$611/ac', N: 5, P: 20, S: 0, K: 10, beY: '31 bu', beP: '$0.38/lb' },
    },
    rot: '4+ year rotation. Sensitive to wet conditions and heavy soils.',
    insects: ['Cutworms', 'Lygus bugs', 'Grasshoppers'],
    diseases: ['Ascochyta', 'Botrytis grey mould', 'Sclerotinia'],
    dNotes: 'Fungicide critical for ascochyta. Multiple applications often needed in wet years.',
    wNotes: 'Very limited herbicide options. Weed-free seedbed essential.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026; AB Cropping Alt 2025',
  },
  {
    name: 'Flax', cat: 'Oilseed', prov: ['SK', 'MB', 'AB'],
    zones: {
      DarkBrown: { yield: '22 bu/ac', price: '$15.50', rev: '$341/ac', N: 50, P: 20, S: 10, K: 5, beY: '26 bu', beP: '$18.00' },
      Black: { yield: '28 bu/ac', price: '$15.50', rev: '$434/ac', N: 60, P: 25, S: 10, K: 5, beY: '31 bu', beP: '$16.46' },
    },
    rot: 'Avoid flax-on-flax. 4+ year rotation for aster yellows management.',
    insects: ['Cutworms', 'Grasshoppers', 'Aphids', 'Flea beetles'],
    diseases: ['Pasmo', 'Aster yellows', 'Powdery mildew'],
    dNotes: 'No consistent fungicide recommendation. Monitor for pasmo.',
    wNotes: 'Very limited herbicide options. Few Group 1 options registered.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026',
  },
  {
    name: 'Yellow Mustard', cat: 'Oilseed', prov: ['SK', 'AB'],
    zones: {
      Brown: { yield: '22 bu/ac', price: '$0.38/lb', rev: '$380/ac', N: 50, P: 20, S: 10, K: 5, beY: '26 bu', beP: '$0.44/lb' },
      DarkBrown: { yield: '25 bu/ac', price: '$0.38/lb', rev: '$432/ac', N: 55, P: 20, S: 10, K: 5, beY: '28 bu', beP: '$0.41/lb' },
    },
    rot: 'Avoid brassica-on-brassica. Minimum 3-year break.',
    insects: ['Flea beetles', 'Cutworms', 'Diamondback moth', 'Lygus bugs'],
    diseases: ['Sclerotinia', 'Alternaria', 'White rust'],
    dNotes: 'Fungicide for sclerotinia at flowering if risk conditions met.',
    wNotes: 'Fewer herbicide options than canola. Pre-seed burnoff critical.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026; AB Cropping Alt 2025',
  },
  {
    name: 'Faba Beans', cat: 'Pulse', prov: ['SK'],
    zones: {
      Black: { yield: '55 bu/ac', price: '$9.50', rev: '$523/ac', N: 5, P: 30, S: 0, K: 20, beY: '65 bu', beP: '$11.09' },
    },
    rot: 'Excellent nitrogen fixer. 4+ year rotation.',
    insects: ['Cutworms', 'Pea aphid', 'Lygus bugs'],
    diseases: ['Ascochyta', 'Botrytis', 'Sclerotinia'],
    dNotes: 'Fungicide at flowering for botrytis/sclerotinia based on risk.',
    wNotes: 'Limited herbicide options. Competitive at canopy closure.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026',
  },
  {
    name: 'Soybeans', cat: 'Pulse', prov: ['MB'],
    zones: {
      Black: { yield: '35 bu/ac', price: '$13.00', rev: '$455/ac', N: 5, P: 30, S: 0, K: 20, beY: '42 bu', beP: '$15.29' },
    },
    rot: 'Inoculant critical. 3+ year rotation.',
    insects: ['Soybean aphid', 'Cutworms', 'Grasshoppers'],
    diseases: ['Sclerotinia', 'Phytophthora root rot', 'White mould'],
    dNotes: 'Fungicide based on sclerotinia pressure at R1-R3 growth stage.',
    wNotes: 'Roundup Ready system standard. Pre-emerge options available.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026 (shared prairie data)',
  },
  {
    name: 'Sunflower', cat: 'Oilseed', prov: ['MB'],
    zones: {
      Black: { yield: '1400 lb/ac', price: '$0.22/lb', rev: '$308/ac', N: 80, P: 35, S: 0, K: 20, beY: '1600 lb', beP: '$0.26/lb' },
    },
    rot: '4+ year rotation. Avoid fields with volunteer sunflower issues.',
    insects: ['Sunflower beetle', 'Cutworms', 'Lygus bugs', 'Sunflower moth'],
    diseases: ['Sclerotinia', 'Downy mildew', 'Verticillium'],
    dNotes: 'Fungicide for sclerotinia at R3-R5. Downy mildew seed treatment critical.',
    wNotes: 'Limited in-crop options. Pre-emerge soil-applied products key.',
    timings: 'Pre-seed, In-crop',
    src: 'SK CPG 2026 (shared prairie data)',
  },
  {
    name: 'Dry Beans', cat: 'Pulse', prov: ['AB'],
    zones: {
      Irrigated: { yield: '2200 lb/ac', price: '$0.40/lb', rev: '$880/ac', N: 5, P: 30, S: 0, K: 15, beY: '2500 lb', beP: '$0.46/lb' },
    },
    rot: '3-4 year rotation. Irrigation management critical.',
    insects: ['Mexican bean beetle', 'Cutworms', 'Lygus bugs'],
    diseases: ['White mould', 'Anthracnose', 'Common bacterial blight'],
    dNotes: 'Fungicide for white mould at flowering. Multiple passes may be needed.',
    wNotes: 'Limited options. Inter-row cultivation used in some systems.',
    timings: 'Pre-seed, In-crop',
    src: 'AB Cropping Alt 2025',
  },
]

// ─── Spray Rate Data ──────────────────────────────────────────────────────────

export const SPRAY_RATES: SprayRate[] = [
  {
    pest: 'Cutworms', crop: 'All crops',
    products: [
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: 'Apply evening when cutworms are active. 25-30% plant damage = threshold.' },
      { name: 'Decis 100 EC', rate: '20-30 mL/ac', grp: '3A (Pyrethroid)', notes: 'Ground or aerial. Check for cutworm presence before applying.' },
      { name: 'Lorsban 4E (chlorpyrifos)', rate: '580-1160 mL/ac', grp: '1B (OP)', notes: 'Soil drench for below-ground species. Check provincial registration.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Cutworm Charts',
  },
  {
    pest: 'Grasshoppers', crop: 'All crops',
    products: [
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: '8-12 hoppers/m² at field edge = threshold. Treat borders first.' },
      { name: 'Malathion 85E', rate: '405-544 mL/ac', grp: '1B (OP)', notes: 'Ground or aerial. Short residual — monitor for re-entry.' },
      { name: 'Carbamalt (carbaryl)', rate: 'Per label', grp: '1A (Carbamate)', notes: 'Bait formulation available for rangeland use.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025',
  },
  {
    pest: 'Wheat Midge', crop: 'Wheat, Durum',
    products: [
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: 'Apply warm evening at heading. 1 midge per 4-5 heads = threshold.' },
      { name: 'Decis 100 EC', rate: '20-30 mL/ac', grp: '3A (Pyrethroid)', notes: 'Ground or aerial at heading. Midge tolerant varieties reduce need.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Cereal Insect Charts',
  },
  {
    pest: 'Flea Beetles', crop: 'Canola, Mustard',
    products: [
      { name: 'Decis 100 EC', rate: '20-30 mL/ac', grp: '3A (Pyrethroid)', notes: 'Apply when >25% defoliation at cotyledon to 2-leaf stage.' },
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: 'Ground only. Do not graze treated areas.' },
      { name: 'Malathion 85E', rate: '405-544 mL/ac', grp: '1B (OP)', notes: 'Ground or aerial application.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Canola Insect Charts',
  },
  {
    pest: 'Bertha Armyworm', crop: 'Canola',
    products: [
      { name: 'Coragen MaX', rate: '34-51 mL/ac', grp: '28 (Diamide)', notes: '0 day PHI. Best choice for resistance management.' },
      { name: 'Decis 100 EC', rate: '20-30 mL/ac', grp: '3A (Pyrethroid)', notes: '~20 larvae/m² threshold.' },
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: 'Ground only.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Canola Insect Charts',
  },
  {
    pest: 'Cabbage Seedpod Weevil', crop: 'Canola',
    products: [
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: '3-4 weevils per 10 sweeps at early flower = threshold. Spray field edges first.' },
      { name: 'Decis 100 EC', rate: '20-30 mL/ac', grp: '3A (Pyrethroid)', notes: 'Ground or aerial at early flower.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Canola Insect Charts',
  },
  {
    pest: 'Diamondback Moth', crop: 'Canola, Mustard',
    products: [
      { name: 'Coragen MaX', rate: '34-51 mL/ac', grp: '28 (Diamide)', notes: '100-150 larvae/m² pre-flower threshold.' },
      { name: 'Matador/Silencer 120EC', rate: '34 mL/ac', grp: '3A (Pyrethroid)', notes: 'DBM resistance to pyrethroids is common — check local efficacy data.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025',
  },
  {
    pest: 'FHB (Fusarium Head Blight)', crop: 'Wheat, Barley, Durum',
    products: [
      { name: 'Prosaro PRO', rate: '324 mL/ac', grp: '3+7', notes: 'Apply at early anthesis (Zadoks 60-65). Best FHB product available.' },
      { name: 'Proline 480SC', rate: '162 mL/ac', grp: '3 (Triazole)', notes: 'At anthesis. Apply within 2 days of flowering.' },
      { name: 'Caramba', rate: '405 mL/ac', grp: '3 (Triazole)', notes: 'At anthesis.' },
      { name: 'Miravis Ace', rate: '405 mL/ac', grp: '3+7', notes: 'At anthesis. Broad spectrum disease control.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Foliar Fungicide Tables 3-4',
  },
  {
    pest: 'Sclerotinia Stem Rot', crop: 'Canola',
    products: [
      { name: 'Proline 480SC', rate: '162 mL/ac', grp: '3 (Triazole)', notes: '20-50% bloom. Apply based on sclerotinia risk checklist.' },
      { name: 'Lance WDG', rate: '112 g/ac', grp: '7 (SDHI)', notes: '20-50% bloom.' },
      { name: 'Cotegra', rate: '202-304 mL/ac', grp: '7+3', notes: '20-50% bloom. Dual mode of action.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Foliar Fungicide Table 7',
  },
  {
    pest: 'Ascochyta / Mycosphaerella', crop: 'Peas, Lentils, Chickpeas',
    products: [
      { name: 'Priaxor', rate: '121-162 mL/ac', grp: '7+11', notes: 'Apply at early flower or before expected rain event.' },
      { name: 'Headline EC', rate: '162 mL/ac', grp: '11 (Strobilurin)', notes: 'Preventative at early flower.' },
      { name: 'Bravo/Echo (chlorothalonil)', rate: '0.5-1.0 L/ac', grp: 'M5', notes: 'Low resistance risk. Good tank mix partner.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Foliar Fungicide Table 6',
  },
  {
    pest: 'Leaf Diseases (Cereals)', crop: 'Wheat, Barley, Oats',
    products: [
      { name: 'Tilt 250E / Propiconazole', rate: '202 mL/ac', grp: '3 (Triazole)', notes: 'Flag leaf to heading. Low cost option.' },
      { name: 'Stratego PRO', rate: '243 mL/ac', grp: '3+11', notes: 'Flag leaf timing.' },
      { name: 'Nexicor', rate: '304 mL/ac', grp: '3+7+11', notes: 'Broad spectrum. Flag to heading.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Foliar Fungicide Tables 3-4',
  },
  {
    pest: 'Pre-Seed Burnoff', crop: 'All crops',
    products: [
      { name: 'Glyphosate 360', rate: '0.5-1.0 L/ac (acid equiv.)', grp: '9', notes: '1-3 days before seeding. 20-40 L/ac water volume.' },
      { name: 'Aim EC (carfentrazone)', rate: '15-47 mL/ac', grp: '14 (PPO)', notes: 'Tank mix with glyphosate for resistance management. Add surfactant.' },
      { name: 'Heat LQ (saflufenacil)', rate: '14.4 mL/ac', grp: '14 (PPO)', notes: 'Tank mix with glyphosate. Excellent kochia control.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Herbicide Section',
  },
  {
    pest: 'Desiccation / Pre-Harvest', crop: 'Wheat, Barley, Canola, Peas, Lentils',
    products: [
      { name: 'Glyphosate 360', rate: '0.67-1.0 L/ac', grp: '9', notes: 'Wheat: <30% grain moisture. Canola: 60%+ seed color change. Always check PHI.' },
      { name: 'Reglone / Diquat', rate: '0.34-0.45 L/ac', grp: '22 (Contact)', notes: 'Canola, pulses. Contact desiccant — good spray coverage critical.' },
      { name: 'Aim EC', rate: '30-47 mL/ac', grp: '14', notes: 'Harvest aid for cereals, pulses. Add surfactant.' },
    ],
    src: 'SK/AB Guide to Crop Protection 2025, Herbicide Section',
  },
]

// ─── Herbicide Timing (5-Pass System) ────────────────────────────────────────

export const HERBICIDE_PASSES: HerbicidePass[] = [
  {
    pass: 1,
    label: 'Pre-Seed Burnoff',
    timing: '1-3 days before seeding',
    products: 'Glyphosate 360 + Aim EC / Heat LQ',
    targetWeeds: 'All emerged grassy & broadleaf weeds, volunteer crops',
    crops: 'All crops',
    notes: 'Critical first pass. Sets the stage for the whole season. Add Group 14 partner for resistance management.',
  },
  {
    pass: 2,
    label: 'Pre-Emergence (Soil)',
    timing: 'After seeding, before crop emergence',
    products: 'Authority (Grp 14), Edge/Fortress (Grp 8/15), Eptam/Avadex (Grp 15), Zidua SC (Grp 15)',
    targetWeeds: 'Wild oats, green foxtail, cleavers, kochia, volunteer canola',
    crops: 'Cereals, Canola, Pulses (varies by crop)',
    notes: 'Soil moisture required for activation. Check label for crop safety. Excellent for Group 1 resistant wild oats.',
  },
  {
    pass: 3,
    label: 'In-Crop Pass 1',
    timing: '1-4 leaf crop stage',
    products: 'Assure/Axial (Grp 1), Simplicity (Grp 1+2), Buctril M (Grp 6+4), MCPA (Grp 4), Infinity (Grp 6+4)',
    targetWeeds: 'Emerged broadleaf and grassy weeds',
    crops: 'Cereals, Canola (HT specific)',
    notes: 'Timing is critical — apply before weeds compete. Scout first. Match product to weed spectrum.',
  },
  {
    pass: 4,
    label: 'In-Crop Fungicide',
    timing: 'Flag leaf / early flower',
    products: 'Prosaro/Caramba (Grp 3/7), Proline (Grp 3), Lance (Grp 7), Priaxor (Grp 7+11)',
    targetWeeds: 'FHB, sclerotinia, leaf diseases',
    crops: 'Cereals at heading, Canola at 20-50% bloom, Pulses at flower',
    notes: 'Timing is everything — missing the window costs more than the product. Use disease risk tools (FHB Risk Map, canola sclerotinia checklist).',
  },
  {
    pass: 5,
    label: 'Pre-Harvest',
    timing: 'Crop maturity — check crop-specific thresholds',
    products: 'Glyphosate 360 (Grp 9), Reglone/Diquat (Grp 22), Aim EC (Grp 14)',
    targetWeeds: 'Desiccation, green weed control, crop dry-down',
    crops: 'Wheat, Barley, Canola, Peas, Lentils',
    notes: 'Always confirm PHI for your crop and buyer. Some milling oat buyers prohibit glyphosate. Check contract terms.',
  },
]

// ─── Input Cost Defaults ──────────────────────────────────────────────────────

export const DEFAULT_INPUT_COSTS: InputCosts = {
  seed: 35,
  fert: 89,
  chem: 55,
  ins: 20,
  truck: 30,
  fuel: 38,
  mRep: 30,
  bRep: 4,
  cust: 6,
  lab: 22,
  util: 21,
  opInt: 12,
  rent: 80,
  lic: 15,
  dep: 55,
  capInt: 12,
}

export const VARIABLE_COST_LABELS: Record<keyof InputCosts, string> = {
  seed: 'Seed',
  fert: 'Fertilizer',
  chem: 'Crop Protection',
  ins: 'Crop Insurance',
  truck: 'Trucking',
  fuel: 'Fuel',
  mRep: 'Machinery Repairs',
  bRep: 'Building Repairs',
  cust: 'Custom Work',
  lab: 'Labour',
  util: 'Utilities',
  opInt: 'Operating Interest',
  rent: 'Land Rent / Taxes',
  lic: 'Licenses & Insurance',
  dep: 'Depreciation',
  capInt: 'Capital Interest',
}

export const VARIABLE_COST_KEYS: (keyof InputCosts)[] = [
  'seed', 'fert', 'chem', 'ins', 'truck', 'fuel', 'mRep', 'bRep', 'cust', 'lab', 'util', 'opInt',
]

export const FIXED_COST_KEYS: (keyof InputCosts)[] = [
  'rent', 'lic', 'dep', 'capInt',
]

// ─── Commodity Outlook ────────────────────────────────────────────────────────

export const COMMODITY_OUTLOOK: CommodityOutlook[] = [
  { crop: 'HRS Wheat', range10yr: '$5.50-$14.50/bu', forecast5yr: '$7.00-$9.50 — global demand steady', rating: 'Stable', direction: '↔' },
  { crop: 'Canola', range10yr: '$8.50-$22.00/bu', forecast5yr: '$13.00-$17.00 — crush capacity expanding', rating: 'Strong', direction: '↑' },
  { crop: 'Durum Wheat', range10yr: '$6.00-$16.00/bu', forecast5yr: '$8.00-$11.00 — niche demand steady', rating: 'Mod-Strong', direction: '↗' },
  { crop: 'Field Peas', range10yr: '$6.00-$16.00/bu', forecast5yr: '$8.50-$12.00 — plant protein demand growing', rating: 'Strong', direction: '↑' },
  { crop: 'Red Lentils', range10yr: '$0.15-$0.55/lb', forecast5yr: '$0.25-$0.40 — India import policies volatile', rating: 'Moderate', direction: '↗' },
  { crop: 'Feed Barley', range10yr: '$3.50-$9.00/bu', forecast5yr: '$5.00-$6.50 — feedlot demand steady', rating: 'Stable', direction: '↔' },
  { crop: 'Malt Barley', range10yr: '$4.00-$9.50/bu', forecast5yr: '$5.50-$7.50 — craft brewing steady', rating: 'Mod-Strong', direction: '↗' },
  { crop: 'Flax', range10yr: '$9.00-$24.00/bu', forecast5yr: '$13.00-$18.00 — health food demand growing', rating: 'Moderate', direction: '↗' },
  { crop: 'Milling Oats', range10yr: '$2.50-$8.00/bu', forecast5yr: '$4.00-$5.50 — food use growing', rating: 'Moderate', direction: '↗' },
  { crop: 'Yellow Mustard', range10yr: '$0.20-$0.65/lb', forecast5yr: '$0.35-$0.50 — condiment demand steady', rating: 'Stable', direction: '↔' },
]

// ─── Helper Functions ─────────────────────────────────────────────────────────

export function getZoneData(crop: Crop, zone: SoilZone): ZoneData | null {
  return crop.zones[zone] ?? crop.zones[Object.keys(crop.zones)[0] as SoilZone] ?? null
}

export function parseNumber(s: string): number {
  return parseFloat(String(s).replace(/[^0-9.-]/g, '')) || 0
}

export function getTotalVariableCosts(costs: InputCosts): number {
  return VARIABLE_COST_KEYS.reduce((sum, k) => sum + costs[k], 0)
}

export function getTotalFixedCosts(costs: InputCosts): number {
  return FIXED_COST_KEYS.reduce((sum, k) => sum + costs[k], 0)
}

export function getTotalCosts(costs: InputCosts): number {
  return getTotalVariableCosts(costs) + getTotalFixedCosts(costs)
}