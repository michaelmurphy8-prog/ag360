"use client";

import { useRouter } from "next/navigation";
import {
  MapPin, Wheat, DollarSign, BarChart3, Package, ArrowRight, X,
  PenTool, Trash2, Grid3x3, Upload, Download, AlertTriangle,
  Thermometer, Wind, Droplets, Square,
} from "lucide-react";
import {
  CROP_COLORS, STATUS_COLORS, fmt, fmtD,
  getFieldPosition, getFieldMargin,
  type FieldWithCoords, type KPIs, type WeatherPoint,
} from "@/lib/maps-types";
import type { OverlapResult } from "@/lib/boundary-utils";
import mapboxgl from "mapbox-gl";

/* ── Mini Donut ─────────────────────────────── */
function MiniDonut({ value, max, color, size = 44 }: { value: number; max: number; color: string; size?: number }) {
  const sw = 4, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold text-white">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

interface Props {
  fields: FieldWithCoords[];
  kpis: KPIs | null;
  cropBreakdown: Record<string, { acres: number; count: number }>;
  cropYear: number;
  selectedField: FieldWithCoords | null;
  setSelectedField: (f: FieldWithCoords | null) => void;
  weather: WeatherPoint[];
  showWeather: boolean;
  overlaps: OverlapResult[];
  mapRef: React.RefObject<mapboxgl.Map | null>;
  mapHeight: number;
  // Boundary actions
  isDrawing: boolean;
  savingBoundary: boolean;
  onStartDraw: () => void;
  onEditBoundary: () => void;
  onDeleteBoundary: () => void;
  onSnapLLD: () => void;
  onShowImport: () => void;
  onShowExport: () => void;
}

export default function IntelligencePanel({
  fields, kpis, cropBreakdown, cropYear, selectedField, setSelectedField,
  weather, showWeather, overlaps, mapRef, mapHeight,
  isDrawing, savingBoundary, onStartDraw, onEditBoundary, onDeleteBoundary, onSnapLLD,
  onShowImport, onShowExport,
}: Props) {
  const router = useRouter();

  const flyToField = (field: FieldWithCoords) => {
    setSelectedField(field);
    const pos = getFieldPosition(field);
    mapRef.current?.flyTo({ center: [pos.lng, pos.lat], zoom: 13, duration: 800 });
  };

  return (
    <div style={{ width: 380, flexShrink: 0, background: "var(--ag-bg-primary)", borderLeft: "1px solid var(--ag-border-solid)", overflowY: "auto", height: mapHeight }}>
      <div className="p-5">
        <h1 className="text-lg font-bold text-ag-primary">Farm Command Center</h1>
        <p className="text-xs text-ag-muted mt-0.5 mb-5">{cropYear} crop year · {fields.length} fields mapped</p>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { icon: MapPin, ic: "text-[var(--ag-green)]", l: "Fields", v: String(kpis.totalFields), s: `${kpis.seededCount} seeded` },
              { icon: Wheat, ic: "text-[var(--ag-blue)]", l: "Acres", v: fmt(kpis.totalAcres), s: `${fmt(kpis.seededAcres)} seeded` },
              { icon: DollarSign, ic: "text-[var(--ag-yellow)]", l: "Costs", v: `$${fmt(kpis.totalActualCost)}`, s: `$${fmtD(kpis.avgCostPerAcre)}/ac` },
              { icon: BarChart3, ic: kpis.netMarginActual >= 0 ? "text-[var(--ag-green)]" : "text-[var(--ag-red)]", l: "Margin",
                v: `$${fmt(kpis.netMarginActual)}`, s: `$${kpis.seededAcres > 0 ? fmtD(kpis.netMarginActual / kpis.seededAcres) : "0.00"}/ac`,
                vc: kpis.netMarginActual >= 0 ? "text-emerald-400" : "text-red-400" },
            ].map((k: any) => (
              <div key={k.l} className="bg-ag-card border border-ag rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1"><k.icon size={11} className={k.ic} /><span className="text-[10px] text-ag-muted uppercase">{k.l}</span></div>
                <p className={`text-lg font-bold ${k.vc || "text-white"}`}>{k.v}</p>
                <p className="text-[10px] text-ag-dim">{k.s}</p>
              </div>
            ))}
          </div>
        )}

        {/* Crop Mix */}
        {Object.keys(cropBreakdown).length > 0 && kpis && kpis.seededAcres > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted mb-2">Crop Mix</p>
            <div className="flex rounded-lg overflow-hidden h-2.5 mb-2">
              {Object.entries(cropBreakdown).sort((a, b) => b[1].acres - a[1].acres).map(([crop, d]) => (
                <div key={crop} style={{ width: `${(d.acres / kpis.seededAcres) * 100}%`, backgroundColor: CROP_COLORS[crop] || "#9ca3af" }} />
              ))}
            </div>
            {Object.entries(cropBreakdown).sort((a, b) => b[1].acres - a[1].acres).map(([crop, d]) => (
              <div key={crop} className="flex items-center gap-2 text-[11px] mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CROP_COLORS[crop] || "#9ca3af" }} />
                <span className="text-ag-secondary flex-1">{crop}</span>
                <span className="text-ag-muted">{fmt(d.acres)} ac</span>
              </div>
            ))}
          </div>
        )}

        {/* Weather */}
        {showWeather && weather.length > 0 && (
          <div className="mb-5">
            <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted mb-2">Current Conditions</p>
            <div className="bg-ag-card border border-ag rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Thermometer size={14} className="text-[var(--ag-blue)]" /><span className="text-lg font-bold text-white">{weather[0].temperature}°C</span></div>
                <div className="flex items-center gap-3 text-xs text-ag-secondary">
                  <span className="flex items-center gap-1"><Wind size={11} /> {weather[0].windspeed} km/h</span>
                  <span className="flex items-center gap-1"><Droplets size={11} /> {weather[0].precipitation}mm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Import/Export */}
        <div className="flex gap-2 mb-4">
          <button onClick={onShowImport}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-3 py-2 text-xs text-ag-secondary hover:text-white hover:border-[#60A5FA]/40 transition-colors">
            <Upload size={12} /> Import
          </button>
          <button onClick={onShowExport}
            className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-3 py-2 text-xs text-ag-secondary hover:text-white hover:border-[var(--ag-accent)]/40 transition-colors">
            <Download size={12} /> Export
          </button>
        </div>

        {/* Overlap Warnings */}
        {overlaps.length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[var(--ag-yellow)] mb-2 flex items-center gap-1.5">
              <AlertTriangle size={10} /> Boundary Overlaps
            </p>
            {overlaps.map((o, i) => (
              <div key={i} className="bg-[#FBBF24]/5 border border-[#FBBF24]/20 rounded-lg px-3 py-2 mb-1.5 text-xs">
                <p className="text-[var(--ag-yellow)] font-semibold">{o.fieldName1} ↔ {o.fieldName2}</p>
                <p className="text-ag-muted">{o.overlapAcres} acres overlap</p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-ag my-4" />

        {/* Selected Field */}
        {selectedField ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">Selected Field</p>
              <button onClick={() => setSelectedField(null)} className="p-1 rounded-md hover:bg-[var(--ag-bg-active)] text-ag-muted hover:text-ag-primary transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="bg-ag-card border border-ag rounded-xl overflow-hidden">
              <div className="h-1 w-full" style={{ backgroundColor: CROP_COLORS[selectedField.crop_type || ""] || "var(--ag-border-solid)" }} />
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-ag-primary font-semibold text-base">{selectedField.field_name}</h3>
                    <p className="text-ag-muted text-sm">{selectedField.acres} acres</p>
                    <p className="text-ag-dim text-xs mt-0.5">{selectedField.lld_quarter}-{selectedField.lld_section}-{selectedField.lld_township}-{selectedField.lld_range}-W{selectedField.lld_meridian}</p>
                    {selectedField.boundary_acres && (
                      <p className="text-[var(--ag-blue)] text-xs mt-0.5">Mapped: {fmtD(selectedField.boundary_acres)} ac</p>
                    )}
                  </div>
                  <MiniDonut value={parseFloat(String(selectedField.actual_total)) || 0} max={parseFloat(String(selectedField.budget_total)) || 1}
                    color={(parseFloat(String(selectedField.actual_total)) || 0) > (parseFloat(String(selectedField.budget_total)) || 0) ? "var(--ag-red)" : "var(--ag-green)"} />
                </div>
                {selectedField.crop_type && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CROP_COLORS[selectedField.crop_type] || "#9ca3af" }} />
                      <span className="text-sm font-medium text-ag-primary">{selectedField.crop_type}</span>
                      {selectedField.variety && <span className="text-xs text-ag-muted">{selectedField.variety}</span>}
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        selectedField.crop_status === "seeded" ? "bg-[#1E3A5F] text-[var(--ag-blue)]" :
                        selectedField.crop_status === "growing" ? "bg-[#14532D] text-[#4ADE80]" :
                        selectedField.crop_status === "harvested" ? "bg-[#78350F] text-[var(--ag-yellow)]" : "bg-[#334155] text-ag-secondary"
                      }`}>{(selectedField.crop_status || "planned").charAt(0).toUpperCase() + (selectedField.crop_status || "planned").slice(1)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { label: "Revenue", val: parseFloat(String(selectedField.actual_revenue)) || 0, pos: true },
                        { label: "Cost", val: parseFloat(String(selectedField.actual_total)) || 0, pos: true },
                        { label: "Net Margin", val: getFieldMargin(selectedField), pos: false },
                        { label: "Variance", val: (parseFloat(String(selectedField.actual_total)) || 0) - (parseFloat(String(selectedField.budget_total)) || 0), pos: false },
                      ].map(m => (
                        <div key={m.label} className="bg-[var(--ag-bg-hover)] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-ag-muted">{m.label}</p>
                          <p className={`text-sm font-semibold ${m.pos ? "text-white" : m.val >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {m.label === "Variance" && m.val > 0 ? "+" : ""}${fmt(m.val)}
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
                      <button onClick={onStartDraw}
                        className="w-full flex items-center justify-center gap-2 bg-[var(--ag-blue)]/10 border border-[#60A5FA]/20 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ag-blue)] hover:bg-[var(--ag-blue)]/20 transition-colors">
                        <PenTool size={14} /> {selectedField.boundary ? "Redraw Boundary" : "Draw Boundary"}
                      </button>
                      {selectedField.boundary && (
                        <button onClick={onEditBoundary}
                          className="w-full flex items-center justify-center gap-2 bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ag-green)] hover:bg-[var(--ag-accent)]/20 transition-colors">
                          <PenTool size={14} /> Edit Vertices
                        </button>
                      )}
                      {!selectedField.boundary && (
                        <button onClick={onSnapLLD} disabled={savingBoundary}
                          className="w-full flex items-center justify-center gap-2 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-3 py-1.5 text-xs text-ag-secondary hover:text-white hover:border-[#60A5FA]/40 transition-colors disabled:opacity-50">
                          <Grid3x3 size={12} /> Snap to LLD Quarter Section
                        </button>
                      )}
                    </>
                  )}
                  {selectedField.boundary && !isDrawing && (
                    <button onClick={onDeleteBoundary} disabled={savingBoundary}
                      className="w-full flex items-center justify-center gap-2 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-3 py-1.5 text-xs text-[var(--ag-red)] hover:border-[var(--ag-red)]/40 transition-colors disabled:opacity-50">
                      <Trash2 size={12} /> Remove Boundary
                    </button>
                  )}
                </div>

                <button onClick={() => router.push(`/fields/${selectedField.id}`)}
                  className="w-full flex items-center justify-between bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)] rounded-lg px-3 py-2 text-sm font-semibold text-[var(--ag-green)] hover:bg-[var(--ag-accent)]/20 transition-colors mb-2">
                  <span>Open Field Detail</span><ArrowRight size={14} />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => window.location.href = selectedField.crop_type ? `/marketing?crop=${encodeURIComponent(selectedField.crop_type)}` : "/marketing"}
                    className="flex items-center gap-1.5 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-2 py-1.5 text-xs text-ag-secondary hover:text-white hover:border-[var(--ag-accent)]/40 transition-colors">
                    <DollarSign size={12} /> Contracts
                  </button>
                  <button onClick={() => window.location.href = selectedField.crop_type ? `/inventory?crop=${encodeURIComponent(selectedField.crop_type)}` : "/inventory"}
                    className="flex items-center gap-1.5 bg-[var(--ag-bg-hover)] border border-ag rounded-lg px-2 py-1.5 text-xs text-ag-secondary hover:text-white hover:border-[var(--ag-accent)]/40 transition-colors">
                    <Package size={12} /> Inventory
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <MapPin size={24} className="mx-auto text-ag-dim mb-2" />
            <p className="text-sm text-ag-muted">Click a field on the map</p>
            <p className="text-xs text-ag-dim mt-1">to view details and actions</p>
          </div>
        )}

        {/* Field List */}
        <div className="mt-5">
          <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted mb-2">All Fields ({fields.length})</p>
          {fields.map(field => {
            const margin = getFieldMargin(field);
            return (
              <button key={field.id} onClick={() => flyToField(field)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left mb-1.5 transition-colors ${
                  selectedField?.id === field.id ? "bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)]" : "bg-ag-card border border-ag hover:border-[var(--ag-accent)]/30"
                }`}>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CROP_COLORS[field.crop_type || ""] || "var(--ag-text-dim)" }} />
                  {field.boundary && <Square size={8} className="text-[var(--ag-blue)]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ag-primary truncate">{field.field_name}</p>
                  <p className="text-[10px] text-ag-muted">{field.crop_type || "Unassigned"} · {field.acres} ac</p>
                </div>
                <span className={`text-xs font-semibold ${margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>${fmt(margin)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}