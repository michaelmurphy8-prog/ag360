"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Field {
  id: string;
  field_name: string;
  acres: number;
  lld_quarter: string;
  lld_section: number;
  lld_township: number;
  lld_range: number;
  lld_meridian: number;
  lld_province: string;
  notes: string;
}

interface EditFieldModalProps {
  field: Field;
  onClose: () => void;
  onFieldUpdated: () => void;
}

export default function EditFieldModal({ field, onClose, onFieldUpdated }: EditFieldModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    field_name: field.field_name || "",
    acres: field.acres?.toString() || "",
    lld_quarter: field.lld_quarter || "",
    lld_section: field.lld_section?.toString() || "",
    lld_township: field.lld_township?.toString() || "",
    lld_range: field.lld_range?.toString() || "",
    lld_meridian: field.lld_meridian?.toString() || "",
    lld_province: field.lld_province || "SK",
    notes: field.notes || "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/fields/${field.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          acres: parseFloat(form.acres),
          lld_section: form.lld_section ? parseInt(form.lld_section) : null,
          lld_township: form.lld_township ? parseInt(form.lld_township) : null,
          lld_range: form.lld_range ? parseInt(form.lld_range) : null,
          lld_meridian: form.lld_meridian ? parseInt(form.lld_meridian) : null,
        }),
      });
      if (res.ok) {
        onFieldUpdated();
        onClose();
      }
    } catch (error) {
      console.error("Error updating field:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/fields/${field.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onFieldUpdated();
        onClose();
      }
    } catch (error) {
      console.error("Error deleting field:", error);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-lg shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Field</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">

          {/* Field Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Field Name <span className="text-red-500">*</span>
            </label>
            <input
              name="field_name"
              value={form.field_name}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Acres */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Acres <span className="text-red-500">*</span>
            </label>
            <input
              name="acres"
              value={form.acres}
              onChange={handleChange}
              required
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
            <select
              name="lld_province"
              value={form.lld_province}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="SK">Saskatchewan</option>
              <option value="AB">Alberta</option>
              <option value="MB">Manitoba</option>
            </select>
          </div>

          {/* LLD */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Legal Land Description (LLD)
            </label>
            <div className="grid grid-cols-5 gap-2">
              <select
                name="lld_quarter"
                value={form.lld_quarter}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Qtr</option>
                <option value="NW">NW</option>
                <option value="NE">NE</option>
                <option value="SW">SW</option>
                <option value="SE">SE</option>
              </select>
              <input
                name="lld_section"
                value={form.lld_section}
                onChange={handleChange}
                placeholder="Sec"
                type="number"
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                name="lld_township"
                value={form.lld_township}
                onChange={handleChange}
                placeholder="Twp"
                type="number"
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                name="lld_range"
                value={form.lld_range}
                onChange={handleChange}
                placeholder="Rng"
                type="number"
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <select
                name="lld_meridian"
                value={form.lld_meridian}
                onChange={handleChange}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">W</option>
                <option value="1">W1</option>
                <option value="2">W2</option>
                <option value="3">W3</option>
                <option value="4">W4</option>
                <option value="5">W5</option>
                <option value="6">W6</option>
              </select>
            </div>
            <p className="text-xs text-gray-400 mt-1">Quarter · Section · Township · Range · Meridian</p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Save / Cancel */}
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>

          {/* Delete */}
          <div className="border-t border-gray-200 pt-4">
            {!confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="w-full text-red-500 hover:text-red-700 text-sm font-medium py-1"
              >
                Delete this field
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-700 text-sm font-medium mb-3">
                  Are you sure? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-lg py-1.5 text-sm disabled:opacity-50"
                  >
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}