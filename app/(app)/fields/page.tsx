"use client";

import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Sprout, DollarSign, LayoutGrid, List, ArrowUpDown, Filter } from "lucide-react";
import AddFieldModal from "@/components/fields/AddFieldModal";
import EditFieldModal from "@/components/fields/EditFieldModal";
import AddCropModal from "@/components/fields/AddCropModal";
import AddCostModal from "@/components/fields/AddCostModal";
import { useRouter } from "next/navigation";

interface FieldRow {
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
  crop_id: string | null;
  crop_year: number | null;
  crop_type: string | null;
  variety: string | null;
  seeded_acres: number | null;
  expected_yield_bu_ac: number | null;
  seeding_date: string | null;
  crop_status: string | null;
  budget_total: number;
  actual_total: number;
  budget_revenue: number;
  actual_revenue: number;
}

interface KPIs {
  totalFields: number;
  totalAcres: number;
  seededAcres: number;
  seededCount: number;
  unseededCount: number;
  totalBudgetCost: number;
  totalActualCost: number;
  totalBudgetRevenue: number;
  totalActualRevenue: number;
  costVariance: number;
  avgCostPerAcre: number;
  netMarginActual: number;
  netMarginBudget: number;
}

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-gray-100 text-gray-600",
  seeded: "bg-blue-100 text-blue-700",
  growing: "bg-green-100 text-green-700",
  harvested: "bg-amber-100 text-amber-700",
};

const CROP_COLORS: Record<string, string> = {
  Canola: "bg-yellow-400",
  Wheat: "bg-blue-500",
  Barley: "bg-violet-500",
  Oats: "bg-amber-600",
  Peas: "bg-lime-500",
  "Lentils - Red": "bg-red-500",
  "Lentils - Green": "bg-green-500",
  Chickpeas: "bg-orange-500",
  Flax: "bg-indigo-500",
  Corn: "bg-amber-400",
  Soybeans: "bg-green-600",
  Durum: "bg-blue-400",
  Other: "bg-gray-400",
};

const CROP_DOT_COLORS: Record<string, string> = {
  Canola: "#facc15",
  Wheat: "#3b82f6",
  Barley: "#8b5cf6",
  Oats: "#d97706",
  Peas: "#84cc16",
  "Lentils - Red": "#ef4444",
  "Lentils - Green": "#22c55e",
  Chickpeas: "#f97316",
  Flax: "#6366f1",
  Corn: "#fbbf24",
  Soybeans: "#16a34a",
  Durum: "#60a5fa",
  Other: "#9ca3af",
};

