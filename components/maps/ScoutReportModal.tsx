// components/maps/ScoutReportModal.tsx
"use client";
import { useState } from "react";
import {
  X, Loader2, MapPin, Bug, Leaf, Droplets, CloudHail, Sprout,
  AlertTriangle, Eye, CheckCircle,
} from "lucide-react";

const T = {
  bg: "#080C15", card: "#0F1729", border: "rgba(255,255,255,0.06)",
  text1: "#F1F5F9", text2: "#94A3B8", text3: "#64748B", text4: "#475569",
  green: "#34D399", greenDim: "rgba(52,211,153,0.12)",
  red: "#F87171", redDim: "rgba(248,113,113,0.12)",
  amber: "#FBBF24", amberDim: "rgba(251,191,36,0.12)",
  sky: "#38BDF8", purple: "#A78BFA",
};

const inputClass = "w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[2px] font-mono font-semibold text-[#64748B] mb-1.5";

const REPORT_TYPES = [
  { id: "general", label: "General", icon: Eye, color: "#38BDF8" },
  { id: "pest", label: "Pest", icon: Bug, color: "#F87171" },
  { id: "disease", label: "Disease", icon: AlertTriangle, color: "#FBBF24" },
  { id: "weed", label: "Weed", icon: Leaf, color: "#34D399" },
  { id: "nutrient", label: "Nutrient", icon: Sprout, color: "#A78BFA" },
  { id: "moisture", label: "Moisture", icon: Droplets, color: "#38BDF8" },
  { id: "hail", label: "Hail", icon: CloudHail, color: "#94A3B8" },
];

const SEVERITIES = [
  { id: "low", label: "Low", color: "#34D399", bg: "rgba(52,211,153,0.12)" },
  { id: "medium", label: "Medium", color: "#FBBF24", bg: "rgba(251,191,36,0.12)" },
  { id: "high", label: "High", color: "#F97316", bg: "rgba(249,115,22,0.12)" },
  { id: "critical", label: "Critical", color: "#F87171", bg: "rgba(248,113,113,0.12)" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  fields: { id: string; name: string }[];
  cropYear: number;
  onCreated: () => void;
}

export default function ScoutReportModal({ open, onClose, latitude, longitude, fields, cropYear, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [reportType, setReportType] = useState("general");
  const [severity, setSeverity] = useState("low");
  const [fieldId, setFieldId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      const selectedField = fields.find((f) => f.id === fieldId);
      const res = await fetch("/api/maps/scout-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude, longitude, title: title.trim(), notes: notes.trim() || null,
          report_type: reportType, severity,
          field_id: fieldId || null, field_name: selectedField?.name || null,
          crop_year: cropYear,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed to save"); }
      onCreated();
      onClose();
      setTitle(""); setNotes(""); setReportType("general"); setSeverity("low"); setFieldId("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl shadow-2xl" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: T.greenDim }}>
              <MapPin size={18} style={{ color: T.green }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: T.text1 }}>Drop Scout Pin</h2>
              <p className="text-xs font-mono" style={{ color: T.text3 }}>{latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
            <X size={18} style={{ color: T.text3 }} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className={inputClass} placeholder="e.g. Grasshopper pressure — NW corner" autoFocus />
          </div>

          {/* Report Type */}
          <div>
            <label className={labelClass}>Type</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_TYPES.map((rt) => {
                const Icon = rt.icon;
                const active = reportType === rt.id;
                return (
                  <button key={rt.id} onClick={() => setReportType(rt.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: active ? `${rt.color}20` : "rgba(255,255,255,0.03)",
                      color: active ? rt.color : T.text3,
                      border: `1px solid ${active ? `${rt.color}40` : "rgba(255,255,255,0.06)"}`,
                    }}>
                    <Icon size={12} /> {rt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div>
            <label className={labelClass}>Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button key={s.id} onClick={() => setSeverity(s.id)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-center transition-all"
                  style={{
                    background: severity === s.id ? s.bg : "rgba(255,255,255,0.03)",
                    color: severity === s.id ? s.color : T.text3,
                    border: `1px solid ${severity === s.id ? `${s.color}40` : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Field assignment */}
          <div>
            <label className={labelClass}>Assign to Field (optional)</label>
            <select value={fieldId} onChange={(e) => setFieldId(e.target.value)} className={inputClass + " bg-[#111827]"}>
              <option value="">No field</option>
              {fields.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              className={inputClass + " h-20 resize-none"}
              placeholder="What did you observe? Estimated coverage, density, affected area..." />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: T.redDim }}>
              <AlertTriangle size={12} style={{ color: T.red }} />
              <span className="text-xs" style={{ color: T.red }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t" style={{ borderColor: T.border }}>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl hover:bg-white/[0.06] transition-colors" style={{ color: T.text3 }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all disabled:opacity-40"
            style={{ background: T.green, color: T.bg }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            Drop Pin
          </button>
        </div>
      </div>
    </div>
  );
}