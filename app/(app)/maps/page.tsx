"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Maximize2, Minimize2, MapPin, X, Eye } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import * as turfArea from "@turf/area";

import { useMapData } from "@/hooks/useMapData";
import {
  MAP_STYLES, getFieldColor, getFieldPosition, getFieldMargin, fmtD, fmt,
  type ColorMode, type MapStyleKey, type FieldWithCoords, type YardMarker, type WeatherPoint,
} from "@/lib/maps-types";
import { generateLLDRectangle, calcAcres, type GeoJSONFeature } from "@/lib/boundary-utils";

import MapControls from "@/components/maps/MapControls";
import DrawBar from "@/components/maps/DrawBar";
import MapLegend from "@/components/maps/MapLegend";
import IntelligencePanel from "@/components/maps/IntelligencePanel";
import BoundaryImportModal from "@/components/maps/BoundaryImportModal";
import BoundaryExportModal from "@/components/maps/BoundaryExportModal";
import ScoutReportModal from "@/components/maps/ScoutReportModal";
import { WindParticleLayer } from "@/lib/maps/windParticles";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function MapsPage() {
  const { fields, kpis, cropBreakdown, yards, weather, overlaps, loading, cropYear, fetchFields, fetchWeather } = useMapData();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const binMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const weatherMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  const [selectedField, setSelectedField] = useState<FieldWithCoords | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("crop");
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("satellite");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [showBins, setShowBins] = useState(true);
  const [showWeather, setShowWeather] = useState(false);
  const [showRadar, setShowRadar] = useState(false);
  const [showWind, setShowWind] = useState(false);
  const [showScoutPins, setShowScoutPins] = useState(true);
  const [scoutReports, setScoutReports] = useState<any[]>([]);
  const [scoutMode, setScoutMode] = useState(false);
  const [scoutModalOpen, setScoutModalOpen] = useState(false);
  const [scoutClickCoords, setScoutClickCoords] = useState({ lat: 0, lng: 0 });
  const scoutMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const windLayerRef = useRef<WindParticleLayer | null>(null);
  const [radarTimestamp, setRadarTimestamp] = useState("");
  const [mapHeight, setMapHeight] = useState(700);

  // Draw state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingAcres, setDrawingAcres] = useState(0);
  const [drawingHectares, setDrawingHectares] = useState(0);
  const [savingBoundary, setSavingBoundary] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

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

  /* ── Scout reports fetch ───────────────────────── */
  const fetchScoutReports = useCallback(async () => {
    try {
      const res = await fetch(`/api/maps/scout-reports?cropYear=${cropYear}`);
      if (res.ok) setScoutReports(await res.json());
    } catch {}
  }, [cropYear]);

  useEffect(() => { fetchScoutReports(); }, [fetchScoutReports]);
  /* ── Weather trigger ───────────────────────────── */
  useEffect(() => { if (showWeather && weather.length === 0) fetchWeather(); }, [showWeather, weather.length, fetchWeather]);
/* ── Wind particles toggle ─────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (showWind) {
      if (!windLayerRef.current) {
        windLayerRef.current = new WindParticleLayer(map);
      }
      windLayerRef.current.start();
    } else {
      if (windLayerRef.current) {
        windLayerRef.current.stop();
        windLayerRef.current = null;
      }
    }
    return () => {
      if (windLayerRef.current) {
        windLayerRef.current.stop();
        windLayerRef.current = null;
      }
    };
  }, [showWind]);
/* ── Scout pin markers ─────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear old scout markers
    scoutMarkersRef.current.forEach((m) => m.remove());
    scoutMarkersRef.current = [];
    if (!showScoutPins) return;

    const SCOUT_COLORS: Record<string, string> = {
      general: "#38BDF8", pest: "#F87171", disease: "#FBBF24",
      weed: "#34D399", nutrient: "#A78BFA", moisture: "#38BDF8",
      hail: "#94A3B8", other: "#94A3B8",
    };
    const SEV_SIZES: Record<string, number> = { low: 10, medium: 13, high: 16, critical: 20 };

    scoutReports.forEach((r) => {
      const color = SCOUT_COLORS[r.report_type] || "#94A3B8";
      const size = SEV_SIZES[r.severity] || 12;
      const el = document.createElement("div");
      el.style.cssText = `width:${size + 8}px;height:${size + 8}px;display:flex;align-items:center;justify-content:center;cursor:pointer;`;
      const dot = document.createElement("div");
      dot.style.cssText = `width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px ${color}80;transition:transform 0.15s;`;
      el.appendChild(dot);
      el.onmouseenter = () => { dot.style.transform = "scale(1.4)"; };
      el.onmouseleave = () => { dot.style.transform = "scale(1)"; };

      const popupHTML = `
          <div style="font-family:system-ui;color:#F1F5F9;padding:4px 0;">
            <div style="font-size:13px;font-weight:700;margin-bottom:4px;">${r.title}</div>
            <div style="display:flex;gap:8px;margin-bottom:4px;">
              <span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border-radius:4px;background:${color}20;color:${color};">${r.report_type}</span>
              <span style="font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,0.06);color:#94A3B8;">${r.severity}</span>
            </div>
            ${r.notes ? `<p style="font-size:11px;color:#94A3B8;margin:4px 0 0;line-height:1.4;">${r.notes}</p>` : ""}
            ${r.field_name ? `<div style="font-size:10px;color:#64748B;margin-top:4px;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" style="display:inline;vertical-align:middle;margin-right:3px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>${r.field_name}</div>` : ""}
            <div style="font-size:10px;color:#475569;margin-top:4px;">${new Date(r.scouted_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</div>
          </div>
        `;

      const lngLat: [number, number] = [r.longitude, r.latitude];

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        // Close any existing popup
        if (popupRef.current) popupRef.current.remove();
        popupRef.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12, maxWidth: "260px" })
          .setLngLat(lngLat)
          .setHTML(popupHTML)
          .addTo(mapRef.current!);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(map);
      scoutMarkersRef.current.push(marker);
      scoutMarkersRef.current.push(marker);
    });
  }, [scoutReports, showScoutPins]);
  /* ── Scout mode cursor ─────────────────────────── */
  useEffect(() => {
    (window as any).__scoutMode = scoutMode;
    const map = mapRef.current;
    if (map?.getCanvas()) {
      map.getCanvas().style.cursor = scoutMode ? "crosshair" : "";
    }
  }, [scoutMode]);
  /* ── Map init ──────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLES[mapStyle],
      center: [-106.5, 51.5],
      zoom: 7,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;
    // Scout mode — click to drop pin
    map.on("click", (e) => {
      if (!(window as any).__scoutMode) return;
      setScoutClickCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      setScoutModalOpen(true);
      setScoutMode(false);
      (window as any).__scoutMode = false;
      if (map.getCanvas()) map.getCanvas().style.cursor = "";
    });
    return () => { map.remove(); mapRef.current = null; drawRef.current = null; };
  }, [loading]);

  /* ── Draw area calc ────────────────────────────── */
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
      } else { setDrawingAcres(0); setDrawingHectares(0); }
    };
    map.on("draw.create", updateArea);
    map.on("draw.update", updateArea);
    map.on("draw.delete", updateArea);
    map.on("draw.render", updateArea);
    return () => { map.off("draw.create", updateArea); map.off("draw.update", updateArea); map.off("draw.delete", updateArea); map.off("draw.render", updateArea); };
  }, [loading]);

  /* ── Style switch ──────────────────────────────── */
  const initialStyleRef = useRef(true);
  useEffect(() => {
    if (initialStyleRef.current) { initialStyleRef.current = false; return; }
    if (mapRef.current) mapRef.current.setStyle(MAP_STYLES[mapStyle]);
  }, [mapStyle]);

  /* ── Resize ────────────────────────────────────── */
  useEffect(() => { if (mapRef.current) setTimeout(() => mapRef.current?.resize(), 100); }, [panelCollapsed, mapHeight]);

  /* ── Render boundaries ─────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fields.length === 0) return;
    const render = () => {
      fields.forEach((f: FieldWithCoords) => {
        try {
          if (map.style && map.isStyleLoaded()) {
            if (map.getLayer(`boundary-fill-${f.id}`)) map.removeLayer(`boundary-fill-${f.id}`);
            if (map.getLayer(`boundary-line-${f.id}`)) map.removeLayer(`boundary-line-${f.id}`);
            if (map.getSource(`boundary-${f.id}`)) map.removeSource(`boundary-${f.id}`);
          }
        } catch { /* */ }
      });
      fields.forEach((field: FieldWithCoords) => {
        if (!field.boundary) return;
        const color = getFieldColor(field, colorMode);
        const isSelected = selectedField?.id === field.id;
        try {
          map.addSource(`boundary-${field.id}`, { type: "geojson", data: field.boundary });
          map.addLayer({ id: `boundary-fill-${field.id}`, type: "fill", source: `boundary-${field.id}`, paint: { "fill-color": color, "fill-opacity": isSelected ? 0.3 : 0.15 } });
          map.addLayer({ id: `boundary-line-${field.id}`, type: "line", source: `boundary-${field.id}`, paint: { "line-color": isSelected ? "#FFFFFF" : color, "line-width": isSelected ? 3 : 2, "line-opacity": 0.8 } });
        } catch (e) { console.error("Boundary render:", e); }
      });
    };
    if (map.isStyleLoaded()) render();
    else map.once("style.load", render);
  }, [fields, colorMode, selectedField, mapStyle]);

  /* ── Radar ─────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const safeRemove = () => { try { if (map.style && map.isStyleLoaded()) { if (map.getLayer("radar-layer")) map.removeLayer("radar-layer"); if (map.getSource("radar-source")) map.removeSource("radar-source"); } } catch { /* */ } };
    const addRadar = async () => {
      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await res.json();
        const latest = data.radar?.past?.slice(-1)[0];
        if (!latest) return;
        setRadarTimestamp(new Date(latest.time * 1000).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }));
        safeRemove();
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
    return () => { if (iv) clearInterval(iv); safeRemove(); };
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
      fields.forEach((field: FieldWithCoords) => {
        const hasBoundary = !!field.boundary;
        const color = getFieldColor(field, colorMode);
        const sz = Math.max(22, Math.min(40, field.acres / 8));
        const margin = getFieldMargin(field);
        const pos = getFieldPosition(field);

        const el = document.createElement("div");
        Object.assign(el.style, { width: `${sz}px`, height: `${sz}px`, cursor: "pointer" });
        const dot = document.createElement("div");
        Object.assign(dot.style, {
          width: "100%", height: "100%", borderRadius: "50%",
          backgroundColor: hasBoundary ? "transparent" : color,
          border: hasBoundary ? "none" : (selectedField?.id === field.id ? "3px solid #F1F5F9" : "2px solid rgba(0,0,0,0.3)"),
          boxShadow: hasBoundary ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
          transition: "transform 0.15s ease",
        });
        if (hasBoundary) {
          dot.style.display = "flex"; dot.style.alignItems = "center"; dot.style.justifyContent = "center";
          dot.innerHTML = `<span style="font-size:10px;font-weight:600;color:white;text-shadow:0 1px 3px rgba(0,0,0,0.8);white-space:nowrap;">${field.field_name}</span>`;
        }
        el.appendChild(dot);

        el.onmouseenter = () => {
          if (!hasBoundary) dot.style.transform = "scale(1.3)";
          el.style.zIndex = "10";
          if (popupRef.current) popupRef.current.remove();
          const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 15 })
            .setLngLat([pos.lng, pos.lat]).setHTML(`
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
        el.onclick = () => { setSelectedField(field); map.flyTo({ center: [pos.lng, pos.lat], zoom: 13, duration: 800 }); };
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([pos.lng, pos.lat]).addTo(map);
        markersRef.current.push(marker);
        bounds.extend([pos.lng, pos.lat]);
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
      yards.forEach((yard: YardMarker) => {
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
        el.onmouseleave = () => { box.style.transform = "scale(1)"; if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; } };
        el.onclick = () => { window.location.href = "/inventory"; };
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([yard.longitude, yard.latitude]).addTo(map);
        binMarkersRef.current.push(marker);
      });
    };
    const tryPlace = () => {
      if (map.isStyleLoaded()) place();
      else setTimeout(tryPlace, 200);
    };
    tryPlace();
  }, [yards, showBins]);

  /* ── Weather markers ───────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    weatherMarkersRef.current.forEach(m => m.remove());
    weatherMarkersRef.current = [];
    if (!map || !showWeather || weather.length === 0) return;
    const place = () => {
      weather.forEach((w: WeatherPoint) => {
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

  /* ── Boundary actions ──────────────────────────── */
  const startDrawing = () => {
    const map = mapRef.current;
    if (!map || !selectedField) return;
    if (!drawRef.current) {
      const draw = new MapboxDraw({
        displayControlsDefault: false, controls: {},
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
    setIsDrawing(true); setDrawingAcres(0); setDrawingHectares(0);
  };

  const cancelDrawing = () => {
    if (drawRef.current) { drawRef.current.deleteAll(); drawRef.current.changeMode("simple_select"); }
    setIsDrawing(false); setDrawingAcres(0); setDrawingHectares(0);
  };

  const saveBoundary = async () => {
    if (!drawRef.current || !selectedField) return;
    const data = drawRef.current.getAll();
    if (data.features.length === 0) return;
    const polygon = data.features[data.features.length - 1];
    setSavingBoundary(true);
    try {
      const res = await fetch("/api/fields/boundary", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_id: selectedField.id, boundary: polygon, boundary_acres: drawingAcres }),
      });
      const result = await res.json();
      if (result.success) {
        drawRef.current.deleteAll(); drawRef.current.changeMode("simple_select");
        setIsDrawing(false); setDrawingAcres(0); setDrawingHectares(0);
        await fetchFields();
      }
    } catch (e) { console.error(e); }
    finally { setSavingBoundary(false); }
  };

  const deleteBoundary = async () => {
    if (!selectedField) return;
    setSavingBoundary(true);
    try { await fetch(`/api/fields/boundary?field_id=${selectedField.id}`, { method: "DELETE" }); await fetchFields(); }
    catch (e) { console.error(e); }
    finally { setSavingBoundary(false); }
  };

  const handleImportAssign = async (fieldId: string, boundary: GeoJSONFeature, acres: number) => {
    const res = await fetch("/api/fields/boundary", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_id: fieldId, boundary, boundary_acres: acres }),
    });
    const result = await res.json();
    if (!result.success) throw new Error("Save failed");
    await fetchFields();
  };

  const snapToLLD = async () => {
    if (!selectedField) return;
    const rect = generateLLDRectangle(selectedField.lld_quarter, selectedField.lld_section, selectedField.lld_township, selectedField.lld_range, selectedField.lld_meridian);
    if (!rect) return;
    setSavingBoundary(true);
    try {
      const acres = calcAcres(rect);
      await fetch("/api/fields/boundary", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_id: selectedField.id, boundary: rect, boundary_acres: acres }),
      });
      await fetchFields();
    } catch (e) { console.error(e); }
    finally { setSavingBoundary(false); }
  };

  /* ═══════ RENDER ═══════════════════════════════════════ */
  return (
    <div style={{ margin: "-24px", display: "flex", height: mapHeight }}>
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: mapHeight }} />

        <MapControls
          mapStyle={mapStyle} setMapStyle={setMapStyle}
          colorMode={colorMode} setColorMode={setColorMode}
          showBins={showBins} setShowBins={setShowBins}
          showWeather={showWeather} setShowWeather={setShowWeather}
          showRadar={showRadar} setShowRadar={setShowRadar}
          showWind={showWind} setShowWind={setShowWind}
        />
        {/* Scout mode button */}
        <div style={{ position: "absolute", top: 56, left: 60, zIndex: 10, display: "flex", gap: 8 }}>
          <button
            onClick={() => setScoutMode(!scoutMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition-colors ${
              scoutMode ? "bg-[#34D399] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white border border-black/20"
            }`}>
            {scoutMode ? <><X size={12} /> Cancel Scout</> : <><MapPin size={12} /> Scout Pin</>}
          </button>
          <button
            onClick={() => setShowScoutPins(!showScoutPins)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition-colors ${
              showScoutPins ? "bg-[#F59E0B] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white border border-black/20"
            }`}>
            <Eye size={12} /> Pins {scoutReports.length > 0 ? `(${scoutReports.length})` : ""}
          </button>
        </div>
        {scoutMode && (
          <div style={{ position: "absolute", top: 92, left: 60, zIndex: 10 }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#34D399] text-[#0F1629] shadow-lg animate-pulse">
            Click anywhere on the map to drop a scout pin
          </div>
        )}
        {isDrawing && selectedField && (
          <DrawBar
            selectedField={selectedField}
            drawingAcres={drawingAcres} drawingHectares={drawingHectares}
            savingBoundary={savingBoundary}
            onSave={saveBoundary} onCancel={cancelDrawing}
          />
        )}

        <MapLegend
          colorMode={colorMode} fields={fields} cropBreakdown={cropBreakdown}
          yards={yards} weather={weather}
          showBins={showBins} showWeather={showWeather} showRadar={showRadar}
          radarTimestamp={radarTimestamp}
        />

        <button onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="absolute top-4 right-4 z-10 bg-[#0F1629]/90 border border-[#1E293B] rounded-lg p-2 shadow-lg text-[#94A3B8] hover:text-white transition-colors">
          {panelCollapsed ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
        </button>
      </div>

      {!panelCollapsed && (
        <IntelligencePanel
          fields={fields} kpis={kpis} cropBreakdown={cropBreakdown} cropYear={cropYear}
          selectedField={selectedField} setSelectedField={setSelectedField}
          weather={weather} showWeather={showWeather} overlaps={overlaps}
          mapRef={mapRef} mapHeight={mapHeight}
          isDrawing={isDrawing} savingBoundary={savingBoundary}
          onStartDraw={startDrawing} onDeleteBoundary={deleteBoundary} onSnapLLD={snapToLLD}
          onShowImport={() => setShowImportModal(true)} onShowExport={() => setShowExportModal(true)}
        />
      )}

      {showImportModal && (
        <BoundaryImportModal fields={fields} onClose={() => setShowImportModal(false)} onAssign={handleImportAssign} />
      )}
      {showExportModal && (
        <BoundaryExportModal fields={fields} onClose={() => setShowExportModal(false)} />
      )}
      <ScoutReportModal
        open={scoutModalOpen}
        onClose={() => setScoutModalOpen(false)}
        latitude={scoutClickCoords.lat}
        longitude={scoutClickCoords.lng}
        fields={fields.map((f) => ({ id: f.id, name: f.field_name }))}
        cropYear={cropYear}
        onCreated={() => { setScoutModalOpen(false); fetchScoutReports(); }}
      />
    </div>
  );
}