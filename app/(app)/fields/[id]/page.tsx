"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import AddCostModal from "@/components/fields/AddCostModal";

interface Cost {
  id: string;
  cost_type: string;
  category: string;
  description: string;
  amount_per_acre: number;
  total_amount: number;
  date_incurred: string;
  notes: string;
}

interface Crop {
  id: string;
  crop_year: number;
  crop_type: string;
  variety: string;
  seeded_acres: number;
  expected_yield_bu_ac: number;
  status: string;
  costs?: Cost[];
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
}

const CATEGORY_ORDER = [
  "Seed", "Fertilizer", "Chemical", "Fuel",
  "Labour", "Land Rent", "Custom Work", "Crop Insurance", "Other"
];

export default function FieldDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [field, setField] = useState<Field | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [costView, setCostView] = useState<"budget" | "actual">("budget");
  const [showAddCost, setShowAddCost] = useState(false);

  async function fetchData() {
    try {
      // Fetch field
      const fieldRes = await fetch(`/api/fields/${id}`);
      const fieldData = await fieldRes.json();
      setField(fieldData.field);

      // Fetch crops
      const cropRes = await fetch(`/api/fields/${id}/crops`);
      const cropData = await cropRes.json();
      const currentCrop = cropData.crops?.find(
        (c: Crop) => c.crop_year === new Date().getFullYear()
      );
      setCrop(currentCrop || null);

      // Fetch costs for current crop
      if (currentCrop) {
        const costRes = await fetch(`/api/field-crops/${currentCrop.id}/costs`);
        const costData = await costRes.json();
        setCosts(costData.costs || []);
      }
    } catch (error) {
      console.error("Error fetching field data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="p-6 text-[#7A8A7C]">Loading...</div>;
  if (!field) return <div className="p-6 text-[#7A8A7C]">Field not found.</div>;

  const filteredCosts = costs.filter((c) => c.cost_type === costView);

  const totalCost = filteredCosts.reduce(
    (sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0
  );

  const costPerAcre = field.acres > 0 ? totalCost / field.acres : 0;

  // Group costs by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filteredCosts.filter((c) => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Cost[]>);

  const budgetTotal = costs
    .filter((c) => c.cost_type === "budget")
    .reduce((sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0);

  const actualTotal = costs
    .filter((c) => c.cost_type === "actual")
    .reduce((sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0);

  const variance = actualTotal - budgetTotal;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Back button */}
      <button
        onClick={() => router.push("/fields")}
        className="flex items-center gap-2 text-[#7A8A7C] hover:text-[#222527] text-sm mb-6"
      >
        <ArrowLeft size={16} />
        Back to Fields
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">{field.field_name}</h1>
          <p className="text-[#7A8A7C] text-sm mt-1">{field.acres} acres</p>
          {field.lld_quarter && (
            <p className="text-gray-400 text-xs mt-0.5">
              {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
            </p>
          )}
          {crop && (
            <p className="text-[#4A7C59] text-sm font-medium mt-1">
              {crop.crop_type} {crop.variety && `— ${crop.variety}`} · {crop.status}
            </p>
          )}
        </div>
        {crop && (
          <button
            onClick={() => setShowAddCost(true)}
            className="flex items-center gap-2 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Add Cost
          </button>
        )}
      </div>

      {/* P&L Summary Cards */}
      {costs.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Budget Total</p>
            <p className="text-xl font-bold text-[#222527]">
              ${budgetTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ${field.acres > 0 ? (budgetTotal / field.acres).toFixed(2) : "0.00"}/ac
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Actual Total</p>
            <p className="text-xl font-bold text-[#222527]">
              ${actualTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ${field.acres > 0 ? (actualTotal / field.acres).toFixed(2) : "0.00"}/ac
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Variance</p>
            <p className={`text-xl font-bold ${variance > 0 ? "text-red-500" : "text-green-600"}`}>
              {variance > 0 ? "+" : ""}${variance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {variance > 0 ? "Over budget" : "Under budget"}
            </p>
          </div>
        </div>
      )}

      {/* Cost View Toggle */}
      {crop && (
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[#222527]">Cost Breakdown</h2>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setCostView("budget")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                costView === "budget"
                  ? "bg-[#4A7C59] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Budget
            </button>
            <button
              onClick={() => setCostView("actual")}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                costView === "actual"
                  ? "bg-[#4A7C59] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              Actual
            </button>
          </div>
        </div>
      )}

      {/* Cost Table */}
      {filteredCosts.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center">
          <p className="text-[#7A8A7C]">No {costView} costs entered yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Cost" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, items]) => {
            const categoryTotal = items.reduce(
              (sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0
            );
            return (
              <div key={category} className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#E4E7E0]">
                  <span className="text-sm font-semibold text-[#222527]">{category}</span>
                  <span className="text-sm font-semibold text-[#222527]">
                    ${categoryTotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((cost) => (
                    <div key={cost.id} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm text-[#222527]">
                          {cost.description || category}
                        </p>
                        {cost.amount_per_acre && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            ${parseFloat(String(cost.amount_per_acre)).toFixed(2)}/ac
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-medium text-[#222527]">
                        ${parseFloat(String(cost.total_amount)).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Total Row */}
          <div className="bg-[#4A7C59] rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-white font-semibold">
              Total {costView === "budget" ? "Budget" : "Actual"} Cost
            </span>
            <div className="text-right">
              <p className="text-white font-bold text-lg">
                ${totalCost.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-green-200 text-xs">
                ${costPerAcre.toFixed(2)}/ac
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Cost Modal */}
      {showAddCost && crop && (
        <AddCostModal
          fieldCropId={crop.id}
          fieldName={field.field_name}
          cropType={crop.crop_type}
          onClose={() => setShowAddCost(false)}
          onCostAdded={fetchData}
        />
      )}
    </div>
  );
}