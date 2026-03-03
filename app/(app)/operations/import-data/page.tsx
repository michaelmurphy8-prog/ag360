"use client";

import React, { useState, useCallback } from "react";
import { MapPin, Sprout, Wheat, Receipt, Database, ArrowRight } from "lucide-react";
import ImportCard from "@/components/import-data/ImportCard";
import ImportModal from "@/components/import-data/ImportModal";
import { downloadTemplate, type ImportType } from "@/lib/template-generator";

export default function ImportDataPage() {
  const [activeModal, setActiveModal] = useState<ImportType | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const cropYear = new Date().getFullYear();

  const handleSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    // Clear after 8 seconds
    setTimeout(() => setSuccessMessage(null), 8000);
  }, []);

  return (
    <div className="min-h-screen bg-ag-primary">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-[#22C55E]/10">
              <Database className="w-5 h-5 text-[#22C55E]" />
            </div>
            <h1 className="text-2xl font-bold text-ag-primary">Import Data</h1>
          </div>
          <p className="text-ag-secondary ml-12">
            Bulk import your farm data from Excel or CSV files. Download a template, fill it in, and upload.
          </p>
        </div>

        {/* Success toast */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/20 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
            <p className="text-sm text-[#22C55E] font-medium">{successMessage}</p>
          </div>
        )}

        {/* Import Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ImportCard
            icon={MapPin}
            title="Fields"
            description="Import your field list with locations, legal descriptions, and optional crop assignments."
            onDownloadTemplate={() => downloadTemplate("fields")}
            onUpload={() => setActiveModal("fields")}
          />
          <ImportCard
            icon={Sprout}
            title="Seeding"
            description="Import seeding records — crop assignments, varieties, rates, and seed costs."
            onDownloadTemplate={() => downloadTemplate("seeding")}
            onUpload={() => setActiveModal("seeding")}
          />
          <ImportCard
            icon={Wheat}
            title="Harvest"
            description="Import harvest data — bushels, moisture, grades, and bin destinations."
            onDownloadTemplate={() => downloadTemplate("harvest")}
            onUpload={() => setActiveModal("harvest")}
          />
          <ImportCard
            icon={Receipt}
            title="Expenses"
            description="Import field expenses — fertilizer, chemical, fuel, rent, and more."
            onDownloadTemplate={() => downloadTemplate("expenses")}
            onUpload={() => setActiveModal("expenses")}
          />
        </div>

        {/* How It Works */}
        <div className="mt-10 p-5 rounded-xl bg-ag-card border border-ag">
          <h3 className="text-sm font-semibold text-ag-primary mb-4">How It Works</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
            <Step number={1} text="Download a template and fill in your data in Excel" />
            <ArrowRight className="w-4 h-4 text-[#334155] hidden sm:block shrink-0" />
            <Step number={2} text="Upload — we'll validate every row and flag issues" />
            <ArrowRight className="w-4 h-4 text-[#334155] hidden sm:block shrink-0" />
            <Step number={3} text="Confirm — data flows to Maps, Fields, Finance, and more" />
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Tip title="Column matching" text="Headers are matched automatically — 'field name', 'Field Name', and 'field_name' all work." />
          <Tip title="Import order" text="Import Fields first, then Seeding, Harvest, and Expenses — they reference existing fields." />
          <Tip title="Safe to re-import" text="Duplicate fields are updated, not duplicated. Re-uploads won't create double entries." />
        </div>
      </div>

      {/* Import Modal */}
      {activeModal && (
        <ImportModal
          type={activeModal}
          isOpen={true}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
          cropYear={cropYear}
        />
      )}
    </div>
  );
}

function Step({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center text-xs font-bold shrink-0">
        {number}
      </div>
      <p className="text-sm text-ag-secondary">{text}</p>
    </div>
  );
}

function Tip({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-3 rounded-lg bg-ag-card/50 border border-ag/50">
      <p className="text-xs font-medium text-ag-primary mb-0.5">{title}</p>
      <p className="text-xs text-ag-muted leading-relaxed">{text}</p>
    </div>
  );
}