"use client";

import { useState, useRef } from "react";
import { X, Upload, FileText, AlertTriangle, CheckCircle, MapPin } from "lucide-react";
import { parseImportFile, calcAcres, flattenMultiPolygon, type GeoJSONFeature, type ImportResult } from "@/lib/boundary-utils";

interface Field {
  id: string;
  field_name: string;
  acres: number;
  boundary: any | null;
}

interface Props {
  fields: Field[];
  onClose: () => void;
  onAssign: (fieldId: string, boundary: GeoJSONFeature, acres: number) => Promise<void>;
}

export default function BoundaryImportModal({ fields, onClose, onAssign }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [assignments, setAssignments] = useState<Record<number, string>>({}); // featureIndex -> fieldId
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsing(true);
    setResult(null);
    setAssignments({});
    setSaved(new Set());

    const res = await parseImportFile(file);

    // Flatten multi-polygons
    const flattened: GeoJSONFeature[] = [];
    for (const f of res.features) {
      flattened.push(...flattenMultiPolygon(f));
    }
    res.features = flattened;

    setResult(res);
    setParsing(false);
  };

  const assignFeature = async (featureIndex: number) => {
    const fieldId = assignments[featureIndex];
    if (!fieldId || !result) return;

    const feature = result.features[featureIndex];
    const acres = calcAcres(feature);

    setSaving(true);
    try {
      await onAssign(fieldId, feature, acres);
      setSaved(prev => new Set([...prev, featureIndex]));
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const assignAll = async () => {
    if (!result) return;
    setSaving(true);
    for (let i = 0; i < result.features.length; i++) {
      const fieldId = assignments[i];
      if (!fieldId || saved.has(i)) continue;
      const feature = result.features[i];
      const acres = calcAcres(feature);
      try {
        await onAssign(fieldId, feature, acres);
        setSaved(prev => new Set([...prev, i]));
      } catch (e) { console.error(e); }
    }
    setSaving(false);
  };

  const allAssigned = result ? result.features.every((_, i) => assignments[i]) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-ag-primary border border-ag rounded-2xl w-[640px] max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ag">
          <div>
            <h2 className="text-base font-bold text-ag-primary">Import Field Boundaries</h2>
            <p className="text-xs text-ag-muted mt-0.5">Upload shapefile (.zip), KML, KMZ, or GeoJSON</p>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18}/></button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Upload area */}
          {!result && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-ag rounded-xl p-8 text-center cursor-pointer hover:border-[#60A5FA]/40 transition-colors"
            >
              <input ref={fileRef} type="file" className="hidden" accept=".zip,.shp,.kml,.kmz,.json,.geojson" onChange={handleFile} />
              {parsing ? (
                <div className="text-ag-muted">
                  <div className="animate-spin w-8 h-8 border-2 border-[#60A5FA] border-t-transparent rounded-full mx-auto mb-3"/>
                  <p className="text-sm">Parsing file...</p>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-ag-dim mb-3"/>
                  <p className="text-sm text-ag-secondary mb-1">Drop file here or click to browse</p>
                  <p className="text-xs text-ag-dim">Supports: .zip (shapefile), .kml, .kmz, .json, .geojson</p>
                </>
              )}
            </div>
          )}

          {/* Errors */}
          {result?.errors.map((err, i) => (
            <div key={i} className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
              <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0"/>
              <p className="text-xs text-red-400">{err}</p>
            </div>
          ))}

          {/* Warnings */}
          {result?.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-2">
              <AlertTriangle size={14} className="text-yellow-400 mt-0.5 flex-shrink-0"/>
              <p className="text-xs text-yellow-400">{w}</p>
            </div>
          ))}

          {/* Features list */}
          {result && result.features.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-ag-muted">
                  {result.features.length} Polygon{result.features.length > 1 ? "s" : ""} Found
                </p>
                {result.features.length > 1 && (
                  <button onClick={() => fileRef.current?.click()} className="text-xs text-[#60A5FA] hover:underline">Upload different file</button>
                )}
              </div>

              {result.features.map((feature, i) => {
                const acres = calcAcres(feature);
                const propName = feature.properties?.name || feature.properties?.Name || feature.properties?.FIELD_NAME || feature.properties?.field_name || "";
                const isSaved = saved.has(i);

                return (
                  <div key={i} className={`bg-ag-card border rounded-lg p-3 mb-2 ${isSaved ? "border-[#34D399]/40" : "border-ag"}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {isSaved ? (
                          <CheckCircle size={18} className="text-[#34D399]"/>
                        ) : (
                          <MapPin size={18} className="text-[#60A5FA]"/>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-ag-primary font-medium">
                          {propName || `Polygon ${i + 1}`}
                        </p>
                        <p className="text-xs text-ag-muted">{acres} acres · {feature.geometry.type}</p>
                      </div>
                      {!isSaved && (
                        <div className="flex items-center gap-2">
                          <select
                            value={assignments[i] || ""}
                            onChange={e => setAssignments({ ...assignments, [i]: e.target.value })}
                            className="bg-ag-primary border border-ag rounded-lg px-2 py-1 text-xs text-ag-primary min-w-[140px]"
                          >
                            <option value="">Assign to field...</option>
                            {fields.map(f => (
                              <option key={f.id} value={f.id}>{f.field_name} ({f.acres} ac)</option>
                            ))}
                          </select>
                          <button onClick={() => assignFeature(i)} disabled={!assignments[i] || saving}
                            className="px-3 py-1 bg-[#34D399] text-[#0F1629] rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-[#2AB385] transition-colors">
                            Save
                          </button>
                        </div>
                      )}
                      {isSaved && <span className="text-xs text-[#34D399] font-semibold">Saved</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ag">
          <button onClick={onClose} className="px-4 py-2 text-xs text-ag-secondary hover:text-white transition-colors">Close</button>
          {result && result.features.length > 1 && allAssigned && (
            <button onClick={assignAll} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#34D399] text-[#0F1629] rounded-lg text-xs font-semibold disabled:opacity-50 hover:bg-[#2AB385] transition-colors">
              {saving ? "Saving..." : `Save All (${result.features.length - saved.size} remaining)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}