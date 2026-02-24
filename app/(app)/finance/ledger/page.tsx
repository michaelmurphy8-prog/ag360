"use client";

import { useState, useEffect } from "react";

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  sub_type: string;
  normal_balance: string;
  field_allocatable: boolean;
}

interface JournalLine {
  account_id: string;
  account_code?: string;
  account_name?: string;
  description: string;
  debit: number;
  credit: number;
  field_name?: string;
  crop?: string;
}

interface JournalEntry {
  id: string;
  entry_number: number;
  entry_date: string;
  description: string;
  source: string;
  crop_year: number;
  field_name?: string;
  crop?: string;
  lines: JournalLine[];
}

export default function LedgerPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState("2025");
  const [tab, setTab] = useState<"journal" | "accounts">("journal");
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // New entry form state
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [entryDesc, setEntryDesc] = useState("");
  const [entryMemo, setEntryMemo] = useState("");
  const [entryFieldName, setEntryFieldName] = useState("");
  const [entryCrop, setEntryCrop] = useState("");
  const [lines, setLines] = useState<{ account_id: string; description: string; debit: string; credit: string }[]>([
    { account_id: "", description: "", debit: "", credit: "" },
    { account_id: "", description: "", debit: "", credit: "" },
  ]);

  useEffect(() => {
    fetchAccounts();
    fetchEntries();
  }, [cropYear]);

  const fetchAccounts = async () => {
    const res = await fetch("/api/finance/accounts");
    const data = await res.json();
    if (data.accounts) setAccounts(data.accounts);
  };

  const fetchEntries = async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/journal?cropYear=${cropYear}`);
    const data = await res.json();
    if (data.entries) setEntries(data.entries);
    setLoading(false);
  };

  const addLine = () => {
    setLines([...lines, { account_id: "", description: "", debit: "", credit: "" }]);
  };

  const updateLine = (idx: number, field: string, value: string) => {
    const updated = [...lines];
    (updated[idx] as any)[field] = value;
    setLines(updated);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const saveEntry = async () => {
    if (!entryDate || !entryDesc || !isBalanced) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/finance/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_date: entryDate,
          description: entryDesc,
          memo: entryMemo,
          crop_year: parseInt(cropYear),
          field_name: entryFieldName || null,
          crop: entryCrop || null,
          lines: lines.filter((l) => l.account_id).map((l) => ({
            account_id: l.account_id,
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setShowNewEntry(false);
      setEntryDesc("");
      setEntryMemo("");
      setEntryFieldName("");
      setEntryCrop("");
      setLines([
        { account_id: "", description: "", debit: "", credit: "" },
        { account_id: "", description: "", debit: "", credit: "" },
      ]);
      fetchEntries();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number) => n > 0 ? `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";

  // Group accounts by type for the chart of accounts view
  const accountsByType = accounts.reduce((acc: Record<string, Account[]>, a) => {
    if (!acc[a.account_type]) acc[a.account_type] = [];
    acc[a.account_type].push(a);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    asset: "Assets",
    liability: "Liabilities",
    equity: "Equity",
    revenue: "Revenue",
    expense: "Expenses",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Ledger</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">Double-entry farm accounting</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
            className="bg-white border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm text-[#222527]"
          >
            {["2026", "2025", "2024", "2023"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNewEntry(!showNewEntry)}
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#4A7C59] text-white hover:bg-[#3D6B4A]"
          >
            + New Entry
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5F5F3] p-1 rounded-xl w-fit">
        {[
          { id: "journal" as const, label: "Journal Entries" },
          { id: "accounts" as const, label: "Chart of Accounts" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? "bg-white text-[#222527] shadow-sm" : "text-[#7A8A7C] hover:text-[#222527]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
          <button onClick={() => setError("")} className="ml-2 text-red-400">✕</button>
        </div>
      )}

      {/* New Entry Form */}
      {showNewEntry && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-[#222527] mb-4">New Journal Entry</h3>

          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <label className="text-[10px] uppercase text-[#7A8A7C] font-semibold">Date</label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)}
                className="w-full mt-1 border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] uppercase text-[#7A8A7C] font-semibold">Description</label>
              <input type="text" value={entryDesc} onChange={(e) => setEntryDesc(e.target.value)}
                placeholder="e.g. Canola sale to Viterra Swift Current"
                className="w-full mt-1 border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] uppercase text-[#7A8A7C] font-semibold">Field (optional)</label>
              <input type="text" value={entryFieldName} onChange={(e) => setEntryFieldName(e.target.value)}
                placeholder="e.g. North Home"
                className="w-full mt-1 border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm" />
            </div>
          </div>

          {/* Lines */}
          <div className="bg-[#F8FAF7] rounded-lg p-3 mb-3">
            <div className="grid grid-cols-[2fr_1.5fr_100px_100px_32px] gap-2 text-[10px] uppercase text-[#7A8A7C] font-semibold mb-2 px-1">
              <div>Account</div>
              <div>Description</div>
              <div className="text-right">Debit</div>
              <div className="text-right">Credit</div>
              <div />
            </div>

            {lines.map((line, idx) => (
              <div key={idx} className="grid grid-cols-[2fr_1.5fr_100px_100px_32px] gap-2 mb-1.5">
                <select
                  value={line.account_id}
                  onChange={(e) => updateLine(idx, "account_id", e.target.value)}
                  className="border border-[#E4E7E0] rounded-lg px-2 py-1.5 text-sm bg-white"
                >
                  <option value="">Select account...</option>
                  {["revenue", "expense", "asset", "liability", "equity"].map((type) => (
                    <optgroup key={type} label={typeLabels[type]}>
                      {accounts.filter((a) => a.account_type === type).map((a) => (
                        <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <input type="text" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)}
                  placeholder="Line memo" className="border border-[#E4E7E0] rounded-lg px-2 py-1.5 text-sm" />
                <input type="number" step="0.01" value={line.debit} onChange={(e) => updateLine(idx, "debit", e.target.value)}
                  placeholder="0.00" className="border border-[#E4E7E0] rounded-lg px-2 py-1.5 text-sm text-right" />
                <input type="number" step="0.01" value={line.credit} onChange={(e) => updateLine(idx, "credit", e.target.value)}
                  placeholder="0.00" className="border border-[#E4E7E0] rounded-lg px-2 py-1.5 text-sm text-right" />
                <button onClick={() => removeLine(idx)} className="text-[#B0B8B0] hover:text-red-400 text-lg">✕</button>
              </div>
            ))}

            <button onClick={addLine} className="text-xs text-[#4A7C59] hover:underline mt-1">+ Add line</button>
          </div>

          {/* Totals */}
          <div className="flex items-center justify-between">
            <div className="flex gap-6 text-sm">
              <span className="text-[#7A8A7C]">Debits: <span className="font-bold text-[#222527]">${totalDebit.toFixed(2)}</span></span>
              <span className="text-[#7A8A7C]">Credits: <span className="font-bold text-[#222527]">${totalCredit.toFixed(2)}</span></span>
              {isBalanced ? (
                <span className="text-[#4A7C59] font-semibold text-xs">Balanced</span>
              ) : totalDebit > 0 || totalCredit > 0 ? (
                <span className="text-red-500 font-semibold text-xs">
                  Out of balance by ${Math.abs(totalDebit - totalCredit).toFixed(2)}
                </span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewEntry(false)}
                className="px-4 py-1.5 text-sm text-[#7A8A7C] border border-[#E4E7E0] rounded-lg hover:bg-[#F5F5F3]">
                Cancel
              </button>
              <button onClick={saveEntry} disabled={!isBalanced || saving || !entryDesc}
                className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${
                  isBalanced && entryDesc ? "bg-[#4A7C59] text-white hover:bg-[#3D6B4A]" : "bg-[#E4E7E0] text-[#B0B8B0] cursor-not-allowed"
                }`}>
                {saving ? "Saving..." : "Post Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JOURNAL ENTRIES TAB */}
      {tab === "journal" && (
        loading ? (
          <div className="text-center py-16 text-[#7A8A7C]">Loading journal entries...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📒</div>
            <p className="text-[#7A8A7C] mb-2">No journal entries for {cropYear} yet.</p>
            <p className="text-xs text-[#B0B8B0]">Click "+ New Entry" to record your first transaction.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const entryLines = Array.isArray(entry.lines) ? entry.lines : [];
              const total = entryLines.reduce((s, l) => s + (parseFloat(String(l.debit)) || 0), 0);

              return (
                <div key={entry.id} className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#F5F5F3]">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#B0B8B0]">#{entry.entry_number}</span>
                      <span className="text-xs text-[#7A8A7C]">{new Date(entry.entry_date).toLocaleDateString("en-CA")}</span>
                      <span className="text-sm font-semibold text-[#222527]">{entry.description}</span>
                      {entry.field_name && (
                        <span className="text-[10px] bg-[#F5F5F3] text-[#7A8A7C] px-2 py-0.5 rounded-full">{entry.field_name}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] uppercase text-[#B0B8B0]">{entry.source}</span>
                      <span className="text-sm font-bold text-[#222527]">${total.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="px-4 py-2">
                    {entryLines.map((line, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_100px] gap-2 py-1 text-xs">
                        <span className={`${parseFloat(String(line.credit)) > 0 ? "pl-6" : ""} text-[#222527]`}>
                          <span className="text-[#B0B8B0] font-mono mr-2">{line.account_code}</span>
                          {line.account_name}
                          {line.description && <span className="text-[#B0B8B0]"> — {line.description}</span>}
                        </span>
                        <span className="text-right font-mono text-[#222527]">{fmt(parseFloat(String(line.debit)) || 0)}</span>
                        <span className="text-right font-mono text-[#222527]">{fmt(parseFloat(String(line.credit)) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* CHART OF ACCOUNTS TAB */}
      {tab === "accounts" && (
        <div className="space-y-4">
          {["asset", "liability", "equity", "revenue", "expense"].map((type) => {
            const accts = accountsByType[type] || [];
            if (accts.length === 0) return null;

            return (
              <div key={type} className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-[#F5F5F3] border-b border-[#E4E7E0]">
                  <h3 className="text-sm font-bold text-[#222527]">{typeLabels[type]} ({accts.length})</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase text-[#7A8A7C] font-semibold">
                      <th className="text-left px-4 py-2">Code</th>
                      <th className="text-left px-4 py-2">Name</th>
                      <th className="text-left px-4 py-2">Sub-type</th>
                      <th className="text-center px-4 py-2">Field Alloc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accts.map((a) => (
                      <tr key={a.id} className="border-t border-[#F5F5F3] hover:bg-[#F8FAF7]">
                        <td className="px-4 py-2 font-mono text-[#7A8A7C]">{a.code}</td>
                        <td className="px-4 py-2 font-medium text-[#222527]">{a.name}</td>
                        <td className="px-4 py-2 text-[#7A8A7C] text-xs">{a.sub_type}</td>
                        <td className="px-4 py-2 text-center">{a.field_allocatable ? "✓" : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}