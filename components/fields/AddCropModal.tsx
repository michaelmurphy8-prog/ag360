"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddCropModalProps {
  fieldId: string;
  fieldName: string;
  onClose: () => void;
  onCropAdded: () => void;
}

const CROP_OPTIONS = [
  "Canola",
  "Wheat",
  "Barley",
  "Oats",
  "Peas",
  "Lentils - Red",
  "Lentils - Green",
  "Chickpeas",
  "Flax",
  "Corn",
  "Soybeans",
  "Durum",
  "Other",
];

export default function AddCropModal({ fieldId, fieldName, onClose, onCropAdded }: AddCropModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    crop_year: new Date().getFullYear().toString(),
    crop_type: "",
    variety: "",
    seeded_acres: "",
    expected_yield_bu_ac: "",
    seeding_date: "",
    status: "planned",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/fields/${fieldId}/crops`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          crop_year: parseInt(form.crop_year),
          seeded_acres: form.seeded_acres ? parseFloat(form.seeded_acres) : null,
          expected_yield_bu_ac: form.expected_yield_bu_ac ? parseFloat(form.expected_yield_bu_ac) : null,
        }),
      });
      if (res.ok) {
        onCropAdded();
        onClose();
      }
    } catch (error) {
      console.error("Error adding crop:", error);
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
            <h2 className="text-lg font-semibold text-gray-900">Add Crop</h2>
            <p className="text-sm text-gray-400">{fieldName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">

          {/* Crop Year */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crop Year <span className="text-red-500">*</span>
            </label>
            <input
              name="crop_year"
              value={form.crop_year}
              onChange={handleChange}
              required
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Crop Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Crop Type <span className="text-red-500">*</span>
            </label>
            <select
              name="crop_type"
              value={form.crop_type}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select a crop...</option>
              {CROP_OPTIONS.map((crop) => (
                <option key={crop} value={crop}>{crop}</option>
              ))}
            </select>
          </div>

          {/* Variety */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variety
            </label>
            <input
              name="variety"
              value={form.variety}
              onChange={handleChange}
              placeholder="e.g. InVigor L233P, AAC Brandon"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Seeded Acres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seeded Acres
            </label>
            <input
              name="seeded_acres"
              value={form.seeded_acres}
              onChange={handleChange}
              type="number"
              placeholder="e.g. 155"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Expected Yield */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Yield (bu/ac)
            </label>
            <input
              name="expected_yield_bu_ac"
              value={form.expected_yield_bu_ac}
              onChange={handleChange}
              type="number"
              placeholder="e.g. 45"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Seeding Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seeding Date
            </label>
            <input
              name="seeding_date"
              value={form.seeding_date}
              onChange={handleChange}
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="planned">Planned</option>
              <option value="seeded">Seeded</option>
              <option value="growing">Growing</option>
              <option value="harvested">Harvested</option>
            </select>
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
              {loading ? "Saving..." : "Add Crop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}