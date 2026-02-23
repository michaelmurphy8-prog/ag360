"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from "@clerk/nextjs";
import { Plus, Trash2, Package, TrendingUp, ArrowRightLeft, Truck, Pencil, Upload } from "lucide-react";

const CROPS = ["Canola", "CWRS Wheat", "Durum", "Barley", "Oats", "Peas", "Lentils", "Flax", "Soybeans", "Corn"];
const CONTRACT_TYPES = ["Cash Sale", "HTA (Basis Contract)", "Deferred Delivery", "Futures-First", "Target Order", "PRO/Pool"];
const MOVEMENT_TYPES = ["Delivery Out", "Bin Transfer", "Purchase In", "Inventory Adjustment", "Sale", "Return"];
const GRADES = ["#1", "#2", "#3", "Feed", "Sample", "Tough", "Damp"];

type Holding = {
  id?: number;
  crop: string;
  location: string;
  quantity_bu: number;
  grade?: string;
  moisture?: number;
  estimated_price?: number;
  notes?: string;
};

type Contract = {
  id?: number;
  crop: string;
  contract_type: string;
  quantity_bu: number;
  price_per_bu?: number;
  basis?: number;
  elevator?: string;
  delivery_date?: string;
  notes?: string;
};

type Movement = {
  id?: number;
  movement_type: string;
  crop: string;
  quantity_bu: number;
  from_location?: string;
  to_location?: string;
  price_per_bu?: number;
  notes?: string;
  movement_date: string;
};

type Driver = {
  id: string;
  driver_name: string;
  driver_id?: string;
  phone?: string;
};

type Truck = {
  id: string;
  truck_name: string;
  truck_id?: string;
  license_plate?: string;
};

type Customer = {
  id: string;
  customer_name: string;
  customer_id?: string;
  location?: string;
};

type GrainLoad = {
  id: string;
  date: string;
  driver_id?: string;
  driver_name?: string;
  truck_id?: string;
  truck_name?: string;
  customer_id?: string;
  customer_name?: string;
  contract_reference?: string;
  gross_weight_kg: number;
  dockage_percent?: number;
  dockage_kg?: number;
  net_weight_kg?: number;
  settlement_id?: string;
  notes?: string;
};

