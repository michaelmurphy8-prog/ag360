"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddRevenueModalProps {
  fieldCropId: string;
  fieldName: string;
  cropType: string;
  onClose: () => void;
  onRevenueAdded: () => void;
}

export default function AddRevenueModal({
  fieldCropId,
  fieldName,
  cropType,
  onClose,
  onRevenueAdded,
}: AddRevenueModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    revenue_type: "budget",
    source: "cash_sale",
    description: "",
    bushels: "",
    price_per_bu: "",
    total_revenue: "",
    date: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name === "revenue_type" || name === "source") return;

    // Auto-calculate total when bushels and price are entered
    const updated = { ...form, [name]: value };
    if (name === "bushels" || name === "price_per_bu") {
      const bu = parseFloat(name === "bushels" ? value : form.bushels);
      const price = parseFloat(name === "price_per_bu" ? value : form.price_per_bu);
      if (!isNaN(bu) && !isNaN(price)) {
        updated.total_revenue = (bu * price).toFixed(2);
      }
    }
    setForm(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/field-crops/${fieldCropId}/revenue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bushels: form.bushels ? parseFloat(form.bushels) : null,
          price_per_bu: form.price_per_bu ? parseFloat(form.price_per_bu) : null,
          total_revenue: form.total_revenue ? parseFloat(form.total_revenue) : null,
        }),
      });
      const result = await res.json();
      if (result.revenue) {
        onRevenueAdded();
        onClose();
      }
    } catch (error) {
      console.error("Error adding revenue:", error);
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
            <h2 className="text-lg font-semibold text-gray-900">Add Revenue</h2>
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
              Revenue Type
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                type="button"
                onClick={() => setForm({ ...form, revenue_type: "budget" })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.revenue_type === "budget"
                    ? "bg-[#4A7C59] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Budget
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, revenue_type: "actual" })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.revenue_type === "actual"
                    ? "bg-[#4A7C59] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Actual
              </button>
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {["cash_sale", "contract", "crop_insurance"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm({ ...form, source: s })}
                  className={`flex-1 py-2 text-xs font-medium transition-colors ${
                    form.source === s
                      ? "bg-[#4A7C59] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {s === "cash_sale" ? "Cash Sale" : s === "contract" ? "Contract" : "Crop Insurance"}
                </button>
              ))}
            </div>
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
              placeholder="e.g. Viterra Swift Current delivery"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Bushels + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bushels
              </label>
              <input
                name="bushels"
                value={form.bushels}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 7200"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price per Bu ($)
              </label>
              <input
                name="price_per_bu"
                value={form.price_per_bu}
                onChange={handleChange}
                type="number"
                placeholder="e.g. 13.42"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          {/* Total Revenue — auto calculated */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Revenue ($)
              <span className="text-gray-400 font-normal ml-1">— auto calculated</span>
            </label>
            <input
              name="total_revenue"
              value={form.total_revenue}
              onChange={handleChange}
              type="number"
              placeholder="e.g. 96624.00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              name="date"
              value={form.date}
              onChange={handleChange}
              type="date"
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
              {loading ? "Saving..." : "Add Revenue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}