"use client";

import { Save, X } from "lucide-react";
import { fmtD } from "@/lib/maps-types";
import type { FieldWithCoords } from "@/lib/maps-types";

interface Props {
  selectedField: FieldWithCoords;
  drawingAcres: number;
  drawingHectares: number;
  savingBoundary: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function DrawBar({ selectedField, drawingAcres, drawingHectares, savingBoundary, onSave, onCancel }: Props) {
  const diff = drawingAcres - selectedField.acres;
  const pct = ((diff / selectedField.acres) * 100).toFixed(1);

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-ag-card/95 border border-[#60A5FA]/40 rounded-xl px-5 py-3 shadow-xl flex items-center gap-4">
      <div>
        <p className="text-[10px] text-ag-muted uppercase tracking-wide">Drawing boundary for</p>
        <p className="text-sm font-semibold text-ag-primary">{selectedField.field_name}</p>
      </div>
      <div className="border-l border-ag pl-4">
        <p className="text-[10px] text-ag-muted uppercase tracking-wide">Area</p>
        <p className="text-base font-bold text-[#60A5FA]">
          {drawingAcres > 0 ? `${fmtD(drawingAcres)} ac` : "Click to draw..."}{" "}
          {drawingHectares > 0 && <span className="text-xs text-ag-muted font-normal">({fmtD(drawingHectares)} ha)</span>}
        </p>
      </div>
      {selectedField.acres && drawingAcres > 0 && (
        <div className="border-l border-ag pl-4">
          <p className="text-[10px] text-ag-muted uppercase tracking-wide">vs Declared</p>
          <p className={`text-sm font-semibold ${Math.abs(diff) < 5 ? "text-[#34D399]" : "text-[#FBBF24]"}`}>
            {diff > 0 ? "+" : ""}{fmtD(diff)} ac ({pct}%)
          </p>
        </div>
      )}
      <div className="flex items-center gap-2 ml-4">
        <button onClick={onSave} disabled={drawingAcres === 0 || savingBoundary}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#34D399] text-[#0F1629] rounded-lg text-xs font-semibold hover:bg-[#2AB385] transition-colors disabled:opacity-50">
          <Save size={12} /> {savingBoundary ? "Saving..." : "Save"}
        </button>
        <button onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] text-ag-secondary rounded-lg text-xs font-semibold hover:text-white transition-colors">
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  );
}