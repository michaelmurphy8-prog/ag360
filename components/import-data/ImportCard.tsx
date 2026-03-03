"use client";

import React from "react";
import { Download, Upload, type LucideIcon } from "lucide-react";

interface ImportCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  lastImport?: string | null; // e.g., "12 fields imported on Mar 1"
  onDownloadTemplate: () => void;
  onUpload: () => void;
}

export default function ImportCard({ icon: Icon, title, description, lastImport, onDownloadTemplate, onUpload }: ImportCardProps) {
  return (
    <div className="group relative bg-[#0F1629] border border-[#1E293B] rounded-xl p-5 hover:border-[#334155] transition-all duration-200">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2.5 rounded-lg bg-[#22C55E]/10 text-[#22C55E] group-hover:bg-[#22C55E]/15 transition-colors">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-[#E2E8F0]">{title}</h3>
          <p className="text-sm text-[#94A3B8] mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>

      {/* Last import badge */}
      {lastImport && (
        <div className="mb-4 px-2.5 py-1.5 rounded-md bg-[#22C55E]/5 border border-[#22C55E]/10 inline-block">
          <p className="text-xs text-[#22C55E]">{lastImport}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-1">
        <button
          onClick={onDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1E293B] text-[#94A3B8] text-sm hover:bg-[#334155] hover:text-[#E2E8F0] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Template
        </button>
        <button
          onClick={onUpload}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#22C55E] text-[#0B1120] text-sm font-semibold hover:bg-[#16A34A] transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Data
        </button>
      </div>
    </div>
  );
}