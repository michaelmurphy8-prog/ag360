"use client";

import { useState, useRef } from "react";
import {
  X, Download, Upload, FileSpreadsheet, CheckCircle, AlertTriangle,
  Loader2, ChevronRight, ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";

type ParsedWorker = {
  name: string;
  role: string | null;
  worker_type: string | null;
  status: string | null;
  phone: string | null;
  email: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  hourly_rate: string | null;
  daily_rate: string | null;
  start_date: any;
  end_date: any;
  notes: string | null;
  _valid: boolean;
  _error: string | null;
};

// Fuzzy header matching
const HEADER_MAP: Record<string, string> = {
  name: "name", "full name": "name", "worker name": "name", employee: "name", "employee name": "name",
  role: "role", position: "role", title: "role", "job title": "role",
  type: "worker_type", "worker type": "worker_type", "employment type": "worker_type", category: "worker_type",
  status: "status",
  phone: "phone", "phone number": "phone", tel: "phone", telephone: "phone", cell: "phone", mobile: "phone",
  email: "email", "email address": "email",
  "emergency contact": "emergency_contact", "emergency name": "emergency_contact", "ice contact": "emergency_contact",
  "emergency phone": "emergency_phone", "ice phone": "emergency_phone", "emergency number": "emergency_phone",
  "hourly rate": "hourly_rate", hourly: "hourly_rate", "rate/hr": "hourly_rate", "$/hr": "hourly_rate",
  "daily rate": "daily_rate", daily: "daily_rate", "rate/day": "daily_rate", "$/day": "daily_rate",
  "start date": "start_date", started: "start_date", "hire date": "start_date", hired: "start_date",
  "end date": "end_date", ended: "end_date", "termination date": "end_date",
  notes: "notes", comments: "notes", memo: "notes",
};

function matchHeader(raw: string): string | null {
  const clean = raw.toLowerCase().trim().replace(/[_\-*#]/g, " ").replace(/\s+/g, " ");
  return HEADER_MAP[clean] || null;
}

export default function WorkerBulkUpload({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedWorker[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; errors: { row: number; error: string }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Template Download ───────────────────────

  const downloadTemplate = () => {
    const headers = [
      "Name", "Role", "Type", "Status", "Phone", "Email",
      "Emergency Contact", "Emergency Phone",
      "Hourly Rate", "Daily Rate", "Start Date", "End Date", "Notes",
    ];
    const example = [
      "John Smith", "Equipment Operator", "Full-Time", "Active", "306-555-0123", "john@farm.ca",
      "Jane Smith", "306-555-0456",
      "28.00", "", "2024-03-15", "", "Experienced combine operator",
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Column widths
    ws["!cols"] = [
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 25 },
      { wch: 20 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Workers");

    // Add a reference sheet
    const refData = [
      ["Field", "Valid Values", "Notes"],
      ["Type", "Full-Time, Seasonal, Contractor, Family", "Defaults to Full-Time if blank"],
      ["Status", "Active, Inactive", "Defaults to Active if blank"],
      ["Hourly Rate", "Number (e.g. 28.00)", "$ sign optional"],
      ["Daily Rate", "Number (e.g. 350.00)", "Use hourly OR daily, not both"],
      ["Dates", "YYYY-MM-DD or MM/DD/YYYY", "Both formats accepted"],
    ];
    const refWs = XLSX.utils.aoa_to_sheet(refData);
    refWs["!cols"] = [{ wch: 15 }, { wch: 40 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, refWs, "Reference");

    XLSX.writeFile(wb, "AG360_Worker_Template.xlsx");
  };

  // ─── File Parse ──────────────────────────────

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

        if (rows.length === 0) {
          setParsed([]);
          setStep(2);
          return;
        }

        // Map headers
        const rawHeaders = Object.keys(rows[0]);
        const headerMapping: Record<string, string> = {};
        for (const h of rawHeaders) {
          const match = matchHeader(h);
          if (match) headerMapping[h] = match;
        }

        const workers: ParsedWorker[] = rows.map(row => {
          const mapped: Record<string, any> = {};
          for (const [rawH, field] of Object.entries(headerMapping)) {
            mapped[field] = row[rawH];
          }

          const name = String(mapped.name || "").trim();
          const valid = name.length > 0;
          const error = !valid ? "Name is required" : null;

          return {
            name,
            role: mapped.role ? String(mapped.role).trim() : null,
            worker_type: mapped.worker_type ? String(mapped.worker_type).trim() : null,
            status: mapped.status ? String(mapped.status).trim() : null,
            phone: mapped.phone ? String(mapped.phone).trim() : null,
            email: mapped.email ? String(mapped.email).trim() : null,
            emergency_contact: mapped.emergency_contact ? String(mapped.emergency_contact).trim() : null,
            emergency_phone: mapped.emergency_phone ? String(mapped.emergency_phone).trim() : null,
            hourly_rate: mapped.hourly_rate ? String(mapped.hourly_rate) : null,
            daily_rate: mapped.daily_rate ? String(mapped.daily_rate) : null,
            start_date: mapped.start_date || null,
            end_date: mapped.end_date || null,
            notes: mapped.notes ? String(mapped.notes).trim() : null,
            _valid: valid,
            _error: error,
          };
        });

        // Filter out completely empty rows
        const filtered = workers.filter(w => w.name || w.role || w.phone || w.email);
        setParsed(filtered);
        setStep(2);
      } catch (err) {
        console.error("Parse error:", err);
        setParsed([]);
        setStep(2);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Upload ──────────────────────────────────

  const handleUpload = async () => {
    const validWorkers = parsed.filter(w => w._valid);
    if (validWorkers.length === 0) return;

    setUploading(true);
    try {
      const body = validWorkers.map(({ _valid, _error, ...rest }) => rest);
      const r = await fetch("/api/hr/workers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workers: body }),
      });
      const data = await r.json();
      setResult(data);
      setStep(3);
    } catch (err) {
      setResult({ inserted: 0, errors: [{ row: 0, error: "Upload failed" }] });
      setStep(3);
    }
    setUploading(false);
  };

  const validCount = parsed.filter(w => w._valid).length;
  const invalidCount = parsed.filter(w => !w._valid).length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-[var(--ag-border)] max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "var(--ag-bg-card)" }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ag-border)]">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={16} style={{ color: "var(--ag-accent)" }} />
            <h2 className="text-[16px] font-bold text-[var(--ag-text-primary)]">Bulk Upload Workers</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)]">
            <X size={16} className="text-[var(--ag-text-muted)]" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
          {["Upload File", "Preview & Validate", "Results"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: step > i + 1 ? "var(--ag-green)" : step === i + 1 ? "var(--ag-accent)" : "var(--ag-border)",
                    color: step >= i + 1 ? "white" : "var(--ag-text-dim)",
                  }}>
                  {step > i + 1 ? "✓" : i + 1}
                </div>
                <span className="text-[10px] font-semibold" style={{ color: step === i + 1 ? "var(--ag-accent)" : "var(--ag-text-muted)" }}>{label}</span>
              </div>
              {i < 2 && <ChevronRight size={12} className="text-[var(--ag-text-dim)] mx-1" />}
            </div>
          ))}
        </div>

        <div className="p-6">
          {/* ── Step 1: Upload ─────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center py-6">
                <FileSpreadsheet size={40} className="mx-auto mb-3" style={{ color: "var(--ag-accent)", opacity: 0.5 }} />
                <p className="text-[14px] font-semibold text-[var(--ag-text-primary)] mb-1">Upload your worker list</p>
                <p className="text-[12px] text-[var(--ag-text-muted)]">Excel (.xlsx) or CSV files accepted. Max 200 workers per upload.</p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold rounded-xl border border-[var(--ag-border)] text-[var(--ag-text-secondary)] hover:text-[var(--ag-text-primary)] hover:border-[var(--ag-accent)] transition-colors">
                  <Download size={14} /> Download Template
                </button>

                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 text-[12px] font-semibold rounded-xl transition-all"
                  style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }}>
                  <Upload size={14} /> Choose File
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              </div>

              <div className="rounded-lg px-4 py-3 text-[11px] text-[var(--ag-text-dim)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                <p className="font-semibold text-[var(--ag-text-muted)] mb-1">Column mapping</p>
                <p>Headers are matched automatically. Required: <span className="font-semibold text-[var(--ag-text-primary)]">Name</span>. Optional: Role, Type (Full-Time/Seasonal/Contractor/Family), Status, Phone, Email, Emergency Contact, Emergency Phone, Hourly Rate, Daily Rate, Start Date, End Date, Notes.</p>
              </div>
            </div>
          )}

          {/* ── Step 2: Preview ────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => { setStep(1); setParsed([]); setFileName(""); }}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ag-text-muted)] hover:text-[var(--ag-text-primary)]">
                  <ArrowLeft size={12} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--ag-text-dim)]">{fileName}</span>
                  {validCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--ag-green-dim, rgba(74,124,89,0.08))", color: "var(--ag-green)" }}>
                      {validCount} valid
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--ag-red-dim, rgba(239,68,68,0.08))", color: "var(--ag-red)" }}>
                      {invalidCount} invalid
                    </span>
                  )}
                </div>
              </div>

              {parsed.length === 0 ? (
                <div className="py-8 text-center text-[var(--ag-text-muted)]">
                  <p className="text-[14px] font-semibold">No data found</p>
                  <p className="text-[12px] mt-1">Check that your file has headers in the first row.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--ag-border)] overflow-hidden">
                  <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
                    <table className="w-full text-[11px]">
                      <thead className="sticky top-0">
                        <tr style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">#</th>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Name</th>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Role</th>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Type</th>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Phone</th>
                          <th className="py-2 px-3 text-left font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Rate</th>
                          <th className="py-2 px-3 text-center font-mono text-[8px] text-[var(--ag-text-muted)] uppercase tracking-[1px]">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.map((w, i) => (
                          <tr key={i} className="border-t border-[var(--ag-border)]"
                            style={{ backgroundColor: w._valid ? "transparent" : "rgba(239,68,68,0.03)" }}>
                            <td className="py-2 px-3 text-[var(--ag-text-dim)]">{i + 1}</td>
                            <td className="py-2 px-3 font-semibold text-[var(--ag-text-primary)]">
                              {w.name || <span className="text-[var(--ag-red)] italic">Missing</span>}
                            </td>
                            <td className="py-2 px-3 text-[var(--ag-text-secondary)]">{w.role || "—"}</td>
                            <td className="py-2 px-3 text-[var(--ag-text-secondary)]">{w.worker_type || "Full-Time"}</td>
                            <td className="py-2 px-3 text-[var(--ag-text-secondary)]">{w.phone || "—"}</td>
                            <td className="py-2 px-3 text-[var(--ag-text-secondary)]">
                              {w.hourly_rate ? `$${w.hourly_rate}/hr` : w.daily_rate ? `$${w.daily_rate}/day` : "—"}
                            </td>
                            <td className="py-2 px-3 text-center">
                              {w._valid ? (
                                <CheckCircle size={12} style={{ color: "var(--ag-green)" }} className="inline" />
                              ) : (
                                <span className="text-[9px] text-[var(--ag-red)] font-semibold">{w._error}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {validCount > 0 && (
                <div className="flex justify-end">
                  <button onClick={handleUpload} disabled={uploading}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl"
                    style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)", opacity: uploading ? 0.6 : 1 }}>
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? "Uploading..." : `Import ${validCount} Worker${validCount > 1 ? "s" : ""}`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Results ────────────────── */}
          {step === 3 && result && (
            <div className="space-y-4 text-center py-4">
              {result.inserted > 0 ? (
                <>
                  <CheckCircle size={40} className="mx-auto" style={{ color: "var(--ag-green)" }} />
                  <p className="text-[18px] font-bold text-[var(--ag-text-primary)]">{result.inserted} Worker{result.inserted > 1 ? "s" : ""} Imported</p>
                </>
              ) : (
                <>
                  <AlertTriangle size={40} className="mx-auto" style={{ color: "var(--ag-red)" }} />
                  <p className="text-[18px] font-bold text-[var(--ag-text-primary)]">Import Failed</p>
                </>
              )}

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-[var(--ag-border)] p-3 text-left max-h-[200px] overflow-y-auto" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                  <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--ag-text-muted)] mb-2">{result.errors.length} Error{result.errors.length > 1 ? "s" : ""}</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-[11px] text-[var(--ag-red)] py-0.5">
                      Row {err.row}: {err.error}
                    </p>
                  ))}
                </div>
              )}

              <button onClick={() => { onComplete(); onClose(); }}
                className="px-5 py-2 text-sm font-semibold rounded-xl"
                style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}