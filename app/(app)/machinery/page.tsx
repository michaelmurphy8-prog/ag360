"use client";

import { useState, useEffect, useCallback } from "react";
import { Tractor, Upload, Plus, Wrench } from "lucide-react";
import BulkUploadModal from "@/components/machinery/BulkUploadModal";
import AddAssetModal from "@/components/machinery/AddAssetModal";
import FleetFilters from "@/components/machinery/FleetFilters";
import ServiceTab from "@/components/machinery/ServiceTab";

interface Asset {
  id: string; name: string; make: string; model: string; year: number;
  serialNumber: string | null; currentValue: number | null; purchasePrice: number | null;
  assetType: string | null; assetClass: string | null; status: string;
  hoursTotal: number | null; kmTotal: number | null; nextService: string | null; notes: string | null;
}

function statusStyle(status: string) {
  if (status === "ACTIVE") return "bg-[#34D399]/[0.08] text-[#34D399]";
  if (status === "WATCH") return "bg-[#F59E0B]/[0.08] text-[#F59E0B]";
  if (status === "DOWN") return "bg-[#EF4444]/[0.08] text-[#EF4444]";
  if (status === "SOLD") return "bg-white/[0.04] text-[#64748B]";
  if (status === "RETIRED") return "bg-white/[0.04] text-[#64748B]";
  return "bg-[#34D399]/[0.08] text-[#34D399]";
}

export default function MachineryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMake, setFilterMake] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"fleet" | "service">("fleet");

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/machinery/assets");
      const data = await res.json();
      if (data.success) setAssets(data.assets);
    } catch (err) { console.error("Failed to fetch assets:", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const makes = [...new Set(assets.map(a => a.make).filter(Boolean))].sort() as string[];
  const classes = [...new Set(assets.map(a => a.assetClass).filter(Boolean))].sort() as string[];

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search || a.make?.toLowerCase().includes(q) || a.model?.toLowerCase().includes(q) || a.serialNumber?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q);
    const matchMake = !filterMake || a.make === filterMake;
    const matchClass = !filterClass || a.assetClass === filterClass;
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchMake && matchClass && matchStatus;
  });

  const totalValue = assets.reduce((sum, a) => sum + (Number(a.currentValue) || 0), 0);
  const active = assets.filter(a => a.status === "ACTIVE").length;
  const watch = assets.filter(a => a.status === "WATCH").length;
  const down = assets.filter(a => a.status === "DOWN").length;

  const kpis = [
    { label: "Total Fleet Value", value: totalValue >= 1000000 ? `$${(totalValue / 1000000).toFixed(2)}M` : `$${(totalValue / 1000).toFixed(0)}K`, unit: "CAD" },
    { label: "Total Assets", value: String(assets.length), unit: "units" },
    { label: "Active", value: String(active), unit: "units" },
    { label: "Needs Attention", value: String(watch), unit: "watch" },
    { label: "Down / In Shop", value: String(down), unit: "units" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold text-[#F1F5F9] tracking-tight">Machinery</h1>
        <p className="text-[13px] text-[#64748B] mt-1">Murphy Farms · {assets.length} assets tracked</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-[#111827] rounded-xl border border-white/[0.06] p-5">
            <p className="font-mono text-[11px] font-bold text-[#F1F5F9] uppercase tracking-[1.5px]">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#F1F5F9] mt-1">{kpi.value}</p>
            <p className="text-xs text-[#64748B] mt-1">{kpi.unit}</p>
          </div>
        ))}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[#111827] rounded-xl border border-white/[0.06] p-1.5 w-fit">
        <button onClick={() => setActiveTab("fleet")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "fleet" ? "bg-white/[0.06] text-[#F1F5F9]" : "text-[#64748B] hover:text-[#94A3B8]"
          }`}>
          <Tractor size={15} /> Fleet Assets
        </button>
        <button onClick={() => setActiveTab("service")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === "service" ? "bg-white/[0.06] text-[#F1F5F9]" : "text-[#64748B] hover:text-[#94A3B8]"
          }`}>
          <Wrench size={15} /> Service & Maintenance
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "fleet" ? (
        <div className="bg-[#111827] rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
            <h2 className="font-mono text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[2px]">Fleet Assets</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBulkUpload(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#34D399] border border-[#34D399]/30 px-4 py-2 rounded-full hover:bg-[#34D399]/[0.06] transition-colors">
                <Upload size={12} /> Bulk Upload
              </button>
              <button onClick={() => setShowAddAsset(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#080C15] bg-[#34D399] px-4 py-2 rounded-full hover:bg-[#6EE7B7] transition-colors">
                <Plus size={12} /> Add Asset
              </button>
            </div>
          </div>

          <div className="px-6 pt-4">
            <FleetFilters
              search={search} onSearchChange={setSearch}
              filterMake={filterMake} onMakeChange={setFilterMake}
              filterClass={filterClass} onClassChange={setFilterClass}
              filterStatus={filterStatus} onStatusChange={setFilterStatus}
              makes={makes} classes={classes}
            />
          </div>

          <div className="divide-y divide-white/[0.04]">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-[#64748B]">Loading fleet...</div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-[#64748B]">
                {assets.length === 0 ? "No assets yet — add one or use bulk upload." : "No assets match your current filters."}
              </div>
            ) : filtered.map(asset => (
              <div key={asset.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-[10px] bg-[#34D399]/[0.08] border border-[#34D399]/[0.15] flex items-center justify-center">
                    <Tractor size={16} className="text-[#34D399]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{asset.name}</p>
                    <p className="text-xs text-[#64748B] capitalize">
                      {asset.assetClass || asset.model} · {asset.year}
                      {asset.serialNumber ? ` · #${asset.serialNumber}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Hours</p>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{asset.hoursTotal ? asset.hoursTotal.toLocaleString() : "—"}</p>
                  </div>
                  {asset.kmTotal && (
                    <div className="text-right">
                      <p className="text-xs text-[#64748B]">KM</p>
                      <p className="text-sm font-semibold text-[#F1F5F9]">{asset.kmTotal.toLocaleString()}</p>
                    </div>
                  )}
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Est. Value</p>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{asset.currentValue ? `$${Math.round(Number(asset.currentValue)).toLocaleString()}` : "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">Next Service</p>
                    <p className="text-sm font-semibold text-[#F1F5F9]">{asset.nextService ? (isNaN(Number(asset.nextService)) ? asset.nextService : `${Number(asset.nextService).toLocaleString()} hrs`) : "—"}</p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle(asset.status)}`}>{asset.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ServiceTab assets={assets} />
      )}

      {/* Modals */}
      {showAddAsset && <AddAssetModal onClose={() => setShowAddAsset(false)} onSuccess={() => { fetchAssets(); setShowAddAsset(false); }} />}
      {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} onSuccess={() => { fetchAssets(); setShowBulkUpload(false); }} />}
    </div>
  );
}