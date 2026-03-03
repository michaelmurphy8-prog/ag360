"use client";

import { useState, useRef } from "react";
import { X, Wrench, Paperclip, FileText, Trash2, Upload } from "lucide-react";

interface Asset {
  id: string;
  name: string;
  make: string;
  model: string;
  hoursTotal: number | null;
  kmTotal?: number | null;
  assetClass?: string | null;
}

const SERVICE_TYPES = [
  "Oil Change", "Filter Replacement", "Greasing", "Belt Replacement",
  "Tire Service", "Hydraulic Service", "Electrical Repair", "Engine Repair",
  "Transmission Service", "Bearing Replacement", "Annual Inspection",
  "Winterization", "Pre-Season Check", "Calibration", "Warranty Work", "Other",
];

const CATEGORIES = [
  { value: "preventive", label: "Preventive" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "warranty", label: "Warranty" },
  { value: "general", label: "General" },
];

const POWER_UNITS = ["truck", "pickup", "car", "van"];

interface Attachment {
  url: string;
  filename: string;
}

interface Props {
  assets: Asset[];
  preselectedAssetId?: string;
  scanData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddServiceLogModal({ assets, preselectedAssetId, scanData, onClose, onSuccess }: Props) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    assetId: scanData?.matched_asset_id || preselectedAssetId || "",
    date: scanData?.date || new Date().toISOString().split("T")[0],
    type: scanData?.service_type || "",
    serviceCategory: scanData?.category || "preventive",
    cost: scanData?.cost?.toString() || "",
    hoursAtService: scanData?.hours_at_service?.toString() || "",
    kmAtService: scanData?.km_at_service?.toString() || "",
    laborHours: scanData?.labor_hours?.toString() || "",
    partsUsed: scanData?.parts_used || "",
    vendor: scanData?.vendor || "",
    performedBy: scanData?.performed_by || "",
    notes: scanData?.notes || "",
  });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const selectedAsset = assets.find(a => a.id === form.assetId);
  const isPowerUnit = selectedAsset && POWER_UNITS.includes((selectedAsset.assetClass || "").toLowerCase());

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/machinery/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (data.success) {
          setAttachments(prev => [...prev, { url: data.url, filename: data.filename }]);
        }
      }
    } catch (err) { console.error("Upload failed:", err); }
    finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!form.assetId || !form.date || !form.type) return;
    setSaving(true);
    try {
      const res = await fetch("/api/machinery/service", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cost: form.cost ? parseFloat(form.cost) : null,
          hoursAtService: form.hoursAtService ? parseFloat(form.hoursAtService) : null,
          kmAtService: form.kmAtService ? parseFloat(form.kmAtService) : null,
          laborHours: form.laborHours ? parseFloat(form.laborHours) : null,
          attachments: attachments.length > 0 ? JSON.stringify(attachments) : null,
        }),
      });
      const data = await res.json();
      if (data.success) onSuccess();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--ag-bg-card)] border border-[var(--ag-border)] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-[var(--ag-border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--ag-accent)]/10 flex items-center justify-center">
              <Wrench size={16} className="text-[var(--ag-green)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ag-primary">Log Service</h2>
              <p className="text-xs text-ag-muted">Record completed maintenance work</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Scan result banner */}
          {scanData && (
            <div className={`rounded-lg p-3 border text-xs ${
              scanData.confidence === 'high' ? 'bg-[var(--ag-accent)]/10 border-[var(--ag-accent-border)] text-[var(--ag-green)]' :
              scanData.confidence === 'medium' ? 'bg-[#F59E0B]/10 border-[var(--ag-yellow)/0.2] text-[var(--ag-yellow)]' :
              'bg-[var(--ag-red)]/10 border-[var(--ag-red)]/20 text-[var(--ag-red)]'
            }`}>
              <p className="font-semibold">AI Scanned — {scanData.confidence} confidence</p>
              {scanData.raw_unit_description && (
                <p className="mt-1 text-ag-secondary">Document describes unit as: "{scanData.raw_unit_description}"</p>
              )}
              <p className="mt-1 text-ag-muted">Please verify all fields before saving.</p>
            </div>
          )}
          {/* Unit */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Unit *</label>
            <select value={form.assetId} onChange={e => update("assetId", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none">
              <option value="">Select unit...</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} — {a.make} {a.model}</option>
              ))}
            </select>
            {selectedAsset && (
              <div className="flex gap-4 mt-1">
                {selectedAsset.hoursTotal != null && (
                  <p className="text-[10px] text-ag-muted">Current hours: {selectedAsset.hoursTotal.toLocaleString()}</p>
                )}
                {selectedAsset.kmTotal != null && (
                  <p className="text-[10px] text-ag-muted">Current km: {selectedAsset.kmTotal.toLocaleString()}</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Date *</label>
              <input type="date" value={form.date} onChange={e => update("date", e.target.value)}
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Category</label>
              <select value={form.serviceCategory} onChange={e => update("serviceCategory", e.target.value)}
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Service Type */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Service Type *</label>
            <select value={form.type} onChange={e => update("type", e.target.value)}
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none">
              <option value="">Select type...</option>
              {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Cost + Hours/KM + Labor */}
          <div className={`grid gap-4 ${isPowerUnit ? "grid-cols-4" : "grid-cols-3"}`}>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Cost ($)</label>
              <input type="number" step="0.01" value={form.cost} onChange={e => update("cost", e.target.value)} placeholder="0.00"
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Hours at Service</label>
              <input type="number" value={form.hoursAtService} onChange={e => update("hoursAtService", e.target.value)} placeholder="0"
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
            {isPowerUnit && (
              <div>
                <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">KM at Service</label>
                <input type="number" value={form.kmAtService} onChange={e => update("kmAtService", e.target.value)} placeholder="0"
                  className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Labor Hours</label>
              <input type="number" step="0.5" value={form.laborHours} onChange={e => update("laborHours", e.target.value)} placeholder="0"
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
          </div>

          {/* Parts Used */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Parts Used</label>
            <input type="text" value={form.partsUsed} onChange={e => update("partsUsed", e.target.value)} placeholder="e.g., 2x oil filters, 10L 15W-40"
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Vendor / Shop</label>
              <input type="text" value={form.vendor} onChange={e => update("vendor", e.target.value)} placeholder="e.g., Prairie Equipment"
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Performed By</label>
              <input type="text" value={form.performedBy} onChange={e => update("performedBy", e.target.value)} placeholder="e.g., Mike, Dealer Tech"
                className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none" />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => update("notes", e.target.value)} placeholder="Additional details..."
              className="w-full mt-1 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[var(--ag-accent)]/40 focus:outline-none resize-none" />
          </div>

          {/* Attachments */}
          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide mb-2 block">Attachments</label>

            {/* Existing attachments */}
            {attachments.length > 0 && (
              <div className="space-y-2 mb-3">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-3 bg-[var(--ag-bg-hover)] border border-[var(--ag-border)] rounded-lg px-3 py-2">
                    <FileText size={14} className="text-[var(--ag-blue)] flex-shrink-0" />
                    <a href={att.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-[var(--ag-blue)] hover:underline truncate flex-1">
                      {att.filename}
                    </a>
                    <button onClick={() => removeAttachment(i)} className="text-ag-muted hover:text-[var(--ag-red)] transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="hidden" onChange={handleUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 text-xs font-semibold text-ag-secondary border border-dashed border-white/[0.1] rounded-lg px-4 py-3 w-full hover:border-[var(--ag-accent)]/30 hover:text-[var(--ag-green)] transition-colors disabled:opacity-50">
              {uploading ? (
                <><Upload size={14} className="animate-pulse" /> Uploading...</>
              ) : (
                <><Paperclip size={14} /> Attach invoice, service sheet, or photo</>
              )}
            </button>
            <p className="text-[10px] text-ag-dim mt-1">PDF, images, Word, Excel — max 10MB each</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[var(--ag-border)] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ag-secondary hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.assetId || !form.type || saving}
            className="px-5 py-2 text-sm font-semibold bg-[var(--ag-accent)] text-[var(--ag-accent-text)] rounded-full hover:bg-[var(--ag-accent-hover)] transition-colors disabled:opacity-50">
            {saving ? "Saving..." : "Log Service"}
          </button>
        </div>
      </div>
    </div>
  );
}