type SortKey = "name" | "acres" | "crop" | "variance" | "costPerAcre";

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtD(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function FieldsPage() {
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<Record<string, { acres: number; count: number }>>({});
  const [loading, setLoading] = useState(true);
  const [cropYear, setCropYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [filterCrop, setFilterCrop] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingField, setEditingField] = useState<FieldRow | null>(null);
  const [addingCropToField, setAddingCropToField] = useState<FieldRow | null>(null);
  const [addingCostToCrop, setAddingCostToCrop] = useState<{
    fieldCropId: string;
    fieldName: string;
    cropType: string;
  } | null>(null);
  const router = useRouter();

  async function fetchFields() {
    try {
      const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
      const data = await res.json();
      setFields(data.fields || []);
      setKpis(data.kpis || null);
      setCropBreakdown(data.cropBreakdown || {});
    } catch (error) {
      console.error("Error fetching fields:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchFields();
  }, [cropYear]);

  // Unique crop types for filter
  const cropTypes = useMemo(() => {
    const types = new Set<string>();
    fields.forEach((f) => {
      if (f.crop_type) types.add(f.crop_type);
    });
    return Array.from(types).sort();
  }, [fields]);

  // Filtered + sorted
  const displayFields = useMemo(() => {
    let filtered = [...fields];
    if (filterCrop !== "all") {
      filtered = filtered.filter((f) => f.crop_type === filterCrop);
    }
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.field_name.localeCompare(b.field_name);
        case "acres":
          return (b.acres || 0) - (a.acres || 0);
        case "crop":
          return (a.crop_type || "zzz").localeCompare(b.crop_type || "zzz");
        case "variance": {
          const va = (parseFloat(String(a.actual_total)) || 0) - (parseFloat(String(a.budget_total)) || 0);
          const vb = (parseFloat(String(b.actual_total)) || 0) - (parseFloat(String(b.budget_total)) || 0);
          return va - vb;
        }
        case "costPerAcre": {
          const ca = a.acres > 0 ? (parseFloat(String(a.actual_total)) || 0) / a.acres : 0;
          const cb = b.acres > 0 ? (parseFloat(String(b.actual_total)) || 0) / b.acres : 0;
          return cb - ca;
        }
        default:
          return 0;
      }
    });
    return filtered;
  }, [fields, filterCrop, sortKey]);

  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear + 1; y >= currentYear - 3; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Fields</h1>
          <p className="text-[#7A8A7C] text-sm mt-1">
            Manage your fields and track profitability
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Crop Year Selector */}
          <select
            value={cropYear}
            onChange={(e) => setCropYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-[#222527] focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-[#4A7C59] hover:bg-[#3d6b4a] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Field
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Total Fields</p>
            <p className="text-xl font-bold text-[#222527]">{kpis.totalFields}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {kpis.seededCount} seeded · {kpis.unseededCount} unassigned
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Total Acres</p>
            <p className="text-xl font-bold text-[#222527]">{fmt(kpis.totalAcres)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{fmt(kpis.seededAcres)} seeded</p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Budget Cost</p>
            <p className="text-xl font-bold text-[#222527]">${fmt(kpis.totalBudgetCost)}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              ${kpis.seededAcres > 0 ? fmtD(kpis.totalBudgetCost / kpis.seededAcres) : "0.00"}/ac
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Actual Cost</p>
            <p className="text-xl font-bold text-[#222527]">${fmt(kpis.totalActualCost)}</p>
            <p className="text-xs text-gray-400 mt-0.5">${fmtD(kpis.avgCostPerAcre)}/ac</p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Cost Variance</p>
            <p className={`text-xl font-bold ${kpis.costVariance > 0 ? "text-red-500" : "text-green-600"}`}>
              {kpis.costVariance > 0 ? "+" : ""}${fmt(kpis.costVariance)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {kpis.costVariance > 0 ? "Over budget" : "Under budget"}
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
            <p className="text-xs text-[#7A8A7C] mb-1">Net Margin (Actual)</p>
            <p className={`text-xl font-bold ${kpis.netMarginActual >= 0 ? "text-green-600" : "text-red-500"}`}>
              ${fmt(kpis.netMarginActual)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              ${kpis.seededAcres > 0 ? fmtD(kpis.netMarginActual / kpis.seededAcres) : "0.00"}/ac
            </p>
          </div>
        </div>
      )}

      {/* Crop Breakdown Bar */}
      {Object.keys(cropBreakdown).length > 0 && kpis && kpis.seededAcres > 0 && (
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-4 mb-6">
          <p className="text-xs text-[#7A8A7C] mb-3 font-medium">Crop Mix — {cropYear}</p>
          <div className="flex rounded-lg overflow-hidden h-4 mb-3">
            {Object.entries(cropBreakdown)
              .sort((a, b) => b[1].acres - a[1].acres)
              .map(([crop, data]) => (
                <div
                  key={crop}
                  className={`${CROP_COLORS[crop] || "bg-gray-400"} transition-all`}
                  style={{ width: `${(data.acres / kpis.seededAcres) * 100}%` }}
                  title={`${crop}: ${fmt(data.acres)} ac (${((data.acres / kpis.seededAcres) * 100).toFixed(0)}%)`}
                />
              ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(cropBreakdown)
              .sort((a, b) => b[1].acres - a[1].acres)
              .map(([crop, data]) => (
                <div key={crop} className="flex items-center gap-1.5 text-xs text-[#7A8A7C]">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CROP_DOT_COLORS[crop] || "#9ca3af" }}
                  />
                  {crop}: {fmt(data.acres)} ac ({data.count})
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Toolbar: Filter, Sort, View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Crop filter */}
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[#7A8A7C]" />
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-[#222527] focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Crops</option>
              {cropTypes.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
          {/* Sort */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown size={14} className="text-[#7A8A7C]" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs text-[#222527] focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="name">Name</option>
              <option value="acres">Acres</option>
              <option value="crop">Crop</option>
              <option value="variance">Variance</option>
              <option value="costPerAcre">Cost/Acre</option>
            </select>
          </div>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode("card")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "card" ? "bg-[#222527] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1.5 transition-colors ${
              viewMode === "table" ? "bg-[#222527] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Fields List */}
      {loading ? (
        <p className="text-[#7A8A7C]">Loading fields...</p>
      ) : fields.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <p className="text-[#7A8A7C] text-lg">No fields yet</p>
          <p className="text-gray-400 text-sm mt-2">Click &quot;Add Field&quot; to get started</p>
        </div>
      ) : viewMode === "card" ? (
        /* ===== CARD VIEW ===== */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayFields.map((field) => {
            const cropColor = field.crop_type ? CROP_COLORS[field.crop_type] || "bg-gray-400" : null;
            const budget = parseFloat(String(field.budget_total)) || 0;
            const actual = parseFloat(String(field.actual_total)) || 0;
            const variance = actual - budget;
            const actualRev = parseFloat(String(field.actual_revenue)) || 0;
            const margin = actualRev - actual;
            const expectedProd = (parseFloat(String(field.expected_yield_bu_ac)) || 0) *
              (parseFloat(String(field.seeded_acres)) || parseFloat(String(field.acres)) || 0);

            return (
              <div
                key={field.id}
                onClick={() => router.push(`/fields/${field.id}`)}
                className="bg-white border border-[#E4E7E0] rounded-xl shadow-sm overflow-hidden cursor-pointer hover:border-[#4A7C59] transition-colors"
              >
                <div className={`h-1.5 w-full ${cropColor || "bg-gray-200"}`} />
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-[#222527] font-semibold text-lg">{field.field_name}</h3>
                      <p className="text-[#7A8A7C] text-sm mt-0.5">{field.acres} acres</p>
                      {field.lld_quarter && (
                        <p className="text-gray-400 text-xs mt-0.5">
                          {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian} ({field.lld_province})
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingField(field);
                      }}
                      className="text-gray-400 hover:text-[#4A7C59] transition-colors p-1"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>

                  {field.crop_type ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${cropColor}`} />
                          <span className="text-sm text-[#222527] font-medium">{field.crop_type}</span>
                          {field.variety && <span className="text-xs text-gray-400">{field.variety}</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[field.crop_status || "planned"]}`}>
                          {(field.crop_status || "planned").charAt(0).toUpperCase() + (field.crop_status || "planned").slice(1)}
                        </span>
                      </div>

                      {/* Expected production */}
                      {field.expected_yield_bu_ac && (
                        <p className="text-xs text-gray-400 mt-2">
                          Est. {fmt(expectedProd)} bu ({field.expected_yield_bu_ac} bu/ac)
                        </p>
                      )}

                      {/* Cost Summary */}
                      <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 space-y-1">
                        {budget > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Budget</span>
                            <span className="font-medium text-gray-700">${fmtD(budget)}</span>
                          </div>
                        )}
                        {actual > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Actual</span>
                            <span className="font-medium text-gray-700">${fmtD(actual)}</span>
                          </div>
                        )}
                        {budget > 0 && actual > 0 && (
                          <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                            <span className="text-gray-500">Variance</span>
                            <span className={`font-medium ${variance > 0 ? "text-red-500" : "text-green-600"}`}>
                              {variance > 0 ? "+" : ""}${fmtD(variance)}
                            </span>
                          </div>
                        )}
                        {actualRev > 0 && (
                          <div className="flex justify-between text-xs border-t border-gray-200 pt-1 mt-1">
                            <span className="text-gray-500">Net Margin</span>
                            <span className={`font-medium ${margin >= 0 ? "text-green-600" : "text-red-500"}`}>
                              ${fmtD(margin)}
                            </span>
                          </div>
                        )}
                        {(budget === 0 && actual === 0) && (
                          <p className="text-xs text-gray-400">No costs entered</p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddingCostToCrop({
                            fieldCropId: field.crop_id!,
                            fieldName: field.field_name,
                            cropType: field.crop_type!,
                          });
                        }}
                        className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-[#4A7C59] hover:text-[#3d6b4a] font-medium border border-[#4A7C59] rounded-lg py-1.5 transition-colors"
                      >
                        <DollarSign size={12} />
                        Add Cost
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddingCropToField(field);
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs text-[#4A7C59] hover:text-[#3d6b4a] font-medium"
                    >
                      <Sprout size={13} />
                      Assign {cropYear} Crop
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== TABLE VIEW ===== */
        <div className="bg-white border border-[#E4E7E0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-[#E4E7E0]">
                  <th className="text-left px-4 py-3 font-semibold text-[#222527]">Field</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#222527]">Acres</th>
                  <th className="text-left px-4 py-3 font-semibold text-[#222527]">Crop</th>
                  <th className="text-center px-4 py-3 font-semibold text-[#222527]">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#222527]">Budget</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#222527]">Actual</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#222527]">Variance</th>
                  <th className="text-right px-4 py-3 font-semibold text-[#222527]">$/Acre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayFields.map((field) => {
                  const budget = parseFloat(String(field.budget_total)) || 0;
                  const actual = parseFloat(String(field.actual_total)) || 0;
                  const variance = actual - budget;
                  const cpa = field.acres > 0 ? actual / field.acres : 0;

                  return (
                    <tr
                      key={field.id}
                      onClick={() => router.push(`/fields/${field.id}`)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#222527]">{field.field_name}</p>
                        {field.lld_quarter && (
                          <p className="text-xs text-gray-400">
                            {field.lld_quarter}-{field.lld_section}-{field.lld_township}-{field.lld_range}-W{field.lld_meridian}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#222527]">{field.acres}</td>
                      <td className="px-4 py-3">
                        {field.crop_type ? (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: CROP_DOT_COLORS[field.crop_type] || "#9ca3af" }}
                            />
                            <span>{field.crop_type}</span>
                            {field.variety && <span className="text-xs text-gray-400">{field.variety}</span>}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {field.crop_status ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[field.crop_status]}`}>
                            {field.crop_status.charAt(0).toUpperCase() + field.crop_status.slice(1)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-[#222527]">
                        {budget > 0 ? `$${fmtD(budget)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#222527]">
                        {actual > 0 ? `$${fmtD(actual)}` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${variance > 0 ? "text-red-500" : variance < 0 ? "text-green-600" : "text-gray-400"}`}>
                        {budget > 0 || actual > 0
                          ? `${variance > 0 ? "+" : ""}$${fmtD(variance)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-[#222527]">
                        {actual > 0 ? `$${fmtD(cpa)}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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