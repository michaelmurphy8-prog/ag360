"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  make: string;
  model: string;
  status: string;
}

interface Props {
  assets: Asset[];
  preselectedAssetId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DowntimeModal({ assets, preselectedAssetId, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetId: preselectedAssetId || "",
    reason: "",
    notes: "",
    costImpact: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const activeAssets = assets.filter(a => a.status !== "DOWN" && a.status !== "SOLD" && a.status !== "RETIRED");

  const handleSave = async () => {
    if (!form.assetId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/machinery/downtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          costImpact: form.costImpact ? parseFloat(form.costImpact) : null,
        }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-[var(--ag-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ag-red)]/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-[var(--ag-red)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ag-primary">Report Downtime</h2>
              <p className="text-xs text-ag-muted">Mark a unit as down — starts tracking time</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Unit *</label>
            <select value={form.assetId} onChange={e => update("assetId", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-red)]/40 focus:outline-none">
              <option value="">Select unit...</option>
              {activeAssets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.make} {a.model}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Reason</label>
            <select value={form.reason} onChange={e => update("reason", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-red)]/40 focus:outline-none">
              <option value="">Select reason...</option>
              {["Mechanical Failure", "Electrical Issue", "Hydraulic Leak", "Tire/Track Damage", "Waiting on Parts", "Scheduled Repair", "Accident/Damage", "Weather Hold", "Other"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Est. Cost Impact ($)</label>
            <input type="number" step="0.01" value={form.costImpact} onChange={e => update("costImpact", e.target.value)} placeholder="0.00"
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-red)]/40 focus:outline-none" />
          </div>

          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="What happened..."
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-red)]/40 focus:outline-none resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--ag-border)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ag-secondary hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.assetId || saving}
            className="px-5 py-2 text-sm font-semibold bg-[var(--ag-red)] text-white rounded-full hover:bg-[#DC2626] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Mark as Down"}
          </button>
        </div>
      </div>
    </div>
  );
}