"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Sprout, DollarSign } from "lucide-react";
import AddFieldModal from "@/components/fields/AddFieldModal";
import EditFieldModal from "@/components/fields/EditFieldModal";
import AddCropModal from "@/components/fields/AddCropModal";
import AddCostModal from "@/components/fields/AddCostModal";

interface Crop {
  id: string;
  crop_year: number;
  crop_type: string;
  variety: string;
  seeded_acres: number;
  expected_yield_bu_ac: number;
  seeding_date: string;
  status: string;
}

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
  crops?: Crop[];
}

const STATUS_COLORS: Record<string, string> = {
  planned:   "bg-gray-100 text-gray-600",
  seeded:    "bg-blue-100 text-blue-700",
  growing:   "bg-green-100 text-green-700",
  harvested: "bg-amber-100 text-amber-700",
};

const CROP_COLORS: Record<string, string> = {
  "Canola":         "bg-yellow-400",
  "Wheat":          "bg-blue-500",
  "Barley":         "bg-violet-500",
  "Oats":           "bg-amber-600",
  "Peas":           "bg-lime-500",
  "Lentils - Red":  "bg-red-500",
  "Lentils - Green":"bg-green-500",
  "Chickpeas":      "bg-orange-500",
  "Flax":           "bg-indigo-500",
  "Corn":           "bg-amber-400",
  "Soybeans":       "bg-green-600",
  "Durum":          "bg-blue-400",
  "Other":          "bg-gray-400",
};

export default function FieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [addingCropToField, setAddingCropToField] = useState<Field | null>(null);
  const [addingCostToCrop, setAddingCostToCrop] = useState<{
    fieldCropId: string;
    fieldName: string;
    cropType: string;
  } | null>(null);

  async function fetchFields() {
    try {
      const res = await fetch("/api/fields");
      const data = await res.json();
      const fieldsData: Field[] = data.fields || [];

      const fieldsWithCrops = await Promise.all(
        fieldsData.map(async (field) => {
          const cropRes = await fetch(`/api/fields/${field.id}/crops`);
          const cropData = await cropRes.json();
          return { ...field, crops: cropData.crops || [] };
        })
      );

      setFields(fieldsWithCrops);
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
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
          <p className="text-gray-400 text-sm mt-2">Click "Add Field" to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => {
            const currentCrop = field.crops?.find(
              (c) => c.crop_year === new Date().getFullYear()
            );
            const cropColor = currentCrop
              ? CROP_COLORS[currentCrop.crop_type] || "bg-gray-400"
              : null;

            return (
              <div
                key={field.id}
                className="bg-white border border-[#E4E7E0] rounded-xl shadow-sm overflow-hidden"
              >
                {/* Crop colour bar */}
                <div className={`h-1.5 w-full ${cropColor || "bg-gray-200"}`} />

                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-[#222527] font-semibold text-lg">
                        {field.field_name}
                      </h3>
                      <p className="text-[#7A8A7C] text-sm mt-0.5">
                        {field.acres} acres
                      </p>
                      {field.lld_quarter && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
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

                  {/* Current crop */}
                  {currentCrop ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${cropColor}`} />
                          <span className="text-sm text-[#222527] font-medium">
                            {currentCrop.crop_type}
                          </span>
                          {currentCrop.variety && (
                            <span className="text-xs text-gray-400">
                              {currentCrop.variety}
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[currentCrop.status]}`}>
                          {currentCrop.status.charAt(0).toUpperCase() + currentCrop.status.slice(1)}
                        </span>
                      </div>

                      {/* Add Cost button */}
                      <button
                        onClick={() =>
                          setAddingCostToCrop({
                            fieldCropId: currentCrop.id,
                            fieldName: field.field_name,
                            cropType: currentCrop.crop_type,
                          })
                        }
                        className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-[#4A7C59] hover:text-[#3d6b4a] font-medium border border-[#4A7C59] rounded-lg py-1.5 transition-colors"
                      >
                        <DollarSign size={12} />
                        Add Cost
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCropToField(field)}
                      className="mt-3 flex items-center gap-1.5 text-xs text-[#4A7C59] hover:text-[#3d6b4a] font-medium"
                    >
                      <Sprout size={13} />
                      Assign {new Date().getFullYear()} Crop
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddFieldModal
          onClose={() => setShowAddModal(false)}
          onFieldAdded={fetchFields}
        />
      )}
      {editingField && (
        <EditFieldModal
          field={editingField}
          onClose={() => setEditingField(null)}
          onFieldUpdated={fetchFields}
        />
      )}
      {addingCropToField && (
        <AddCropModal
          fieldId={addingCropToField.id}
          fieldName={addingCropToField.field_name}
          onClose={() => setAddingCropToField(null)}
          onCropAdded={fetchFields}
        />
      )}
      {addingCostToCrop && (
        <AddCostModal
          fieldCropId={addingCostToCrop.fieldCropId}
          fieldName={addingCostToCrop.fieldName}
          cropType={addingCostToCrop.cropType}
          onClose={() => setAddingCostToCrop(null)}
          onCostAdded={fetchFields}
        />
      )}
    </div>
  );
}