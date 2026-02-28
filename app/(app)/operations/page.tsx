"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MapPin, Upload, Wheat, ArrowRight, TrendingUp, TrendingDown,
} from "lucide-react";

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

interface CropBreakdown {
  [crop: string]: { acres: number; count: number };
}

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

function fmt(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtD(n: number): string {
  return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OperationsPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<CropBreakdown>({});
  const [loading, setLoading] = useState(true);
  const cropYear = new Date().getFullYear();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
        const data = await res.json();
        setKpis(data.kpis || null);
        setCropBreakdown(data.cropBreakdown || {});
      } catch (err) {
        console.error("Error loading operations data:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-6 text-[#7A8A7C]">Loading operations...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#222527]">Operations</h1>
        <p className="text-[#7A8A7C] text-sm mt-1">
          Farm operations overview — {cropYear} crop year
        </p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
            <p className="text-xs text-[#7A8A7C] mb-1">Total Acres</p>
            <p className="text-2xl font-bold text-[#222527]">{fmt(kpis.totalAcres)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {kpis.totalFields} fields · {kpis.seededCount} seeded
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
            <p className="text-xs text-[#7A8A7C] mb-1">Total Costs (Actual)</p>
            <p className="text-2xl font-bold text-[#222527]">${fmt(kpis.totalActualCost)}</p>
            <p className="text-xs text-gray-400 mt-1">${fmtD(kpis.avgCostPerAcre)}/ac avg</p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
            <p className="text-xs text-[#7A8A7C] mb-1">Total Revenue (Actual)</p>
            <p className="text-2xl font-bold text-[#222527]">${fmt(kpis.totalActualRevenue)}</p>
            <p className="text-xs text-gray-400 mt-1">
              ${kpis.seededAcres > 0 ? fmtD(kpis.totalActualRevenue / kpis.seededAcres) : "0.00"}/ac
            </p>
          </div>
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
            <p className="text-xs text-[#7A8A7C] mb-1">Net Margin</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${kpis.netMarginActual >= 0 ? "text-green-600" : "text-red-500"}`}>
                ${fmt(kpis.netMarginActual)}
              </p>
              {kpis.netMarginActual >= 0 ? (
                <TrendingUp size={18} className="text-green-500" />
              ) : (
                <TrendingDown size={18} className="text-red-500" />
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              ${kpis.seededAcres > 0 ? fmtD(kpis.netMarginActual / kpis.seededAcres) : "0.00"}/ac
            </p>
          </div>
        </div>
      )}

      {/* Crop Mix + Budget vs Actual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Crop Breakdown */}
        <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
          <p className="text-sm font-semibold text-[#222527] mb-4">Crop Mix — {cropYear}</p>
          {Object.keys(cropBreakdown).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(cropBreakdown)
                .sort((a, b) => b[1].acres - a[1].acres)
                .map(([crop, data]) => {
                  const pct = kpis && kpis.seededAcres > 0 ? (data.acres / kpis.seededAcres) * 100 : 0;
                  return (
                    <div key={crop}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CROP_DOT_COLORS[crop] || "#9ca3af" }}
                          />
                          <span className="text-sm text-[#222527] font-medium">{crop}</span>
                        </div>
                        <span className="text-sm text-[#7A8A7C]">
                          {fmt(data.acres)} ac · {data.count} field{data.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CROP_DOT_COLORS[crop] || "#9ca3af",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No crops assigned yet</p>
          )}
        </div>

        {/* Budget vs Actual */}
        {kpis && (
          <div className="bg-white border border-[#E4E7E0] rounded-xl p-5">
            <p className="text-sm font-semibold text-[#222527] mb-4">Budget vs Actual</p>
            <div className="space-y-4">
              {/* Cost comparison */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#7A8A7C]">Costs</span>
                  <span className={`text-sm font-medium ${kpis.costVariance > 0 ? "text-red-500" : "text-green-600"}`}>
                    {kpis.costVariance > 0 ? "+" : ""}${fmt(kpis.costVariance)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-lg font-bold text-[#222527]">${fmt(kpis.totalBudgetCost)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Actual</p>
                    <p className="text-lg font-bold text-[#222527]">${fmt(kpis.totalActualCost)}</p>
                  </div>
                </div>
              </div>
              {/* Revenue comparison */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[#7A8A7C]">Revenue</span>
                  <span className={`text-sm font-medium ${(kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {(kpis.totalActualRevenue - kpis.totalBudgetRevenue) >= 0 ? "+" : ""}
                    ${fmt(kpis.totalActualRevenue - kpis.totalBudgetRevenue)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="text-lg font-bold text-[#222527]">${fmt(kpis.totalBudgetRevenue)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-xs text-gray-500">Actual</p>
                    <p className="text-lg font-bold text-[#222527]">${fmt(kpis.totalActualRevenue)}</p>
                  </div>
                </div>
              </div>
              {/* Margin summary bar */}
              <div className={`rounded-lg px-4 py-3 ${kpis.netMarginActual >= 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${kpis.netMarginActual >= 0 ? "text-green-700" : "text-red-700"}`}>
                    Net Margin
                  </span>
                  <span className={`text-lg font-bold ${kpis.netMarginActual >= 0 ? "text-green-700" : "text-red-700"}`}>
                    ${fmt(kpis.netMarginActual)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/fields"
          className="bg-white border border-[#E4E7E0] rounded-xl p-5 hover:border-[#4A7C59] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 flex items-center justify-center">
                <MapPin size={20} className="text-[#4A7C59]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#222527]">Fields</p>
                <p className="text-xs text-[#7A8A7C]">
                  {kpis ? `${kpis.totalFields} fields · ${fmt(kpis.totalAcres)} acres` : "Manage your fields"}
                </p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-[#4A7C59] transition-colors" />
          </div>
        </Link>
        <Link
          href="/imports"
          className="bg-white border border-[#E4E7E0] rounded-xl p-5 hover:border-[#4A7C59] transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#4A7C59]/10 flex items-center justify-center">
                <Upload size={20} className="text-[#4A7C59]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#222527]">Import Data</p>
                <p className="text-xs text-[#7A8A7C]">Upload Excel files, scale tickets, and more</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-[#4A7C59] transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}