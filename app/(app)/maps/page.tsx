"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  MapPin, Wheat, DollarSign, BarChart3, Package, ArrowRight, Maximize2, Minimize2,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { fieldToCoords } from "@/lib/lld-geocode";

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
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  const [fields, setFields] = useState<FieldWithCoords[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<Record<string, { acres: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<FieldWithCoords | null>(null);
  const [colorMode, setColorMode] = useState<ColorMode>("crop");
  const [mapStyle, setMapStyle] = useState<"satellite" | "dark" | "terrain">("satellite");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const cropYear = new Date().getFullYear();

  const STYLES: Record<string, string> = {
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    dark: "mapbox://styles/mapbox/dark-v11",
    terrain: "mapbox://styles/mapbox/outdoors-v12",
  };

  /* ── Fetch ────────────────────────────────────── */
  useEffect(() => {
    (async () => {
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
    })();
  }, []);

  /* ── Map init (same pattern as BinMap) ─────────── */
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: STYLES[mapStyle],
      center: [-106.5, 51.5],
      zoom: 7,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    return () => { map.remove(); mapRef.current = null; };
  }, [loading]);

  /* ── Style switch ──────────────────────────────── */
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setStyle(STYLES[mapStyle]);
  }, [mapStyle]);

  /* ── Markers ───────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fields.length === 0) return;

    // Wait for style to be loaded
    const place = () => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();

      fields.forEach(field => {
        const color = getFieldColor(field, colorMode);
        const sz = Math.max(22, Math.min(40, field.acres / 8));

        const el = document.createElement("div");
        Object.assign(el.style, {
          width: `${sz}px`, height: `${sz}px`, borderRadius: "50%",
          backgroundColor: color, border: selectedField?.id === field.id ? "3px solid #F1F5F9" : "2px solid rgba(0,0,0,0.3)",
          cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)", transition: "transform 0.2s",
        });
        el.onmouseenter = () => { el.style.transform = "scale(1.3)"; el.style.zIndex = "10"; };
        el.onmouseleave = () => { el.style.transform = "scale(1)"; el.style.zIndex = "1"; };
        el.onclick = () => {
          setSelectedField(field);
          map.flyTo({ center: [field.longitude, field.latitude], zoom: 11, duration: 800 });
        };

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([field.longitude, field.latitude])
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend([field.longitude, field.latitude]);
      });

      if (fields.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 12 });
      else map.flyTo({ center: [fields[0].longitude, fields[0].latitude], zoom: 11 });
    };

    if (map.isStyleLoaded()) place();
    else map.once("style.load", place);
  }, [fields, colorMode, selectedField]);

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

  // Don't conditionally return — map container must always be in DOM

  /* ═══════ RENDER ═══════════════════════════════════════ */
  return (
    <div style={{ display: "flex", gap: 0 }}>

      {/* ═══ MAP ═════════════════════════════════════════ */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: 700 }} />

        {/* Controls */}
        <div style={{ position: "absolute", top: 16, left: 60, zIndex: 10, display: "flex", gap: 8 }}>
          <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
            {(["satellite","dark","terrain"] as const).map(s => (
              <button key={s} onClick={() => setMapStyle(s)}
                className={`px-3 py-1.5 text-xs font-semibold ${mapStyle===s ? "bg-[#34D399] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"}`}>
                {s==="satellite"?"🛰 Satellite":s==="dark"?"🌙 Dark":"⛰ Terrain"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
            {(["crop","status","margin","budget"] as const).map(m => (
              <button key={m} onClick={() => setColorMode(m)}
                className={`px-3 py-1.5 text-xs font-semibold ${colorMode===m ? "bg-[#60A5FA] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"}`}>
                {m.charAt(0).toUpperCase()+m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-4 z-10 bg-[#0F1629]/90 border border-[#1E293B] rounded-xl p-3 shadow-lg max-w-[200px]">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#64748B] mb-2">
            {colorMode==="crop"?"Crop Type":colorMode==="status"?"Field Status":colorMode==="margin"?"Net Margin":"Budget Usage"}
          </p>
          {legendItems.map(i => (
            <div key={i.label} className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: i.color }} />
              <span className="text-xs text-[#F1F5F9] flex-1">{i.label}</span>
              <span className="text-[10px] text-[#64748B]">{i.detail}</span>
            </div>
          ))}
        </div>

        {/* Toggle */}
        <button onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="absolute top-4 right-4 z-10 bg-[#0F1629]/90 border border-[#1E293B] rounded-lg p-2 shadow-lg text-[#94A3B8] hover:text-white">
          {panelCollapsed ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
        </button>
      </div>

      {/* ═══ PANEL ═══════════════════════════════════════ */}
      {!panelCollapsed && (
        <div style={{ width: 380, flexShrink: 0, background: "#0B1120", borderLeft: "1px solid #1E293B", overflowY: "auto", height: "100vh" }}>
          <div className="p-5">
            <h1 className="text-lg font-bold text-[#F1F5F9]">Farm Command Center</h1>
            <p className="text-xs text-[#64748B] mt-0.5 mb-5">{cropYear} crop year · {fields.length} fields mapped</p>

            {/* KPIs */}
            {kpis && (
              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1"><MapPin size={11} className="text-[#34D399]"/><span className="text-[10px] text-[#64748B] uppercase">Fields</span></div>
                  <p className="text-lg font-bold text-white">{kpis.totalFields}</p>
                  <p className="text-[10px] text-[#475569]">{kpis.seededCount} seeded</p>
                </div>
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1"><Wheat size={11} className="text-[#60A5FA]"/><span className="text-[10px] text-[#64748B] uppercase">Acres</span></div>
                  <p className="text-lg font-bold text-white">{fmt(kpis.totalAcres)}</p>
                  <p className="text-[10px] text-[#475569]">{fmt(kpis.seededAcres)} seeded</p>
                </div>
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1"><DollarSign size={11} className="text-[#FBBF24]"/><span className="text-[10px] text-[#64748B] uppercase">Costs</span></div>
                  <p className="text-lg font-bold text-white">${fmt(kpis.totalActualCost)}</p>
                  <p className="text-[10px] text-[#475569]">${fmtD(kpis.avgCostPerAcre)}/ac</p>
                </div>
                <div className="bg-[#0F1629] border border-[#1E293B] rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-1"><BarChart3 size={11} className={kpis.netMarginActual>=0?"text-[#34D399]":"text-[#EF4444]"}/><span className="text-[10px] text-[#64748B] uppercase">Margin</span></div>
                  <p className={`text-lg font-bold ${kpis.netMarginActual>=0?"text-emerald-400":"text-red-400"}`}>${fmt(kpis.netMarginActual)}</p>
                  <p className="text-[10px] text-[#475569]">${kpis.seededAcres>0?fmtD(kpis.netMarginActual/kpis.seededAcres):"0.00"}/ac</p>
                </div>
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
                    <button onClick={() => router.push(`/fields/${selectedField.id}`)}
                      className="w-full flex items-center justify-between bg-[#34D399]/10 border border-[#34D399]/20 rounded-lg px-3 py-2 text-sm font-semibold text-[#34D399] hover:bg-[#34D399]/20 mb-2">
                      <span>Open Field Detail</span><ArrowRight size={14}/>
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => window.location.href=selectedField.crop_type?`/marketing?crop=${encodeURIComponent(selectedField.crop_type)}`:"/marketing"}
                        className="flex items-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-[#94A3B8] hover:text-white hover:border-[#34D399]/40">
                        <DollarSign size={12}/> Contracts
                      </button>
                      <button onClick={() => window.location.href=selectedField.crop_type?`/inventory?crop=${encodeURIComponent(selectedField.crop_type)}`:"/inventory"}
                        className="flex items-center gap-1.5 bg-white/[0.03] border border-[#1E293B] rounded-lg px-2 py-1.5 text-xs text-[#94A3B8] hover:text-white hover:border-[#34D399]/40">
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
                return (
                  <button key={field.id} onClick={() => {
                    setSelectedField(field);
                    mapRef.current?.flyTo({ center:[field.longitude,field.latitude], zoom:11, duration:800 });
                  }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1.5 ${
                    selectedField?.id===field.id?"bg-[#34D399]/10 border border-[#34D399]/20":"bg-[#0F1629] border border-[#1E293B] hover:border-[#34D399]/30"
                  }`}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CROP_COLORS[field.crop_type||""]||"#475569" }}/>
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
    </div>
  );
}