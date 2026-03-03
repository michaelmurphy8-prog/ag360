"use client";

import { useState } from "react";
import { X, Calendar } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  make: string;
  model: string;
  hoursTotal: number | null;
}

const SERVICE_TYPES = [
  "Oil Change", "Filter Replacement", "Greasing", "Belt Replacement",
  "Tire Service", "Hydraulic Service", "Annual Inspection",
  "Winterization", "Pre-Season Check", "Calibration", "Other",
];

interface Props {
  assets: Asset[];
  preselectedAssetId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ScheduleServiceModal({ assets, preselectedAssetId, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    assetId: preselectedAssetId || "",
    serviceType: "",
    intervalHours: "",
    intervalDays: "",
    dueAtHours: "",
    dueAtDate: "",
    priority: "normal",
    notes: "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedAsset = assets.find(a => a.id === form.assetId);

  const handleSave = async () => {
    if (!form.assetId || !form.serviceType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/machinery/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          intervalHours: form.intervalHours ? parseFloat(form.intervalHours) : null,
          intervalDays: form.intervalDays ? parseInt(form.intervalDays) : null,
          dueAtHours: form.dueAtHours ? parseFloat(form.dueAtHours) : null,
          dueAtDate: form.dueAtDate || null,
        }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--ag-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ag-blue)]/10 flex items-center justify-center">
              <Calendar size={16} className="text-[var(--ag-blue)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ag-primary">Schedule Service</h2>
              <p className="text-xs text-ag-muted">Set up upcoming or recurring maintenance</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Unit */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Unit *</label>
            <select value={form.assetId} onChange={e => update("assetId", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none">
              <option value="">Select unit...</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.make} {a.model}</option>)}
            </select>
            {selectedAsset?.hoursTotal && (
              <p className="text-[10px] text-ag-muted mt-1">Current hours: {selectedAsset.hoursTotal.toLocaleString()}</p>
            )}
          </div>

          {/* Service Type */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Service Type *</label>
            <select value={form.serviceType} onChange={e => update("serviceType", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none">
              <option value="">Select type...</option>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Due triggers */}
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide mb-3">Due When (set one or both)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-ag-muted">At Hours</label>
                <input type="number" value={form.dueAtHours} onChange={e => update("dueAtHours", e.target.value)} placeholder="e.g., 750"
                  className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-ag-muted">By Date</label>
                <input type="date" value={form.dueAtDate} onChange={e => update("dueAtDate", e.target.value)}
                  className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Recurrence */}
          <div className="bg-white/[0.02] rounded-lg p-4 border border-white/[0.04]">
            <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide mb-3">Repeat Every (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-ag-muted">Hours Interval</label>
                <input type="number" value={form.intervalHours} onChange={e => update("intervalHours", e.target.value)} placeholder="e.g., 250"
                  className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-ag-muted">Days Interval</label>
                <input type="number" value={form.intervalDays} onChange={e => update("intervalDays", e.target.value)} placeholder="e.g., 365"
                  className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none" />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Priority</label>
            <div className="flex gap-2 mt-1">
              {[
                { value: "low", label: "Low", color: "text-ag-secondary border-[var(--ag-border)]" },
                { value: "normal", label: "Normal", color: "text-[var(--ag-blue)] border-[#60A5FA]/30" },
                { value: "high", label: "High", color: "text-[var(--ag-yellow)] border-[#F59E0B]/30" },
                { value: "critical", label: "Critical", color: "text-[var(--ag-red)] border-[var(--ag-red)]/30" },
              ].map(p => (
                <button key={p.value} onClick={() => update("priority", p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.priority === p.value ? `${p.color} bg-[var(--ag-bg-hover)]` : "text-ag-muted border-white/[0.04]"
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Additional details..."
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#60A5FA]/40 focus:outline-none resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--ag-border)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ag-secondary hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.assetId || !form.serviceType || saving}
            className="px-5 py-2 text-sm font-semibold bg-[var(--ag-blue)] text-white rounded-full hover:bg-[#3B82F6] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Schedule Service"}
          </button>
        </div>
      </div>
    </div>
  );
}