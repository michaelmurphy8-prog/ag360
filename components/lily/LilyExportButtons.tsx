"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Download } from "lucide-react";

export default function LilyExportButtons({
  content,
  farmName,
}: {
  content: string;
  farmName?: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "pdf" | "excel") => {
    setExporting(format);
    setShowMenu(false);

    try {
      const { exportLilyPDF, exportLilyExcel } = await import("@/lib/lily-export");
      if (format === "pdf") {
        exportLilyPDF(content, farmName || "My Farm");
      } else {
        exportLilyExcel(content, farmName || "My Farm");
      }
    } catch (err) {
      console.error("Export error:", err);
    }

    setTimeout(() => setExporting(null), 1000);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold rounded-lg transition-all"
        style={{
          color: "var(--ag-text-dim)",
          border: "1px solid transparent",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--ag-accent)";
          e.currentTarget.style.borderColor = "var(--ag-border)";
          e.currentTarget.style.backgroundColor = "var(--ag-bg-secondary)";
        }}
        onMouseLeave={(e) => {
          if (!showMenu) {
            e.currentTarget.style.color = "var(--ag-text-dim)";
            e.currentTarget.style.borderColor = "transparent";
            e.currentTarget.style.backgroundColor = "transparent";
          }
        }}
        title="Download this response"
      >
        <Download size={10} />
        {exporting ? (exporting === "pdf" ? "Saving PDF..." : "Saving Excel...") : "Export"}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div
            className="absolute bottom-full left-0 mb-1.5 z-50 rounded-xl border border-[var(--ag-border)] shadow-lg overflow-hidden"
            style={{ backgroundColor: "var(--ag-bg-card)", minWidth: 160 }}
          >
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11px] font-semibold text-[var(--ag-text-primary)] hover:bg-[var(--ag-bg-hover)] transition-colors"
            >
              <FileText size={13} style={{ color: "var(--ag-red, #EF4444)" }} />
              <div className="text-left">
                <p>Download PDF</p>
                <p className="text-[9px] font-normal text-[var(--ag-text-dim)]">AG360 letterhead</p>
              </div>
            </button>
            <div className="border-t border-[var(--ag-border)]" />
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[11px] font-semibold text-[var(--ag-text-primary)] hover:bg-[var(--ag-bg-hover)] transition-colors"
            >
              <FileSpreadsheet size={13} style={{ color: "var(--ag-green)" }} />
              <div className="text-left">
                <p>Download Excel</p>
                <p className="text-[9px] font-normal text-[var(--ag-text-dim)]">Branded spreadsheet</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}