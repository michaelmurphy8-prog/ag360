"use client";

import { useMemo } from "react";
import { Thermometer, Eye } from "lucide-react";
import { CROP_COLORS, STATUS_COLORS, fmt, type ColorMode, type FieldWithCoords, type YardMarker, type WeatherPoint } from "@/lib/maps-types";

interface Props {
  colorMode: ColorMode;
  fields: FieldWithCoords[];
  cropBreakdown: Record<string, { acres: number; count: number }>;
  yards: YardMarker[];
  weather: WeatherPoint[];
  showBins: boolean;
  showWeather: boolean;
  showRadar: boolean;
  radarTimestamp: string;
}

export default function MapLegend({
  colorMode, fields, cropBreakdown, yards, weather,
  showBins, showWeather, showRadar, radarTimestamp,
}: Props) {
  const legendItems = useMemo(() => {
    if (colorMode === "crop")
      return Object.entries(cropBreakdown).map(([crop, d]) => ({ color: CROP_COLORS[crop] || "#9ca3af", label: crop, detail: `${fmt(d.acres)} ac` }));
    if (colorMode === "status")
      return Object.entries(STATUS_COLORS).map(([s, c]) => ({ color: c, label: s.charAt(0).toUpperCase() + s.slice(1), detail: `${fields.filter(f => (f.crop_status || "planned") === s).length}` }));
    if (colorMode === "margin")
      return [{ color: "#22c55e", label: "> $50K", detail: "Strong" }, { color: "#4ade80", label: "$20-50K", detail: "Good" }, { color: "#86efac", label: "$0-20K", detail: "OK" }, { color: "#fbbf24", label: "< $0", detail: "Warning" }, { color: "#ef4444", label: "< -$10K", detail: "Loss" }];
    return [{ color: "#22c55e", label: "< 75%", detail: "On track" }, { color: "#4ade80", label: "75-90%", detail: "Watch" }, { color: "#fbbf24", label: "90-100%", detail: "Near" }, { color: "#ef4444", label: "> 100%", detail: "Over" }];
  }, [colorMode, cropBreakdown, fields]);

  return (
    <div className="absolute bottom-6 left-4 z-10 bg-ag-card/90 border border-ag rounded-xl p-3 shadow-lg max-w-[220px]">
      <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted mb-2">
        {colorMode === "crop" ? "Crop Type" : colorMode === "status" ? "Field Status" : colorMode === "margin" ? "Net Margin" : "Budget Usage"}
      </p>
      {legendItems.map(i => (
        <div key={i.label} className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: i.color }} />
          <span className="text-xs text-ag-primary flex-1">{i.label}</span>
          <span className="text-[10px] text-ag-muted">{i.detail}</span>
        </div>
      ))}
      {showBins && yards.length > 0 && (
        <><div className="border-t border-ag my-2" /><div className="flex items-center gap-2 mb-1"><div className="w-3 h-3 rounded bg-[var(--ag-border-solid)] border border-[var(--ag-accent)] flex-shrink-0" /><span className="text-xs text-ag-primary flex-1">Bin Yards</span><span className="text-[10px] text-ag-muted">{yards.length}</span></div></>
      )}
      {showWeather && weather.length > 0 && (
        <><div className="border-t border-ag my-2" /><div className="flex items-center gap-2"><Thermometer size={12} className="text-[var(--ag-blue)]" /><span className="text-xs text-ag-primary">Live Weather</span></div></>
      )}
      {showRadar && (
        <>
          <div className="border-t border-ag my-2" />
          <div className="flex items-center gap-2"><Eye size={12} className="text-[#8B5CF6]" /><span className="text-xs text-ag-primary flex-1">Radar</span>{radarTimestamp && <span className="text-[10px] text-ag-muted">{radarTimestamp}</span>}</div>
          <div className="flex items-center gap-1 mt-1.5">{["#00FF00", "#FFFF00", "#FFA500", "#FF0000", "#FF00FF"].map((c, i) => (<div key={i} style={{ flex: 1, height: 4, backgroundColor: c, borderRadius: 2, opacity: 0.7 }} />))}</div>
          <div className="flex justify-between text-[8px] text-ag-muted mt-0.5"><span>Light</span><span>Heavy</span></div>
        </>
      )}
    </div>
  );
}