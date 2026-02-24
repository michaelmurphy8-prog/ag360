"use client";

import { useState, useEffect } from "react";

interface HarvestRecord {
  id: string;
  crop: string;
  variety: string;
  field_name: string;
  area_harvested_ac: string;
  dry_yield_bu_per_ac: string;
  total_dry_yield_bu: string;
  moisture_pct: string;
  productivity_ac_per_hr: string;
  provider: string;
  file_name: string;
}

interface Summary {
  totalAcres: number;
  totalBushels: number;
  avgYield: number;
  avgMoisture: number;
  fieldCount: number;
  varietyCount: number;
  cropCount: number;
  topVariety: string;
  topYield: number;
}

export default function OperationsPage() {
  const [records, setRecords] = useState<HarvestRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataType, setDataType] = useState("harvest");
  const [cropYear, setCropYear] = useState("2025");
  const [sortCol, setSortCol] = useState("dry_yield_bu_per_ac");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/imports/records?type=${dataType}&year=${cropYear}`)
      .then((r) => r.json())
      .then((data) => {
        setRecords(data.records || []);
        setSummary(data.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dataType, cropYear]);

  const sorted = [...records].sort((a: any, b: any) => {
    const aVal = parseFloat(a[sortCol]) || a[sortCol] || "";
    const bVal = parseFloat(b[sortCol]) || b[sortCol] || "";
    if (sortDir === "asc") return aVal > bVal ? 1 : -1;
    return aVal < bVal ? 1 : -1;
  });

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const fmt = (n: string | number, dec = 1) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === null) return "—";
    return num.toLocaleString("en-CA", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };

  const fmtInt = (n: string | number) => {
    const num = typeof n === "string" ? parseFloat(n) : n;
    if (isNaN(num) || num === null) return "—";
    return Math.round(num).toLocaleString("en-CA");
  };

  // Get unique crops for color coding
  const cropColors: Record<string, string> = {
    "HRW Wheat": "#D97706",
    "Canola": "#F59E0B",
    "Lentils": "#059669",
    "Peas": "#10B981",
    "Durum": "#B45309",
    "Barley": "#92400E",
    "Oats": "#78716C",
    "Flax": "#6366F1",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Operations Data</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">
            Imported field operations from all equipment brands
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={cropYear}
            onChange={(e) => setCropYear(e.target.value)}
            className="bg-white border border-[#E4E7E0] rounded-lg px-3 py-1.5 text-sm text-[#222527] focus:outline-none focus:border-[#4A7C59]"
          >
            {["2026", "2025", "2024", "2023"].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <a
            href="/grain360/imports"
            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#4A7C59] text-white hover:bg-[#3D6B4A]"
          >
            + Import Data
          </a>
        </div>
      </div>

      {/* Data Type Tabs */}
      <div className="flex gap-1 mb-6 bg-[#F5F5F3] p-1 rounded-xl w-fit">
        {[
          { id: "harvest", label: "Harvest", icon: "🌾" },
          { id: "seeding", label: "Seeding", icon: "🌱" },
          { id: "application", label: "Spraying", icon: "💧" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setDataType(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              dataType === t.id
                ? "bg-white text-[#222527] shadow-sm"
                : "text-[#7A8A7C] hover:text-[#222527]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#7A8A7C]">Loading operations data...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📂</div>
          <p className="text-[#7A8A7C] mb-4">No {dataType} records for {cropYear}.</p>
          <a
            href="/grain360/imports"
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-[#4A7C59] text-white hover:bg-[#3D6B4A] inline-block"
          >
            Import Data
          </a>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          {summary && dataType === "harvest" && (
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Total Acres</div>
                <div className="text-2xl font-bold text-[#222527]">{fmtInt(summary.totalAcres)}</div>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Total Bushels</div>
                <div className="text-2xl font-bold text-[#222527]">{fmtInt(summary.totalBushels)}</div>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Avg Yield</div>
                <div className="text-2xl font-bold text-[#4A7C59]">{fmt(summary.avgYield)} bu/ac</div>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Avg Moisture</div>
                <div className="text-2xl font-bold text-[#222527]">{fmt(summary.avgMoisture)}%</div>
              </div>
              <div className="bg-white border border-[#E4E7E0] rounded-xl p-4">
                <div className="text-[10px] uppercase tracking-wider text-[#7A8A7C] mb-1">Top Variety</div>
                <div className="text-lg font-bold text-[#222527]">{summary.topVariety}</div>
                <div className="text-xs text-[#4A7C59]">{fmt(summary.topYield)} bu/ac</div>
              </div>
            </div>
          )}

          {/* Variety Performance Cards */}
          {dataType === "harvest" && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-[#222527] mb-3">Variety Performance</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(
                  records.reduce((acc: Record<string, { acres: number; bushels: number; count: number; crop: string }>, r) => {
                    const v = r.variety || "Unknown";
                    if (!acc[v]) acc[v] = { acres: 0, bushels: 0, count: 0, crop: r.crop };
                    acc[v].acres += parseFloat(r.area_harvested_ac) || 0;
                    acc[v].bushels += parseFloat(r.total_dry_yield_bu) || 0;
                    acc[v].count += 1;
                    return acc;
                  }, {})
                )
                  .sort(([, a], [, b]) => (b.acres > 0 ? b.bushels / b.acres : 0) - (a.acres > 0 ? a.bushels / a.acres : 0))
                  .map(([variety, data]) => {
                    const avgYield = data.acres > 0 ? data.bushels / data.acres : 0;
                    const color = cropColors[data.crop] || "#6B7280";
                    return (
                      <div
                        key={variety}
                        className="bg-white border border-[#E4E7E0] rounded-xl p-4 hover:border-[#4A7C59]/40 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: color }}
                          />
                          <span className="text-sm font-semibold text-[#222527]">{variety}</span>
                        </div>
                        <div className="text-2xl font-bold text-[#222527]">
                          {fmt(avgYield)} <span className="text-xs font-normal text-[#7A8A7C]">bu/ac</span>
                        </div>
                        <div className="text-xs text-[#7A8A7C] mt-1">
                          {fmtInt(data.acres)} ac across {data.count} field{data.count > 1 ? "s" : ""}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Records Table */}
          <div className="bg-white rounded-xl border border-[#E4E7E0] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F5F5F3]">
                  {dataType === "harvest" && (
                    <>
                      <Th col="field_name" label="Field" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
                      <Th col="crop" label="Crop" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
                      <Th col="variety" label="Variety" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} />
                      <Th col="area_harvested_ac" label="Acres" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} align="right" />
                      <Th col="dry_yield_bu_per_ac" label="Yield (bu/ac)" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} align="right" />
                      <Th col="total_dry_yield_bu" label="Total Bu" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} align="right" />
                      <Th col="moisture_pct" label="Moisture" sortCol={sortCol} sortDir={sortDir} onClick={handleSort} align="right" />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const yieldVal = parseFloat(r.dry_yield_bu_per_ac);
                  const avgYield = summary?.avgYield || 0;
                  const isAbove = yieldVal > avgYield;
                  const color = cropColors[r.crop] || "#6B7280";

                  return (
                    <tr
                      key={r.id || i}
                      className="border-b border-[#F5F5F3] hover:bg-[#F8FAF7] transition-colors"
                    >
                      {dataType === "harvest" && (
                        <>
                          <td className="px-4 py-3 font-medium text-[#222527]">{r.field_name}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ background: color }}
                              />
                              {r.crop}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#7A8A7C]">{r.variety || "—"}</td>
                          <td className="px-4 py-3 text-right font-mono">{fmtInt(r.area_harvested_ac)}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`font-bold font-mono ${
                                isAbove ? "text-[#4A7C59]" : "text-amber-600"
                              }`}
                            >
                              {fmt(r.dry_yield_bu_per_ac)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[#7A8A7C]">
                            {fmtInt(r.total_dry_yield_bu)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-[#7A8A7C]">
                            {fmt(r.moisture_pct)}%
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Source Footer */}
          <div className="mt-3 text-xs text-[#B0B8B0] flex items-center justify-between">
            <span>
              {records.length} records - Crop year {cropYear} -
              Source: {records[0]?.provider?.replace("_", " ") || "Import"}
            </span>
            <span>{records[0]?.file_name || ""}</span>
          </div>
        </>
      )}
    </div>
  );
}

// Sortable table header component
function Th({
  col,
  label,
  sortCol,
  sortDir,
  onClick,
  align = "left",
}: {
  col: string;
  label: string;
  sortCol: string;
  sortDir: "asc" | "desc";
  onClick: (col: string) => void;
  align?: "left" | "right";
}) {
  const active = sortCol === col;
  return (
    <th
      onClick={() => onClick(col)}
      className={`px-4 py-3 text-[10px] uppercase tracking-wider font-semibold cursor-pointer select-none border-b border-[#E4E7E0] whitespace-nowrap hover:text-[#4A7C59] transition-colors ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-[#4A7C59]" : "text-[#7A8A7C]"}`}
    >
      {label} {active ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </th>
  );
}