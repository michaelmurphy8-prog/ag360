"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import AddCostModal from "@/components/fields/AddCostModal";
import AddRevenueModal from "@/components/fields/AddRevenueModal";

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

interface Revenue {
  id: string;
  revenue_type: string;
  source: string;
  description: string;
  bushels: number;
  price_per_bu: number;
  total_revenue: number;
  date: string;
}

interface Crop {
  id: string;
  crop_year: number;
  crop_type: string;
  variety: string;
  seeded_acres: number;
  expected_yield_bu_ac: number;
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
  const [revenue, setRevenue] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [costView, setCostView] = useState<"budget" | "actual">("budget");
  const [activeTab, setActiveTab] = useState<"costs" | "revenue">("costs");
  const [showAddCost, setShowAddCost] = useState(false);
  const [showAddRevenue, setShowAddRevenue] = useState(false);

  async function fetchData() {
    try {
      const fieldRes = await fetch(`/api/fields/${id}`);
      const fieldData = await fieldRes.json();
      setField(fieldData.field);

      const cropRes = await fetch(`/api/fields/${id}/crops`);
      const cropData = await cropRes.json();
      const currentCrop = cropData.crops?.find(
        (c: Crop) => c.crop_year === new Date().getFullYear()
      );
      setCrop(currentCrop || null);

      if (currentCrop) {
        const costRes = await fetch(`/api/field-crops/${currentCrop.id}/costs`);
        const costData = await costRes.json();
        setCosts(costData.costs || []);

        const revRes = await fetch(`/api/field-crops/${currentCrop.id}/revenue`);
        const revData = await revRes.json();
        setRevenue(revData.revenue || []);
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
  const filteredRevenue = revenue.filter((r) => r.revenue_type === costView);

  const totalCost = filteredCosts.reduce(
    (sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0
  );
  const totalRevenue = filteredRevenue.reduce(
    (sum, r) => sum + (parseFloat(String(r.total_revenue)) || 0), 0
  );
  const netMargin = totalRevenue - totalCost;
  const costPerAcre = field.acres > 0 ? totalCost / field.acres : 0;
  const revenuePerAcre = field.acres > 0 ? totalRevenue / field.acres : 0;
  const marginPerAcre = field.acres > 0 ? netMargin / field.acres : 0;

  const budgetCostTotal = costs
    .filter((c) => c.cost_type === "budget")
    .reduce((sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0);
  const actualCostTotal = costs
    .filter((c) => c.cost_type === "actual")
    .reduce((sum, c) => sum + (parseFloat(String(c.total_amount)) || 0), 0);
  const variance = actualCostTotal - budgetCostTotal;

  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const items = filteredCosts.filter((c) => c.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {} as Record<string, Cost[]>);

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Back */}
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
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddRevenue(true)}
              className="flex items-center gap-2 border border-[#4A7C59] text-[#4A7C59] hover:bg-[#4A7C59] hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Revenue
            </button>
            <button
              onClick={() => setShowAddCost(true)}
              className="flex items-center gap-2 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              Add Cost
            </button>
          </div>
        )}
      </div>

      {/* P&L Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
          <p className="text-xs text-[#7A8A7C] mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-[#222527]">
            ${totalRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">${revenuePerAcre.toFixed(2)}/ac</p>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
          <p className="text-xs text-[#7A8A7C] mb-1">Total Costs</p>
          <p className="text-xl font-bold text-[#222527]">
            ${totalCost.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">${costPerAcre.toFixed(2)}/ac</p>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
          <p className="text-xs text-[#7A8A7C] mb-1">Net Margin</p>
          <p className={`text-xl font-bold ${netMargin >= 0 ? "text-green-600" : "text-red-500"}`}>
            ${netMargin.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">${marginPerAcre.toFixed(2)}/ac</p>
        </div>
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
          <p className="text-xs text-[#7A8A7C] mb-1">Cost Variance</p>
          <p className={`text-xl font-bold ${variance > 0 ? "text-red-500" : "text-green-600"}`}>
            {variance > 0 ? "+" : ""}${variance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {variance > 0 ? "Over budget" : "Under budget"}
          </p>
        </div>
      </div>

      {/* Toggle Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setActiveTab("costs")}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "costs"
                ? "bg-[#222527] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Costs
          </button>
          <button
            onClick={() => setActiveTab("revenue")}
            className={`px-5 py-1.5 text-sm font-medium transition-colors ${
              activeTab === "revenue"
                ? "bg-[#222527] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Revenue
          </button>
        </div>
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

      {/* Costs Tab */}
      {activeTab === "costs" && (
        <>
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
                          <div className="flex-1">
                            <p className="text-sm text-[#222527]">{cost.description || category}</p>
                            {cost.amount_per_acre && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                ${parseFloat(String(cost.amount_per_acre)).toFixed(2)}/ac
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-[#222527]">
                              ${parseFloat(String(cost.total_amount)).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                            </p>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this cost entry?")) return;
                                await fetch(`/api/field-crops/${crop?.id}/costs/${cost.id}`, { method: "DELETE" });
                                fetchData();
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="bg-[#4A7C59] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-white font-semibold">
                  Total {costView === "budget" ? "Budget" : "Actual"} Cost
                </span>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">
                    ${totalCost.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-green-200 text-xs">${costPerAcre.toFixed(2)}/ac</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Revenue Tab */}
      {activeTab === "revenue" && (
        <>
          {filteredRevenue.length === 0 ? (
            <div className="border border-dashed border-gray-300 rounded-xl p-10 text-center">
              <p className="text-[#7A8A7C]">No {costView} revenue entered yet</p>
              <p className="text-gray-400 text-sm mt-1">Click "Add Revenue" to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-[#E4E7E0]">
                  <span className="text-sm font-semibold text-[#222527]">Revenue Entries</span>
                  <span className="text-sm font-semibold text-[#222527]">
                    ${totalRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {filteredRevenue.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1">
                        <p className="text-sm text-[#222527]">
                          {rev.description || rev.source.replace("_", " ")}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {rev.bushels && `${parseFloat(String(rev.bushels)).toLocaleString()} bu`}
                          {rev.bushels && rev.price_per_bu && " @ "}
                          {rev.price_per_bu && `$${parseFloat(String(rev.price_per_bu)).toFixed(2)}/bu`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-green-600">
                          ${parseFloat(String(rev.total_revenue)).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                        </p>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this revenue entry?")) return;
                            await fetch(`/api/field-crops/${crop?.id}/revenue/${rev.id}`, { method: "DELETE" });
                            fetchData();
                          }}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-[#4A7C59] rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-white font-semibold">
                  Total {costView === "budget" ? "Budget" : "Actual"} Revenue
                </span>
                <div className="text-right">
                  <p className="text-white font-bold text-lg">
                    ${totalRevenue.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-green-200 text-xs">${revenuePerAcre.toFixed(2)}/ac</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showAddCost && crop && (
        <AddCostModal
          fieldCropId={crop.id}
          fieldName={field.field_name}
          cropType={crop.crop_type}
          onClose={() => setShowAddCost(false)}
          onCostAdded={fetchData}
        />
      )}
      {showAddRevenue && crop && (
        <AddRevenueModal
          fieldCropId={crop.id}
          fieldName={field.field_name}
          cropType={crop.crop_type}
          onClose={() => setShowAddRevenue(false)}
          onRevenueAdded={fetchData}
        />
      )}
    </div>
  );
}