// lib/boundary-utils.ts
// Boundary utilities: import parsing, export generation, overlap detection, LLD snap

import * as turfArea from "@turf/area";

/* ───── Types ──────────────────────────────────────────── */
export interface GeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, any>;
}

export interface ImportResult {
  features: GeoJSONFeature[];
  errors: string[];
  warnings: string[];
}

export interface OverlapResult {
  fieldId1: string;
  fieldId2: string;
  fieldName1: string;
  fieldName2: string;
  overlapAcres: number;
}

/* ───── Import: Parse Shapefile (.zip) ─────────────────── */
export async function parseShapefile(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const features: GeoJSONFeature[] = [];

  try {
    const shpjs = (await import("shpjs")).default;
    const buffer = await file.arrayBuffer();
    const result = await shpjs(buffer);

    const featureCollection = Array.isArray(result) ? result[0] : result;

    if (!featureCollection?.features) {
      errors.push("No features found in shapefile");
      return { features, errors, warnings };
    }

    for (const f of featureCollection.features) {
      if (f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon") {
        features.push({
          type: "Feature",
          geometry: f.geometry,
          properties: f.properties || {},
        });
      } else if (f.geometry) {
        warnings.push(`Skipped ${f.geometry.type} feature (only Polygon/MultiPolygon supported)`);
      }
    }

    if (features.length === 0) {
      errors.push("No polygon features found in shapefile");
    }
  } catch (e: any) {
    errors.push(`Shapefile parse error: ${e.message}`);
  }

  return { features, errors, warnings };
}

/* ───── Import: Parse KML/KMZ ──────────────────────────── */
export async function parseKML(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const features: GeoJSONFeature[] = [];

  try {
    const { kml } = await import("@tmcw/togeojson");
    let text: string;

    if (file.name.endsWith(".kmz")) {
      // KMZ is a zipped KML
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      const kmlFile = Object.keys(zip.files).find(n => n.endsWith(".kml"));
      if (!kmlFile) { errors.push("No KML file found inside KMZ"); return { features, errors, warnings }; }
      text = await zip.files[kmlFile].async("string");
    } else {
      text = await file.text();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "text/xml");
    const geoJSON = kml(doc);

    for (const f of geoJSON.features) {
      if (f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon") {
        features.push({
          type: "Feature",
          geometry: f.geometry as any,
          properties: f.properties || {},
        });
      } else if (f.geometry) {
        warnings.push(`Skipped ${f.geometry.type} feature`);
      }
    }

    if (features.length === 0) errors.push("No polygon features found in KML");
  } catch (e: any) {
    errors.push(`KML parse error: ${e.message}`);
  }

  return { features, errors, warnings };
}

/* ───── Import: Parse GeoJSON ──────────────────────────── */
export async function parseGeoJSON(file: File): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const features: GeoJSONFeature[] = [];

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const feats = data.type === "FeatureCollection" ? data.features :
                  data.type === "Feature" ? [data] :
                  data.type === "Polygon" || data.type === "MultiPolygon" ? [{ type: "Feature", geometry: data, properties: {} }] : [];

    for (const f of feats) {
      if (f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon") {
        features.push({ type: "Feature", geometry: f.geometry, properties: f.properties || {} });
      } else if (f.geometry) {
        warnings.push(`Skipped ${f.geometry.type} feature`);
      }
    }

    if (features.length === 0) errors.push("No polygon features found");
  } catch (e: any) {
    errors.push(`GeoJSON parse error: ${e.message}`);
  }

  return { features, errors, warnings };
}

/* ───── Auto-detect and parse ──────────────────────────── */
export async function parseImportFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".zip") || name.endsWith(".shp")) return parseShapefile(file);
  if (name.endsWith(".kml") || name.endsWith(".kmz")) return parseKML(file);
  if (name.endsWith(".json") || name.endsWith(".geojson")) return parseGeoJSON(file);
  return { features: [], errors: [`Unsupported file type: ${name}. Use .zip (shapefile), .kml, .kmz, .json, or .geojson`], warnings: [] };
}

/* ───── Calculate area ─────────────────────────────────── */
export function calcAcres(feature: GeoJSONFeature): number {
  try {
    const m2 = turfArea.default(feature as any);
    return Math.round((m2 / 4046.86) * 100) / 100;
  } catch { return 0; }
}

export function calcHectares(feature: GeoJSONFeature): number {
  try {
    const m2 = turfArea.default(feature as any);
    return Math.round((m2 / 10000) * 100) / 100;
  } catch { return 0; }
}

/* ───── Multi-polygon → single polygons ────────────────── */
export function flattenMultiPolygon(feature: GeoJSONFeature): GeoJSONFeature[] {
  if (feature.geometry.type === "Polygon") return [feature];
  if (feature.geometry.type === "MultiPolygon") {
    return (feature.geometry.coordinates as number[][][][]).map((coords, i) => ({
      type: "Feature" as const,
      geometry: { type: "Polygon" as const, coordinates: coords },
      properties: { ...feature.properties, _partIndex: i },
    }));
  }
  return [];
}

