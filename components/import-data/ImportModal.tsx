"use client";

import React, { useState, useCallback } from "react";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Upload,
  Loader2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import FileDropZone from "./FileDropZone";
import PreviewTable from "./PreviewTable";
import { parseFile } from "@/lib/import-parsers";
import {
  normalizeCropType,
  normalizeCategory,
  normalizeProvince,
} from "@/lib/import-parsers";
import {
  validateRows,
  type ValidationResult,
  type ExistingField,
} from "@/lib/import-validators";
import type { ImportType } from "@/lib/template-generator";

interface ImportModalProps {
  type: ImportType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  cropYear: number;
}

type Step = "upload" | "preview" | "importing" | "done";

const TYPE_CONFIG = {
  fields: {
    label: "Fields",
    apiPath: "/api/import/fields",
    successLink: "/operations/fields",
    successLabel: "View Fields",
  },
  seeding: {
    label: "Seeding Records",
    apiPath: "/api/import/seeding",
    successLink: "/operations/fields",
    successLabel: "View Fields",
  },
  harvest: {
    label: "Harvest Data",
    apiPath: "/api/import/harvest",
    successLink: "/grain360",
    successLabel: "View Grain Loads",
  },
  expenses: {
    label: "Expenses",
    apiPath: "/api/import/expenses",
    successLink: "/finance",
    successLabel: "View Finance",
  },
};

