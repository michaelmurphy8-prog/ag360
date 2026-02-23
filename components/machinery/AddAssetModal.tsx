'use client';

import { useState } from 'react';

interface AddAssetModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddAssetModal({ onClose, onSuccess }: AddAssetModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear().toString(),
    serial_number: '',
    purchase_value: '',
    current_value: '',
    asset_type: 'fixed',
    asset_class: 'tractor',
    status: 'ACTIVE',
    hours_km: '',
    next_service_hours_km: '',
    notes: '',
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
      const res = await fetch('/api/machinery/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: [form] }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setError(data.errors?.[0] || 'Save failed');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400 bg-white";
  const labelClass = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Asset</h2>
            <p className="text-sm text-gray-500 mt-0.5">Add a single asset to your fleet</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">⚠ {error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Make *</label>
              <input name="make" value={form.make} onChange={handleChange} placeholder="e.g. John Deere" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model *</label>
              <input name="model" value={form.model} onChange={handleChange} placeholder="e.g. 8R 410" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Year *</label>
              <input name="year" value={form.year} onChange={handleChange} placeholder="e.g. 2021" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serial Number</label>
              <input name="serial_number" value={form.serial_number} onChange={handleChange} placeholder="Optional" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Asset Class</label>
              <select name="asset_class" value={form.asset_class} onChange={handleChange} className={inputClass}>
                <option value="tractor">Tractor</option>
                <option value="combine">Combine</option>
                <option value="header">Header</option>
                <option value="sprayer">Sprayer</option>
                <option value="seeder">Seeder</option>
                <option value="truck">Truck</option>
                <option value="auger">Auger</option>
                <option value="construction">Construction</option>
                <option value="implement">Implement</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Asset Type</label>
              <select name="asset_type" value={form.asset_type} onChange={handleChange} className={inputClass}>
                <option value="fixed">Fixed</option>
                <option value="variable">Variable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Purchase Value ($CAD)</label>
              <input name="purchase_value" value={form.purchase_value} onChange={handleChange} placeholder="e.g. 425000" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Value ($CAD)</label>
              <input name="current_value" value={form.current_value} onChange={handleChange} placeholder="e.g. 285000" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Status</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="ACTIVE">Active</option>
                <option value="WATCH">Watch</option>
                <option value="DOWN">Down</option>
                <option value="SOLD">Sold</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Hours / KM</label>
              <input name="hours_km" value={form.hours_km} onChange={handleChange} placeholder="e.g. 1842" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Next Service (hrs/km)</label>
              <input name="next_service_hours_km" value={form.next_service_hours_km} onChange={handleChange} placeholder="e.g. 2000" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes" rows={2} className={inputClass + " resize-none"} />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}