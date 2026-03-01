"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  MapPin, Wheat, DollarSign, BarChart3, Package, ArrowRight,
  Maximize2, Minimize2, Satellite, Moon, Mountain, CloudRain,
  Thermometer, Wind, Droplets, Warehouse, Eye, PenTool, Save,
  X, Trash2, Square, Upload, Download, AlertTriangle, Grid3x3,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as turfArea from "@turf/area";
import { fieldToCoords } from "@/lib/lld-geocode";
import { detectOverlaps, generateLLDRectangle, type OverlapResult, type GeoJSONFeature } from "@/lib/boundary-utils";
import BoundaryImportModal from "@/components/maps/BoundaryImportModal";
import BoundaryExportModal from "@/components/maps/BoundaryExportModal";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

/* ───── Types ──────────────────────────────────────────── */
interface FieldRow {
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
interface KPIs {
  totalFields: number; totalAcres: number; seededAcres: number;
  seededCount: number; unseededCount: number;
  totalBudgetCost: number; totalActualCost: number;
  totalBudgetRevenue: number; totalActualRevenue: number;
  costVariance: number; avgCostPerAcre: number;
  netMarginActual: number; netMarginBudget: number;
}
interface FieldWithCoords extends FieldRow { latitude: number; longitude: number; }
interface YardMarker {
  id: string; yard_name: string; latitude: number; longitude: number;
  bin_count: number; total_capacity_bu: number; total_stored_bu: number;
}
interface WeatherPoint {
  latitude: number; longitude: number; temperature: number;
  windspeed: number; precipitation: number;
}

/* ───── Constants ──────────────────────────────────────── */
const CROP_COLORS: Record<string, string> = {
  Canola: "#facc15", Wheat: "#3b82f6", Barley: "#8b5cf6",
  Oats: "#d97706", Peas: "#84cc16", "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e", Chickpeas: "#f97316", Flax: "#6366f1",
  Corn: "#fbbf24", Soybeans: "#16a34a", Durum: "#60a5fa",
};
const STATUS_COLORS: Record<string, string> = {
  planned: "#94A3B8", seeded: "#60A5FA", growing: "#4ADE80", harvested: "#FBBF24",
};
type ColorMode = "crop" | "status" | "margin" | "budget";

function fmt(n: number) { return n.toLocaleString("en-CA", { maximumFractionDigits: 0 }); }
function fmtD(n: number) { return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getFieldColor(f: FieldWithCoords, mode: ColorMode): string {
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

function hexToRgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ───── Mini Donut ─────────────────────────────────────── */
function MiniDonut({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const sw = 4, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (pct/100)*c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

/* ═══════ MAIN ═══════════════════════════════════════════ */
export default function MapsPage() {
  const { user } = useUser();
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const binMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const weatherMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const [fields, setFields] = useState<FieldWithCoords[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<Record<string, { acres: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<FieldWithCoords | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("crop");
  const [mapStyle, setMapStyle] = useState<"satellite" | "dark" | "terrain">("satellite");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showBins, setShowBins] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [radarTimestamp, setRadarTimestamp] = useState("");
  const [yards, setYards] = useState<YardMarker[]>([]);
  const [weather, setWeather] = useState<WeatherPoint[]>([]);
  const [mapHeight, setMapHeight] = useState(700);

  // Draw mode state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingAcres, setDrawingAcres] = useState(0);
  const [drawingHectares, setDrawingHectares] = useState(0);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [overlaps, setOverlaps] = useState<OverlapResult[]>([]);

  const cropYear = new Date().getFullYear();

  const STYLES: Record<string, string> = {
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    dark: "mapbox://styles/mapbox/dark-v11",
    terrain: "mapbox://styles/mapbox/outdoors-v12",
  };

  /* ── Dynamic height ────────────────────────────── */
  useEffect(() => {
    const calc = () => {
      const main = document.querySelector("main");
      if (main) setMapHeight(window.innerHeight - main.getBoundingClientRect().top);
      else setMapHeight(window.innerHeight);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  /* ── Fetch fields ──────────────────────────────── */
  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
      const data = await res.json();
      setKpis(data.kpis || null);
      setCropBreakdown(data.cropBreakdown || {});
      const geo: FieldWithCoords[] = [];
      for (const f of data.fields || []) {
        const c = fieldToCoords(f);
        if (c) geo.push({ ...f, latitude: c.latitude, longitude: c.longitude });
      }
      setFields(geo);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [cropYear]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  // Detect overlaps when fields change
  useEffect(() => {
    if (fields.filter(f => f.boundary).length >= 2) {
      detectOverlaps(fields).then(setOverlaps);
    } else {
      setOverlaps([]);
    }
  }, [fields]);

  /* ── Fetch yards/bins ──────────────────────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/inventory/yards", { headers: { "x-user-id": user.id } });
        const data = await res.json();
        const yds: YardMarker[] = (data.yards || [])
          .filter((y: any) => y.latitude && y.longitude)
          .map((y: any) => ({
            id: y.id, yard_name: y.yard_name,
            latitude: parseFloat(y.latitude), longitude: parseFloat(y.longitude),
            bin_count: y.bin_count || 0,
            total_capacity_bu: parseFloat(y.total_capacity_bu) || 0,
            total_stored_bu: parseFloat(y.total_stored_bu) || 0,
          }));
        setYards(yds);
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  /* ── Fetch weather ─────────────────────────────── */
  const fetchWeather = useCallback(async () => {
    if (fields.length === 0) return;
    try {
      const pts = fields.slice(0, 5);
      const results: WeatherPoint[] = [];
      for (const f of pts) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${f.latitude}&longitude=${f.longitude}&current=temperature_2m,wind_speed_10m,precipitation&timezone=America/Regina`);
        const data = await res.json();
        if (data.current) results.push({ latitude: f.latitude, longitude: f.longitude, temperature: data.current.temperature_2m, windspeed: data.current.wind_speed_10m, precipitation: data.current.precipitation });
      }
      setWeather(results);
    } catch (e) { console.error(e); }
  }, [fields]);

  useEffect(() => { if (showWeather && weather.length === 0) fetchWeather(); }, [showWeather, weather.length, fetchWeather]);

  /* ── Map init ──────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: STYLES[mapStyle],
      center: [-106.5, 51.5],
      zoom: 7,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    // Draw control added lazily in startDrawing()

    return () => { map.remove(); mapRef.current = null; drawRef.current = null; };
  }, [loading]);

  /* ── Draw area calculation ─────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateArea = () => {
      const draw = drawRef.current;
      if (!draw) return;
      const data = draw.getAll();
      if (data.features.length > 0) {
        const poly = data.features[data.features.length - 1];
        if (poly.geometry.type === "Polygon" && (poly.geometry as any).coordinates[0].length >= 4) {
          const areaM2 = turfArea.default(poly as any);
          setDrawingAcres(Math.round((areaM2 / 4046.86) * 100) / 100);
          setDrawingHectares(Math.round((areaM2 / 10000) * 100) / 100);
        }
      } else {
        setDrawingAcres(0);
        setDrawingHectares(0);
      }
    };

    map.on("draw.create", updateArea);
    map.on("draw.update", updateArea);
    map.on("draw.delete", updateArea);
    map.on("draw.render", updateArea);

    return () => {
      map.off("draw.create", updateArea);
      map.off("draw.update", updateArea);
      map.off("draw.delete", updateArea);
      map.off("draw.render", updateArea);
    };
  }, [loading]);

  /* ── Style switch ──────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(STYLES[mapStyle]);
  }, [mapStyle]);

  /* ── Resize ────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current) setTimeout(() => mapRef.current?.resize(), 100);
  }, [panelCollapsed, mapHeight]);

  /* ── Render saved boundaries ───────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fields.length === 0) return;

    const renderBoundaries = () => {
      // Clean up old boundary layers
      fields.forEach(f => {
        try {
          if (map.style && map.isStyleLoaded()) {
            if (map.getLayer(`boundary-fill-${f.id}`)) map.removeLayer(`boundary-fill-${f.id}`);
            if (map.getLayer(`boundary-line-${f.id}`)) map.removeLayer(`boundary-line-${f.id}`);
            if (map.getSource(`boundary-${f.id}`)) map.removeSource(`boundary-${f.id}`);
          }
        } catch { /* style not ready */ }
      });

      // Add boundary layers for fields that have them
      fields.forEach(field => {
        if (!field.boundary) return;
        const color = getFieldColor(field, colorMode);
        const isSelected = selectedField?.id === field.id;

        try {
          map.addSource(`boundary-${field.id}`, {
            type: "geojson",
            data: field.boundary,
          });

          map.addLayer({
            id: `boundary-fill-${field.id}`,
            type: "fill",
            source: `boundary-${field.id}`,
            paint: {
              "fill-color": color,
              "fill-opacity": isSelected ? 0.3 : 0.15,
            },
          });

          map.addLayer({
            id: `boundary-line-${field.id}`,
            type: "line",
            source: `boundary-${field.id}`,
            paint: {
              "line-color": isSelected ? "#FFFFFF" : color,
              "line-width": isSelected ? 3 : 2,
              "line-opacity": 0.8,
            },
          });
        } catch (e) { console.error("Boundary render error:", e); }
      });
    };

    if (map.isStyleLoaded()) renderBoundaries();
    else map.once("style.load", renderBoundaries);
  }, [fields, colorMode, selectedField, mapStyle]);

  /* ── Radar layer ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const safeRemoveRadar = () => {
      try {
        if (map.style && map.isStyleLoaded()) {
          if (map.getLayer("radar-layer")) map.removeLayer("radar-layer");
          if (map.getSource("radar-source")) map.removeSource("radar-source");
        }
      } catch { /* style not ready */ }
    };

    const addRadar = async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();
        const latest = data.radar?.past?.slice(-1)[0];
        if (!latest) return;
        setRadarTimestamp(new Date(latest.time * 1000).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }));
        safeRemoveRadar();
        if (showRadar) {
          map.addSource("radar-source", { type: "raster", tiles: [`https://tilecache.rainviewer.com/v2/radar/${latest.time}/256/{z}/{x}/{y}/4/1_1.png`], tileSize: 256 });
          map.addLayer({ id: "radar-layer", type: "raster", source: "radar-source", paint: { "raster-opacity": 0.6 } });
        }
      } catch (e) { console.error(e); }
    };

    const apply = () => { if (map.isStyleLoaded()) addRadar(); else map.once("style.load", addRadar); };
    apply();
    let iv: NodeJS.Timeout | null = null;
    if (showRadar) iv = setInterval(apply, 300000);
    return () => { if (iv) clearInterval(iv); safeRemoveRadar(); };
  }, [showRadar, mapStyle]);

  /* ── Field markers ─────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fields.length === 0) return;
    const place = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      const bounds = new mapboxgl.LngLatBounds();
      fields.forEach(field => {
        const hasBoundary = !!field.boundary;
        const color = getFieldColor(field, colorMode);
        const sz = Math.max(22, Math.min(40, field.acres / 8));
        const margin = (parseFloat(String(field.actual_revenue)) || 0) - (parseFloat(String(field.actual_total)) || 0);

        // Use boundary centroid if available, otherwise LLD coords
        let lng = field.longitude;
        let lat = field.latitude;
        if (hasBoundary && field.boundary?.geometry?.coordinates?.[0]) {
          const coords = field.boundary.geometry.coordinates[0];
          let sumLng = 0, sumLat = 0;
          for (const c of coords) { sumLng += c[0]; sumLat += c[1]; }
          lng = sumLng / coords.length;
          lat = sumLat / coords.length;
        }

        const el = document.createElement("div");
        Object.assign(el.style, { width: `${sz}px`, height: `${sz}px`, cursor: "pointer" });
        const dot = document.createElement("div");
        Object.assign(dot.style, {
          width: "100%", height: "100%", borderRadius: "50%",
          backgroundColor: hasBoundary ? "transparent" : color,
          border: hasBoundary
            ? "none"
            : (selectedField?.id === field.id ? "3px solid #F1F5F9" : "2px solid rgba(0,0,0,0.3)"),
          boxShadow: hasBoundary ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
          transition: "transform 0.15s ease",
        });

        // Show label for boundary fields
        if (hasBoundary) {
          dot.style.display = "flex";
          dot.style.alignItems = "center";
          dot.style.justifyContent = "center";
          dot.innerHTML = `<span style="font-size:10px;font-weight:600;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;">${field.field_name}</span>`;
        }

        el.appendChild(dot);

        el.onmouseenter = () => {
          if (!hasBoundary) dot.style.transform = "scale(1.3)";
          el.style.zIndex = "10";
          if (popupRef.current) popupRef.current.remove();
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 })
            .setLngLat([lng, lat]).setHTML(`
              <div style="background:#0F1629;border:1px solid #1E293B;border-radius:8px;padding:8px 12px;color:#F1F5F9;font-family:inherit;min-width:140px;">
                <div style="font-weight:600;font-size:13px;margin-bottom:2px;">${field.field_name}</div>
                <div style="font-size:11px;color:#94A3B8;">${field.crop_type || "Unassigned"} · ${field.acres} ac${field.boundary_acres ? ` (mapped: ${fmtD(field.boundary_acres)} ac)` : ""}</div>
                <div style="display:flex;gap:12px;margin-top:6px;">
                  <div><span style="font-size:9px;color:#64748B;">REVENUE</span><div style="font-size:12px;font-weight:600;">$${fmt(parseFloat(String(field.actual_revenue)) || 0)}</div></div>
                  <div><span style="font-size:9px;color:#64748B;">MARGIN</span><div style="font-size:12px;font-weight:600;color:${margin >= 0 ? '#34D399' : '#EF4444'};">$${fmt(margin)}</div></div>
                </div>
              </div>
            `).addTo(map);
          popupRef.current = popup;
        };
        el.onmouseleave = () => {
          if (!hasBoundary) dot.style.transform = "scale(1)";
          el.style.zIndex = "1";
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        };
        el.onclick = () => {
          setSelectedField(field);
          map.flyTo({ center: [lng, lat], zoom: 13, duration: 800 });
        };
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([lng, lat]);
      });
      if (fields.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
      else map.flyTo({ center: [fields[0].longitude, fields[0].latitude], zoom: 11 });
    };
    if (map.isStyleLoaded()) place();
    else map.once("style.load", place);
  }, [fields, colorMode, selectedField]);

  /* ── Bin markers ───────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    binMarkersRef.current.forEach(m => m.remove());
    binMarkersRef.current = [];
    if (!map || !showBins || yards.length === 0) return;
    const place = () => {
      yards.forEach(yard => {
        const fillPct = yard.total_capacity_bu > 0 ? (yard.total_stored_bu / yard.total_capacity_bu) * 100 : 0;
        const fillColor = fillPct > 80 ? "#EF4444" : fillPct > 50 ? "#FBBF24" : "#34D399";
        const el = document.createElement("div");
        Object.assign(el.style, { width: "28px", height: "28px", cursor: "pointer" });
        const box = document.createElement("div");
        Object.assign(box.style, {
          width: "100%", height: "100%", borderRadius: "6px",
          backgroundColor: "#1E293B", border: `2px solid ${fillColor}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.15s ease",
        });
        box.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${fillColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v18H3z"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>`;
        el.appendChild(box);
        el.onmouseenter = () => {
          box.style.transform = "scale(1.2)";
          if (popupRef.current) popupRef.current.remove();
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 })
            .setLngLat([yard.longitude, yard.latitude]).setHTML(`
              <div style="background:#0F1629;border:1px solid #1E293B;border-radius:8px;padding:6px 10px;color:#F1F5F9;font-family:inherit;">
                <div style="font-weight:600;font-size:13px;">${yard.yard_name}</div>
                <div style="font-size:12px;color:${fillColor};font-weight:600;margin-top:2px;">${Math.round(fillPct)}% full</div>
              </div>
            `).addTo(map);
          popupRef.current = popup;
        };
        el.onmouseleave = () => {
          box.style.transform = "scale(1)";
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        };
        el.onclick = () => { window.location.href = "/inventory"; };
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([yard.longitude, yard.latitude]).addTo(map);
        binMarkersRef.current.push(marker);
      });
    };
    if (map.isStyleLoaded()) place();
    else map.once("style.load", place);
  }, [yards, showBins]);

  /* ── Weather markers ───────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    weatherMarkersRef.current.forEach(m => m.remove());
    weatherMarkersRef.current = [];
    if (!map || !showWeather || weather.length === 0) return;
    const place = () => {
      weather.forEach(w => {
        const el = document.createElement("div");
        Object.assign(el.style, {
          backgroundColor: "rgba(15,22,41,0.85)", border: "1px solid #1E293B",
          borderRadius: "10px", padding: "6px 10px", color: "#F1F5F9",
          fontSize: "11px", pointerEvents: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px",
        });
        const tc = w.temperature > 25 ? "#EF4444" : w.temperature > 10 ? "#FBBF24" : w.temperature > 0 ? "#60A5FA" : "#94A3B8";
        el.innerHTML = `<span style="font-weight:700;font-size:14px;color:${tc}">${w.temperature}°C</span><span style="color:#64748B;font-size:10px;">${w.windspeed} km/h</span>${w.precipitation > 0 ? `<span style="color:#60A5FA;font-size:10px;">${w.precipitation}mm</span>` : ""}`;
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom-left" }).setLngLat([w.longitude + 0.02, w.latitude + 0.02]).addTo(map);
        weatherMarkersRef.current.push(marker);
      });
    };
    if (map.isStyleLoaded()) place();
    else map.once("style.load", place);
  }, [weather, showWeather]);

  /* ── Draw mode handlers ────────────────────────── */
  const startDrawing = () => {
    const map = mapRef.current;
    if (!map || !selectedField) return;

    // Lazily add draw control on first use
    if (!drawRef.current) {
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        defaultMode: "simple_select",
        styles: [
          { id: "gl-draw-polygon-fill", type: "fill", filter: ["all", ["==", "$type", "Polygon"]], paint: { "fill-color": "#60A5FA", "fill-opacity": 0.15 } },
          { id: "gl-draw-polygon-stroke", type: "line", filter: ["all", ["==", "$type", "Polygon"]], paint: { "line-color": "#60A5FA", "line-width": 2, "line-dasharray": [2, 2] } },
          { id: "gl-draw-polygon-midpoint", type: "circle", filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]], paint: { "circle-radius": 4, "circle-color": "#60A5FA" } },
          { id: "gl-draw-polygon-vertex-active", type: "circle", filter: ["all", ["==", "$type", "Point"], ["==", "meta", "vertex"]], paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#60A5FA" } },
          { id: "gl-draw-line", type: "line", filter: ["all", ["==", "$type", "LineString"]], paint: { "line-color": "#60A5FA", "line-width": 2, "line-dasharray": [2, 2] } },
          { id: "gl-draw-point", type: "circle", filter: ["all", ["==", "$type", "Point"], ["!=", "meta", "midpoint"]], paint: { "circle-radius": 6, "circle-color": "#fff", "circle-stroke-width": 2, "circle-stroke-color": "#60A5FA" } },
        ],
      });
      map.addControl(draw, "top-left");
      drawRef.current = draw;
    }

    drawRef.current.deleteAll();
    drawRef.current.changeMode("draw_polygon");
    setIsDrawing(true);
    setDrawingAcres(0);
    setDrawingHectares(0);
  };

  const cancelDrawing = () => {
    if (drawRef.current) { drawRef.current.deleteAll(); drawRef.current.changeMode("simple_select"); }
    setIsDrawing(false);
    setDrawingAcres(0);
    setDrawingHectares(0);
  };

  const saveBoundary = async () => {
    if (!drawRef.current || !selectedField) return;
    const data = drawRef.current.getAll();
    if (data.features.length === 0) return;

    const polygon = data.features[data.features.length - 1];
    setSavingBoundary(true);

    try {
      const res = await fetch("/api/fields/boundary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_id: selectedField.id,
          boundary: polygon,
          boundary_acres: drawingAcres,
        }),
      });
      const result = await res.json();
      if (result.success) {
        drawRef.current.deleteAll();
        drawRef.current.changeMode("simple_select");
        setIsDrawing(false);
        setDrawingAcres(0);
        setDrawingHectares(0);
        // Refresh fields
        await fetchFields();
      }
    } catch (e) { console.error("Save boundary error:", e); }
    finally { setSavingBoundary(false); }
  };

  const deleteBoundary = async () => {
    if (!selectedField) return;
    setSavingBoundary(true);
    try {
      await fetch(`/api/fields/boundary?field_id=${selectedField.id}`, { method: "DELETE" });
      await fetchFields();
    } catch (e) { console.error(e); }
    finally { setSavingBoundary(false); }
  };
  // Import handler
  const handleImportAssign = async (fieldId: string, boundary: GeoJSONFeature, acres: number) => {
    const res = await fetch("/api/fields/boundary", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, boundary, boundary_acres: acres }),
    });
    const result = await res.json();
    if (!result.success) throw new Error("Save failed");
    await fetchFields();
  };

  // LLD snap handler
  const snapToLLD = async () => {
    if (!selectedField) return;
    const rect = generateLLDRectangle(
      selectedField.lld_quarter,
      selectedField.lld_section,
      selectedField.lld_township,
      selectedField.lld_range,
      selectedField.lld_meridian,
    );
    if (!rect) return;
    setSavingBoundary(true);
    try {
      const { calcAcres: ca } = await import("@/lib/boundary-utils");
      const acres = ca(rect);
      await fetch("/api/fields/boundary", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_id: selectedField.id, boundary: rect, boundary_acres: acres }),
      });
      await fetchFields();
    } catch (e) { console.error(e); }
    finally { setSavingBoundary(false); }
  };

  /* ── Legend ─────────────────────────────────────── */
  const legendItems = useMemo(() => {
    if (colorMode === "crop")
      return Object.entries(cropBreakdown).map(([crop, d]) => ({ color: CROP_COLORS[crop] || "#9ca3af", label: crop, detail: `${fmt(d.acres)} ac` }));
    if (colorMode === "status")
      return Object.entries(STATUS_COLORS).map(([s, c]) => ({ color: c, label: s.charAt(0).toUpperCase()+s.slice(1), detail: `${fields.filter(f=>(f.crop_status||"planned")===s).length}` }));
    if (colorMode === "margin")
      return [{ color:"#22c55e",label:"> $50K",detail:"Strong" },{ color:"#4ade80",label:"$20-50K",detail:"Good" },{ color:"#86efac",label:"$0-20K",detail:"OK" },{ color:"#fbbf24",label:"< $0",detail:"Warning" },{ color:"#ef4444",label:"< -$10K",detail:"Loss" }];
    return [{ color:"#22c55e",label:"< 75%",detail:"On track" },{ color:"#4ade80",label:"75-90%",detail:"Watch" },{ color:"#fbbf24",label:"90-100%",detail:"Near" },{ color:"#ef4444",label:"> 100%",detail:"Over" }];
  }, [colorMode, cropBreakdown, fields]);

  /* ═══════ RENDER ═══════════════════════════════════════ */
  return (
    <div style={{ margin: "-24px", display: "flex", height: mapHeight }}>

      {/* ═══ MAP ═════════════════════════════════════════ */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: mapHeight }} />

        {/* Top Controls */}
        <div style={{ position: "absolute", top: 16, left: 60, zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
            {([
              { key: "satellite" as const, icon: Satellite, label: "Satellite" },
              { key: "dark" as const, icon: Moon, label: "Dark" },
              { key: "terrain" as const, icon: Mountain, label: "Terrain" },
            ]).map(s => (
              <button key={s.key} onClick={() => setMapStyle(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                  mapStyle===s.key ? "bg-[#34D399] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
                }`}>
                <s.icon size={12}/> {s.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
            {(["crop","status","margin","budget"] as const).map(m => (
              <button key={m} onClick={() => setColorMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  colorMode===m ? "bg-[#60A5FA] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
                }`}>
                {m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
            <button onClick={() => setShowBins(!showBins)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                showBins ? "bg-[#F59E0B] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
              }`}>
              <Warehouse size={12}/> Bins
            </button>
            <button onClick={() => setShowWeather(!showWeather)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                showWeather ? "bg-[#60A5FA] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
              }`}>
              <CloudRain size={12}/> Weather
            </button>
            <button onClick={() => setShowRadar(!showRadar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
                showRadar ? "bg-[#8B5CF6] text-white" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
              }`}>
              <Eye size={12}/> Radar
            </button>
          </div>
        </div>

        {/* Draw Mode Bar */}
        {isDrawing && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#0F1629]/95 border border-[#60A5FA]/40 rounded-xl px-5 py-3 shadow-xl flex items-center gap-4">
            <div>
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Drawing boundary for</p>
              <p className="text-sm font-semibold text-[#F1F5F9]">{selectedField?.field_name}</p>
            </div>
            <div className="border-l border-[#1E293B] pl-4">
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide">Area</p>
              <p className="text-base font-bold text-[#60A5FA]">
                {drawingAcres > 0 ? `${fmtD(drawingAcres)} ac` : "Click to draw..."}{" "}
                {drawingHectares > 0 && <span className="text-xs text-[#64748B] font-normal">({fmtD(drawingHectares)} ha)</span>}
              </p>
            </div>
            {selectedField?.acres && drawingAcres > 0 && (
              <div className="border-l border-[#1E293B] pl-4">
                <p className="text-[10px] text-[#64748B] uppercase tracking-wide">vs Declared</p>
                {(() => {
                  const diff = drawingAcres - selectedField.acres;
                  const pct = ((diff / selectedField.acres) * 100).toFixed(1);
                  return <p className={`text-sm font-semibold ${Math.abs(diff) < 5 ? "text-[#34D399]" : "text-[#FBBF24]"}`}>
                    {diff > 0 ? "+" : ""}{fmtD(diff)} ac ({pct}%)
                  </p>;
                })()}
              </div>
            )}
            <div className="flex items-center gap-2 ml-4">
              <button onClick={saveBoundary} disabled={drawingAcres === 0 || savingBoundary}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34D399] text-[#0F1629] rounded-lg text-xs font-semibold hover:bg-[#2AB385] transition-colors disabled:opacity-50">
                <Save size={12}/> {savingBoundary ? "Saving..." : "Save"}
              </button>
              <button onClick={cancelDrawing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] text-[#94A3B8] rounded-lg text-xs font-semibold hover:text-white transition-colors">
                <X size={12}/> Cancel
              </button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-10 bg-[#0F1629]/90 border border-[#1E293B] rounded-xl p-3 shadow-lg max-w-[220px]">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-2">
            {colorMode==="crop"?"Crop Type":colorMode==="status"?"Field Status":colorMode==="margin"?"Net Margin":"Budget Usage"}
          </p>
          {legendItems.map(i => (
            <div key={i.label} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: i.color }} />
              <span className="text-xs text-[#F1F5F9] flex-1">{i.label}</span>
              <span className="text-[10px] text-[#64748B]">{i.detail}</span>
            </div>
          ))}
          {showBins && yards.length > 0 && (
            <><div className="border-t border-[#1E293B] my-2"/><div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded bg-[#1E293B] border border-[#34D399] flex-shrink-0"/><span className="text-xs text-[#F1F5F9] flex-1">Bin Yards</span><span className="text-[10px] text-[#64748B]">{yards.length}</span></div></>
          )}
          {showWeather && weather.length > 0 && (
            <><div className="border-t border-[#1E293B] my-2"/><div className="flex items-center gap-2"><Thermometer size={12} className="text-[#60A5FA]"/><span className="text-xs text-[#F1F5F9]">Live Weather</span></div></>
          )}
          {showRadar && (
            <>
              <div className="border-t border-[#1E293B] my-2"/>
              <div className="flex items-center gap-2"><Eye size={12} className="text-[#8B5CF6]"/><span className="text-xs text-[#F1F5F9] flex-1">Radar</span>{radarTimestamp && <span className="text-[10px] text-[#64748B]">{radarTimestamp}</span>}</div>
              <div className="flex items-center gap-1 mt-1.5">{["#00FF00","#FFFF00","#FFA500","#FF0000","#FF00FF"].map((c,i)=>(<div key={i} style={{flex:1,height:4,backgroundColor:c,borderRadius:2,opacity:0.7}}/>))}</div>
              <div className="flex justify-between text-[8px] text-[#64748B] mt-0.5"><span>Light</span><span>Heavy</span></div>
            </>
          )}
        </div>

        {/* Panel Toggle */}
        <button onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="absolute top-4 right-4 z-10 bg-[#0F1629]/90 border border-[#1E293B] rounded-lg p-2 shadow-lg text-[#94A3B8] hover:text-white transition-colors">
          {panelCollapsed ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
        </button>
      </div>

      {/* ═══ INTELLIGENCE PANEL ══════════════════════════ */}
      {!panelCollapsed && (
        <div style={{ width: 380, flexShrink: 0, background: "#0B1120", borderLeft: "1px solid #1E293B", overflowY: "auto", height: mapHeight }}>
          <div className="p-5">
            <h1 className="text-lg font-bold text-[#F1F5F9]">Farm Command Center</h1>
            <p className="text-xs text-[#64748B] mt-0.5 mb-5">{cropYear} crop year · {fields.length} fields mapped</p>

            {/* KPIs */}
            {kpis && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                {[
                  { icon: MapPin, ic: "text-[#34D399]", l: "Fields", v: String(kpis.totalFields), s: `${kpis.seededCount} seeded` },
                  { icon: Wheat, ic: "text-[#60A5FA]", l: "Acres", v: fmt(kpis.totalAcres), s: `${fmt(kpis.seededAcres)} seeded` },
                  { icon: DollarSign, ic: "text-[#FBBF24]", l: "Costs", v: `$${fmt(kpis.totalActualCost)}`, s: `$${fmtD(kpis.avgCostPerAcre)}/ac` },
                  { icon: BarChart3, ic: kpis.netMarginActual>=0?"text-[#34D399]":"text-[#EF4444]", l: "Margin",
                    v: `$${fmt(kpis.netMarginActual)}`, s: `$${kpis.seededAcres>0?fmtD(kpis.netMarginActual/kpis.seededAcres):"0.00"}/ac`,
                    vc: kpis.netMarginActual>=0?"text-emerald-400":"text-red-400" },
                ].map((k: any) => (
                  <div key={k.l} className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                    <div className="flex items-center gap-1.5 mb-1"><k.icon size={11} className={k.ic}/><span className="text-[10px] text-[#64748B] uppercase">{k.l}</span></div>
                    <p className={`text-lg font-bold ${k.vc||"text-white"}`}>{k.v}</p>
                    <p className="text-[10px] text-[#475569]">{k.s}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Crop Mix */}
            {Object.keys(cropBreakdown).length > 0 && kpis && kpis.seededAcres > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-2">Crop Mix</p>
                <div className="flex rounded-lg overflow-hidden h-2.5 mb-2">
                  {Object.entries(cropBreakdown).sort((a,b)=>b[1].acres-a[1].acres).map(([crop,d])=>(
                    <div key={crop} style={{ width:`${(d.acres/kpis.seededAcres)*100}%`, backgroundColor: CROP_COLORS[crop]||"#9ca3af" }}/>
                  ))}
                </div>
                {Object.entries(cropBreakdown).sort((a,b)=>b[1].acres-a[1].acres).map(([crop,d])=>(
                  <div key={crop} className="flex items-center gap-2 text-[11px] mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CROP_COLORS[crop]||"#9ca3af" }}/>
                    <span className="text-[#94A3B8] flex-1">{crop}</span>
                    <span className="text-[#64748B]">{fmt(d.acres)} ac</span>
                  </div>
                ))}
              </div>
            )}

            {/* Weather */}
            {showWeather && weather.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-2">Current Conditions</p>
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Thermometer size={14} className="text-[#60A5FA]"/><span className="text-lg font-bold text-white">{weather[0].temperature}°C</span></div>
                    <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                      <span className="flex items-center gap-1"><Wind size={11}/> {weather[0].windspeed} km/h</span>
                      <span className="flex items-center gap-1"><Droplets size={11}/> {weather[0].precipitation}mm</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Import/Export */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setShowImportModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-[#94A3B8] hover:text-white hover:border-[#60A5FA]/40 transition-colors">
                <Upload size={12}/> Import
              </button>
              <button onClick={() => setShowExportModal(true)}
                className="flex-1 flex items-center justify-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-[#94A3B8] hover:text-white hover:border-[#34D399]/40 transition-colors">
                <Download size={12}/> Export
              </button>
            </div>

            {/* Overlap Warnings */}
            {overlaps.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#FBBF24] mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={10}/> Boundary Overlaps
                </p>
                {overlaps.map((o, i) => (
                  <div key={i} className="bg-[#FBBF24]/5 border border-[#FBBF24]/20 rounded-lg px-3 py-2 mb-1.5 text-xs">
                    <p className="text-[#FBBF24] font-semibold">{o.fieldName1} ↔ {o.fieldName2}</p>
                    <p className="text-[#64748B]">{o.overlapAcres} acres overlap</p>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-[#1E293B] my-4"/>

            {/* Selected Field */}
            {selectedField ? (
              <div>
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-3">Selected Field</p>
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-xl overflow-hidden">
                  <div className="h-1 w-full" style={{ backgroundColor: CROP_COLORS[selectedField.crop_type||""]||"#1E293B" }}/>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-[#F1F5F9] font-semibold text-base">{selectedField.field_name}</h3>
                        <p className="text-[#64748B] text-sm">{selectedField.acres} acres</p>
                        <p className="text-[#475569] text-xs mt-0.5">{selectedField.lld_quarter}-{selectedField.lld_section}-{selectedField.lld_township}-{selectedField.lld_range}-W{selectedField.lld_meridian}</p>
                        {selectedField.boundary_acres && (
                          <p className="text-[#60A5FA] text-xs mt-0.5">Mapped: {fmtD(selectedField.boundary_acres)} ac</p>
                        )}
                      </div>
                      <MiniDonut value={parseFloat(String(selectedField.actual_total))||0} max={parseFloat(String(selectedField.budget_total))||1}
                        color={(parseFloat(String(selectedField.actual_total))||0)>(parseFloat(String(selectedField.budget_total))||0)?"#EF4444":"#34D399"}/>
                    </div>
                    {selectedField.crop_type && (
                      <>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CROP_COLORS[selectedField.crop_type]||"#9ca3af" }}/>
                          <span className="text-sm font-medium text-[#F1F5F9]">{selectedField.crop_type}</span>
                          {selectedField.variety && <span className="text-xs text-[#64748B]">{selectedField.variety}</span>}
                          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                            selectedField.crop_status==="seeded"?"bg-[#1E3A5F] text-[#60A5FA]":
                            selectedField.crop_status==="growing"?"bg-[#14532D] text-[#4ADE80]":
                            selectedField.crop_status==="harvested"?"bg-[#78350F] text-[#FBBF24]":"bg-[#334155] text-[#94A3B8]"
                          }`}>{(selectedField.crop_status||"planned").charAt(0).toUpperCase()+(selectedField.crop_status||"planned").slice(1)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {[
                            { label:"Revenue", val: parseFloat(String(selectedField.actual_revenue))||0, pos: true },
                            { label:"Cost", val: parseFloat(String(selectedField.actual_total))||0, pos: true },
                            { label:"Net Margin", val: (parseFloat(String(selectedField.actual_revenue))||0)-(parseFloat(String(selectedField.actual_total))||0), pos: false },
                            { label:"Variance", val: (parseFloat(String(selectedField.actual_total))||0)-(parseFloat(String(selectedField.budget_total))||0), pos: false },
                          ].map(m => (
                            <div key={m.label} className="bg-white/[0.03] rounded-lg px-3 py-2">
                              <p className="text-[10px] text-[#64748B]">{m.label}</p>
                              <p className={`text-sm font-semibold ${m.pos?"text-white":m.val>=0?"text-emerald-400":"text-red-400"}`}>
                                {m.label==="Variance"&&m.val>0?"+":""}${fmt(m.val)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Boundary Actions */}
                    <div className="space-y-2 mb-3">
                      {!isDrawing && (
                        <>
                          <button onClick={startDrawing}
                            className="w-full flex items-center justify-center gap-2 bg-[#60A5FA]/10 border border-[#60A5FA]/20 rounded-lg px-3 py-2 text-sm font-semibold text-[#60A5FA] hover:bg-[#60A5FA]/20 transition-colors">
                            <PenTool size={14}/> {selectedField.boundary ? "Redraw Boundary" : "Draw Boundary"}
                          </button>
                          {!selectedField.boundary && (
                            <button onClick={snapToLLD} disabled={savingBoundary}
                              className="w-full flex items-center justify-center gap-2 bg-white/[0.03] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-[#94A3B8] hover:text-white hover:border-[#60A5FA]/40 transition-colors disabled:opacity-50">
                              <Grid3x3 size={12}/> Snap to LLD Quarter Section
                            </button>
                          )}
                        </>
                      )}
                      {selectedField.boundary && !isDrawing && (
                        <button onClick={deleteBoundary} disabled={savingBoundary}
                          className="w-full flex items-center justify-center gap-2 bg-white/[0.03] border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs text-[#EF4444] hover:border-[#EF4444]/40 transition-colors disabled:opacity-50">
                          <Trash2 size={12}/> Remove Boundary
                        </button>
                      )}
                    </div>

                    <button onClick={() => router.push(`/fields/${selectedField.id}`)}
                      className="w-full flex items-center justify-between bg-[#34D399]/10 border border-[#34D399]/20 rounded-lg px-3 py-2 text-sm font-semibold text-[#34D399] hover:bg-[#34D399]/20 transition-colors mb-2">
                      <span>Open Field Detail</span><ArrowRight size={14}/>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => window.location.href=selectedField.crop_type?`/marketing?crop=${encodeURIComponent(selectedField.crop_type)}`:"/marketing"}
                        className="flex items-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-[#94A3B8] hover:text-white hover:border-[#34D399]/40 transition-colors">
                        <DollarSign size={12}/> Contracts
                      </button>
                      <button onClick={() => window.location.href=selectedField.crop_type?`/inventory?crop=${encodeURIComponent(selectedField.crop_type)}`:"/inventory"}
                        className="flex items-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-[#94A3B8] hover:text-white hover:border-[#34D399]/40 transition-colors">
                        <Package size={12}/> Inventory
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <MapPin size={24} className="mx-auto text-[#475569] mb-2"/>
                <p className="text-sm text-[#64748B]">Click a field on the map</p>
                <p className="text-xs text-[#475569] mt-1">to view details and actions</p>
              </div>
            )}

            {/* Field List */}
            <div className="mt-5">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-2">All Fields ({fields.length})</p>
              {fields.map(field => {
                const margin = (parseFloat(String(field.actual_revenue))||0)-(parseFloat(String(field.actual_total))||0);
                let fLng = field.longitude, fLat = field.latitude;
                if (field.boundary?.geometry?.coordinates?.[0]) {
                  const cs = field.boundary.geometry.coordinates[0];
                  fLng = cs.reduce((s: number, c: number[]) => s + c[0], 0) / cs.length;
                  fLat = cs.reduce((s: number, c: number[]) => s + c[1], 0) / cs.length;
                }
                return (
                  <button key={field.id} onClick={() => {
                    setSelectedField(field);
                    mapRef.current?.flyTo({ center:[field.boundary?.geometry?.coordinates?.[0] ? [field.boundary.geometry.coordinates[0].reduce((s: number,c: number[]) => s+c[0], 0)/field.boundary.geometry.coordinates[0].length, field.boundary.geometry.coordinates[0].reduce((s: number,c: number[]) => s+c[1], 0)/field.boundary.geometry.coordinates[0].length] : [field.longitude,field.latitude]][0] as [number,number], zoom:13, duration:800 });
                  }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1.5 transition-colors ${
                    selectedField?.id===field.id?"bg-[#34D399]/10 border border-[#34D399]/20":"bg-[#0F1629] border border-[#1E293B] hover:border-[#34D399]/30"
                  }`}>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CROP_COLORS[field.crop_type||""]||"#475569" }}/>
                      {field.boundary && <Square size={8} className="text-[#60A5FA]"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F1F5F9] truncate">{field.field_name}</p>
                      <p className="text-[10px] text-[#64748B]">{field.crop_type||"Unassigned"} · {field.acres} ac</p>
                    </div>
                    <span className={`text-xs font-semibold ${margin>=0?"text-emerald-400":"text-red-400"}`}>${fmt(margin)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImportModal && (
        <BoundaryImportModal
          fields={fields}
          onClose={() => setShowImportModal(false)}
          onAssign={handleImportAssign}
        />
      )}
      {showExportModal && (
        <BoundaryExportModal
          fields={fields}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}