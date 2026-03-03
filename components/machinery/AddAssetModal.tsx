'use client';

import { useState } from 'react';
import { X, Tractor } from 'lucide-react';

interface AddAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAssetModal({ onClose, onSuccess }: AddAssetModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    make: '', model: '', year: new Date().getFullYear().toString(),
    serial_number: '', purchase_value: '', current_value: '',
    asset_type: 'fixed', asset_class: 'tractor', status: 'ACTIVE',
    hours_km: '', km_total: '', next_service_hours_km: '', notes: '',
    warranty_expiry: '', warranty_notes: '', dealer_name: '', dealer_phone: '',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit() {
    if (!form.make || !form.model || !form.year) {
      setError('Make, Model, and Year are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/machinery/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { onSuccess(); onClose(); }
      else setError(data.error || 'Save failed');
    } catch { setError('Network error — please try again'); }
    finally { setSaving(false); }
  }

  const isPowerUnit = ['truck', 'pickup', 'car', 'van'].includes(form.asset_class);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#111827] border border-white/[0.06] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#34D399]/10 flex items-center justify-center">
              <Tractor size={16} className="text-[#34D399]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ag-primary">Add Asset</h2>
              <p className="text-xs text-ag-muted">Add a single asset to your fleet</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ag-muted hover:text-white"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl p-3 text-sm text-[#EF4444]">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Make *</label>
              <input name="make" value={form.make} onChange={handleChange} placeholder="e.g. John Deere"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Model *</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. 8R 410"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Year *</label>
              <input name="year" value={form.year} onChange={handleChange} placeholder="e.g. 2021"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Serial Number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="Optional"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Asset Class</label>
              <select name="asset_class" value={form.asset_class} onChange={handleChange}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none">
                {["tractor","combine","header","sprayer","seeder","truck","auger","construction","implement","other"].map(c =>
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Asset Type</label>
              <select name="asset_type" value={form.asset_type} onChange={handleChange}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none">
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Purchase Value ($CAD)</label>
              <input name="purchase_value" value={form.purchase_value} onChange={handleChange} placeholder="e.g. 425000"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Current Value ($CAD)</label>
              <input name="current_value" value={form.current_value} onChange={handleChange} placeholder="e.g. 285000"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
          </div>

          <div className={`grid gap-4 ${isPowerUnit ? "grid-cols-4" : "grid-cols-3"}`}>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Status</label>
              <select name="status" value={form.status} onChange={handleChange}
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none">
                {["ACTIVE","WATCH","DOWN","SOLD","RETIRED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Hours</label>
              <input name="hours_km" value={form.hours_km} onChange={handleChange} placeholder="e.g. 1842"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
            {isPowerUnit && (
              <div>
                <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">KM (Odometer)</label>
                <input name="km_total" value={form.km_total} onChange={handleChange} placeholder="e.g. 48000"
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Next Service (hrs)</label>
              <input name="next_service_hours_km" value={form.next_service_hours_km} onChange={handleChange} placeholder="e.g. 2000"
                className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
            </div>
          </div>

          {/* Warranty & Dealer */}
          <div className="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
            <p className="text-xs font-semibold text-ag-secondary uppercase tracking-wide mb-3">Warranty & Dealer</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-ag-muted">Warranty Expiry</label>
                <input type="date" name="warranty_expiry" value={form.warranty_expiry} onChange={handleChange}
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-ag-muted">Warranty Notes</label>
                <input name="warranty_notes" value={form.warranty_notes} onChange={handleChange} placeholder="e.g. Powertrain 5yr/5000hrs"
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-ag-muted">Dealer Name</label>
                <input name="dealer_name" value={form.dealer_name} onChange={handleChange} placeholder="e.g. Redhead Equipment"
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
              </div>
              <div>
                <label className="text-[11px] text-ag-muted">Dealer Phone</label>
                <input name="dealer_phone" value={form.dealer_phone} onChange={handleChange} placeholder="e.g. 306-555-1234"
                  className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ag-secondary uppercase tracking-wide">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" rows={2}
              className="w-full mt-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-ag-primary focus:border-[#34D399]/40 focus:outline-none resize-none" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-ag-secondary hover:text-white transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-[#34D399] text-[#080C15] rounded-full hover:bg-[#6EE7B7] transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}