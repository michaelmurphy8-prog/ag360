'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

interface ParsedRow {
  make: string;
  model: string;
  year: string;
  serial_number: string;
  purchase_value: string;
  current_value: string;
  asset_type: string;
  asset_class: string;
  status: string;
  hours_km: string;
  next_service_hours_km: string;
  notes: string;
}

interface BulkUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ onClose, onSuccess }: BulkUploadModalProps) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', range: 1 }) as Record<string, unknown>[];

      const labelToKey: Record<string, string> = {
        'Make *': 'make', 'Model *': 'model', 'Year *': 'year',
        'Serial Number': 'serial_number',
        'Purchase Value ($CAD)': 'purchase_value',
        'Current Value ($CAD)': 'current_value',
        'Asset Type (fixed/variable)': 'asset_type',
        'Asset Class': 'asset_class', 'Status': 'status',
        'Hours / KM': 'hours_km',
        'Next Service (hrs/km)': 'next_service_hours_km',
        'Notes': 'notes',
        'make': 'make', 'model': 'model', 'year': 'year',
        'serial_number': 'serial_number', 'purchase_value': 'purchase_value',
        'current_value': 'current_value', 'asset_type': 'asset_type',
        'asset_class': 'asset_class', 'status': 'status',
        'hours_km': 'hours_km', 'next_service_hours_km': 'next_service_hours_km',
        'notes': 'notes',
      };

      const normalized: ParsedRow[] = rawRows.map(row => {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(row)) {
          const key = labelToKey[k.trim()];
          if (key) mapped[key] = String(v);
        }
        return mapped as unknown as ParsedRow;
      });

      const filtered = normalized.filter(r =>
        r.make &&
        !r.notes?.toLowerCase().includes('example row') &&
        !r.notes?.toLowerCase().includes('delete this')
      );

      setRows(filtered);
      setStep('preview');
    };
    reader.readAsBinaryString(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    setUploading(true);
    setErrors([]);
    try {
      const res = await fetch('/api/machinery/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
        setTimeout(() => { onSuccess(); onClose(); }, 1500);
      } else {
        setErrors(data.errors || ['Upload failed']);
      }
    } catch {
      setErrors(['Network error — please try again']);
    } finally {
      setUploading(false);
    }
  }

  const statusColor = (s: string) => {
    const val = s?.toUpperCase();
    if (val === 'ACTIVE') return 'text-green-600 bg-green-50';
    if (val === 'WATCH')  return 'text-yellow-600 bg-yellow-50';
    if (val === 'DOWN')   return 'text-red-600 bg-red-50';
    return 'text-gray-500 bg-gray-50';
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bulk Upload Assets</h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload your fleet using the Excel template</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
                <div>
                  <p className="text-sm font-medium text-green-800">Step 1 — Download the template</p>
                  <p className="text-xs text-green-600 mt-0.5">Fill it out in Excel, then upload below</p>
                </div>
                <a href="/machinery_bulk_upload_template.xlsx" download className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                  ↓ Download Excel Template
                </a>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all"
              >
                <div className="text-4xl mb-3">📊</div>
                <p className="text-gray-700 font-medium">Step 2 — Drop your filled template here or click to browse</p>
                <p className="text-gray-400 text-sm mt-1">Accepts .xlsx or .csv</p>
                <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </div>
            </div>
          )}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{rows.length} assets ready to import</p>
                  <p className="text-sm text-gray-500">{fileName}</p>
                </div>
                <button onClick={() => { setRows([]); setStep('upload'); setFileName(''); }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                  Upload different file
                </button>
              </div>
              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                  {errors.map((e, i) => <p key={i} className="text-sm text-red-700">⚠ {e}</p>)}
                </div>
              )}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {['Make','Model','Year','Serial #','Class','Type','Value','Hours/KM','Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{row.make}</td>
                        <td className="px-3 py-2.5 text-gray-700">{row.model}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.year}</td>
                        <td className="px-3 py-2.5 text-gray-400 font-mono text-xs">{row.serial_number || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600 capitalize">{row.asset_class || 'other'}</td>
                        <td className="px-3 py-2.5 text-gray-500 capitalize">{row.asset_type || 'fixed'}</td>
                        <td className="px-3 py-2.5 text-gray-700">{row.current_value ? `$${Number(row.current_value).toLocaleString()}` : '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.hours_km ? Number(row.hours_km).toLocaleString() : '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor(row.status || 'active')}`}>
                            {row.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {step === 'done' && (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-semibold text-gray-900">Assets imported successfully</p>
              <p className="text-gray-500 mt-1">{rows.length} assets added to your fleet</p>
            </div>
          )}
        </div>
        {step === 'preview' && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={handleConfirm} disabled={uploading || rows.length === 0} className="px-6 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
              {uploading ? 'Importing...' : `Import ${rows.length} Assets`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}