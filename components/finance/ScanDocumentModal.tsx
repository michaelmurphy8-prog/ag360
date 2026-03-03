// components/finance/ScanDocumentModal.tsx
// AI document scanner modal — upload → extract → review → post to ledger

"use client";

import { useState, useRef, useCallback } from "react";
import {
  X, Upload, Loader2, CheckCircle, AlertTriangle, Info,
  FileText, Image, ChevronDown, Trash2, Plus, ScanLine,
  Receipt, CreditCard, Clock, Calendar, Building2,
} from "lucide-react";

// ─── Design Tokens ─────────────────────────────
const T = {
  bg: "#080C15",
  card: "#0F1729",
  border: "rgba(255,255,255,0.06)",
  borderHover: "rgba(255,255,255,0.12)",
  text1: "#F1F5F9",
  text2: "#94A3B8",
  text3: "#64748B",
  text4: "#475569",
  green: "#34D399",
  greenDim: "rgba(52,211,153,0.12)",
  red: "#F87171",
  redDim: "rgba(248,113,113,0.12)",
  amber: "#FBBF24",
  amberDim: "rgba(251,191,36,0.12)",
  purple: "#A78BFA",
  purpleDim: "rgba(167,139,250,0.12)",
};

const inputClass =
  "w-full bg-white/[0.04] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-ag-primary placeholder-[#475569] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const selectClass =
  "bg-[#111827] border border-white/[0.10] rounded-lg px-3 py-2 text-sm text-ag-primary focus:outline-none focus:border-[#34D399]/50 transition-colors";
const labelClass =
  "block text-[10px] uppercase tracking-[2px] font-mono font-semibold text-ag-muted mb-1.5";

interface Account {
  id: string;
  code: string;
  name: string;
  account_type?: string;
  sub_type?: string;
}

interface LineItem {
  description: string;
  account_id: string;
  account_code: string;
  account_name: string;
  quantity: number;
  unit_price: number;
  debit: number;
  credit: number;
}

interface ScanResult {
  vendor: string;
  date: string;
  document_number: string | null;
  document_type: string;
  payment_status: string;
  payment_terms: string;
  payment_method: string | null;
  due_date: string | null;
  description: string;
  line_items: LineItem[];
  tax_gst: number;
  tax_pst: number;
  subtotal: number;
  total: number;
  confidence: string;
  notes: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  accounts: Account[];
  cropYear: number;
  userId: string;
  onEntryCreated: () => void;
}

type Step = "upload" | "scanning" | "review";

