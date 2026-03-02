/**
 * LLD → Lat/Lng Geocoder for Western Canadian Land Descriptions
 *
 * Saskatchewan / Alberta / Manitoba use the Dominion Land Survey (DLS) system.
 * Each township is ~6 miles square. Sections are numbered 1-36 within a township.
 * Quarter sections (NE/NW/SE/SW) are the basic farm unit (~160 acres).
 *
 * This provides approximate center-of-quarter coordinates — accurate to ~0.5 km,
 * which is more than sufficient for a farm command center map view.
 */

// ─── Meridian base longitudes ────────────────────────────
const MERIDIAN_BASE_LNG: Record<number, number> = {
  1: -97.4573,   // Prime (W1) — Manitoba
  2: -102.0,     // W2 — Saskatchewan East
  3: -106.0,     // W3 — Saskatchewan West
  4: -110.0,     // W4 — Alberta East
  5: -114.0,     // W5 — Alberta West
  6: -118.0,     // W6 — BC border
};

// Base latitude for Township 1
const BASE_LAT = 49.0;

// Approximate degrees per township (~6 miles)
const LAT_PER_TOWNSHIP = 0.0869;  // ~6 miles in degrees latitude

// Longitude degrees per range varies with latitude — we use a function
function lngPerRange(lat: number): number {
  // ~6 miles in longitude degrees at a given latitude
  const milesPerDegreeLng = 69.172 * Math.cos((lat * Math.PI) / 180);
  return 6 / milesPerDegreeLng;
}

// Section center offsets within a township (6x6 grid)
// Sections are numbered in a serpentine pattern:
//  31 32 33 34 35 36
//  30 29 28 27 26 25
//  19 20 21 22 23 24
//  18 17 16 15 14 13
//   7  8  9 10 11 12
//   6  5  4  3  2  1
const SECTION_GRID: Record<number, { row: number; col: number }> = {};
(() => {
  const serpentine = [
    [6, 5, 4, 3, 2, 1],
    [7, 8, 9, 10, 11, 12],
    [18, 17, 16, 15, 14, 13],
    [19, 20, 21, 22, 23, 24],
    [30, 29, 28, 27, 26, 25],
    [31, 32, 33, 34, 35, 36],
  ];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 6; col++) {
      SECTION_GRID[serpentine[row][col]] = { row, col };
    }
  }
})();

// Quarter section offsets from section center
const QUARTER_OFFSET: Record<string, { latOff: number; lngOff: number }> = {
  NE: { latOff: 0.25, lngOff: 0.25 },
  NW: { latOff: 0.25, lngOff: -0.25 },
  SE: { latOff: -0.25, lngOff: 0.25 },
  SW: { latOff: -0.25, lngOff: -0.25 },
};

export interface LLDCoords {
  latitude: number;
  longitude: number;
  accuracy: "quarter" | "section" | "township";
}

export interface LLDInput {
  quarter?: string;    // "NE", "NW", "SE", "SW"
  section: number;     // 1-36
  township: number;    // 1-126
  range: number;       // 1-34
  meridian: number;    // 1-6
}

/**
 * Convert an LLD to approximate lat/lng coordinates.
 */
export function lldToLatLng(lld: LLDInput): LLDCoords | null {
  const { quarter, section, township, range, meridian } = lld;

  // Validate
  const baseLng = MERIDIAN_BASE_LNG[meridian];
  if (baseLng === undefined) return null;
  if (township < 1 || township > 126) return null;
  if (range < 1 || range > 34) return null;
  if (section < 1 || section > 36) return null;

  // Township center latitude
  const townshipLat = BASE_LAT + (township - 0.5) * LAT_PER_TOWNSHIP;

  // Range center longitude (ranges go WEST from meridian)
  const dLng = lngPerRange(townshipLat);
  const townshipLng = baseLng - (range - 0.5) * dLng;

  // Section offset within township
  const secPos = SECTION_GRID[section];
  if (!secPos) return null;

  // Each section is 1/6 of a township
  const sectionLatOffset = ((secPos.row - 2.5) / 6) * LAT_PER_TOWNSHIP;
  const sectionLngOffset = ((secPos.col - 2.5) / 6) * dLng;

  let lat = townshipLat + sectionLatOffset;
  let lng = townshipLng + sectionLngOffset;
  let accuracy: "quarter" | "section" | "township" = "section";

  // Quarter offset
  if (quarter && QUARTER_OFFSET[quarter.toUpperCase()]) {
    const qOff = QUARTER_OFFSET[quarter.toUpperCase()];
    // Quarter is 1/2 of section in each direction
    const qLatStep = LAT_PER_TOWNSHIP / 12; // half a section
    const qLngStep = dLng / 12;
    lat += qOff.latOff * qLatStep * 2;
    lng += qOff.lngOff * qLngStep * 2;
    accuracy = "quarter";
  }

  return { latitude: lat, longitude: lng, accuracy };
}

/**
 * Parse an LLD string like "SE-5-12-12-W3" into components.
 */
export function parseLLD(lldString: string): LLDInput | null {
  // Patterns: "SE-5-12-12-W3", "NE 5-12-12 W3", "5-12-12-W3" (no quarter)
  const cleaned = lldString.trim().toUpperCase().replace(/\s+/g, "-");

  // With quarter: QQ-S-T-R-WM
  const withQuarter = cleaned.match(/^(NE|NW|SE|SW)[- ]?(\d+)[- ](\d+)[- ](\d+)[- ]?W(\d)$/);
  if (withQuarter) {
    return {
      quarter: withQuarter[1],
      section: parseInt(withQuarter[2]),
      township: parseInt(withQuarter[3]),
      range: parseInt(withQuarter[4]),
      meridian: parseInt(withQuarter[5]),
    };
  }

  // Without quarter: S-T-R-WM
  const withoutQuarter = cleaned.match(/^(\d+)[- ](\d+)[- ](\d+)[- ]?W(\d)$/);
  if (withoutQuarter) {
    return {
      section: parseInt(withoutQuarter[1]),
      township: parseInt(withoutQuarter[2]),
      range: parseInt(withoutQuarter[3]),
      meridian: parseInt(withoutQuarter[4]),
    };
  }

  return null;
}

/**
 * Convert a field's LLD components directly to coords.
 */
export function fieldToCoords(field: {
  lld_quarter?: string;
  lld_section?: number;
  lld_township?: number;
  lld_range?: number;
  lld_meridian?: number;
  latitude?: number;
  longitude?: number;
  boundary?: any;
}): LLDCoords | null {
  // 1. Try LLD first
  if (field.lld_section && field.lld_township && field.lld_range && field.lld_meridian) {
    return lldToLatLng({
      quarter: field.lld_quarter,
      section: field.lld_section,
      township: field.lld_township,
      range: field.lld_range,
      meridian: field.lld_meridian,
    });
  }
  // 2. Fall back to direct GPS coordinates
  if (field.latitude && field.longitude) {
    return { latitude: field.latitude, longitude: field.longitude, accuracy: "quarter" };
  }
  // 3. Fall back to boundary centroid
  if (field.boundary) {
    try {
      const coords = field.boundary?.geometry?.coordinates?.[0] || field.boundary?.coordinates?.[0];
      if (coords && coords.length > 0) {
        const lats = coords.map((c: number[]) => c[1]);
        const lngs = coords.map((c: number[]) => c[0]);
        return {
          latitude: lats.reduce((a: number, b: number) => a + b, 0) / lats.length,
          longitude: lngs.reduce((a: number, b: number) => a + b, 0) / lngs.length,
          accuracy: "quarter",
        };
      }
    } catch { /* */ }
  }
  return null;
}