"use client";

import React, { useState, useMemo } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ValidationResult } from "@/lib/import-validators";
import type { ImportType } from "@/lib/template-generator";
import { TEMPLATE_CONFIGS } from "@/lib/template-generator";

interface PreviewTableProps {
  validation: ValidationResult;
  type: ImportType;
  onToggleRow?: (rowIndex: number) => void;
  excludedRows?: Set<number>;
}

const PAGE_SIZE = 20;

const STATUS_CONFIG = {
  valid: {
    icon: CheckCircle2,
    color: "text-[var(--ag-green)]",
    bg: "bg-[var(--ag-accent)]/5",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-[var(--ag-yellow)]",
    bg: "bg-[#F59E0B]/5",
  },
  error: {
    icon: AlertCircle,
    color: "text-[var(--ag-red)]",
    bg: "bg-[var(--ag-red)]/5",
  },
};

export default function PreviewTable({
  validation,
  type,
  onToggleRow,
  excludedRows = new Set(),
}: PreviewTableProps) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<"all" | "valid" | "warning" | "error">(
    "all"
  );

  const columns = TEMPLATE_CONFIGS[type].columns;

  const filteredRows = useMemo(() => {
    if (filter === "all") return validation.rows;
    return validation.rows.filter((r) => r.status === filter);
  }, [validation.rows, filter]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pageRows = filteredRows.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );

  const { summary } = validation;

  return (
    <div className="space-y-3">
      {/* Summary Bar */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-ag-secondary">{summary.total} rows parsed</span>
        <span className="text-ag-dim">|</span>
        <button
          onClick={() => {
            setFilter("all");
            setPage(0);
          }}
          className={
            "px-2 py-0.5 rounded text-xs font-medium transition-colors " +
            (filter === "all"
              ? "bg-[var(--ag-border-solid)] text-ag-primary"
              : "text-ag-secondary hover:text-ag-primary")
          }
        >
          All ({summary.total})
        </button>
        <button
          onClick={() => {
            setFilter("valid");
            setPage(0);
          }}
          className={
            "px-2 py-0.5 rounded text-xs font-medium transition-colors " +
            (filter === "valid"
              ? "bg-[var(--ag-green-dim)] text-[var(--ag-green)]"
              : "text-[var(--ag-green)]/70 hover:text-[var(--ag-green)]")
          }
        >
          Valid ({summary.valid})
        </button>
        {summary.warnings > 0 && (
          <button
            onClick={() => {
              setFilter("warning");
              setPage(0);
            }}
            className={
              "px-2 py-0.5 rounded text-xs font-medium transition-colors " +
              (filter === "warning"
                ? "bg-[#F59E0B]/10 text-[var(--ag-yellow)]"
                : "text-[var(--ag-yellow)]/70 hover:text-[var(--ag-yellow)]")
            }
          >
            Warnings ({summary.warnings})
          </button>
        )}
        {summary.errors > 0 && (
          <button
            onClick={() => {
              setFilter("error");
              setPage(0);
            }}
            className={
              "px-2 py-0.5 rounded text-xs font-medium transition-colors " +
              (filter === "error"
                ? "bg-[var(--ag-red)]/10 text-[var(--ag-red)]"
                : "text-[var(--ag-red)]/70 hover:text-[var(--ag-red)]")
            }
          >
            Errors ({summary.errors})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-ag overflow-hidden">
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-ag-card border-b border-ag">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ag-secondary w-10">
                  <span className="sr-only">Status</span>
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-ag-secondary w-8">
                  Row
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-3 py-2.5 text-left text-xs font-medium text-ag-secondary whitespace-nowrap"
                  >
                    {col.header}
                    {col.required && (
                      <span className="text-[var(--ag-green)] ml-0.5">*</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const statusConf = STATUS_CONFIG[row.status];
                const StatusIcon = statusConf.icon;
                const isExcluded = excludedRows.has(row.rowIndex);
                const errorFields = new Set(
                  row.messages
                    .filter((m) => m.severity === "error")
                    .map((m) => m.field)
                );
                const warnFields = new Set(
                  row.messages
                    .filter((m) => m.severity === "warning")
                    .map((m) => m.field)
                );

                return (
                  <React.Fragment key={row.rowIndex}>
                    <tr
                      className={
                        "border-b border-ag/50 transition-colors hover:bg-[var(--ag-bg-active)] " +
                        statusConf.bg +
                        (isExcluded ? " opacity-40" : "")
                      }
                      onClick={() => onToggleRow?.(row.rowIndex)}
                    >
                      <td className="px-3 py-2">
                        <StatusIcon
                          className={"w-4 h-4 " + statusConf.color}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-ag-muted font-mono">
                        {row.rowIndex}
                      </td>
                      {columns.map((col) => {
                        const val = row.data[col.key];
                        const hasError = errorFields.has(col.key);
                        const hasWarn = warnFields.has(col.key);

                        let cellColor = "text-ag-primary";
                        if (hasError) cellColor = "text-[var(--ag-red)] bg-[var(--ag-red)]/5";
                        else if (hasWarn) cellColor = "text-[var(--ag-yellow)]";

                        return (
                          <td
                            key={col.key}
                            className={
                              "px-3 py-2 whitespace-nowrap max-w-[200px] truncate " +
                              cellColor
                            }
                          >
                            {val !== null && val !== undefined ? (
                              String(val)
                            ) : (
                              <span className="text-ag-dim">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    {/* Error/Warning messages row */}
                    {row.messages.length > 0 && (
                      <tr
                        className={
                          statusConf.bg +
                          " border-b border-ag/50"
                        }
                      >
                        <td />
                        <td />
                        <td colSpan={columns.length} className="px-3 py-1.5">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {row.messages.map((msg, mi) => (
                              <span
                                key={mi}
                                className={
                                  "text-xs " +
                                  (msg.severity === "error"
                                    ? "text-[var(--ag-red)]"
                                    : "text-[var(--ag-yellow)]")
                                }
                              >
                                {msg.message}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="px-3 py-8 text-center text-ag-secondary"
                  >
                    No rows match this filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-ag-secondary">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filteredRows.length)} of{" "}
            {filteredRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-[var(--ag-bg-active)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-[var(--ag-bg-active)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}