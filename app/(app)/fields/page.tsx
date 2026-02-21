"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import AddFieldModal from "@/components/fields/AddFieldModal";
import EditFieldModal from "@/components/fields/EditFieldModal";

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

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);

  function fetchFields() {
    fetch("/api/fields")
      .then((res) => res.json())
      .then((data) => {
        setFields(data.fields || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchFields();
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Fields</h1>
          <p className="text-[#7A8A7C] text-sm mt-1">
            Manage your fields and track profitability
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {/* Fields List */}
      {loading ? (
        <p className="text-[#7A8A7C]">Loading fields...</p>
      ) : fields.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-[#7A8A7C] text-lg">No fields yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Click "Add Field" to get started
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => (
            <div
              key={field.id}
              className="bg-white border border-[#E4E7E0] rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[#222527] font-semibold text-lg">
                    {field.field_name}
                  </h3>
                  <p className="text-[#7A8A7C] text-sm mt-1">
                    {field.acres} acres
                  </p>
                  {field.lld_quarter && (
                    <p className="text-gray-400 text-xs mt-1">
                      {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
                    </p>
                  )}
                  {field.notes && (
                    <p className="text-gray-400 text-xs mt-2 italic">
                      {field.notes}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditingField(field)}
                  className="text-gray-400 hover:text-[#4A7C59] transition-colors p-1"
                >
                  <Pencil size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddFieldModal
          onClose={() => setShowAddModal(false)}
          onFieldAdded={fetchFields}
        />
      )}

      {/* Edit Modal */}
      {editingField && (
        <EditFieldModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onFieldUpdated={fetchFields}
        />
      )}
    </div>
  );
}