export default function ScanDocumentModal({
  open,
  onClose,
  accounts,
  cropYear,
  userId,
  onEntryCreated,
}: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ─── Editable form state (initialized from scan result) ───
  const [vendor, setVendor] = useState("");
  const [date, setDate] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [docType, setDocType] = useState("receipt");
  const [paymentStatus, setPaymentStatus] = useState("paid");
  const [paymentTerms, setPaymentTerms] = useState("paid");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [notes, setNotes] = useState("");

  const resetAll = useCallback(() => {
    setStep("upload");
    setScanResult(null);
    setFileName("");
    setError("");
    setVendor("");
    setDate("");
    setDocNumber("");
    setDocType("receipt");
    setPaymentStatus("paid");
    setPaymentTerms("paid");
    setDueDate("");
    setDescription("");
    setLineItems([]);
    setNotes("");
  }, []);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  // ─── File Upload Handler ───────────────────────
  const handleFile = async (file: File) => {
    if (!file) return;
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file. Use JPEG, PNG, GIF, WebP, or PDF.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("File too large. Max 20MB.");
      return;
    }

    setFileName(file.name);
    setError("");
    setStep("scanning");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/finance/scan-document", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Scan failed");
      }

      const data: ScanResult = json.data;
      setScanResult(data);

      // Populate editable form
      setVendor(data.vendor || "");
      setDate(data.date || new Date().toISOString().slice(0, 10));
      setDocNumber(data.document_number || "");
      setDocType(data.document_type || "receipt");
      setPaymentStatus(data.payment_status || "paid");
      setPaymentTerms(data.payment_terms || "paid");
      setDueDate(data.due_date || "");
      setDescription(data.description || "");
      setLineItems(data.line_items || []);
      setNotes(data.notes || "");
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Failed to scan document");
      setStep("upload");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  // ─── Line Item Helpers ─────────────────────────
  const updateLine = (i: number, field: string, val: any) => {
    setLineItems((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: val } : l))
    );
  };

  const removeLine = (i: number) => {
    setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  const addLine = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: "",
        account_id: "",
        account_code: "",
        account_name: "",
        quantity: 0,
        unit_price: 0,
        debit: 0,
        credit: 0,
      },
    ]);
  };

  // ─── Totals ────────────────────────────────────
  const totalDebit = lineItems.reduce(
    (s, l) => s + (parseFloat(String(l.debit)) || 0), 0
  );
  const totalCredit = lineItems.reduce(
    (s, l) => s + (parseFloat(String(l.credit)) || 0), 0
  );
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  // ─── Payment terms → due date auto-calc ────────
  const handleTermsChange = (terms: string) => {
    setPaymentTerms(terms);
    if (terms === "paid") {
      setPaymentStatus("paid");
      setDueDate("");
    } else {
      setPaymentStatus("unpaid");
      if (date) {
        const d = new Date(date);
        if (terms === "due_on_receipt") setDueDate(date);
        else if (terms === "net_15") { d.setDate(d.getDate() + 15); setDueDate(d.toISOString().slice(0, 10)); }
        else if (terms === "net_30") { d.setDate(d.getDate() + 30); setDueDate(d.toISOString().slice(0, 10)); }
        else if (terms === "net_60") { d.setDate(d.getDate() + 60); setDueDate(d.toISOString().slice(0, 10)); }
      }
    }
  };

  // ─── Save / Post to Ledger ─────────────────────
  const handlePost = async (asDraft: boolean) => {
    if (!isBalanced && !asDraft) {
      setError("Entry must balance before posting. Debits must equal credits.");
      return;
    }
    if (!description) {
      setError("Description is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = {
        entry_date: date,
        description,
        memo: notes || null,
        source: "ai_scan",
        crop_year: cropYear,
        field_name: null,
        crop: null,
        // New payment fields
        vendor: vendor || null,
        document_number: docNumber || null,
        document_type: docType,
        payment_status: asDraft ? "draft" : paymentStatus,
        payment_terms: paymentTerms,
        due_date: dueDate || null,
        ai_scanned: true,
        paid_date: paymentStatus === "paid" ? date : null,
        lines: lineItems.map((l) => ({
          account_id: l.account_id,
          description: l.description,
          debit: parseFloat(String(l.debit)) || 0,
          credit: parseFloat(String(l.credit)) || 0,
          quantity: l.quantity || null,
          unit_price: l.unit_price || null,
        })),
      };

      const res = await fetch("/api/finance/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save entry");
      }

      onEntryCreated();
      handleClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Account Picker (grouped) ──────────────────
  const accountGroups: Record<string, Account[]> = {};
  accounts.forEach((a) => {
    const g = (a.account_type || "other").charAt(0).toUpperCase() + (a.account_type || "other").slice(1);
    if (!accountGroups[g]) accountGroups[g] = [];
    accountGroups[g].push(a);
  });

  if (!open) return null;

  // ─── Confidence badge ──────────────────────────
  const confidenceConfig: Record<string, { color: string; bg: string; label: string }> = {
    high: { color: T.green, bg: T.greenDim, label: "High Confidence" },
    medium: { color: T.amber, bg: T.amberDim, label: "Medium — Review Carefully" },
    low: { color: T.red, bg: T.redDim, label: "Low — Manual Edits Needed" },
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div
        className="w-full max-w-4xl rounded-2xl shadow-2xl mb-8"
        style={{ background: T.card, border: `1px solid ${T.border}` }}
      >
        {/* ── Header ──────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: T.border }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: T.purpleDim }}
            >
              <ScanLine size={18} style={{ color: T.purple }} />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: T.text1 }}>
                {step === "upload" && "Scan Document"}
                {step === "scanning" && "Analyzing Document..."}
                {step === "review" && "Review & Post"}
              </h2>
              <p className="text-xs" style={{ color: T.text3 }}>
                {step === "upload" && "Upload a receipt, invoice, or statement"}
                {step === "scanning" && `Processing ${fileName}...`}
                {step === "review" && "Verify the extracted data, then post to ledger"}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors">
            <X size={18} style={{ color: T.text3 }} />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* ── STEP 1: Upload ────────────────────── */}
          {step === "upload" && (
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
                dragOver ? "border-[#A78BFA] bg-[#A78BFA]/5" : "border-white/[0.10] hover:border-white/[0.20]"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                onChange={onFileInput}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: T.purpleDim }}>
                <Upload size={28} style={{ color: T.purple }} />
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: T.text1 }}>
                Drop your document here or click to browse
              </p>
              <p className="text-xs" style={{ color: T.text3 }}>
                Supports: Photos (JPG, PNG), PDFs — Receipts, Invoices, Statements, Quotes
              </p>
              <div className="flex items-center justify-center gap-4 mt-6">
                {[
                  { icon: Receipt, label: "Receipts" },
                  { icon: FileText, label: "Invoices" },
                  { icon: CreditCard, label: "Statements" },
                  { icon: Building2, label: "Quotes" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: T.text4 }}>
                    <Icon size={12} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Scanning ──────────────────── */}
          {step === "scanning" && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-full bg-[#A78BFA]/20 blur-xl animate-pulse" />
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: T.purpleDim }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: T.purple }} />
                </div>
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: T.text1 }}>
                AI is reading your document...
              </p>
              <p className="text-xs" style={{ color: T.text3 }}>
                Extracting vendor, line items, taxes, and mapping to your Chart of Accounts
              </p>
              <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }}>
                <FileText size={12} style={{ color: T.text4 }} />
                <span className="text-xs font-mono" style={{ color: T.text4 }}>{fileName}</span>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Edit ─────────────── */}
          {step === "review" && scanResult && (
            <div className="space-y-5">
              {/* Confidence banner */}
              {(() => {
                const conf = confidenceConfig[scanResult.confidence] || confidenceConfig.medium;
                return (
                  <div
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg"
                    style={{ background: conf.bg, border: `1px solid ${conf.color}20` }}
                  >
                    {scanResult.confidence === "high" ? (
                      <CheckCircle size={14} style={{ color: conf.color }} />
                    ) : (
                      <AlertTriangle size={14} style={{ color: conf.color }} />
                    )}
                    <span className="text-xs font-semibold" style={{ color: conf.color }}>
                      {conf.label}
                    </span>
                    {notes && (
                      <span className="text-xs ml-2" style={{ color: T.text3 }}>
                        — {notes}
                      </span>
                    )}
                  </div>
                );
              })()}

              {/* Document info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <label className={labelClass}>Vendor / Payee</label>
                  <input
                    type="text"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className={inputClass}
                    placeholder="e.g. Shell, Nutrien, Richardson"
                  />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={inputClass}
                    placeholder="Journal entry description"
                  />
                </div>
                <div>
                  <label className={labelClass}>Document Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Document #</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className={inputClass}
                    placeholder="Invoice/receipt number"
                  />
                </div>
                <div>
                  <label className={labelClass}>Document Type</label>
                  <select value={docType} onChange={(e) => setDocType(e.target.value)} className={selectClass + " w-full"}>
                    <option value="receipt">Receipt (Paid)</option>
                    <option value="invoice">Invoice (Bill)</option>
                    <option value="statement">Statement</option>
                    <option value="quote">Quote (No Post)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => handleTermsChange(e.target.value)}
                    className={selectClass + " w-full"}
                  >
                    <option value="paid">Paid (Cash / Card / Debit)</option>
                    <option value="due_on_receipt">Due on Receipt</option>
                    <option value="net_15">Net 15</option>
                    <option value="net_30">Net 30</option>
                    <option value="net_60">Net 60</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {paymentStatus === "unpaid" && (
                  <div>
                    <label className={labelClass}>Due Date</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                )}
              </div>

              {/* Payment status badge */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{
                    background: paymentStatus === "paid" ? T.greenDim : T.amberDim,
                    color: paymentStatus === "paid" ? T.green : T.amber,
                  }}
                >
                  {paymentStatus === "paid" ? (
                    <><CheckCircle size={11} /> Paid</>
                  ) : (
                    <><Clock size={11} /> Unpaid{dueDate ? ` — Due ${dueDate}` : ""}</>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono" style={{ background: "rgba(255,255,255,0.04)", color: T.text3 }}>
                  Total: ${(scanResult.total || 0).toFixed(2)}
                  {scanResult.tax_gst > 0 && ` (incl. GST: $${scanResult.tax_gst.toFixed(2)})`}
                </div>
              </div>

              {/* Line items table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelClass + " mb-0"}>Journal Lines</label>
                  <button
                    onClick={addLine}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg hover:bg-white/[0.06] transition-colors"
                    style={{ color: T.green }}
                  >
                    <Plus size={12} /> Add Line
                  </button>
                </div>
                <div
                  className="rounded-xl overflow-hidden border"
                  style={{ borderColor: T.border }}
                >
                  {/* Table header */}
                  <div
                    className="grid grid-cols-[1fr_200px_90px_90px_36px] gap-2 px-3 py-2 text-[10px] uppercase tracking-[1.5px] font-mono font-semibold"
                    style={{ background: "rgba(255,255,255,0.03)", color: T.text4 }}
                  >
                    <span>Description</span>
                    <span>Account</span>
                    <span className="text-right">Debit</span>
                    <span className="text-right">Credit</span>
                    <span />
                  </div>
                  {/* Line rows */}
                  {lineItems.map((line, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[1fr_200px_90px_90px_36px] gap-2 px-3 py-2 border-t items-center"
                      style={{ borderColor: T.border }}
                    >
                      <input
                        type="text"
                        value={line.description}
                        onChange={(e) => updateLine(i, "description", e.target.value)}
                        className="bg-transparent text-sm text-ag-primary outline-none placeholder-[#475569]"
                        placeholder="Line description"
                      />
                      <select
                        value={line.account_id}
                        onChange={(e) => {
                          const acc = accounts.find((a) => a.id === e.target.value);
                          updateLine(i, "account_id", e.target.value);
                          if (acc) {
                            updateLine(i, "account_code", acc.code);
                            updateLine(i, "account_name", acc.name);
                          }
                        }}
                        className="bg-[#111827] border border-white/[0.08] rounded px-1.5 py-1 text-xs text-ag-primary outline-none truncate"
                      >
                        <option value="">Select account</option>
                        {Object.entries(accountGroups).map(([group, accs]) => (
                          <optgroup key={group} label={group}>
                            {accs.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={line.debit || ""}
                        onChange={(e) => updateLine(i, "debit", parseFloat(e.target.value) || 0)}
                        className="bg-transparent text-sm text-right text-ag-primary outline-none w-full font-mono"
                        placeholder="0.00"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={line.credit || ""}
                        onChange={(e) => updateLine(i, "credit", parseFloat(e.target.value) || 0)}
                        className="bg-transparent text-sm text-right text-ag-primary outline-none w-full font-mono"
                        placeholder="0.00"
                      />
                      <button
                        onClick={() => removeLine(i)}
                        className="p-1 rounded hover:bg-white/[0.06] transition-colors"
                        style={{ color: T.text4 }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {/* Totals row */}
                  <div
                    className="grid grid-cols-[1fr_200px_90px_90px_36px] gap-2 px-3 py-2.5 border-t"
                    style={{
                      borderColor: T.border,
                      background: isBalanced ? "rgba(52,211,153,0.03)" : "rgba(248,113,113,0.03)",
                    }}
                  >
                    <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: isBalanced ? T.green : T.red }}>
                      {isBalanced ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      {isBalanced ? "Balanced" : "Not Balanced"}
                    </span>
                    <span />
                    <span className="text-sm text-right font-mono font-semibold" style={{ color: T.text1 }}>
                      ${totalDebit.toFixed(2)}
                    </span>
                    <span className="text-sm text-right font-mono font-semibold" style={{ color: T.text1 }}>
                      ${totalCredit.toFixed(2)}
                    </span>
                    <span />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={labelClass}>Notes / Memo</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClass}
                  placeholder="Optional notes for this entry"
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg mt-4" style={{ background: T.redDim }}>
              <AlertTriangle size={14} style={{ color: T.red }} />
              <span className="text-xs" style={{ color: T.red }}>{error}</span>
            </div>
          )}
        </div>

        {/* ── Footer Actions ──────────────────────── */}
        {step === "review" && (
          <div
            className="flex items-center justify-between px-6 py-4 border-t"
            style={{ borderColor: T.border }}
          >
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl hover:bg-white/[0.06] transition-colors"
              style={{ color: T.text3 }}
            >
              <ScanLine size={14} />
              Scan Another
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handlePost(true)}
                disabled={saving}
                className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-xl border transition-all"
                style={{ borderColor: T.border, color: T.text2 }}
              >
                Save as Draft
              </button>
              <button
                onClick={() => handlePost(false)}
                disabled={saving || !isBalanced}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2 rounded-xl transition-all disabled:opacity-40"
                style={{ background: T.green, color: T.bg }}
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle size={14} />
                )}
                Post to Ledger
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}