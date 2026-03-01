"use client";

import { Satellite, Moon, Mountain, Warehouse, CloudRain, Eye } from "lucide-react";
import type { MapStyleKey, ColorMode } from "@/lib/maps-types";

interface Props {
  mapStyle: MapStyleKey;
  setMapStyle: (s: MapStyleKey) => void;
  colorMode: ColorMode;
  setColorMode: (m: ColorMode) => void;
  showBins: boolean;
  setShowBins: (b: boolean) => void;
  showWeather: boolean;
  setShowWeather: (w: boolean) => void;
  showRadar: boolean;
  setShowRadar: (r: boolean) => void;
}

export default function MapControls({
  mapStyle, setMapStyle, colorMode, setColorMode,
  showBins, setShowBins, showWeather, setShowWeather, showRadar, setShowRadar,
}: Props) {
  return (
    <div style={{ position: "absolute", top: 16, left: 60, zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
      <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
        {([
          { key: "satellite" as const, icon: Satellite, label: "Satellite" },
          { key: "dark" as const, icon: Moon, label: "Dark" },
          { key: "terrain" as const, icon: Mountain, label: "Terrain" },
        ]).map(s => (
          <button key={s.key} onClick={() => setMapStyle(s.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              mapStyle === s.key ? "bg-[#34D399] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
            }`}>
            <s.icon size={12} /> {s.label}
          </button>
        ))}
      </div>
      <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
        {(["crop", "status", "margin", "budget"] as const).map(m => (
          <button key={m} onClick={() => setColorMode(m)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
              colorMode === m ? "bg-[#60A5FA] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
            }`}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      <div className="flex rounded-lg border border-black/20 overflow-hidden shadow-lg">
        <button onClick={() => setShowBins(!showBins)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            showBins ? "bg-[#F59E0B] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
          }`}>
          <Warehouse size={12} /> Bins
        </button>
        <button onClick={() => setShowWeather(!showWeather)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            showWeather ? "bg-[#60A5FA] text-[#0F1629]" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
          }`}>
          <CloudRain size={12} /> Weather
        </button>
        <button onClick={() => setShowRadar(!showRadar)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
            showRadar ? "bg-[#8B5CF6] text-white" : "bg-[#0F1629]/90 text-[#94A3B8] hover:text-white"
          }`}>
          <Eye size={12} /> Radar
        </button>
      </div>
    </div>
  );
}