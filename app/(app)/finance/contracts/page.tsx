// app/(app)/finance/contracts/page.tsx
// Grain Contracts Management — View, add, edit, delete contracts
// KPI summary, filterable table, status management

"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  FileText, Plus, X, ChevronDown, ChevronUp, Edit2, Trash2,
  CheckCircle, Clock, AlertTriangle, DollarSign, Wheat, TrendingUp
} from "lucide-react";

interface Contract {
  id: string;
  crop: string;
  contract_type: string;
  bushels: number;
  price_per_bushel: number;
  buyer: string;
  delivery_start: string;
  delivery_end: string;
  status: string;
  notes: string;
  field_name: string;
  crop_year: number;
  created_at: string;
}

interface Summary {
  totalContracts: number;
  totalBushels: number;
  totalValue: number;
  openContracts: number;
  openBushels: number;
  deliveredContracts: number;
  deliveredBushels: number;
  byCrop: Record<string, { bushels: number; value: number; count: number }>;
}

const CROPS = [
  "HRW Wheat", "HRS Wheat", "Durum", "Canola", "Barley", "Oats",
  "Peas", "Lentils", "Flax", "Soybeans", "Corn", "Mustard", "Canaryseed"
];

const CONTRACT_TYPES = [
  { value: "cash", label: "Cash / Flat Price" },
  { value: "basis", label: "Basis Contract" },
  { value: "hta", label: "Hedge-to-Arrive (HTA)" },
  { value: "futures", label: "Futures Only" },
  { value: "deferred", label: "Deferred Delivery" },
  { value: "act_of_god", label: "Act of God" },
  { value: "pool", label: "Pool Contract" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-blue-100 text-blue-800" },
  { value: "partial", label: "Partially Delivered", color: "bg-amber-100 text-amber-800" },
  { value: "delivered", label: "Delivered", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
  { value: "rolled", label: "Rolled", color: "bg-purple-100 text-purple-800" },
];

const CROP_COLORS: Record<string, string> = {
  "HRW Wheat": "#D4A843", "HRS Wheat": "#C49B3D", "Durum": "#E8C547",
  Canola: "#E8B931", Barley: "#9B8B6E", Oats: "#BFB599",
  Peas: "#7BAE6E", Lentils: "#A67B5B", Flax: "#6B8FA3",
  Soybeans: "#8FA86E", Corn: "#D4A843", Mustard: "#E8D547",
};

const emptyForm = {
  crop: "", contract_type: "cash", bushels: "", price_per_bushel: "",
  buyer: "", delivery_start: "", delivery_end: "", status: "open",
  notes: "", field_name: "",
};

export default function ContractsPage() {
  const { user } = useUser();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState(2025);
  const [filterCrop, setFilterCrop] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ cropYear: cropYear.toString() });
      if (filterCrop) params.set("crop", filterCrop);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/finance/contracts?${params}`);
      const data = await res.json();
      setContracts(data.contracts || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("Failed to fetch contracts:", err);
    }
    setLoading(false);
  }, [cropYear, filterCrop, filterStatus]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleSubmit = async () => {
    if (!form.crop || !form.bushels || !form.price_per_bushel) return;
    setSaving(true);

    try {
      if (editingId) {
        await fetch("/api/finance/contracts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...form, crop_year: cropYear }),
        });
      } else {
        await fetch("/api/finance/contracts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, crop_year: cropYear }),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      fetchContracts();
    } catch (err) {
      console.error("Failed to save contract:", err);
    }
    setSaving(false);
  };

  const handleEdit = (contract: Contract) => {
    setForm({
      crop: contract.crop,
      contract_type: contract.contract_type || "cash",
      bushels: String(contract.bushels),
      price_per_bushel: String(contract.price_per_bushel),
      buyer: contract.buyer || "",
      delivery_start: contract.delivery_start || "",
      delivery_end: contract.delivery_end || "",
      status: contract.status || "open",
      notes: contract.notes || "",
      field_name: contract.field_name || "",
    });
    setEditingId(contract.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contract? This cannot be undone.")) return;
    try {
      await fetch(`/api/finance/contracts?id=${id}`, { method: "DELETE" });
      fetchContracts();
    } catch (err) {
      console.error("Failed to delete contract:", err);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await fetch("/api/finance/contracts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      fetchContracts();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const fmt = (n: number) =>
    `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtBu = (n: number) =>
    `${Math.round(n).toLocaleString("en-CA")} bu`;
  const fmtPrice = (n: number) =>
    `$${Number(n).toFixed(2)}`;

  const statusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${opt?.color || "bg-gray-100 text-gray-700"}`}>
        {opt?.label || status}
      </span>
    );
  };

  const typeBadge = (type: string) => {
    const t = CONTRACT_TYPES.find((ct) => ct.value === type);
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#EEF1EB] text-[#4A7C59]">
        {t?.label || type}
      </span>
    );
  };

  // Weighted avg price
  const weightedAvgPrice = summary && summary.totalBushels > 0
    ? summary.totalValue / summary.totalBushels
    : 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Contracts</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">
            Grain marketing contracts — crop year {cropYear}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={cropYear}
            onChange={(e) => setCropYear(parseInt(e.target.value))}
            className="border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value={2025}>2025</option>
            <option value={2024}>2024</option>
            <option value={2026}>2026</option>
          </select>
          <button
            onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#4A7C59] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3d6b4a] transition-colors"
          >
            <Plus size={16} /> New Contract
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs font-medium text-[#7A8A7C] uppercase tracking-wider">Total Committed</p>
            <p className="text-2xl font-bold text-[#222527] mt-1">{fmtBu(summary.totalBushels)}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">
              {summary.totalContracts} contract{summary.totalContracts !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs font-medium text-[#7A8A7C] uppercase tracking-wider">Total Value</p>
            <p className="text-2xl font-bold text-[#222527] mt-1">{fmt(summary.totalValue)}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">
              Avg {fmtPrice(weightedAvgPrice)}/bu weighted
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Open</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{fmtBu(summary.openBushels)}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">
              {summary.openContracts} contract{summary.openContracts !== 1 ? "s" : ""} to fill
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Delivered</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{fmtBu(summary.deliveredBushels)}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">
              {summary.deliveredContracts} contract{summary.deliveredContracts !== 1 ? "s" : ""} complete
            </p>
          </div>
        </div>
      )}

      {/* By Crop Breakdown */}
      {summary && Object.keys(summary.byCrop).length > 0 && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-[#222527] mb-3">By Crop</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(summary.byCrop)
              .sort(([, a], [, b]) => b.value - a.value)
              .map(([crop, data]) => (
                <div
                  key={crop}
                  className="flex items-center gap-2 bg-[#F9FAF8] border border-[#E4E7E0] rounded-lg px-3 py-2"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CROP_COLORS[crop] || "#7A8A7C" }}
                  />
                  <div>
                    <span className="text-sm font-medium text-[#222527]">{crop}</span>
                    <span className="text-xs text-[#7A8A7C] ml-2">
                      {fmtBu(data.bushels)} · {fmt(data.value)} · {data.count} contracts
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={filterCrop}
          onChange={(e) => setFilterCrop(e.target.value)}
          className="border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Crops</option>
          {CROPS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        {(filterCrop || filterStatus) && (
          <button
            onClick={() => { setFilterCrop(""); setFilterStatus(""); }}
            className="text-xs text-[#7A8A7C] hover:text-[#222527]"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#7A8A7C]">Loading contracts...</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} className="text-[#C4CCC0] mx-auto mb-3" />
            <p className="text-[#7A8A7C] text-sm">No contracts for {cropYear}</p>
            <button
              onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }}
              className="mt-3 text-sm text-[#4A7C59] font-medium hover:underline"
            >
              + Add your first contract
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E4E7E0] bg-[#F9FAF8]">
                <th className="text-left p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Crop</th>
                <th className="text-left p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Type</th>
                <th className="text-left p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Buyer</th>
                <th className="text-right p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Bushels</th>
                <th className="text-right p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Price</th>
                <th className="text-right p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Value</th>
                <th className="text-left p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Delivery Window</th>
                <th className="text-center p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Status</th>
                <th className="text-right p-3 text-xs font-semibold text-[#7A8A7C] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => {
                const value = (parseFloat(String(c.bushels)) || 0) * (parseFloat(String(c.price_per_bushel)) || 0);
                const isExpanded = expandedId === c.id;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-[#E4E7E0] hover:bg-[#F9FAF8] cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: CROP_COLORS[c.crop] || "#7A8A7C" }}
                        />
                        <span className="font-medium text-[#222527]">{c.crop}</span>
                      </div>
                    </td>
                    <td className="p-3">{typeBadge(c.contract_type)}</td>
                    <td className="p-3 text-[#222527]">{c.buyer || "—"}</td>
                    <td className="p-3 text-right font-mono text-[#222527]">
                      {fmtBu(parseFloat(String(c.bushels)))}
                    </td>
                    <td className="p-3 text-right font-mono text-[#222527]">
                      {fmtPrice(parseFloat(String(c.price_per_bushel)))}
                    </td>
                    <td className="p-3 text-right font-mono font-medium text-[#222527]">
                      {fmt(value)}
                    </td>
                    <td className="p-3 text-[#7A8A7C] text-xs">
                      {c.delivery_start && c.delivery_end
                        ? `${c.delivery_start} → ${c.delivery_end}`
                        : c.delivery_start || "Open"}
                    </td>
                    <td className="p-3 text-center">{statusBadge(c.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-1.5 rounded hover:bg-[#EEF1EB] text-[#7A8A7C] hover:text-[#4A7C59]"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                        {c.status === "open" && (
                          <button
                            onClick={() => handleStatusChange(c.id, "delivered")}
                            className="p-1.5 rounded hover:bg-green-50 text-[#7A8A7C] hover:text-green-600"
                            title="Mark Delivered"
                          >
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-[#7A8A7C] hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#E4E7E0]">
              <h2 className="text-lg font-bold text-[#222527]">
                {editingId ? "Edit Contract" : "New Contract"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="p-1 rounded hover:bg-[#F5F5F3] text-[#7A8A7C]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Row 1: Crop + Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Crop *</label>
                  <select
                    value={form.crop}
                    onChange={(e) => setForm({ ...form, crop: e.target.value })}
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select crop</option>
                    {CROPS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Contract Type</label>
                  <select
                    value={form.contract_type}
                    onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  >
                    {CONTRACT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Bushels + Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Bushels *</label>
                  <input
                    type="number"
                    value={form.bushels}
                    onChange={(e) => setForm({ ...form, bushels: e.target.value })}
                    placeholder="10,000"
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Price per Bushel (CAD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price_per_bushel}
                    onChange={(e) => setForm({ ...form, price_per_bushel: e.target.value })}
                    placeholder="8.50"
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Contract value preview */}
              {form.bushels && form.price_per_bushel && (
                <div className="bg-[#F0F4ED] rounded-lg p-3 text-sm">
                  <span className="text-[#7A8A7C]">Contract Value: </span>
                  <span className="font-bold text-[#4A7C59]">
                    {fmt(parseFloat(form.bushels) * parseFloat(form.price_per_bushel))}
                  </span>
                </div>
              )}

              {/* Row 3: Buyer + Field */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Buyer / Elevator</label>
                  <input
                    type="text"
                    value={form.buyer}
                    onChange={(e) => setForm({ ...form, buyer: e.target.value })}
                    placeholder="Viterra Swift Current"
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Field (optional)</label>
                  <input
                    type="text"
                    value={form.field_name}
                    onChange={(e) => setForm({ ...form, field_name: e.target.value })}
                    placeholder="North Home"
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Row 4: Delivery Window */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Delivery Start</label>
                  <input
                    type="date"
                    value={form.delivery_start}
                    onChange={(e) => setForm({ ...form, delivery_start: e.target.value })}
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Delivery End</label>
                  <input
                    type="date"
                    value={form.delivery_end}
                    onChange={(e) => setForm({ ...form, delivery_end: e.target.value })}
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* Status */}
              {editingId && (
                <div>
                  <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-[#7A8A7C] mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Contract details, terms, special conditions..."
                  rows={2}
                  className="w-full border border-[#E4E7E0] rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-[#E4E7E0]">
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="px-4 py-2 text-sm text-[#7A8A7C] hover:text-[#222527]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.crop || !form.bushels || !form.price_per_bushel}
                className="px-6 py-2 bg-[#4A7C59] text-white rounded-lg text-sm font-medium hover:bg-[#3d6b4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingId ? "Update Contract" : "Add Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}