/* ───── Overlap detection ──────────────────────────────── */
export async function detectOverlaps(
  fields: Array<{ id: string; field_name: string; boundary: GeoJSONFeature | null }>
): Promise<OverlapResult[]> {
  const overlaps: OverlapResult[] = [];

  try {
    const turfIntersect = (await import("@turf/intersect")).default;

    const bounded = fields.filter(f => f.boundary?.geometry?.type === "Polygon");

    for (let i = 0; i < bounded.length; i++) {
      for (let j = i + 1; j < bounded.length; j++) {
        try {
          const a = bounded[i].boundary!;
          const b = bounded[j].boundary!;
          const intersection = turfIntersect(a as any, b as any);
          if (intersection) {
            const overlapM2 = turfArea.default(intersection);
            const overlapAcres = Math.round((overlapM2 / 4046.86) * 100) / 100;
            if (overlapAcres > 0.1) { // Only report > 0.1 acre overlaps
              overlaps.push({
                fieldId1: bounded[i].id,
                fieldId2: bounded[j].id,
                fieldName1: bounded[i].field_name,
                fieldName2: bounded[j].field_name,
                overlapAcres,
              });
            }
          }
        } catch { /* skip invalid geometries */ }
      }
    }
  } catch (e) { console.error("Overlap detection error:", e); }

  return overlaps;
}

/* ───── LLD snap (quarter section rectangle) ───────────── */
export function generateLLDRectangle(
  quarter: string, section: number, township: number, range: number, meridian: number
): GeoJSONFeature | null {
  // Meridian base longitudes
  const meridianBase: Record<number, number> = {
    1: -97.4572, 2: -102.0, 3: -106.0, 4: -110.0, 5: -114.0, 6: -118.0,
  };

  const baseLng = meridianBase[meridian];
  if (!baseLng) return null;

  // Section ~1 mile (0.01449° lat, varies lng)
  const latPerTwp = 0.087; // ~6 miles per township
  const sectionLat = latPerTwp / 6;
  const baseLat = 49.0;

  const twpLat = baseLat + (township - 1) * latPerTwp;

  // Section position in township grid (serpentine)
  const row = Math.floor((section - 1) / 6);
  const colRaw = (section - 1) % 6;
  const col = row % 2 === 0 ? colRaw : 5 - colRaw;

  const cosLat = Math.cos((twpLat * Math.PI) / 180);
  const lngPerRange = 0.087 / cosLat;
  const sectionLng = lngPerRange / 6;

  const sectionBaseLat = twpLat + row * sectionLat;
  const sectionBaseLng = baseLng - (range - 1) * lngPerRange - col * sectionLng;

  // Quarter offsets
  let qLatOff = 0, qLngOff = 0;
  const halfLat = sectionLat / 2;
  const halfLng = sectionLng / 2;

  switch (quarter.toUpperCase()) {
    case "NE": qLatOff = halfLat; qLngOff = 0; break;
    case "NW": qLatOff = halfLat; qLngOff = -halfLng; break;
    case "SE": qLatOff = 0; qLngOff = 0; break;
    case "SW": qLatOff = 0; qLngOff = -halfLng; break;
    default: return null;
  }

  const sw_lat = sectionBaseLat + qLatOff;
  const sw_lng = sectionBaseLng + qLngOff;
  const ne_lat = sw_lat + halfLat;
  const ne_lng = sw_lng + halfLng;

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [sw_lng, sw_lat],
        [ne_lng, sw_lat],
        [ne_lng, ne_lat],
        [sw_lng, ne_lat],
        [sw_lng, sw_lat],
      ]],
    },
    properties: {
      lld: `${quarter}-${section}-${township}-${range}-W${meridian}`,
      source: "lld_snap",
    },
  };
}

/* ───── Export: GeoJSON ────────────────────────────────── */
export function exportGeoJSON(
  fields: Array<{ field_name: string; boundary: GeoJSONFeature | null; crop_type?: string | null; acres?: number }>
): string {
  const features = fields
    .filter(f => f.boundary)
    .map(f => ({
      ...f.boundary!,
      properties: {
        ...f.boundary!.properties,
        field_name: f.field_name,
        crop_type: f.crop_type || null,
        acres: f.acres || null,
      },
    }));

  return JSON.stringify({
    type: "FeatureCollection",
    features,
  }, null, 2);
}

/* ───── Export: KML ────────────────────────────────────── */
export function exportKML(
  fields: Array<{ field_name: string; boundary: GeoJSONFeature | null; crop_type?: string | null }>
): string {
  const placemarks = fields
    .filter(f => f.boundary?.geometry?.type === "Polygon")
    .map(f => {
      const coords = (f.boundary!.geometry.coordinates as number[][][])[0]
        .map(c => `${c[0]},${c[1]},0`).join(" ");
      return `
    <Placemark>
      <name>${escapeXml(f.field_name)}</name>
      <description>${escapeXml(f.crop_type || "")}</description>
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coords}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>AG360 Field Boundaries</name>
    ${placemarks}
  </Document>
</kml>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ───── Export: Shapefile (as GeoJSON download — true shp needs server-side) ── */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}