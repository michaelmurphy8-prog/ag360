'use client';

import { useState, useEffect, useCallback } from "react";
import { Tractor } from "lucide-react";
import BulkUploadModal from "@/components/machinery/BulkUploadModal";
import FleetFilters from "@/components/machinery/FleetFilters";

interface Asset {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  serialNumber: string | null;
  currentValue: number | null;
  purchasePrice: number | null;
  assetType: string | null;
  assetClass: string | null;
  status: string;
  hoursTotal: number | null;
  nextService: string | null;
  notes: string | null;
}

function statusStyle(status: string) {
  if (status === 'ACTIVE')  return 'bg-[#EEF5F0] text-[#4A7C59]';
  if (status === 'WATCH')   return 'bg-[#FFF8EC] text-[#E8A838]';
  if (status === 'DOWN')    return 'bg-[#FDEEED] text-[#D94F3D]';
  if (status === 'SOLD')    return 'bg-[#F0F0F0] text-[#888]';
  if (status === 'RETIRED') return 'bg-[#F0F0F0] text-[#888]';
  return 'bg-[#EEF5F0] text-[#4A7C59]';
}

export default function MachineryPage() {
  const [assets, setAssets]             = useState<Asset[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [search, setSearch]             = useState('');
  const [filterMake, setFilterMake]     = useState('');
  const [filterClass, setFilterClass]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/machinery/assets');
      const data = await res.json();
      if (data.success) setAssets(data.assets);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const makes   = [...new Set(assets.map(a => a.make).filter(Boolean))].sort() as string[];
  const classes = [...new Set(assets.map(a => a.assetClass).filter(Boolean))].sort() as string[];

  const filtered = assets.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      a.make?.toLowerCase().includes(q) ||
      a.model?.toLowerCase().includes(q) ||
      a.serialNumber?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q);
    const matchMake   = !filterMake   || a.make === filterMake;
    const matchClass  = !filterClass  || a.assetClass === filterClass;
    const matchStatus = !filterStatus || a.status === filterStatus;
    return matchSearch && matchMake && matchClass && matchStatus;
  });

  const totalValue = assets.reduce((sum, a) => sum + (a.currentValue || 0), 0);
  const active     = assets.filter(a => a.status === 'ACTIVE').length;
  const watch      = assets.filter(a => a.status === 'WATCH').length;
  const down       = assets.filter(a => a.status === 'DOWN').length;

  const kpis = [
    { label: "Total Fleet Value", value: `$${(totalValue / 1000).toFixed(0)}K`, unit: "CAD" },
    { label: "Total Assets",      value: String(assets.length),                  unit: "units" },
    { label: "Active",            value: String(active),                          unit: "units" },
    { label: "Needs Attention",   value: String(watch),                           unit: "watch" },
    { label: "Down / In Shop",    value: String(down),                            unit: "units" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#222527]">Machinery</h1>
        <p className="text-[#7A8A7C] text-sm mt-1">Murphy Farms · {assets.length} assets tracked</p>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#222527] mt-1">{kpi.value}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">{kpi.unit}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E7E0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#222527]">Fleet Assets</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkUpload(true)}
              className="text-xs font-semibold text-[#4A7C59] border border-[#4A7C59] px-4 py-2 rounded-full hover:bg-[#EEF5F0] transition-colors"
            >
              ↑ Bulk Upload
            </button>
            <button className="text-xs font-semibold text-white bg-[#4A7C59] px-4 py-2 rounded-full hover:bg-[#3d6b4a] transition-colors">
              + Add Asset
            </button>
          </div>
        </div>

        <div className="px-6 pt-4">
          <FleetFilters
            search={search}             onSearchChange={setSearch}
            filterMake={filterMake}     onMakeChange={setFilterMake}
            filterClass={filterClass}   onClassChange={setFilterClass}
            filterStatus={filterStatus} onStatusChange={setFilterStatus}
            makes={makes}
            classes={classes}
          />
        </div>

        <div className="divide-y divide-[#E4E7E0]">
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-[#7A8A7C]">
              Loading fleet...
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-[#7A8A7C]">
              {assets.length === 0
                ? 'No assets yet — add one or use bulk upload.'
                : 'No assets match your current filters.'}
            </div>
          ) : (
            filtered.map((asset) => (
              <div key={asset.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F5F5F3] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-[10px] bg-[#DDE3D6] flex items-center justify-center">
                    <Tractor size={16} className="text-[#4A7C59]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#222527]">{asset.name}</p>
                    <p className="text-xs text-[#7A8A7C] capitalize">
                      {asset.assetClass || asset.model} · {asset.year}
                      {asset.serialNumber ? ` · #${asset.serialNumber}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs text-[#7A8A7C]">Hours / KM</p>
                    <p className="text-sm font-semibold text-[#222527]">
                      {asset.hoursTotal ? asset.hoursTotal.toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7A8A7C]">Est. Value</p>
                    <p className="text-sm font-semibold text-[#222527]">
                      {asset.currentValue ? `$${asset.currentValue.toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#7A8A7C]">Next Service</p>
                    <p className="text-sm font-semibold text-[#222527]">
                      {asset.nextService || '—'}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusStyle(asset.status)}`}>
                    {asset.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showBulkUpload && (
        <BulkUploadModal
          onClose={() => setShowBulkUpload(false)}
          onSuccess={() => { fetchAssets(); setShowBulkUpload(false); }}
        />
      )}
    </div>
  );
}