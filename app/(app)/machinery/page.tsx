import { Tractor, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";

const assets = [
  { name: "John Deere 8R 410", type: "Tractor", year: 2021, hours: 1842, value: "$285,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "2,000 hrs" },
  { name: "Case IH CR9090", type: "Combine", year: 2019, hours: 3210, value: "$420,000", status: "WATCH", statusColor: "bg-[#FFF8EC] text-[#E8A838]", nextService: "Overdue" },
  { name: "John Deere S780", type: "Header", year: 2020, hours: 980, value: "$95,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "1,200 hrs" },
  { name: "Peterbilt 389", type: "Truck", year: 2018, hours: 124000, value: "$68,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "130,000 km" },
  { name: "John Deere 618C", type: "Sprayer", year: 2022, hours: 620, value: "$89,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "800 hrs" },
  { name: "Bourgault 3320", type: "Seeder", year: 2020, hours: 410, value: "$185,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "500 hrs" },
  { name: "Westfield MK130", type: "Auger", year: 2019, hours: 0, value: "$18,000", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", nextService: "Annual" },
  { name: "Ford F-350", type: "Truck", year: 2021, hours: 48000, value: "$52,000", status: "DOWN", statusColor: "bg-[#FDEEED] text-[#D94F3D]", nextService: "In Shop" },
];

const kpis = [
  { label: "Total Fleet Value", value: "$1.21M", unit: "CAD" },
  { label: "Total Assets", value: "8", unit: "units" },
  { label: "Active", value: "6", unit: "units" },
  { label: "Needs Attention", value: "1", unit: "watch" },
  { label: "Down / In Shop", value: "1", unit: "units" },
];

export default function MachineryPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#222527]">Machinery</h1>
        <p className="text-[#7A8A7C] text-sm mt-1">Murphy Farms · 8 assets tracked</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#222527] mt-1">{kpi.value}</p>
            <p className="text-xs text-[#7A8A7C] mt-1">{kpi.unit}</p>
          </div>
        ))}
      </div>

      {/* Asset List */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E4E7E0] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#222527]">Fleet Assets</h2>
          <button className="text-xs font-semibold text-white bg-[#4A7C59] px-4 py-2 rounded-full hover:bg-[#3d6b4a] transition-colors">
            + Add Asset
          </button>
        </div>
        <div className="divide-y divide-[#E4E7E0]">
          {assets.map((asset) => (
            <div key={asset.name} className="px-6 py-4 flex items-center justify-between hover:bg-[#F5F5F3] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-[10px] bg-[#DDE3D6] flex items-center justify-center">
                  <Tractor size={16} className="text-[#4A7C59]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#222527]">{asset.name}</p>
                  <p className="text-xs text-[#7A8A7C]">{asset.type} · {asset.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-xs text-[#7A8A7C]">Hours / KM</p>
                  <p className="text-sm font-semibold text-[#222527]">{asset.hours.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7A8A7C]">Est. Value</p>
                  <p className="text-sm font-semibold text-[#222527]">{asset.value}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#7A8A7C]">Next Service</p>
                  <p className="text-sm font-semibold text-[#222527]">{asset.nextService}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${asset.statusColor}`}>
                  {asset.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}