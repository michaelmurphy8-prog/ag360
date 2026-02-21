"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddCostModalProps {
  fieldCropId: string;
  fieldName: string;
  cropType: string;
  onClose: () => void;
  onCostAdded: () => void;
}

const COST_CATEGORIES = [
  "Seed",
  "Fertilizer",
  "Chemical",
  "Fuel",
  "Labour",
  "Land Rent",
  "Custom Work",
  "Crop Insurance",
  "Other",
];

export default function AddCostModal({
  fieldCropId,
  fieldName,
  cropType,
  onClose,
  onCostAdded,
}: AddCostModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    cost_type: "budget",
    category: "",
    description: "",
    amount_per_acre: "",
    total_amount: "",
    date_incurred: "",
    notes: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;

    // Auto-calculate total from per acre or vice versa
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/field-crops/${fieldCropId}/costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount_per_acre: form.amount_per_acre ? parseFloat(form.amount_per_acre) : null,
          total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
        }),
      });
      const result = await res.json();
if (result.cost) {
  onCostAdded();
  onClose();
}
    } catch (error) {
      console.error("Error adding cost:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Cost</h2>
            <p className="text-sm text-gray-400">{fieldName} — {cropType}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">

          {/* Budget vs Actual toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost Type
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setForm({ ...form, cost_type: "budget" })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.cost_type === "budget"
                    ? "bg-[#4A7C59] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Budget
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, cost_type: "actual" })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.cost_type === "actual"
                    ? "bg-[#4A7C59] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Actual
              </button>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a category...</option>
              {COST_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. InVigor L233P canola seed"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Amount per acre + Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount per Acre ($)
              </label>
              <input
                name="amount_per_acre"
                value={form.amount_per_acre}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 45.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount ($)
              </label>
              <input
                name="total_amount"
                value={form.total_amount}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 6975.00"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              name="date_incurred"
              value={form.date_incurred}
              onChange={handleChange}
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Saving..." : "Add Cost"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}