export default function ImportModal({
  type,
  isOpen,
  onClose,
  onSuccess,
  cropYear,
}: ImportModalProps) {
  const [step, setStep] = useState<Step>("upload");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [excludedRows, setExcludedRows] = useState<Set<number>>(new Set());
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existingFields, setExistingFields] = useState<ExistingField[]>([]);

  const config = TYPE_CONFIG[type];

  // Fetch existing fields for validation
  const loadExistingFields = useCallback(async () => {
    try {
      const res = await fetch("/api/fields/summary?crop_year=" + cropYear);
      if (res.ok) {
        const data = await res.json();
        const fields: ExistingField[] = (data.fields || []).map(
          (f: Record<string, unknown>) => ({
            id: f.id as string,
            field_name: f.field_name as string,
            acres: f.acres as number | null,
          })
        );
        setExistingFields(fields);
        return fields;
      }
    } catch {
      // Non-critical
    }
    return [];
  }, [cropYear]);

  // Step 1 -> Step 2: Parse file and validate
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const fields = await loadExistingFields();

        const buffer = await file.arrayBuffer();
        const parsed = parseFile(buffer, type);

        if (parsed.rows.length === 0) {
          setError(
            "No data rows found. Make sure your file has data below the header row."
          );
          return;
        }

        const result = validateRows(
          parsed.rows,
          type,
          fields,
          new Set(fields.map((f) => f.field_name.trim().toLowerCase()))
        );
        setValidation(result);

        // Auto-exclude error rows
        const autoExclude = new Set<number>();
        result.rows.forEach((r) => {
          if (r.status === "error") autoExclude.add(r.rowIndex);
        });
        setExcludedRows(autoExclude);

        setStep("preview");
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unknown error";
        setError("Failed to parse file: " + message);
      }
    },
    [type, loadExistingFields]
  );

  // Toggle row exclusion
  const handleToggleRow = useCallback((rowIndex: number) => {
    setExcludedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) next.delete(rowIndex);
      else next.add(rowIndex);
      return next;
    });
  }, []);

  // Step 2 -> Step 3: Execute import
  const handleImport = useCallback(async () => {
    if (!validation) return;

    setStep("importing");
    setError(null);

    try {
      const importableRows = validation.rows.filter(
        (r) => !excludedRows.has(r.rowIndex) && r.status !== "error"
      );

      // Transform rows for API based on type
      let apiRows: Record<string, unknown>[];

      switch (type) {
        case "fields":
          apiRows = importableRows.map((r) => ({
            field_name: r.data.field_name,
            acres: r.data.acres,
            crop_type: r.data.crop_type
              ? normalizeCropType(r.data.crop_type)
              : null,
            variety: r.data.variety,
            seeded_acres: r.data.seeded_acres,
            quarter: r.data.quarter
              ? String(r.data.quarter).toUpperCase().trim()
              : null,
            section: r.data.section,
            township: r.data.township,
            range: r.data.range,
            meridian: r.data.meridian,
            latitude: r.data.latitude,
            longitude: r.data.longitude,
            province: normalizeProvince(r.data.province),
            notes: r.data.notes,
          }));
          break;

        case "seeding":
          apiRows = importableRows
            .filter((r) => r.matchedFieldId)
            .map((r) => {
              const matchedField = existingFields.find(
                (f) => f.id === r.matchedFieldId
              );
              return {
                field_id: r.matchedFieldId,
                crop_type:
                  normalizeCropType(r.data.crop_type) || r.data.crop_type,
                variety: r.data.variety,
                seeded_acres: r.data.seeded_acres,
                seeding_date: r.data.seeding_date,
                seed_rate: r.data.seed_rate,
                seed_cost: r.data.seed_cost,
                field_acres: matchedField?.acres,
              };
            });
          break;

        case "harvest":
          apiRows = importableRows
            .filter((r) => r.matchedFieldId)
            .map((r) => ({
              field_id: r.matchedFieldId,
              crop_type:
                normalizeCropType(r.data.crop_type) || r.data.crop_type,
              bushels: r.data.bushels,
              moisture: r.data.moisture,
              grade: r.data.grade,
              date: r.data.date,
              destination: r.data.destination,
            }));
          break;

        case "expenses":
          apiRows = importableRows
            .filter((r) => r.matchedFieldId)
            .map((r) => ({
              field_id: r.matchedFieldId,
              category: normalizeCategory(r.data.category) || "other",
              description: r.data.description,
              amount: r.data.amount,
              date: r.data.date,
              vendor: r.data.vendor,
            }));
          break;
      }

      if (apiRows.length === 0) {
        setError("No valid rows to import after excluding errors.");
        setStep("preview");
        return;
      }

      const res = await fetch(config.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: apiRows, crop_year: cropYear }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Import failed");
        setStep("preview");
        return;
      }

      setImportResult({ success: true, message: result.message });
      setStep("done");
      onSuccess(result.message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Unknown error";
      setError("Import failed: " + message);
      setStep("preview");
    }
  }, [
    validation,
    excludedRows,
    type,
    config.apiPath,
    cropYear,
    existingFields,
    onSuccess,
  ]);

  // Reset modal
  const handleClose = () => {
    setStep("upload");
    setValidation(null);
    setExcludedRows(new Set());
    setImportResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const importableCount = validation
    ? validation.rows.filter(
        (r) => !excludedRows.has(r.rowIndex) && r.status !== "error"
      ).length
    : 0;

  const stepNames = ["upload", "preview", "done"] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl max-h-[85vh] bg-[#0B1120] rounded-xl border border-[#1E293B] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-[#22C55E]" />
            <h2 className="text-lg font-semibold text-[#E2E8F0]">
              Import {config.label}
            </h2>
            {/* Step indicator */}
            <div className="flex items-center gap-2 ml-4">
              {stepNames.map((s, i) => {
                const currentIdx = stepNames.indexOf(
                  step === "importing" ? "preview" : (step as typeof stepNames[number])
                );
                const thisIdx = i;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && <div className="w-6 h-px bg-[#1E293B]" />}
                    <div
                      className={
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium " +
                        (thisIdx === currentIdx
                          ? "bg-[#22C55E] text-[#0B1120]"
                          : thisIdx < currentIdx
                          ? "bg-[#22C55E]/20 text-[#22C55E]"
                          : "bg-[#1E293B] text-[#64748B]")
                      }
                    >
                      {i + 1}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-3 mb-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
              <AlertCircle className="w-4 h-4 text-[#EF4444] mt-0.5 shrink-0" />
              <p className="text-sm text-[#EF4444]">{error}</p>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === "upload" && (
            <div className="max-w-lg mx-auto space-y-4">
              <p className="text-sm text-[#94A3B8]">
                Upload your {config.label.toLowerCase()} file. Use the template
                for best results — we will match columns automatically.
              </p>
              <FileDropZone onFileSelect={handleFileSelect} />
              <p className="text-xs text-[#64748B] text-center">
                Supported formats: .xlsx, .csv — Column headers are matched
                automatically
              </p>
            </div>
          )}

          {/* Step 2: Preview + Validate */}
          {(step === "preview" || step === "importing") && validation && (
            <PreviewTable
              validation={validation}
              type={type}
              onToggleRow={handleToggleRow}
              excludedRows={excludedRows}
            />
          )}

          {/* Step 3: Done */}
          {step === "done" && importResult && (
            <div className="max-w-md mx-auto text-center space-y-4 py-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-[#22C55E]/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
              </div>
              <h3 className="text-lg font-semibold text-[#E2E8F0]">
                Import Complete
              </h3>
              <p className="text-sm text-[#94A3B8]">{importResult.message}</p>
              <a
                href={config.successLink}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C55E]/10 text-[#22C55E] text-sm font-medium hover:bg-[#22C55E]/20 transition-colors"
              >
                {config.successLabel}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== "done" && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1E293B]">
            <div>
              {step === "preview" && (
                <button
                  onClick={() => {
                    setStep("upload");
                    setValidation(null);
                    setError(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#94A3B8] hover:text-[#E2E8F0] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === "preview" && validation && (
                <span className="text-xs text-[#94A3B8]">
                  {importableCount} of {validation.summary.total} rows will be
                  imported
                </span>
              )}
              {step === "preview" && (
                <button
                  onClick={handleImport}
                  disabled={importableCount === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C55E] text-[#0B1120] text-sm font-semibold hover:bg-[#16A34A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Import {importableCount} Rows
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {step === "importing" && (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22C55E]/20 text-[#22C55E] text-sm font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </div>
              )}
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center justify-end px-6 py-4 border-t border-[#1E293B]">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-[#1E293B] text-[#E2E8F0] text-sm font-medium hover:bg-[#334155] transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}