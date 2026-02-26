// ─── AG360 Chemical Knowledge Base ────────────────────────────────────────────
// Curated prairie crop protection products for SK/AB/MB
// Source references: Saskatchewan Crop Protection Guide, PMRA labels, provincial guides
// This data is guidance only — always verify against the registered product label.
// ──────────────────────────────────────────────────────────────────────────────

export interface ChemicalProduct {
  name: string
  activeIngredient: string
  group: string // Resistance management group
  groupNumber: string
  type: 'herbicide' | 'insecticide' | 'fungicide' | 'adjuvant' | 'desiccant'
  manufacturer: string
  registeredCrops: string[]
  targetPests: string[]
  rates: {
    target: string
    rate: string
    waterVolume?: string
    notes?: string
  }[]
  phi: { crop: string; days: number }[] // Pre-harvest intervals
  tankMix: {
    compatible: string[]
    incompatible: string[]
    notes: string
  }
  waterSensitivity: string
  applicationTiming: string
  reEntryInterval?: string
  keyPrecautions: string[]
}

export const CHEMICAL_PRODUCTS: ChemicalProduct[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // HERBICIDES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: 'Roundup WeatherMAX (Glyphosate 540)',
    activeIngredient: 'Glyphosate (540 g/L)',
    group: 'Glycine',
    groupNumber: '9',
    type: 'herbicide',
    manufacturer: 'Bayer',
    registeredCrops: ['canola (RR)', 'soybeans (RR)', 'cereals (pre-seed)', 'pulses (pre-seed)', 'fallow'],
    targetPests: [
      'wild oats', 'green foxtail', 'volunteer cereals', 'Canada thistle',
      'dandelion', 'cleavers', 'lamb\'s quarters', 'pigweed', 'kochia',
      'wild buckwheat', 'chickweed', 'stinkweed',
    ],
    rates: [
      { target: 'Pre-seed burndown (light weeds)', rate: '0.33 L/ac (330 mL/ac)', waterVolume: '40 L/ac ground', notes: 'Apply 1–3 days before seeding' },
      { target: 'Pre-seed burndown (heavy weeds)', rate: '0.5 L/ac (500 mL/ac)', waterVolume: '40 L/ac ground', notes: 'Apply 3–7 days before seeding for perennials' },
      { target: 'In-crop RR canola', rate: '0.33 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply up to 6-leaf stage' },
      { target: 'In-crop RR canola (2nd pass)', rate: '0.33 L/ac', waterVolume: '40 L/ac ground', notes: 'Before bolting stage' },
      { target: 'Pre-harvest (cereals)', rate: '0.67 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at <30% grain moisture, 7+ days before harvest' },
      { target: 'Pre-harvest (pulses)', rate: '0.67 L/ac', waterVolume: '40 L/ac', notes: 'Apply when 80%+ pods brown/mature' },
    ],
    phi: [
      { crop: 'wheat', days: 7 },
      { crop: 'barley', days: 7 },
      { crop: 'canola (RR)', days: 0 },
      { crop: 'peas', days: 3 },
      { crop: 'lentils', days: 3 },
    ],
    tankMix: {
      compatible: ['Heat LQ', 'Aim EC', 'Goldwing', 'Conquer', 'ammonium sulphate (AMS)', 'Merge adjuvant'],
      incompatible: ['Liberty (antagonism in-crop)', 'high rates of liquid fertilizer (>5% v/v)'],
      notes: 'Always add AMS (ammonium sulphate) at 1–2 L/ac for hard water. Jar test new tank mixes.',
    },
    waterSensitivity: 'Hard water (>400 ppm CaCO3) significantly reduces efficacy. Add AMS at 1–2 L/ac or use a water conditioner.',
    applicationTiming: 'Pre-seed, in-crop (RR systems), pre-harvest, fallow',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Do not apply in-crop to non-RR varieties — complete crop kill',
      'Hard water is the #1 cause of poor glyphosate performance on prairies',
      'Do not tank mix with Liberty — antagonism',
      'Pre-harvest: grain must be <30% moisture',
    ],
  },

  {
    name: 'Liberty 200 SN',
    activeIngredient: 'Glufosinate ammonium (200 g/L)',
    group: 'Phosphinic acid',
    groupNumber: '10',
    type: 'herbicide',
    manufacturer: 'BASF',
    registeredCrops: ['canola (Liberty Link / LL)', 'soybeans (LL)'],
    targetPests: [
      'wild oats', 'green foxtail', 'cleavers', 'lamb\'s quarters', 'pigweed',
      'kochia (Group 2 resistant)', 'wild buckwheat', 'volunteer cereals',
      'chickweed', 'stinkweed',
    ],
    rates: [
      { target: 'In-crop LL canola (1st pass)', rate: '1.0 L/ac', waterVolume: '40–80 L/ac ground', notes: 'Apply at 2–5 leaf stage of weeds. Higher water volume = better coverage.' },
      { target: 'In-crop LL canola (2nd pass)', rate: '1.0 L/ac', waterVolume: '40–80 L/ac ground', notes: 'Apply before canola bolting' },
    ],
    phi: [
      { crop: 'canola (LL)', days: 60 },
    ],
    tankMix: {
      compatible: ['Centurion', 'Select', 'Assure II', 'surfactants (check label)'],
      incompatible: ['Roundup / glyphosate (antagonism)', 'Group 2 herbicides (timing conflict)', 'high EC formulations'],
      notes: 'Liberty needs warm temps (>15°C) and sunlight for best activity — contact herbicide, not systemic. Do NOT mix with glyphosate.',
    },
    waterSensitivity: 'Less sensitive to hard water than glyphosate, but clean water is still preferred.',
    applicationTiming: 'In-crop only on Liberty Link canola. Best results in warm, sunny conditions.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Contact herbicide — thorough coverage is critical. Use higher water volumes.',
      'Apply in warm (>15°C), sunny conditions for best activity',
      'Do not apply to stressed canola — crop injury risk increases',
      'Do NOT apply to non-LL canola varieties — crop damage',
    ],
  },

  {
    name: 'Heat LQ',
    activeIngredient: 'Saflufenacil (341 g/L)',
    group: 'PPO inhibitor',
    groupNumber: '14',
    type: 'herbicide',
    manufacturer: 'BASF',
    registeredCrops: ['cereals (pre-seed)', 'canola (pre-seed)', 'pulses (pre-seed)', 'fallow'],
    targetPests: [
      'kochia', 'lamb\'s quarters', 'cleavers', 'narrow-leaved hawk\'s-beard',
      'dandelion', 'volunteer canola', 'wild buckwheat', 'stinkweed',
    ],
    rates: [
      { target: 'Pre-seed burndown (general broadleaf)', rate: '14.4 mL/ac', waterVolume: '40 L/ac ground', notes: 'Always add Merge adjuvant at 0.5% v/v' },
      { target: 'Pre-seed (kochia, resistant broadleafs)', rate: '14.4 mL/ac', waterVolume: '40 L/ac ground', notes: 'Tank mix with glyphosate for grass + broadleaf control' },
    ],
    phi: [
      { crop: 'wheat (pre-seed)', days: 0 },
      { crop: 'canola (pre-seed)', days: 1 },
      { crop: 'peas (pre-seed)', days: 1 },
    ],
    tankMix: {
      compatible: ['Roundup WeatherMAX', 'glyphosate generics', 'Aim EC', 'Merge adjuvant (required)'],
      incompatible: ['Do not apply in-crop to any broadleaf crop — severe injury'],
      notes: 'Must add Merge adjuvant. Excellent partner for glyphosate burndowns — adds broadleaf knockdown, especially kochia.',
    },
    waterSensitivity: 'Low sensitivity. Works well in most water conditions.',
    applicationTiming: 'Pre-seed only. 1+ days before seeding canola/pulses. Same day before seeding cereals.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Pre-seed ONLY — do not apply in-crop to broadleaf crops',
      'Always use Merge adjuvant',
      'Key tool for Group 2-resistant kochia management',
    ],
  },

  {
    name: 'Infinity FX',
    activeIngredient: 'Pyrasulfotole + bromoxynil (50 + 280 g/L)',
    group: 'HPPD + Nitrile',
    groupNumber: '27 + 6',
    type: 'herbicide',
    manufacturer: 'Bayer',
    registeredCrops: ['wheat (spring, durum, winter)', 'barley'],
    targetPests: [
      'cleavers', 'wild buckwheat', 'chickweed', 'hemp nettle',
      'lamb\'s quarters', 'stinkweed', 'narrow-leaved hawk\'s-beard',
      'kochia', 'Russian thistle',
    ],
    rates: [
      { target: 'In-crop cereals (broadleaf weeds)', rate: '0.28 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 2–4 leaf stage of weeds' },
    ],
    phi: [
      { crop: 'wheat', days: 60 },
      { crop: 'barley', days: 60 },
    ],
    tankMix: {
      compatible: ['Axial BIA (grassy weed control)', 'Tundra (grassy weed control)', 'UAN (low rates for leaf burn activation)'],
      incompatible: ['Do not tank mix with organophosphate insecticides — crop injury risk'],
      notes: 'Commonly paired with Axial BIA for full broadleaf + grass control in cereals. Standard prairie 2-way.',
    },
    waterSensitivity: 'Moderate. Clean water preferred. Not as sensitive as glyphosate.',
    applicationTiming: 'In-crop cereals from 2-leaf to flag leaf stage. Best at 2–4 leaf weeds.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Cereals only — will kill canola, pulses, and other broadleafs',
      'Do not apply with organophosphate insecticides',
      'Temporary crop yellowing can occur — cosmetic, crop recovers',
    ],
  },

  {
    name: 'Axial BIA',
    activeIngredient: 'Pinoxaden (50 g/L)',
    group: 'ACCase inhibitor',
    groupNumber: '1',
    type: 'herbicide',
    manufacturer: 'Syngenta',
    registeredCrops: ['wheat (spring, durum, winter)', 'barley'],
    targetPests: [
      'wild oats', 'green foxtail', 'yellow foxtail', 'barnyard grass',
      'Persian darnel', 'volunteer canola (grass stage)',
    ],
    rates: [
      { target: 'Wild oats (up to 4 leaf)', rate: '0.2 L/ac', waterVolume: '40 L/ac ground', notes: 'Best at 1–3 leaf wild oats' },
      { target: 'Wild oats (4+ leaf / heavy)', rate: '0.24 L/ac', waterVolume: '40 L/ac ground', notes: 'Higher rate for larger or dense wild oats' },
      { target: 'Green foxtail', rate: '0.2 L/ac', waterVolume: '40 L/ac ground', notes: '2–4 leaf foxtail' },
    ],
    phi: [
      { crop: 'wheat', days: 60 },
      { crop: 'barley', days: 60 },
    ],
    tankMix: {
      compatible: ['Infinity FX', 'Buctril M', 'MCPA ester', 'Pixxaro', 'Trophy'],
      incompatible: ['Achieve (redundant Group 1)', 'organophosphate insecticides'],
      notes: 'Standard prairie pairing: Axial BIA + Infinity FX = complete grass + broadleaf in cereals.',
    },
    waterSensitivity: 'Low. Performs well across most water quality.',
    applicationTiming: 'In-crop cereals. 1–4 leaf wild oats, 2–4 leaf foxtail.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Group 1 resistance is widespread in wild oats — rotate with Group 2 or other MOA',
      'Do not use on oats — crop injury',
      'Best results on actively growing grassy weeds',
    ],
  },

  {
    name: 'Simplicity GoDRI',
    activeIngredient: 'Imazamox + imazethapyr (17.5 + 17.5 g/L)',
    group: 'ALS inhibitor',
    groupNumber: '2',
    type: 'herbicide',
    manufacturer: 'BASF',
    registeredCrops: ['lentils (Clearfield)', 'chickpeas (Clearfield)'],
    targetPests: [
      'wild mustard', 'stinkweed', 'lamb\'s quarters', 'pigweed',
      'volunteer canola', 'cleavers', 'kochia', 'green foxtail', 'wild oats',
    ],
    rates: [
      { target: 'In-crop Clearfield lentils', rate: '42.4 g/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 2–5 node lentils. Add Merge adjuvant.' },
      { target: 'In-crop Clearfield chickpeas', rate: '42.4 g/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 3–8 node chickpeas. Add Merge adjuvant.' },
    ],
    phi: [
      { crop: 'lentils', days: 60 },
      { crop: 'chickpeas', days: 60 },
    ],
    tankMix: {
      compatible: ['Merge adjuvant (required)', 'Odyssey DLX'],
      incompatible: ['Do not mix with graminicides without checking label'],
      notes: 'Clearfield system only — requires Clearfield-tolerant varieties. Add Merge adjuvant at 0.5% v/v.',
    },
    waterSensitivity: 'Moderate. Clean water preferred.',
    applicationTiming: 'In-crop on Clearfield lentils/chickpeas only. 1 application per season.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'ONLY use on Clearfield-tolerant varieties — will kill conventional lentils/chickpeas',
      'Group 2 resistance management — rotate with non-Group 2 chemistries',
      'Recropping restrictions: wheat/barley safe 10 months; canola check label',
    ],
  },

  {
    name: 'Odyssey DLX',
    activeIngredient: 'Imazamox + imazethapyr (35 + 35 g/L)',
    group: 'ALS inhibitor',
    groupNumber: '2',
    type: 'herbicide',
    manufacturer: 'BASF',
    registeredCrops: ['peas', 'soybeans', 'chickpeas'],
    targetPests: [
      'lamb\'s quarters', 'wild mustard', 'stinkweed', 'pigweed',
      'volunteer canola', 'cleavers', 'chickweed',
    ],
    rates: [
      { target: 'In-crop peas', rate: '17 g/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 3–6 node stage. Add Merge adjuvant.' },
    ],
    phi: [
      { crop: 'peas', days: 60 },
    ],
    tankMix: {
      compatible: ['Merge adjuvant (required)', 'graminicides (Assure II, Select)'],
      incompatible: ['Other Group 2 herbicides (stacking risk)'],
      notes: 'Add Merge adjuvant. Can tank mix with graminicides for grass control.',
    },
    waterSensitivity: 'Moderate. Use clean water.',
    applicationTiming: 'In-crop peas at 3–6 node stage.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Group 2 — rotate chemistries for resistance management',
      'Recropping restrictions apply — check label for following crop',
    ],
  },

  {
    name: 'Viper ADV',
    activeIngredient: 'Imazamox + bentazon (25 + 480 g/L)',
    group: 'ALS + Photosystem II',
    groupNumber: '2 + 6',
    type: 'herbicide',
    manufacturer: 'BASF',
    registeredCrops: ['peas', 'faba beans'],
    targetPests: [
      'lamb\'s quarters', 'wild mustard', 'cleavers', 'wild buckwheat',
      'pigweed', 'chickweed', 'hemp nettle', 'volunteer canola',
    ],
    rates: [
      { target: 'In-crop peas (broadleaf weeds)', rate: '0.4 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 3–6 node peas, 2–4 leaf weeds. Add Turbocharge adjuvant.' },
    ],
    phi: [
      { crop: 'peas', days: 60 },
      { crop: 'faba beans', days: 60 },
    ],
    tankMix: {
      compatible: ['Turbocharge adjuvant (required)', 'graminicides (Assure II, Select, Arrow)'],
      incompatible: ['Organophosphate insecticides', 'other Group 2 herbicides'],
      notes: 'Dual mode of action — better resistance management than straight Group 2.',
    },
    waterSensitivity: 'Moderate. Clean water recommended.',
    applicationTiming: 'In-crop peas/faba beans. 3–6 node stage.',
    reEntryInterval: '24 hours',
    keyPrecautions: [
      'Requires Turbocharge adjuvant — do not substitute',
      'Do not apply during heat stress (>25°C) — crop injury risk',
      'Temporary leaf speckling is normal — crop recovers',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSECTICIDES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: 'Decis 100 EC',
    activeIngredient: 'Deltamethrin (100 g/L)',
    group: 'Pyrethroid',
    groupNumber: '3',
    type: 'insecticide',
    manufacturer: 'Bayer',
    registeredCrops: ['canola', 'wheat', 'barley', 'oats', 'peas', 'lentils', 'flax'],
    targetPests: [
      'flea beetles', 'bertha armyworm', 'diamondback moth', 'grasshoppers',
      'lygus bugs', 'cabbage seedpod weevil', 'pea aphid', 'cutworms',
    ],
    rates: [
      { target: 'Flea beetles (canola)', rate: '80–100 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: >25% cotyledon defoliation with beetles still feeding' },
      { target: 'Bertha armyworm', rate: '100–120 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: 10–20 larvae/m²' },
      { target: 'Diamondback moth', rate: '100 mL/ac', waterVolume: '40 L/ac ground', notes: 'Scout for larvae on underside of leaves' },
      { target: 'Grasshoppers', rate: '80 mL/ac', waterVolume: '40 L/ac ground', notes: 'Best on nymphs. Threshold: 8–12/m²' },
      { target: 'Cabbage seedpod weevil', rate: '100 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 10–20% bloom. Threshold: 3–4 adults/sweep' },
      { target: 'Pea aphid', rate: '80 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: 2–3 per sweep. Scout before flowering.' },
      { target: 'Cutworms', rate: '100 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply in evening when larvae are active' },
    ],
    phi: [
      { crop: 'canola', days: 7 },
      { crop: 'wheat', days: 30 },
      { crop: 'barley', days: 30 },
      { crop: 'peas', days: 7 },
      { crop: 'lentils', days: 7 },
    ],
    tankMix: {
      compatible: ['Roundup WeatherMAX', 'Liberty', 'most fungicides', 'Coragen'],
      incompatible: ['Jar test with EC formulations before mixing'],
      notes: 'Broad-spectrum pyrethroid. Kills beneficials — use only when threshold is reached.',
    },
    waterSensitivity: 'Hard water >400 ppm may reduce efficacy. Add water conditioner if needed.',
    applicationTiming: 'Apply when economic thresholds are met. Evening applications preferred for cutworms.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Toxic to bees — do not apply during bloom if pollinators present',
      'Kills beneficial insects — only spray at threshold',
      'Pyrethroid resistance building in diamondback moth — alternate with Group 28',
    ],
  },

  {
    name: 'Matador 120 EC',
    activeIngredient: 'Lambda-cyhalothrin (120 g/L)',
    group: 'Pyrethroid',
    groupNumber: '3',
    type: 'insecticide',
    manufacturer: 'Syngenta',
    registeredCrops: ['canola', 'wheat', 'barley', 'peas', 'lentils', 'flax', 'mustard'],
    targetPests: [
      'flea beetles', 'bertha armyworm', 'grasshoppers', 'wheat midge',
      'cutworms', 'armyworms', 'sawfly', 'lygus bugs',
    ],
    rates: [
      { target: 'Flea beetles (canola)', rate: '34 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: >25% cotyledon defoliation' },
      { target: 'Bertha armyworm', rate: '42 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: 10–20 larvae/m²' },
      { target: 'Grasshoppers', rate: '34 mL/ac', waterVolume: '40 L/ac ground', notes: 'Target nymphs. Threshold: 8–12/m²' },
      { target: 'Wheat midge', rate: '34 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at heading when 4–8 midge per 8–10 heads' },
      { target: 'Cutworms', rate: '42 mL/ac', waterVolume: '40 L/ac ground', notes: 'Evening application for best results' },
    ],
    phi: [
      { crop: 'canola', days: 7 },
      { crop: 'wheat', days: 14 },
      { crop: 'barley', days: 14 },
      { crop: 'peas', days: 14 },
      { crop: 'lentils', days: 14 },
    ],
    tankMix: {
      compatible: ['Prosaro', 'Proline', 'glyphosate', 'most broadleaf herbicides'],
      incompatible: ['Jar test with all new combinations'],
      notes: 'Very similar spectrum to Decis. Slightly lower rates needed. Same pollinator precautions.',
    },
    waterSensitivity: 'Low sensitivity. Works in most water conditions.',
    applicationTiming: 'At economic thresholds. Evening for cutworms.',
    reEntryInterval: '24 hours',
    keyPrecautions: [
      'Toxic to bees — avoid application during bloom',
      'Kills beneficial insects — threshold-based application only',
      'Restricted Entry Interval is 24 hours (longer than Decis)',
    ],
  },

  {
    name: 'Coragen',
    activeIngredient: 'Chlorantraniliprole (200 g/L)',
    group: 'Diamide',
    groupNumber: '28',
    type: 'insecticide',
    manufacturer: 'FMC',
    registeredCrops: ['canola', 'wheat', 'barley', 'peas', 'lentils'],
    targetPests: [
      'diamondback moth', 'bertha armyworm', 'cabbage looper',
      'cutworms', 'armyworms',
    ],
    rates: [
      { target: 'Diamondback moth (canola)', rate: '50–75 mL/ac', waterVolume: '40 L/ac ground', notes: 'Preferred over pyrethroids where resistance suspected' },
      { target: 'Bertha armyworm', rate: '75 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: 10–20 larvae/m²' },
      { target: 'Cutworms', rate: '75 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply to soil surface in evening' },
    ],
    phi: [
      { crop: 'canola', days: 1 },
      { crop: 'wheat', days: 1 },
      { crop: 'peas', days: 1 },
      { crop: 'lentils', days: 1 },
    ],
    tankMix: {
      compatible: ['Decis', 'Matador', 'fungicides', 'most herbicides'],
      incompatible: ['Check label for specific restrictions'],
      notes: 'Low toxicity to bees and beneficials — preferred choice during bloom if spraying is necessary.',
    },
    waterSensitivity: 'Low. Performs well in most water conditions.',
    applicationTiming: 'At economic thresholds. Can be used during bloom (low bee toxicity).',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Reduced risk to pollinators — better choice than pyrethroids during bloom',
      'Effective on pyrethroid-resistant diamondback moth',
      'More expensive than pyrethroids — reserve for resistance situations or bloom timing',
    ],
  },

  {
    name: 'Sivanto Prime',
    activeIngredient: 'Flupyradifurone (200 g/L)',
    group: 'Butenolide',
    groupNumber: '4D',
    type: 'insecticide',
    manufacturer: 'Bayer',
    registeredCrops: ['canola', 'peas', 'lentils', 'cereals'],
    targetPests: [
      'pea aphid', 'aphids (general)', 'lygus bugs',
    ],
    rates: [
      { target: 'Pea aphid (peas/lentils)', rate: '100–200 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply when threshold met: 2–3 per sweep' },
      { target: 'Lygus bugs (canola)', rate: '200 mL/ac', waterVolume: '40 L/ac ground', notes: 'Threshold: 1–2 per sweep during pod stage' },
    ],
    phi: [
      { crop: 'canola', days: 7 },
      { crop: 'peas', days: 7 },
      { crop: 'lentils', days: 7 },
    ],
    tankMix: {
      compatible: ['Most fungicides', 'Decis (if broad spectrum needed)'],
      incompatible: ['Check label'],
      notes: 'Can be used during bloom — pollinator-safe profile.',
    },
    waterSensitivity: 'Low sensitivity.',
    applicationTiming: 'At economic thresholds. Safe to apply during bloom.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Pollinator-friendly — preferred for aphid control during flowering',
      'Not effective on flea beetles or lepidopteran pests (caterpillars)',
      'More expensive than pyrethroids but safer for beneficials',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FUNGICIDES
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: 'Prosaro XTR',
    activeIngredient: 'Prothioconazole + tebuconazole (125 + 125 g/L)',
    group: 'Triazole + Triazole',
    groupNumber: '3 + 3',
    type: 'fungicide',
    manufacturer: 'Bayer',
    registeredCrops: ['wheat (spring, durum, winter)', 'barley'],
    targetPests: [
      'fusarium head blight (FHB)', 'leaf rust', 'stripe rust',
      'septoria leaf blotch', 'tan spot', 'net blotch',
    ],
    rates: [
      { target: 'FHB suppression (wheat)', rate: '0.32 L/ac', waterVolume: '40 L/ac ground (min)', notes: 'Apply at early flowering (anthesis). Timing is critical — 1–3 days of early flowering.' },
      { target: 'Leaf diseases (wheat/barley)', rate: '0.24 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at flag leaf to early heading' },
    ],
    phi: [
      { crop: 'wheat', days: 36 },
      { crop: 'barley', days: 36 },
    ],
    tankMix: {
      compatible: ['Matador', 'Decis', 'Caramba (for enhanced FHB)', 'Agral 90 adjuvant'],
      incompatible: ['EC herbicides at time of heading application'],
      notes: 'Standard FHB fungicide on prairies. Timing at early anthesis is everything — 1 day late is significantly less effective.',
    },
    waterSensitivity: 'Low. Clean water preferred but not critical.',
    applicationTiming: 'FHB: spray at early flowering (anthesis), ideally within 1–3 days of first anthers visible. Leaf disease: flag leaf to heading.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'FHB timing is critical — spray at first visible anthers, not before or after',
      'Suppression only, not elimination — reduces DON (vomitoxin) levels',
      'Higher water volume (>40 L/ac) improves head coverage for FHB',
      'Do not tank mix with EC formulations at heading',
    ],
  },

  {
    name: 'Proline 480 SC',
    activeIngredient: 'Prothioconazole (480 g/L)',
    group: 'Triazole',
    groupNumber: '3',
    type: 'fungicide',
    manufacturer: 'Bayer',
    registeredCrops: ['canola', 'wheat', 'barley', 'peas', 'lentils'],
    targetPests: [
      'sclerotinia stem rot', 'blackleg', 'leaf diseases (general)',
      'ascochyta blight', 'mycosphaerella blight',
    ],
    rates: [
      { target: 'Sclerotinia (canola)', rate: '64 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 20–50% bloom. Threshold: sclerotinia checklist (moist canopy, history of disease).' },
      { target: 'Ascochyta (lentils)', rate: '64 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at early flower or first sign of disease' },
      { target: 'Mycosphaerella (peas)', rate: '64 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at early flower' },
    ],
    phi: [
      { crop: 'canola', days: 36 },
      { crop: 'lentils', days: 30 },
      { crop: 'peas', days: 30 },
    ],
    tankMix: {
      compatible: ['Decis', 'Matador', 'most herbicides (check label)'],
      incompatible: ['Check label for specific restrictions'],
      notes: 'Strong sclerotinia fungicide. Can tank mix with insecticide if pest pressure warrants.',
    },
    waterSensitivity: 'Low sensitivity.',
    applicationTiming: 'Canola: 20–50% bloom. Pulses: early flower.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Timing for sclerotinia: canopy must still be moist/humid — spray too late and petal drop has occurred',
      'Helicopter/aerial application common for canola sclerotinia timing',
      'Only Group 3 — rotate with Group 7 or 11 fungicides for resistance management',
    ],
  },

  {
    name: 'Priaxor',
    activeIngredient: 'Fluxapyroxad + pyraclostrobin (167 + 333 g/L)',
    group: 'SDHI + Strobilurin',
    groupNumber: '7 + 11',
    type: 'fungicide',
    manufacturer: 'BASF',
    registeredCrops: ['canola', 'wheat', 'barley', 'peas', 'lentils'],
    targetPests: [
      'sclerotinia stem rot', 'blackleg', 'alternaria black spot',
      'ascochyta blight', 'septoria', 'tan spot', 'net blotch',
    ],
    rates: [
      { target: 'Sclerotinia + blackleg (canola)', rate: '0.12 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 20–50% bloom' },
      { target: 'Leaf disease (cereals)', rate: '0.10 L/ac', waterVolume: '40 L/ac ground', notes: 'Flag leaf to heading' },
      { target: 'Ascochyta (lentils/peas)', rate: '0.12 L/ac', waterVolume: '40 L/ac ground', notes: 'Early flower' },
    ],
    phi: [
      { crop: 'canola', days: 36 },
      { crop: 'wheat', days: 36 },
      { crop: 'peas', days: 21 },
      { crop: 'lentils', days: 21 },
    ],
    tankMix: {
      compatible: ['Decis', 'Matador', 'Proline (for enhanced sclerotinia)'],
      incompatible: ['Other strobilurin fungicides (Group 11 stacking)'],
      notes: 'Dual MOA — better resistance management than single-group fungicides.',
    },
    waterSensitivity: 'Low sensitivity.',
    applicationTiming: 'Canola: 20–50% bloom. Cereals: flag leaf to heading. Pulses: early flower.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Do not stack with other Group 11 (strobilurin) products',
      'Plant health benefits (greening) beyond disease control',
      'Strong on sclerotinia + blackleg combination in canola',
    ],
  },

  {
    name: 'Delaro 325 SC',
    activeIngredient: 'Prothioconazole + trifloxystrobin (175 + 150 g/L)',
    group: 'Triazole + Strobilurin',
    groupNumber: '3 + 11',
    type: 'fungicide',
    manufacturer: 'Bayer',
    registeredCrops: ['wheat', 'barley', 'canola', 'peas', 'lentils'],
    targetPests: [
      'fusarium head blight (FHB)', 'leaf rust', 'septoria',
      'tan spot', 'net blotch', 'sclerotinia', 'ascochyta',
    ],
    rates: [
      { target: 'FHB + leaf disease (wheat)', rate: '0.20 L/ac', waterVolume: '40 L/ac ground', notes: 'Apply at early anthesis for FHB' },
      { target: 'Leaf disease (barley)', rate: '0.16 L/ac', waterVolume: '40 L/ac ground', notes: 'Flag leaf to heading' },
      { target: 'Sclerotinia (canola)', rate: '0.20 L/ac', waterVolume: '40 L/ac ground', notes: '20–50% bloom' },
    ],
    phi: [
      { crop: 'wheat', days: 36 },
      { crop: 'barley', days: 36 },
      { crop: 'canola', days: 36 },
    ],
    tankMix: {
      compatible: ['Matador', 'Decis', 'Agral 90'],
      incompatible: ['Other Group 11 products'],
      notes: 'Dual MOA. Good alternative to Prosaro for FHB with added strobilurin plant health.',
    },
    waterSensitivity: 'Low.',
    applicationTiming: 'FHB: early anthesis. Leaf disease: flag leaf. Sclerotinia: 20–50% bloom.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Same FHB timing rules as Prosaro — early anthesis is everything',
      'Group 11 component adds plant health / greening effect',
      'Do not stack with other strobilurin fungicides',
    ],
  },

  {
    name: 'Lance WDG',
    activeIngredient: 'Boscalid (700 g/kg)',
    group: 'SDHI',
    groupNumber: '7',
    type: 'fungicide',
    manufacturer: 'BASF',
    registeredCrops: ['canola', 'peas', 'lentils', 'chickpeas', 'sunflowers'],
    targetPests: [
      'sclerotinia stem rot', 'white mould', 'ascochyta blight',
    ],
    rates: [
      { target: 'Sclerotinia (canola)', rate: '56 g/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 20–50% bloom. History of sclerotinia in field.' },
      { target: 'Sclerotinia (peas/lentils)', rate: '56 g/ac', waterVolume: '40 L/ac ground', notes: 'Apply at early to full bloom' },
    ],
    phi: [
      { crop: 'canola', days: 36 },
      { crop: 'peas', days: 21 },
      { crop: 'lentils', days: 21 },
    ],
    tankMix: {
      compatible: ['Insecticides', 'most herbicides'],
      incompatible: ['Other Group 7 products'],
      notes: 'Solid sclerotinia option. Less common now due to Priaxor dual MOA preference.',
    },
    waterSensitivity: 'Low.',
    applicationTiming: 'Canola: 20–50% bloom. Pulses: early to full bloom.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Single mode of action (Group 7) — rotate with Group 3 or 11',
      'WDG formulation — dissolves in water, good suspension',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ADJUVANTS & WATER CONDITIONERS
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: 'Merge Adjuvant',
    activeIngredient: 'Surfactant blend (50% active)',
    group: 'Adjuvant',
    groupNumber: 'N/A',
    type: 'adjuvant',
    manufacturer: 'BASF',
    registeredCrops: ['all crops (with labelled herbicides)'],
    targetPests: ['N/A — enhances herbicide performance'],
    rates: [
      { target: 'Standard adjuvant rate', rate: '0.5% v/v (200 mL per 40 L water)', waterVolume: 'N/A', notes: 'Required by many herbicide labels (Heat, Simplicity, Viper, etc.)' },
    ],
    phi: [{ crop: 'all', days: 0 }],
    tankMix: {
      compatible: ['Heat LQ', 'Simplicity GoDRI', 'Viper ADV', 'Odyssey DLX', 'most Group 2 herbicides'],
      incompatible: ['Check if herbicide label specifies a different adjuvant'],
      notes: 'Most commonly required adjuvant on prairies. Always check the herbicide label — some specify Merge, others specify Turbocharge or Agral.',
    },
    waterSensitivity: 'N/A — enhances herbicide performance regardless of water quality.',
    applicationTiming: 'Added to spray solution when herbicide label requires it.',
    keyPrecautions: [
      'Always check which adjuvant the herbicide label specifies — using the wrong one can reduce efficacy',
      'Do not exceed labelled rate — excess surfactant can increase crop injury',
    ],
  },

  {
    name: 'Ammonium Sulphate (AMS)',
    activeIngredient: 'Ammonium sulphate (NH₄)₂SO₄',
    group: 'Water conditioner',
    groupNumber: 'N/A',
    type: 'adjuvant',
    manufacturer: 'Various',
    registeredCrops: ['all crops (with glyphosate)'],
    targetPests: ['N/A — conditions hard water for glyphosate'],
    rates: [
      { target: 'Glyphosate water conditioning', rate: '1–2 L/ac liquid AMS (or 1–2 kg/ac dry)', waterVolume: 'N/A', notes: 'Add BEFORE glyphosate in the tank' },
    ],
    phi: [{ crop: 'all', days: 0 }],
    tankMix: {
      compatible: ['Roundup WeatherMAX', 'all glyphosate products', 'most herbicides'],
      incompatible: ['Some EC formulations — jar test if unsure'],
      notes: 'Essential for hard water areas on prairies. Add to tank FIRST, before adding herbicide.',
    },
    waterSensitivity: 'This IS the hard water solution. Binds calcium/magnesium ions that tie up glyphosate.',
    applicationTiming: 'Every time you spray glyphosate if water is >300 ppm hardness.',
    keyPrecautions: [
      'Add AMS to tank FIRST — before glyphosate. Order matters.',
      'If using dry AMS, dissolve fully before adding other products',
      'SK/AB dugout and well water is frequently >400 ppm — test your water',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DESICCANTS / PRE-HARVEST
  // ═══════════════════════════════════════════════════════════════════════════

  {
    name: 'Reglone (Diquat)',
    activeIngredient: 'Diquat (240 g/L)',
    group: 'Bipyridylium',
    groupNumber: '22',
    type: 'desiccant',
    manufacturer: 'Syngenta',
    registeredCrops: ['canola', 'peas', 'lentils', 'potatoes', 'sunflowers'],
    targetPests: ['N/A — desiccant for pre-harvest dry-down'],
    rates: [
      { target: 'Canola desiccation', rate: '0.34 L/ac', waterVolume: '80 L/ac ground (high volume critical)', notes: 'Apply when 60%+ seed colour change. Contact herbicide — coverage is everything.' },
      { target: 'Lentil desiccation', rate: '0.34 L/ac', waterVolume: '80 L/ac ground', notes: 'Apply when bottom pods are brown/rattling' },
      { target: 'Pea desiccation', rate: '0.34 L/ac', waterVolume: '80 L/ac ground', notes: 'Apply when 80%+ pods are yellow/brown' },
    ],
    phi: [
      { crop: 'canola', days: 5 },
      { crop: 'lentils', days: 5 },
      { crop: 'peas', days: 5 },
    ],
    tankMix: {
      compatible: ['Agral 90 (adjuvant, check label)'],
      incompatible: ['Roundup / glyphosate (at time of Reglone application)'],
      notes: 'Contact desiccant — burns tissue on contact. High water volume essential for coverage.',
    },
    waterSensitivity: 'Low. But high water volume is critical for contact coverage.',
    applicationTiming: 'Pre-harvest. Canola: 60%+ seed colour change. Pulses: 80%+ mature pods.',
    reEntryInterval: '24 hours',
    keyPrecautions: [
      'Contact herbicide — high water volume (80+ L/ac) is critical',
      'Do not apply too early — immature seed will shrivel and reduce yield/grade',
      'Highly toxic concentrate — handle with full PPE',
      'Evening application preferred to reduce spray drift',
    ],
  },

  {
    name: 'Eragon LQ',
    activeIngredient: 'Saflufenacil (342 g/L)',
    group: 'PPO inhibitor',
    groupNumber: '14',
    type: 'desiccant',
    manufacturer: 'BASF',
    registeredCrops: ['wheat', 'barley', 'canola', 'peas', 'lentils', 'flax'],
    targetPests: ['N/A — desiccant / pre-harvest aid'],
    rates: [
      { target: 'Wheat/barley desiccation', rate: '7 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at <30% grain moisture. Add Merge adjuvant.' },
      { target: 'Canola desiccation', rate: '7 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply at 60–75% seed colour change. Add Merge.' },
      { target: 'Pulse desiccation', rate: '7 mL/ac', waterVolume: '40 L/ac ground', notes: 'Apply when 80%+ pods brown. Add Merge.' },
    ],
    phi: [
      { crop: 'wheat', days: 3 },
      { crop: 'barley', days: 3 },
      { crop: 'canola', days: 3 },
      { crop: 'peas', days: 3 },
      { crop: 'lentils', days: 3 },
    ],
    tankMix: {
      compatible: ['Merge adjuvant (required)', 'Roundup WeatherMAX (for weed dry-down + desiccation)'],
      incompatible: ['Check label for specific restrictions'],
      notes: 'Commonly tank mixed with glyphosate for pre-harvest: Eragon desiccates the crop while glyphosate handles green weeds.',
    },
    waterSensitivity: 'Low.',
    applicationTiming: 'Pre-harvest. 3–5 days before swathing or combining.',
    reEntryInterval: '12 hours',
    keyPrecautions: [
      'Always add Merge adjuvant',
      'Low rate = cost effective. Commonly paired with glyphosate for one-pass pre-harvest.',
      'Do not apply too early — yield and grade loss from premature desiccation',
    ],
  },
]

// ─── Lookup Helpers ───────────────────────────────────────────────────────────

export function findProductsForPest(pest: string): ChemicalProduct[] {
  const lower = pest.toLowerCase()
  return CHEMICAL_PRODUCTS.filter(p =>
    p.targetPests.some(t => t.toLowerCase().includes(lower) || lower.includes(t.toLowerCase()))
  )
}

export function findProductsForCrop(crop: string): ChemicalProduct[] {
  const lower = crop.toLowerCase()
  return CHEMICAL_PRODUCTS.filter(p =>
    p.registeredCrops.some(c => c.toLowerCase().includes(lower))
  )
}

export function findProductsByType(type: ChemicalProduct['type']): ChemicalProduct[] {
  return CHEMICAL_PRODUCTS.filter(p => p.type === type)
}

export function findProductByName(name: string): ChemicalProduct | undefined {
  const lower = name.toLowerCase()
  return CHEMICAL_PRODUCTS.find(p => p.name.toLowerCase().includes(lower))
}

export function getProductsForScoutDetection(category: string, label: string, crop: string): ChemicalProduct[] {
  const results: ChemicalProduct[] = []
  const labelLower = label.toLowerCase()
  const cropLower = crop.toLowerCase()

  for (const product of CHEMICAL_PRODUCTS) {
    // Must be registered for this crop
    const registeredForCrop = product.registeredCrops.some(c => c.toLowerCase().includes(cropLower))
    if (!registeredForCrop) continue

    // Must target the detected pest/disease
    const targetsDetection = product.targetPests.some(t => {
      const tLower = t.toLowerCase()
      return labelLower.includes(tLower) || tLower.includes(labelLower)
    })

    // Also match by category-type alignment
    const typeMatch =
      (category === 'insect' && product.type === 'insecticide') ||
      (category === 'disease' && product.type === 'fungicide') ||
      (category === 'weed' && product.type === 'herbicide')

    if (targetsDetection || (typeMatch && targetsDetection)) {
      results.push(product)
    }
  }

  return results
}

// ─── Build Lily Context String ────────────────────────────────────────────────
// This generates a text block that gets injected into Lily's system prompt
// so she can reference specific products, rates, and precautions.

export function buildChemicalContextForLily(): string {
  const lines: string[] = [
    '=== REGISTERED CROP PROTECTION PRODUCTS (Prairie Canada) ===',
    'Use this knowledge when recommending products. ALWAYS note: "Verify the product label before application."',
    '',
  ]

  for (const p of CHEMICAL_PRODUCTS) {
    lines.push(`── ${p.name} (${p.activeIngredient}) ──`)
    lines.push(`Type: ${p.type} | Group: ${p.groupNumber} (${p.group}) | Mfr: ${p.manufacturer}`)
    lines.push(`Crops: ${p.registeredCrops.join(', ')}`)
    lines.push(`Targets: ${p.targetPests.join(', ')}`)
    lines.push('Rates:')
    for (const r of p.rates) {
      lines.push(`  • ${r.target}: ${r.rate}${r.waterVolume ? ` in ${r.waterVolume}` : ''}${r.notes ? ` — ${r.notes}` : ''}`)
    }
    lines.push(`PHI: ${p.phi.map(h => `${h.crop} ${h.days}d`).join(', ')}`)
    lines.push(`Tank mix OK: ${p.tankMix.compatible.join(', ')}`)
    lines.push(`Tank mix AVOID: ${p.tankMix.incompatible.join(', ')}`)
    lines.push(`Water: ${p.waterSensitivity}`)
    if (p.keyPrecautions.length > 0) {
      lines.push(`Precautions: ${p.keyPrecautions.join(' | ')}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}