type FarmProfile = {
  inventory: {
    crop: string;
    mode: "on_hand" | "forecast";
    bushels?: number;
    acres?: number;
    aph?: number;
    targetPrice?: number;
  }[];
  primaryElevator?: string;
};

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function InventoryPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"holdings" | "contracts" | "movements" | "grain_loads">("holdings");

  // Existing state
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [newHolding, setNewHolding] = useState<Holding>({ crop: "Canola", location: "", quantity_bu: 0, grade: "#1", moisture: 0, estimated_price: 0 });
  const [newContract, setNewContract] = useState<Contract>({ crop: "Canola", contract_type: "Cash Sale", quantity_bu: 0, price_per_bu: 0, elevator: "" });
  const [newMovement, setNewMovement] = useState<Movement>({ movement_type: "Delivery Out", crop: "Canola", quantity_bu: 0, movement_date: new Date().toISOString().split("T")[0] });

  // Grain loads state
  const [grainLoads, setGrainLoads] = useState<GrainLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showAddLoad, setShowAddLoad] = useState(false);
  const [editingLoad, setEditingLoad] = useState<GrainLoad | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showManageDrivers, setShowManageDrivers] = useState(false);
  const [showManageTrucks, setShowManageTrucks] = useState(false);
  const [showManageCustomers, setShowManageCustomers] = useState(false);
  const [bulkUploadError, setBulkUploadError] = useState("");

  const [newLoad, setNewLoad] = useState({
    date: new Date().toISOString().split("T")[0],
    driver_id: "",
    truck_id: "",
    customer_id: "",
    contract_reference: "",
    gross_weight_kg: "",
    dockage_percent: "",
    settlement_id: "",
    notes: "",
  });

  const [newDriver, setNewDriver] = useState({ driver_name: "", driver_id: "", phone: "" });
  const [newTruck, setNewTruck] = useState({ truck_name: "", truck_id: "", license_plate: "", capacity_mt: "" });
  const [newCustomer, setNewCustomer] = useState({ customer_name: "", customer_id: "", location: "" });

  const headers = { "x-user-id": user?.id || "" };

  const loadAll = useCallback(async () => {
    const [h, c, m, p] = await Promise.all([
      fetch("/api/inventory/holdings", { headers }).then(r => r.json()),
      fetch("/api/inventory/contracts", { headers }).then(r => r.json()),
      fetch("/api/inventory/movements", { headers }).then(r => r.json()),
      fetch("/api/farm-profile", { headers }).then(r => r.json()),
    ]);
    setContracts(c.contracts || []);
    setMovements(m.movements || []);
    if (h.holdings && h.holdings.length > 0) {
      setHoldings(h.holdings);
    } else if (p.profile) {
      const profile: FarmProfile = p.profile;
      const seeded = profile.inventory
        .filter((i) => i.mode === "on_hand" && i.bushels && i.bushels > 0)
        .map((i) => ({
          crop: i.crop,
          location: "Main Bin",
          quantity_bu: i.bushels || 0,
          grade: "#1",
          moisture: 0,
          estimated_price: i.targetPrice || 0,
        }));
      setHoldings(seeded);
    }
  }, []);

  const loadGrainData = useCallback(async () => {
    const [loadsRes, driversRes, trucksRes, customersRes] = await Promise.all([
      fetch("/api/grain-loads").then(r => r.json()),
      fetch("/api/drivers").then(r => r.json()),
      fetch("/api/trucks").then(r => r.json()),
      fetch("/api/customers").then(r => r.json()),
    ]);
    setGrainLoads(loadsRes.loads || []);
    setDrivers(driversRes.drivers || []);
    setTrucks(trucksRes.trucks || []);
    setCustomers(customersRes.customers || []);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
    loadGrainData();
  }, [user?.id]);

  // Existing functions
  async function addHolding() {
    const res = await fetch("/api/inventory/holdings", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item: newHolding }),
    });
    const data = await res.json();
    setHoldings([...holdings, data.holding]);
    setShowAddHolding(false);
    setNewHolding({ crop: "Canola", location: "", quantity_bu: 0, grade: "#1", moisture: 0, estimated_price: 0 });
    await logMovement({ movement_type: "Inventory Adjustment", crop: newHolding.crop, quantity_bu: newHolding.quantity_bu, to_location: newHolding.location, movement_date: new Date().toISOString().split("T")[0] });
  }

  async function deleteHolding(id: number) {
    await fetch("/api/inventory/holdings", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item: { id } }),
    });
    setHoldings(holdings.filter(h => h.id !== id));
  }

  async function addContract() {
    const res = await fetch("/api/inventory/contracts", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item: newContract }),
    });
    const data = await res.json();
    setContracts([data.contract, ...contracts]);
    setShowAddContract(false);
    setNewContract({ crop: "Canola", contract_type: "Cash Sale", quantity_bu: 0, price_per_bu: 0, elevator: "" });
  }

  async function deleteContract(id: number) {
    await fetch("/api/inventory/contracts", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item: { id } }),
    });
    setContracts(contracts.filter(c => c.id !== id));
  }

  async function logMovement(item: Movement) {
    const res = await fetch("/api/inventory/movements", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ item }),
    });
    const data = await res.json();
    setMovements(prev => [data.movement, ...prev]);
  }

  async function addMovement() {
    await logMovement(newMovement);
    setShowAddMovement(false);
    setNewMovement({ movement_type: "Delivery Out", crop: "Canola", quantity_bu: 0, movement_date: new Date().toISOString().split("T")[0] });
  }

  // Grain load functions
  async function addLoad() {
    const res = await fetch("/api/grain-loads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newLoad,
        gross_weight_kg: parseFloat(newLoad.gross_weight_kg) || null,
        dockage_percent: parseFloat(newLoad.dockage_percent) || null,
      }),
    });
    const data = await res.json();
    if (data.load) {
      await loadGrainData();
      setShowAddLoad(false);
      setNewLoad({ date: new Date().toISOString().split("T")[0], driver_id: "", truck_id: "", customer_id: "", contract_reference: "", gross_weight_kg: "", dockage_percent: "", settlement_id: "", notes: "" });
    }
  }

  async function updateLoad() {
    if (!editingLoad) return;
    const res = await fetch(`/api/grain-loads/${editingLoad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingLoad.date,
        driver_id: editingLoad.driver_id || null,
        truck_id: editingLoad.truck_id || null,
        customer_id: editingLoad.customer_id || null,
        contract_reference: editingLoad.contract_reference || null,
        gross_weight_kg: editingLoad.gross_weight_kg,
        dockage_percent: editingLoad.dockage_percent || null,
        settlement_id: editingLoad.settlement_id || null,
        notes: editingLoad.notes || null,
      }),
    });
    const data = await res.json();
    if (data.load) {
      await loadGrainData();
      setEditingLoad(null);
    }
  }

  async function deleteLoad(id: string) {
    if (!confirm("Delete this load?")) return;
    await fetch(`/api/grain-loads/${id}`, { method: "DELETE" });
    await loadGrainData();
  }

  async function addDriver() {
    const res = await fetch("/api/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newDriver),
    });
    const data = await res.json();
    if (data.driver) {
      setDrivers([...drivers, data.driver]);
      setNewDriver({ driver_name: "", driver_id: "", phone: "" });
    }
  }

  async function addTruck() {
    const res = await fetch("/api/trucks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newTruck, capacity_mt: parseFloat(newTruck.capacity_mt) || null }),
    });
    const data = await res.json();
    if (data.truck) {
      setTrucks([...trucks, data.truck]);
      setNewTruck({ truck_name: "", truck_id: "", license_plate: "", capacity_mt: "" });
    }
  }

  async function addCustomer() {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });
    const data = await res.json();
    if (data.customer) {
      setCustomers([...customers, data.customer]);
      setNewCustomer({ customer_name: "", customer_id: "", location: "" });
    }
  }

  async function handleBulkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkUploadError("");

    const text = await file.text();
    const lines = text.trim().split("\n");
    const headers_row = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));

    const loads = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const row: Record<string, string> = {};
      headers_row.forEach((h, i) => { row[h] = values[i] || ""; });

      const driver = drivers.find(d => d.driver_name.toLowerCase() === (row.driver || "").toLowerCase() || d.driver_id === row.driver_id);
      const truck = trucks.find(t => t.truck_name.toLowerCase() === (row.truck || "").toLowerCase() || t.truck_id === row.truck_id);
      const customer = customers.find(c => c.customer_name.toLowerCase() === (row.customer || "").toLowerCase());

      return {
        date: row.date || new Date().toISOString().split("T")[0],
        driver_id: driver?.id || null,
        truck_id: truck?.id || null,
        customer_id: customer?.id || null,
        contract_reference: row.contract_reference || row.contract || null,
        gross_weight_kg: parseFloat(row.gross_weight_kg || row.gross_weight) || null,
        dockage_percent: parseFloat(row.dockage_percent || row.dockage) || null,
        settlement_id: row.settlement_id || null,
        notes: row.notes || null,
      };
    }).filter(l => l.gross_weight_kg);

    if (loads.length === 0) {
      setBulkUploadError("No valid loads found. Check your CSV format.");
      return;
    }

    const res = await fetch("/api/grain-loads/bulk-upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loads }),
    });
    const data = await res.json();
    if (data.inserted) {
      await loadGrainData();
      setShowBulkUpload(false);
      alert(`Successfully uploaded ${data.inserted} loads.`);
    } else {
      setBulkUploadError("Upload failed. Please try again.");
    }
  }

  function downloadTemplate() {
    const template = "date,driver,driver_id,truck,truck_id,customer,contract_reference,gross_weight_kg,dockage_percent,settlement_id,notes\n2026-02-23,John Smith,D01,Truck 1,T01,Viterra Swift Current,C-2026-001,35000,1.5,S-001,\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ag360-grain-loads-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Summary stats for grain loads
  const totalLoads = grainLoads.length;
  const totalGrossKg = grainLoads.reduce((sum, l) => sum + (parseFloat(String(l.gross_weight_kg)) || 0), 0);
  const totalNetKg = grainLoads.reduce((sum, l) => sum + (parseFloat(String(l.net_weight_kg || l.gross_weight_kg)) || 0), 0);
  const totalGrossMT = totalGrossKg / 1000;
  const totalNetMT = totalNetKg / 1000;

  const totalBu = holdings.reduce((sum, h) => sum + Number(h.quantity_bu), 0);
  const totalValue = holdings.reduce((sum, h) => sum + Number(h.quantity_bu) * Number(h.estimated_price || 0), 0);
  const totalContracted = contracts.reduce((sum, c) => sum + Number(c.quantity_bu), 0);
  const unpriced = totalBu - totalContracted;

  function exportCSV() {
    const tab = activeTab;
    let rows: string[] = [];
    if (tab === "holdings") {
      rows = ["Crop,Location,Quantity (bu),Grade,Moisture,Est. Price,Value",
        ...holdings.map(h => `${h.crop},${h.location},${h.quantity_bu},${h.grade || ""},${h.moisture || ""},$${h.estimated_price || 0},$${(Number(h.quantity_bu) * Number(h.estimated_price || 0)).toFixed(0)}`)];
    } else if (tab === "contracts") {
      rows = ["Crop,Type,Quantity (bu),Price/bu,Elevator,Delivery,Value",
        ...contracts.map(c => `${c.crop},${c.contract_type},${c.quantity_bu},$${c.price_per_bu || ""},${c.elevator || ""},${c.delivery_date || ""},$${(Number(c.quantity_bu) * Number(c.price_per_bu || 0)).toFixed(0)}`)];
    } else if (tab === "movements") {
      rows = ["Date,Type,Crop,Quantity (bu),From,To",
        ...movements.map(m => `${m.movement_date},${m.movement_type},${m.crop},${m.quantity_bu},${m.from_location || ""},${m.to_location || ""}`)];
    } else {
      rows = ["Date,Driver,Truck,Customer,Contract,Gross (kg),Dockage %,Net (kg),Settlement,Notes",
        ...grainLoads.map(l => `${l.date},${l.driver_name || ""},${l.truck_name || ""},${l.customer_name || ""},${l.contract_reference || ""},${l.gross_weight_kg || ""},${l.dockage_percent || ""},${l.net_weight_kg || ""},${l.settlement_id || ""},${l.notes || ""}`)];
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ag360-${tab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputClass = "w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white";

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Inventory</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">Holdings, contracts, movements, and grain loads</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-2 text-sm font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2.5 rounded-full hover:bg-[#DDE3D6] transition-colors">
            Export CSV
          </button>
          {activeTab === "grain_loads" ? (
            <>
              <button onClick={() => setShowBulkUpload(true)} className="flex items-center gap-2 text-sm font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2.5 rounded-full hover:bg-[#DDE3D6] transition-colors">
                <Upload size={14} /> Bulk Upload
              </button>
              <button onClick={() => setShowAddLoad(true)} className="flex items-center gap-2 bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#3d6b4a] transition-colors">
                <Plus size={14} /> Add Load
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                if (activeTab === "holdings") setShowAddHolding(true);
                if (activeTab === "contracts") setShowAddContract(true);
                if (activeTab === "movements") setShowAddMovement(true);
              }}
              className="flex items-center gap-2 bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#3d6b4a] transition-colors"
            >
              <Plus size={14} /> Add {activeTab === "holdings" ? "Holding" : activeTab === "contracts" ? "Contract" : "Movement"}
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
        {activeTab !== "grain_loads" ? (
          <>
            {[
              { label: "Total On Hand", value: `${totalBu.toLocaleString()} bu`, sub: "across all bins" },
              { label: "Estimated Value", value: fmt(totalValue), sub: "at target prices" },
              { label: "Contracted", value: `${totalContracted.toLocaleString()} bu`, sub: "committed sales" },
              { label: "Unpriced", value: `${unpriced.toLocaleString()} bu`, sub: unpriced > 0 ? "needs a home" : "fully contracted", highlight: unpriced > 0 },
            ].map((k) => (
              <div key={k.label} className={`rounded-[20px] border shadow-sm p-5 ${k.highlight ? "bg-[#FFF8EC] border-[#F5D78E]" : "bg-white border-[#E4E7E0]"}`}>
                <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.highlight ? "text-[#D97706]" : "text-[#222527]"}`}>{k.value}</p>
                <p className="text-xs text-[#7A8A7C] mt-1">{k.sub}</p>
              </div>
            ))}
          </>
        ) : (
          <>
            {[
              { label: "Total Loads", value: `${totalLoads}`, sub: "all time" },
              { label: "Gross Weight", value: `${totalGrossMT.toFixed(1)} MT`, sub: `${totalGrossKg.toLocaleString()} kg` },
              { label: "Net Weight", value: `${totalNetMT.toFixed(1)} MT`, sub: `${totalNetKg.toLocaleString()} kg` },
              { label: "Avg Dockage", value: grainLoads.filter(l => l.dockage_percent).length > 0 ? `${(grainLoads.filter(l => l.dockage_percent).reduce((s, l) => s + parseFloat(String(l.dockage_percent)), 0) / grainLoads.filter(l => l.dockage_percent).length).toFixed(2)}%` : "—", sub: "average across loads" },
            ].map((k) => (
              <div key={k.label} className="rounded-[20px] border border-[#E4E7E0] shadow-sm p-5 bg-white">
                <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{k.label}</p>
                <p className="text-2xl font-bold mt-1 text-[#222527]">{k.value}</p>
                <p className="text-xs text-[#7A8A7C] mt-1">{k.sub}</p>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm overflow-hidden">
        <div className="flex border-b border-[#E4E7E0]">
          {([
            { key: "holdings", label: "Holdings", icon: Package },
            { key: "contracts", label: "Contracts", icon: TrendingUp },
            { key: "movements", label: "Movement Log", icon: ArrowRightLeft },
            { key: "grain_loads", label: "Grain Loads", icon: Truck },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === key ? "border-[#4A7C59] text-[#4A7C59]" : "border-transparent text-[#7A8A7C] hover:text-[#222527]"}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* HOLDINGS TAB */}
        {activeTab === "holdings" && (
          <div className="p-6 space-y-4">
            {showAddHolding && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Add Holding</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crop</label>
                    <select value={newHolding.crop} onChange={e => setNewHolding({...newHolding, crop: e.target.value})} className={inputClass}>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Location / Bin</label>
                    <input type="text" placeholder="North Bin" value={newHolding.location} onChange={e => setNewHolding({...newHolding, location: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Quantity (bu)</label>
                    <input type="number" value={newHolding.quantity_bu || ""} onChange={e => setNewHolding({...newHolding, quantity_bu: Number(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Grade</label>
                    <select value={newHolding.grade} onChange={e => setNewHolding({...newHolding, grade: e.target.value})} className={inputClass}>
                      {GRADES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Moisture (%)</label>
                    <input type="number" step="0.1" value={newHolding.moisture || ""} onChange={e => setNewHolding({...newHolding, moisture: Number(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Est. Price ($/bu)</label>
                    <input type="number" step="0.01" value={newHolding.estimated_price || ""} onChange={e => setNewHolding({...newHolding, estimated_price: Number(e.target.value)})} className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addHolding} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a]">Save</button>
                  <button onClick={() => setShowAddHolding(false)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#F5F5F3]">Cancel</button>
                </div>
              </div>
            )}
            {holdings.length === 0 ? (
              <p className="text-sm text-[#7A8A7C] text-center py-8">No holdings yet — add a bin or check your Farm Profile inventory.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide border-b border-[#E4E7E0]">
                    <th className="text-left pb-3 pr-8">Crop</th>
                    <th className="text-left pb-3 pr-8">Location</th>
                    <th className="text-right pb-3 pr-8">Quantity</th>
                    <th className="text-left pb-3 pr-8">Grade</th>
                    <th className="text-right pb-3 pr-8">Moisture</th>
                    <th className="text-right pb-3 pr-8">Est. Price</th>
                    <th className="text-right pb-3">Value</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F3]">
                  {holdings.map((h, i) => (
                    <tr key={h.id || i} className="py-3">
                      <td className="py-3 pr-8 font-semibold text-[#222527]">{h.crop}</td>
                      <td className="py-3 pr-8 text-[#7A8A7C]">{h.location}</td>
                      <td className="py-3 pr-8 text-right font-semibold">{Number(h.quantity_bu).toLocaleString()} bu</td>
                      <td className="py-3 pr-8 text-[#7A8A7C]">{h.grade || "—"}</td>
                      <td className="py-3 pr-8 text-right text-[#7A8A7C]">{h.moisture ? `${h.moisture}%` : "—"}</td>
                      <td className="py-3 pr-8 text-right text-[#7A8A7C]">{h.estimated_price ? `$${h.estimated_price}/bu` : "—"}</td>
                      <td className="py-3 text-right font-semibold text-[#4A7C59]">{fmt(Number(h.quantity_bu) * Number(h.estimated_price || 0))}</td>
                      <td className="py-3 text-right">
                        {h.id && <button onClick={() => deleteHolding(h.id!)} className="text-[#D94F3D] hover:text-red-700"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === "contracts" && (
          <div className="p-6 space-y-4">
            {showAddContract && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Add Contract</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crop</label>
                    <select value={newContract.crop} onChange={e => setNewContract({...newContract, crop: e.target.value})} className={inputClass}>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Contract Type</label>
                    <select value={newContract.contract_type} onChange={e => setNewContract({...newContract, contract_type: e.target.value})} className={inputClass}>
                      {CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Quantity (bu)</label>
                    <input type="number" value={newContract.quantity_bu || ""} onChange={e => setNewContract({...newContract, quantity_bu: Number(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Price ($/bu)</label>
                    <input type="number" step="0.01" value={newContract.price_per_bu || ""} onChange={e => setNewContract({...newContract, price_per_bu: Number(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Elevator</label>
                    <input type="text" placeholder="Viterra Swift Current" value={newContract.elevator || ""} onChange={e => setNewContract({...newContract, elevator: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Delivery Date</label>
                    <input type="date" value={newContract.delivery_date || ""} onChange={e => setNewContract({...newContract, delivery_date: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addContract} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a]">Save</button>
                  <button onClick={() => setShowAddContract(false)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#F5F5F3]">Cancel</button>
                </div>
              </div>
            )}
            {holdings.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[...new Set(holdings.map(h => h.crop))].map(crop => {
                  const totalHeld = holdings.filter(h => h.crop === crop).reduce((s, h) => s + Number(h.quantity_bu), 0);
                  const totalSold = contracts.filter(c => c.crop === crop).reduce((s, c) => s + Number(c.quantity_bu), 0);
                  const pct = totalHeld > 0 ? Math.min(100, Math.round((totalSold / totalHeld) * 100)) : 0;
                  return (
                    <div key={crop} className="p-4 bg-[#F5F5F3] rounded-[16px]">
                      <p className="text-sm font-bold text-[#222527]">{crop}</p>
                      <div className="flex justify-between text-xs text-[#7A8A7C] mt-1">
                        <span>{totalSold.toLocaleString()} bu sold</span>
                        <span>{totalHeld.toLocaleString()} bu total</span>
                      </div>
                      <div className="mt-2 h-2 bg-[#E4E7E0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4A7C59] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs font-semibold text-[#4A7C59] mt-1">{pct}% contracted</p>
                    </div>
                  );
                })}
              </div>
            )}
            {contracts.length === 0 ? (
              <p className="text-sm text-[#7A8A7C] text-center py-8">No contracts yet — add your first sale.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide border-b border-[#E4E7E0]">
                    <th className="text-left pb-3 pr-8">Crop</th>
                    <th className="text-left pb-3 pr-8">Type</th>
                    <th className="text-right pb-3 pr-8">Quantity</th>
                    <th className="text-right pb-3 pr-8">Price</th>
                    <th className="text-left pb-3 pr-8">Elevator</th>
                    <th className="text-left pb-3 pr-8">Delivery</th>
                    <th className="text-right pb-3">Value</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F3]">
                  {contracts.map((c, i) => (
                    <tr key={c.id || i}>
                      <td className="py-3 pr-8 font-semibold text-[#222527]">{c.crop}</td>
                      <td className="py-3 pr-8"><span className="text-xs bg-[#EEF5F0] text-[#4A7C59] font-semibold px-2 py-1 rounded-full">{c.contract_type}</span></td>
                      <td className="py-3 pr-8 text-right">{Number(c.quantity_bu).toLocaleString()} bu</td>
                      <td className="py-3 pr-8 text-right">{c.price_per_bu ? `$${c.price_per_bu}/bu` : "—"}</td>
                      <td className="py-3 pr-8 text-[#7A8A7C]">{c.elevator || "—"}</td>
                      <td className="py-3 pr-8 text-[#7A8A7C]">{c.delivery_date || "—"}</td>
                      <td className="py-3 text-right font-semibold text-[#4A7C59]">{c.price_per_bu ? fmt(Number(c.quantity_bu) * Number(c.price_per_bu)) : "—"}</td>
                      <td className="py-3 text-right">
                        {c.id && <button onClick={() => deleteContract(c.id!)} className="text-[#D94F3D] hover:text-red-700"><Trash2 size={14} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* MOVEMENTS TAB */}
        {activeTab === "movements" && (
          <div className="p-6 space-y-4">
            {showAddMovement && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Log Movement</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Type</label>
                    <select value={newMovement.movement_type} onChange={e => setNewMovement({...newMovement, movement_type: e.target.value})} className={inputClass}>
                      {MOVEMENT_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crop</label>
                    <select value={newMovement.crop} onChange={e => setNewMovement({...newMovement, crop: e.target.value})} className={inputClass}>
                      {CROPS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Quantity (bu)</label>
                    <input type="number" value={newMovement.quantity_bu || ""} onChange={e => setNewMovement({...newMovement, quantity_bu: Number(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">From</label>
                    <select value={newMovement.from_location || ""} onChange={e => setNewMovement({...newMovement, from_location: e.target.value})} className={inputClass}>
                      <option value="">Select bin...</option>
                      {[...new Set(holdings.map(h => h.location))].map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="other">Other...</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">To</label>
                    <input type="text" placeholder="Viterra Swift Current" value={newMovement.to_location || ""} onChange={e => setNewMovement({...newMovement, to_location: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Date</label>
                    <input type="date" value={newMovement.movement_date} onChange={e => setNewMovement({...newMovement, movement_date: e.target.value})} className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addMovement} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a]">Save</button>
                  <button onClick={() => setShowAddMovement(false)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#F5F5F3]">Cancel</button>
                </div>
              </div>
            )}
            {movements.length === 0 ? (
              <p className="text-sm text-[#7A8A7C] text-center py-8">No movements logged yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide border-b border-[#E4E7E0]">
                    <th className="text-left pb-3">Date</th>
                    <th className="text-left pb-3">Type</th>
                    <th className="text-left pb-3">Crop</th>
                    <th className="text-right pb-3 pr-8">Quantity</th>
                    <th className="text-left pb-3 pr-8">From</th>
                    <th className="text-left pb-3">To</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F3]">
                  {movements.map((m, i) => (
                    <tr key={m.id || i}>
                      <td className="py-3 text-[#7A8A7C]">{m.movement_date}</td>
                      <td className="py-3"><span className="text-xs bg-[#F5F5F3] text-[#222527] font-semibold px-2 py-1 rounded-full">{m.movement_type}</span></td>
                      <td className="py-3 font-semibold text-[#222527]">{m.crop}</td>
                      <td className="py-3 text-right pr-8">{Number(m.quantity_bu).toLocaleString()} bu</td>
                      <td className="py-3 pr-8 text-[#7A8A7C]">{m.from_location || "—"}</td>
                      <td className="py-3 text-[#7A8A7C]">{m.to_location || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* GRAIN LOADS TAB */}
        {activeTab === "grain_loads" && (
          <div className="p-6 space-y-4">

            {/* Manage dropdowns bar */}
            <div className="flex items-center gap-3 pb-2 border-b border-[#E4E7E0]">
              <span className="text-xs text-[#7A8A7C] font-semibold uppercase tracking-wide">Manage:</span>
              <button onClick={() => setShowManageDrivers(!showManageDrivers)} className="text-xs bg-[#F5F5F3] text-[#222527] font-semibold px-3 py-1.5 rounded-full hover:bg-[#E4E7E0]">
                Drivers ({drivers.length})
              </button>
              <button onClick={() => setShowManageTrucks(!showManageTrucks)} className="text-xs bg-[#F5F5F3] text-[#222527] font-semibold px-3 py-1.5 rounded-full hover:bg-[#E4E7E0]">
                Trucks ({trucks.length})
              </button>
              <button onClick={() => setShowManageCustomers(!showManageCustomers)} className="text-xs bg-[#F5F5F3] text-[#222527] font-semibold px-3 py-1.5 rounded-full hover:bg-[#E4E7E0]">
                Customers ({customers.length})
              </button>
            </div>

            {/* Manage Drivers */}
            {showManageDrivers && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Drivers</p>
                {drivers.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {drivers.map(d => (
                      <div key={d.id} className="flex items-center gap-3 text-sm text-[#222527]">
                        <span className="font-medium">{d.driver_name}</span>
                        {d.driver_id && <span className="text-[#7A8A7C]">ID: {d.driver_id}</span>}
                        {d.phone && <span className="text-[#7A8A7C]">{d.phone}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Driver Name *" value={newDriver.driver_name} onChange={e => setNewDriver({...newDriver, driver_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Driver ID (e.g. D01)" value={newDriver.driver_id} onChange={e => setNewDriver({...newDriver, driver_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Phone" value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addDriver} disabled={!newDriver.driver_name} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a] disabled:opacity-50">Add Driver</button>
              </div>
            )}

            {/* Manage Trucks */}
            {showManageTrucks && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Trucks</p>
                {trucks.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {trucks.map(t => (
                      <div key={t.id} className="flex items-center gap-3 text-sm text-[#222527]">
                        <span className="font-medium">{t.truck_name}</span>
                        {t.truck_id && <span className="text-[#7A8A7C]">ID: {t.truck_id}</span>}
                        {t.license_plate && <span className="text-[#7A8A7C]">{t.license_plate}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3">
                  <input type="text" placeholder="Truck Name *" value={newTruck.truck_name} onChange={e => setNewTruck({...newTruck, truck_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Truck ID (e.g. T01)" value={newTruck.truck_id} onChange={e => setNewTruck({...newTruck, truck_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="License Plate" value={newTruck.license_plate} onChange={e => setNewTruck({...newTruck, license_plate: e.target.value})} className={inputClass} />
                  <input type="number" placeholder="Capacity (MT)" value={newTruck.capacity_mt} onChange={e => setNewTruck({...newTruck, capacity_mt: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addTruck} disabled={!newTruck.truck_name} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a] disabled:opacity-50">Add Truck</button>
              </div>
            )}

            {/* Manage Customers */}
            {showManageCustomers && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Customers</p>
                {customers.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {customers.map(c => (
                      <div key={c.id} className="flex items-center gap-3 text-sm text-[#222527]">
                        <span className="font-medium">{c.customer_name}</span>
                        {c.location && <span className="text-[#7A8A7C]">{c.location}</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Customer Name *" value={newCustomer.customer_name} onChange={e => setNewCustomer({...newCustomer, customer_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Customer ID" value={newCustomer.customer_id} onChange={e => setNewCustomer({...newCustomer, customer_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Location (e.g. Swift Current)" value={newCustomer.location} onChange={e => setNewCustomer({...newCustomer, location: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addCustomer} disabled={!newCustomer.customer_name} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a] disabled:opacity-50">Add Customer</button>
              </div>
            )}

            {/* Add Load Form */}
            {showAddLoad && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Add Grain Load</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Date *</label>
                    <input type="date" value={newLoad.date} onChange={e => setNewLoad({...newLoad, date: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Driver</label>
                    <select value={newLoad.driver_id} onChange={e => setNewLoad({...newLoad, driver_id: e.target.value})} className={inputClass}>
                      <option value="">Select driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}{d.driver_id ? ` (${d.driver_id})` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Truck</label>
                    <select value={newLoad.truck_id} onChange={e => setNewLoad({...newLoad, truck_id: e.target.value})} className={inputClass}>
                      <option value="">Select truck...</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_name}{t.license_plate ? ` — ${t.license_plate}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Customer</label>
                    <select value={newLoad.customer_id} onChange={e => setNewLoad({...newLoad, customer_id: e.target.value})} className={inputClass}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}{c.location ? ` — ${c.location}` : ""}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Contract Reference</label>
                    <input type="text" placeholder="e.g. C-2026-001" value={newLoad.contract_reference} onChange={e => setNewLoad({...newLoad, contract_reference: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Settlement ID</label>
                    <input type="text" placeholder="e.g. S-001" value={newLoad.settlement_id} onChange={e => setNewLoad({...newLoad, settlement_id: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Gross Weight (kg) *</label>
                    <input type="number" placeholder="e.g. 35000" value={newLoad.gross_weight_kg} onChange={e => setNewLoad({...newLoad, gross_weight_kg: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Dockage (%)</label>
                    <input type="number" step="0.01" placeholder="e.g. 1.5" value={newLoad.dockage_percent} onChange={e => setNewLoad({...newLoad, dockage_percent: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Net Weight (kg)</label>
                    <input
                      type="number"
                      readOnly
                      value={
                        newLoad.gross_weight_kg && newLoad.dockage_percent
                          ? (parseFloat(newLoad.gross_weight_kg) - (parseFloat(newLoad.gross_weight_kg) * parseFloat(newLoad.dockage_percent) / 100)).toFixed(0)
                          : newLoad.gross_weight_kg || ""
                      }
                      className={`${inputClass} bg-gray-50 text-[#7A8A7C]`}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Notes</label>
                  <input type="text" placeholder="Any additional notes" value={newLoad.notes} onChange={e => setNewLoad({...newLoad, notes: e.target.value})} className={inputClass} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addLoad} disabled={!newLoad.date || !newLoad.gross_weight_kg} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a] disabled:opacity-50">Save Load</button>
                  <button onClick={() => setShowAddLoad(false)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#F5F5F3]">Cancel</button>
                </div>
              </div>
            )}

            {/* Edit Load Form */}
            {editingLoad && (
              <div className="p-4 bg-[#FFF8EC] border border-[#F5D78E] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Edit Load</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Date</label>
                    <input type="date" value={editingLoad.date} onChange={e => setEditingLoad({...editingLoad, date: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Driver</label>
                    <select value={editingLoad.driver_id || ""} onChange={e => setEditingLoad({...editingLoad, driver_id: e.target.value})} className={inputClass}>
                      <option value="">Select driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Truck</label>
                    <select value={editingLoad.truck_id || ""} onChange={e => setEditingLoad({...editingLoad, truck_id: e.target.value})} className={inputClass}>
                      <option value="">Select truck...</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Customer</label>
                    <select value={editingLoad.customer_id || ""} onChange={e => setEditingLoad({...editingLoad, customer_id: e.target.value})} className={inputClass}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Gross Weight (kg)</label>
                    <input type="number" value={editingLoad.gross_weight_kg || ""} onChange={e => setEditingLoad({...editingLoad, gross_weight_kg: parseFloat(e.target.value)})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Dockage (%)</label>
                    <input type="number" step="0.01" value={editingLoad.dockage_percent || ""} onChange={e => setEditingLoad({...editingLoad, dockage_percent: parseFloat(e.target.value)})} className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={updateLoad} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a]">Save Changes</button>
                  <button onClick={() => setEditingLoad(null)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#F5F5F3]">Cancel</button>
                </div>
              </div>
            )}

            {/* Bulk Upload */}
            {showBulkUpload && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-3">
                <p className="text-sm font-bold text-[#222527]">Bulk Upload Loads</p>
                <p className="text-xs text-[#7A8A7C]">Upload a CSV file with your load data. Driver, truck, and customer names must match your pre-populated lists exactly.</p>
                <div className="flex items-center gap-3">
                  <button onClick={downloadTemplate} className="text-xs text-[#4A7C59] font-semibold underline">Download Template CSV</button>
                </div>
                <input type="file" accept=".csv" onChange={handleBulkUpload} className="text-sm text-[#222527]" />
                {bulkUploadError && <p className="text-xs text-red-500">{bulkUploadError}</p>}
                <button onClick={() => setShowBulkUpload(false)} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-[#E4E7E0]">Cancel</button>
              </div>
            )}

            {/* Loads Table */}
            {grainLoads.length === 0 ? (
              <p className="text-sm text-[#7A8A7C] text-center py-8">No loads recorded yet — add your first load or bulk upload.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide border-b border-[#E4E7E0]">
                      <th className="text-left pb-3 pr-4">Date</th>
                      <th className="text-left pb-3 pr-4">Driver</th>
                      <th className="text-left pb-3 pr-4">Truck</th>
                      <th className="text-left pb-3 pr-4">Customer</th>
                      <th className="text-left pb-3 pr-4">Contract</th>
                      <th className="text-right pb-3 pr-4">Gross (kg)</th>
                      <th className="text-right pb-3 pr-4">Dockage</th>
                      <th className="text-right pb-3 pr-4">Net (kg)</th>
                      <th className="text-left pb-3 pr-4">Settlement</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F3]">
                    {grainLoads.map(load => (
                      <tr key={load.id}>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.date?.split("T")[0]}</td>
                        <td className="py-3 pr-4 font-medium text-[#222527]">{load.driver_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.truck_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.customer_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.contract_reference || "—"}</td>
                        <td className="py-3 pr-4 text-right font-medium">{load.gross_weight_kg ? Number(load.gross_weight_kg).toLocaleString() : "—"}</td>
                        <td className="py-3 pr-4 text-right text-[#7A8A7C]">{load.dockage_percent ? `${load.dockage_percent}%` : "—"}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-[#4A7C59]">{load.net_weight_kg ? Number(load.net_weight_kg).toLocaleString() : "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.settlement_id || "—"}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingLoad(load)} className="text-gray-400 hover:text-[#4A7C59]"><Pencil size={13} /></button>
                            <button onClick={() => deleteLoad(load.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}