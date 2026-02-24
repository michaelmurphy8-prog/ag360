"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  BRANDS,
  DATA_TYPES,
  TARGET_FIELDS,
  autoMapColumns,
  parseCSV,
  fuzzyMatchFields,
} from "@/lib/import-engine";
import type { BrandId, DataTypeId } from "@/lib/import-engine";

export default function ImportsPage() {
  const [step, setStep] = useState(1);
  const [provider, setProvider] = useState<BrandId | null>(null);
  const [dataType, setDataType] = useState<DataTypeId | null>(null);
  const [cropYear, setCropYear] = useState(2025);
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState("");

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});
  const [ag360Fields, setAg360Fields] = useState<{ id: string; name: string; total_acres?: number }[]>([]);

  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const brandObj = BRANDS.find((b) => b.id === provider);
  const dataTypeObj = DATA_TYPES.find((d) => d.id === dataType);
  const targetFields = dataType ? TARGET_FIELDS[dataType] || [] : [];
  const requiredFields = targetFields.filter((f) => f.required);
  const mappedRequired = requiredFields.filter((f) => Object.values(columnMapping).includes(f.key));

  useEffect(() => {
    if (step === 5 && provider) {
      fetch(`/api/imports/fields?provider=${provider}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.fields) setAg360Fields(data.fields);
          if (data.aliasMap) {
            setFieldMapping((prev) => ({ ...data.aliasMap, ...prev }));
          }
        })
        .catch(() => {});
    }
  }, [step, provider]);

  const getExtFieldNames = useCallback((): string[] => {
    const fieldCol = Object.entries(columnMapping).find(([, v]) => v === "field_name");
    if (!fieldCol || rows.length === 0) return [];
    return [...new Set(rows.map((r) => r[fieldCol[0]]).filter(Boolean))];
  }, [columnMapping, rows]);

  const handleFile = async (file: File) => {
    setError("");
    const text = await file.text();
    setCsvText(text);
    setFileName(file.name);

    const parsed = parseCSV(text);
    if (parsed.headers.length === 0 || parsed.rows.length === 0) {
      setError("Could not parse this file. Make sure it's a CSV with headers.");
      return;
    }

    setHeaders(parsed.headers);
    setRows(parsed.rows);

    const mapping = autoMapColumns(parsed.headers, dataType!, provider || undefined);
    setColumnMapping(mapping);

    setStep(4);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleConfirm = async () => {
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/imports/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csvText,
          provider,
          dataType,
          cropYear,
          columnMapping,
          fieldMapping,
          fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");

      setImportResult({ inserted: data.inserted, skipped: data.skipped });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setProvider(null);
    setDataType(null);
    setCsvText("");
    setFileName("");
    setHeaders([]);
    setRows([]);
    setColumnMapping({});
    setFieldMapping({});
    setImportResult(null);
    setError("");
  };

  useEffect(() => {
    if (step === 5 && ag360Fields.length > 0) {
      const extNames = getExtFieldNames();
      const autoMatch = fuzzyMatchFields(extNames, ag360Fields);
      setFieldMapping((prev) => ({ ...autoMatch, ...prev }));
    }
  }, [step, ag360Fields, getExtFieldNames]);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#222527]">Import Data</h1>
            <p className="text-sm text-[#7A8A7C] mt-1">
              Import operations data from any equipment brand
            </p>
          </div>
          {(provider || dataType) && (
            <div className="flex items-center gap-2">
              {brandObj && (
                <span
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border"
                  style={{
                    background: brandObj.color + "12",
                    color: brandObj.color,
                    borderColor: brandObj.color + "33",
                  }}
                >
                  {brandObj.icon} {brandObj.name}
                </span>
              )}
              {dataTypeObj && (
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#F5F5F3] text-[#7A8A7C]">
                  {dataTypeObj.icon} {dataTypeObj.name}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-8">
        {["Source", "Data Type", "Upload", "Map Columns", "Match Fields", "Confirm"].map(
          (label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="h-1.5 w-full rounded-full transition-all duration-300"
                style={{
                  background:
                    i + 1 <= step
                      ? i + 1 === step
                        ? "linear-gradient(90deg, #4A7C59, #6B9E78)"
                        : "#4A7C59"
                      : "#E4E7E0",
                }}
              />
              <span
                className={`text-[10px] ${
                  i + 1 <= step ? "text-[#4A7C59] font-semibold" : "text-[#B0B8B0]"
                }`}
              >
                {label}
              </span>
            </div>
          )
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-400 hover:text-red-600">
            ✕
          </button>
        </div>
      )}

      {step === 1 && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">Where is this data from?</h2>
          <p className="text-sm text-[#7A8A7C] mb-5">
            Select the equipment brand or platform you exported from.
          </p>
          <div className="grid grid-cols-4 gap-3">
            {BRANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  setProvider(b.id);
                  setStep(2);
                }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[#E4E7E0] bg-white hover:border-[#4A7C59] hover:shadow-sm transition-all text-center group"
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-xs font-semibold text-[#222527] group-hover:text-[#4A7C59]">
                  {b.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">What type of data?</h2>
          <p className="text-sm text-[#7A8A7C] mb-5">
            This determines which AG360 module receives the records.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {DATA_TYPES.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDataType(d.id);
                  setStep(3);
                }}
                className="flex flex-col items-start gap-2 p-5 rounded-xl border border-[#E4E7E0] bg-white hover:border-[#4A7C59] hover:shadow-sm transition-all text-left group"
              >
                <span className="text-2xl">{d.icon}</span>
                <span className="text-sm font-semibold text-[#222527] group-hover:text-[#4A7C59]">
                  {d.name}
                </span>
                <span className="text-xs text-[#7A8A7C]">{d.desc}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setStep(1)}
            className="mt-4 text-xs text-[#7A8A7C] hover:text-[#4A7C59]"
          >
            ← Back
          </button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">Upload your file</h2>
          <p className="text-sm text-[#7A8A7C] mb-4">
            Drop a CSV file exported from {brandObj?.name || "your platform"}.
          </p>

          <div className="flex items-center gap-3 mb-5">
            <label className="text-sm text-[#7A8A7C]">Crop Year:</label>
            <select
              value={cropYear}
              onChange={(e) => setCropYear(Number(e.target.value))}
              className="bg-white border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm text-[#222527] focus:outline-none focus:border-[#4A7C59]"
            >
              {[2026, 2025, 2024, 2023, 2022].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-[#E4E7E0] rounded-2xl p-16 text-center cursor-pointer hover:border-[#4A7C59] hover:bg-[#F8FAF7] transition-all"
          >
            <div className="text-4xl mb-3">📂</div>
            <div className="text-sm font-semibold text-[#222527] mb-1">
              Click to upload or drag and drop
            </div>
            <div className="text-xs text-[#7A8A7C]">CSV (.csv) — Max 50MB</div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />

          <button
            onClick={() => setStep(2)}
            className="mt-4 text-xs text-[#7A8A7C] hover:text-[#4A7C59]"
          >
            ← Back
          </button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">Map columns to AG360</h2>
          <p className="text-sm text-[#7A8A7C] mb-1">
            Auto-detected {Object.keys(columnMapping).length} of {headers.length} columns.
            {mappedRequired.length === requiredFields.length ? (
              <span className="text-[#4A7C59] font-semibold"> All required fields mapped.</span>
            ) : (
              <span className="text-amber-600 font-semibold">
                {" "}
                {requiredFields.length - mappedRequired.length} required field(s) need mapping.
              </span>
            )}
          </p>
          <p className="text-xs text-[#B0B8B0] mb-5">
            {fileName} - {rows.length} records - Crop year {cropYear}
          </p>

          <div className="bg-white rounded-xl border border-[#E4E7E0] overflow-hidden">
            <div className="grid grid-cols-[1fr_32px_1fr_120px] gap-0 px-4 py-2.5 bg-[#F5F5F3] border-b border-[#E4E7E0] text-[10px] font-semibold text-[#7A8A7C] uppercase tracking-wider">
              <div>Source Column</div>
              <div />
              <div>AG360 Field</div>
              <div>Sample</div>
            </div>

            {headers.map((header, idx) => {
              const mapped = columnMapping[header];
              const sample = rows[0]?.[header] || "—";

              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[1fr_32px_1fr_120px] gap-0 px-4 py-2.5 items-center border-b border-[#F5F5F3] ${
                    mapped ? "bg-[#F8FAF7]" : ""
                  }`}
                >
                  <div className="text-sm font-mono text-[#222527]">{header}</div>
                  <div className={`text-center text-xs ${mapped ? "text-[#4A7C59]" : "text-[#E4E7E0]"}`}>
                    →
                  </div>
                  <div>
                    <select
                      value={mapped || ""}
                      onChange={(e) => {
                        const newMap = { ...columnMapping };
                        if (e.target.value) newMap[header] = e.target.value;
                        else delete newMap[header];
                        setColumnMapping(newMap);
                      }}
                      className={`w-full bg-white border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#4A7C59] ${
                        mapped ? "border-[#4A7C59]/30 text-[#222527]" : "border-[#E4E7E0] text-[#7A8A7C]"
                      }`}
                    >
                      <option value="">— Skip —</option>
                      {targetFields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label} {f.required ? "*" : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-xs text-[#B0B8B0] font-mono pl-2 truncate">{sample}</div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 text-sm text-[#7A8A7C] border border-[#E4E7E0] rounded-xl hover:bg-[#F5F5F3]"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(5)}
              disabled={mappedRequired.length < requiredFields.length}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
                mappedRequired.length >= requiredFields.length
                  ? "bg-[#4A7C59] text-white hover:bg-[#3D6B4A]"
                  : "bg-[#E4E7E0] text-[#B0B8B0] cursor-not-allowed"
              }`}
            >
              Next: Match Fields →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">Match fields to AG360</h2>
          <p className="text-sm text-[#7A8A7C] mb-5">
            Link {brandObj?.name} field names to your AG360 field registry.
            Auto-matched {Object.keys(fieldMapping).length} of {getExtFieldNames().length}.
          </p>

          <div className="bg-white rounded-xl border border-[#E4E7E0] overflow-hidden">
            <div className="grid grid-cols-[1fr_32px_1fr_80px] gap-0 px-4 py-2.5 bg-[#F5F5F3] border-b border-[#E4E7E0] text-[10px] font-semibold text-[#7A8A7C] uppercase tracking-wider">
              <div>{brandObj?.name} Field</div>
              <div />
              <div>AG360 Field</div>
              <div className="text-center">Status</div>
            </div>

            {getExtFieldNames().map((extName, idx) => {
              const matched = fieldMapping[extName];
              return (
                <div
                  key={idx}
                  className={`grid grid-cols-[1fr_32px_1fr_80px] gap-0 px-4 py-2.5 items-center border-b border-[#F5F5F3] ${
                    matched ? "bg-[#F8FAF7]" : "bg-amber-50/30"
                  }`}
                >
                  <div className="text-sm font-medium text-[#222527]">{extName}</div>
                  <div className={`text-center text-xs ${matched ? "text-[#4A7C59]" : "text-amber-400"}`}>
                    →
                  </div>
                  <div>
                    <select
                      value={matched || ""}
                      onChange={(e) => {
                        const newMap = { ...fieldMapping };
                        if (e.target.value) newMap[extName] = e.target.value;
                        else delete newMap[extName];
                        setFieldMapping(newMap);
                      }}
                      className={`w-full bg-white border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#4A7C59] ${
                        matched ? "border-[#4A7C59]/30" : "border-amber-300"
                      }`}
                    >
                      <option value="">— Select field —</option>
                      <option value="_new">+ Create new field</option>
                      {ag360Fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                          {f.total_acres ? ` (${f.total_acres} ac)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center">
                    {matched ? (
                      <span className="text-[10px] font-semibold text-[#4A7C59]">Matched</span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-500">Unmatched</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between mt-5">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 text-sm text-[#7A8A7C] border border-[#E4E7E0] rounded-xl hover:bg-[#F5F5F3]"
            >
              ← Back
            </button>
            <button
              onClick={() => setStep(6)}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-[#4A7C59] text-white hover:bg-[#3D6B4A]"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {step === 6 && !importResult && (
        <div>
          <h2 className="text-lg font-bold text-[#222527] mb-1">Review and Confirm</h2>
          <p className="text-sm text-[#7A8A7C] mb-5">
            {rows.length} records ready to import into {dataTypeObj?.name}.
          </p>

          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: "Records", value: rows.length, icon: "📊" },
              {
                label: "Fields Matched",
                value: `${Object.keys(fieldMapping).length}/${getExtFieldNames().length}`,
                icon: "🗺️",
              },
              {
                label: "Columns Mapped",
                value: `${Object.keys(columnMapping).length}/${headers.length}`,
                icon: "🔗",
              },
              { label: "Crop Year", value: cropYear, icon: "📅" },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-xs text-[#7A8A7C] mb-1">
                  {card.icon} {card.label}
                </div>
                <div className="text-xl font-bold text-[#222527]">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-[#E4E7E0] overflow-auto mb-5">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F5F5F3]">
                  {Object.entries(columnMapping).map(([src, tgt]) => {
                    const tf = targetFields.find((f) => f.key === tgt);
                    return (
                      <th
                        key={src}
                        className="px-3 py-2.5 text-left text-[#7A8A7C] font-semibold border-b border-[#E4E7E0] whitespace-nowrap"
                      >
                        {tf?.label || tgt}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b border-[#F5F5F3]">
                    {Object.entries(columnMapping).map(([src]) => (
                      <td key={src} className="px-3 py-2 text-[#222527] whitespace-nowrap">
                        {row[src]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <div className="px-3 py-2 text-center text-[#B0B8B0] text-xs border-t border-[#E4E7E0]">
                ... and {rows.length - 5} more records
              </div>
            )}
          </div>

          <div className="bg-[#F8FAF7] border border-[#4A7C59]/20 rounded-xl p-4 mb-5">
            <div className="text-sm font-semibold text-[#4A7C59] mb-1">Import Destination</div>
            <div className="text-sm text-[#7A8A7C]">
              Grain360 → {dataTypeObj?.name} Records → Crop Year {cropYear}
            </div>
            <div className="text-xs text-[#B0B8B0] mt-1">
              Source: {brandObj?.name} - {fileName} - Field aliases saved for future imports
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(5)}
              className="px-4 py-2 text-sm text-[#7A8A7C] border border-[#E4E7E0] rounded-xl hover:bg-[#F5F5F3]"
            >
              ← Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing}
              className="px-6 py-2.5 text-sm font-bold rounded-xl bg-[#4A7C59] text-white hover:bg-[#3D6B4A] shadow-sm disabled:opacity-50"
            >
              {importing ? "Importing..." : `Confirm Import — ${rows.length} Records`}
            </button>
          </div>
        </div>
      )}

      {importResult && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-[#4A7C59] mb-2">Import Complete!</h2>
          <p className="text-sm text-[#7A8A7C] mb-1">
            {importResult.inserted} {dataTypeObj?.name?.toLowerCase()} records imported into Grain360
            for crop year {cropYear}.
          </p>
          {importResult.skipped > 0 && (
            <p className="text-xs text-amber-600">
              {importResult.skipped} records skipped due to errors.
            </p>
          )}
          <p className="text-xs text-[#B0B8B0] mt-2">
            Field aliases saved — future {brandObj?.name} imports will auto-match.
          </p>

          <div className="flex gap-3 justify-center mt-8">
            <button
              onClick={reset}
              className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-[#E4E7E0] text-[#222527] hover:bg-[#F5F5F3]"
            >
              Import More Data
            </button>
            <a
              href="/grain360"
              className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#4A7C59] text-white hover:bg-[#3D6B4A]"
            >
              View in Grain360 →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}