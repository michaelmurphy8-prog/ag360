"use client";

import { useState } from "react";
import { X, Download, FileText, Globe, Map } from "lucide-react";
import { exportGeoJSON, exportKML, downloadFile } from "@/lib/boundary-utils";

interface Field {
  field_name: string;
  boundary: any | null;
  crop_type?: string | null;
  acres?: number;
}

interface Props {
  fields: Field[];
  onClose: () => void;
}

export default function BoundaryExportModal({ fields, onClose }: Props) {
  const boundedFields = fields.filter(f => f.boundary);
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = (format: "geojson" | "kml") => {
    if (format === "geojson") {
      const content = exportGeoJSON(boundedFields);
      downloadFile(content, "ag360-boundaries.geojson", "application/geo+json");
    } else {
      const content = exportKML(boundedFields);
      downloadFile(content, "ag360-boundaries.kml", "application/vnd.google-earth.kml+xml");
    }
    setExported(format);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ag-primary border border-ag rounded-2xl w-[440px] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ag">
          <div>
            <h2 className="text-base font-bold text-ag-primary">Export Boundaries</h2>
            <p className="text-xs text-ag-muted mt-0.5">{boundedFields.length} field{boundedFields.length !== 1 ? "s" : ""} with boundaries</p>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-6">
          {boundedFields.length === 0 ? (
            <div className="text-center py-6">
              <Map size={24} className="mx-auto text-ag-dim mb-2"/>
              <p className="text-sm text-ag-muted">No field boundaries to export</p>
              <p className="text-xs text-ag-dim mt-1">Draw boundaries on the map first</p>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => handleExport("geojson")}
                className="w-full flex items-center gap-4 bg-ag-card border border-ag rounded-xl p-4 hover:border-[var(--ag-accent)]/40 transition-colors text-left">
                <div className="w-10 h-10 rounded-lg bg-[var(--ag-accent)]/10 flex items-center justify-center flex-shrink-0">
                  <Globe size={20} className="text-[var(--ag-green)]"/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ag-primary">GeoJSON</p>
                  <p className="text-xs text-ag-muted">Standard format — works with QGIS, Google Earth, most GIS tools</p>
                </div>
                <Download size={16} className="text-ag-muted"/>
              </button>

              <button onClick={() => handleExport("kml")}
                className="w-full flex items-center gap-4 bg-ag-card border border-ag rounded-xl p-4 hover:border-[#60A5FA]/40 transition-colors text-left">
                <div className="w-10 h-10 rounded-lg bg-[var(--ag-blue)]/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-[var(--ag-blue)]"/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ag-primary">KML</p>
                  <p className="text-xs text-ag-muted">Google Earth format — share with agronomists, landlords</p>
                </div>
                <Download size={16} className="text-ag-muted"/>
              </button>

              {exported && (
                <div className="bg-[var(--ag-accent)]/10 border border-[var(--ag-accent-border)] rounded-lg p-3 text-center">
                  <p className="text-xs text-[var(--ag-green)] font-semibold">Downloaded {exported.toUpperCase()} file</p>
                </div>
              )}

              {/* Field list preview */}
              <div className="mt-4">
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted mb-2">Included Fields</p>
                {boundedFields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-ag-secondary mb-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--ag-accent)]"/>
                    <span className="flex-1">{f.field_name}</span>
                    <span className="text-ag-muted">{f.acres} ac</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-ag">
          <button onClick={onClose} className="px-4 py-2 text-xs text-ag-secondary hover:text-white transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}