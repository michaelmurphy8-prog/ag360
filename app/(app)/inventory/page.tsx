"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from "@clerk/nextjs";
import { Plus, Trash2, Package, TrendingUp, ArrowRightLeft, Truck, Pencil, Upload, BookOpen, Camera } from "lucide-react";

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
  from?: string;
  gross_weight_kg: number;
  dockage_percent?: number;
  dockage_kg?: number;
  net_weight_kg?: number;
  settlement_id?: string;
  notes?: string;
  crop?: string;
  price_per_bushel?: number;
  ticket_number?: string;
  crop_year?: number;
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
  const { user, isLoaded } = useUser();
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
const KG_PER_BUSHEL: Record<string, number> = {
    "HRS Wheat": 27.22, "HRW Wheat": 27.22, "Wheat": 27.22, "Durum": 27.22,
    "Canola": 22.68, "Barley": 21.77, "Oats": 15.42,
    "Peas": 27.22, "Lentils": 27.22, "Flax": 25.40, "Soybeans": 27.22, "Corn": 25.40,
  };
const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
const [filterFrom, setFilterFrom] = useState("");
const [filterTo, setFilterTo] = useState("");

  const [newLoad, setNewLoad] = useState({
    date: new Date().toISOString().split("T")[0],
    driver_id: "",
    truck_id: "",
    customer_id: "",
    from: "",
    contract_reference: "",
    gross_weight_kg: "",
    dockage_percent: "",
    settlement_id: "",
    notes: "",
    crop: "",
    price_per_bushel: "",
    ticket_number: "",
    crop_year: "2025",
  });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showTicketUpload, setShowTicketUpload] = useState(false);
  const [ticketParsing, setTicketParsing] = useState(false);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [parsedTicket, setParsedTicket] = useState<any>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [newDriver, setNewDriver] = useState({ driver_name: "", driver_id: "", phone: "" });
  const [newTruck, setNewTruck] = useState({ truck_name: "", truck_id: "", license_plate: "", capacity_mt: "" });
  const [newCustomer, setNewCustomer] = useState({ customer_name: "", customer_id: "", location: "" });

  const headers = { "x-user-id": user?.id || "" };

  const loadAll = useCallback(async (uid?: string) => {
    const h2 = { "x-user-id": uid || user?.id || "" };
    const [h, c, m, p] = await Promise.all([
      fetch("/api/inventory/holdings", { headers: h2 }).then(r => r.json()),
      fetch("/api/inventory/contracts", { headers: h2 }).then(r => r.json()),
      fetch("/api/inventory/movements", { headers: h2 }).then(r => r.json()),
      fetch("/api/farm-profile", { headers: h2 }).then(r => r.json()),
    ]);
    setContracts(c.contracts || []);
    setMovements(m.movements || []);
    if (h.holdings && h.holdings.length > 0) {
      setHoldings(h.holdings);
    } else if (p.profile && (!h.holdings || h.holdings.length === 0)) {
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
      if (seeded.length > 0) setHoldings(seeded);
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
    if (!isLoaded) return;
    if (!user?.id) return;
    loadAll(user.id);
    loadGrainData();
  }, [isLoaded, user?.id]);

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
        from: newLoad.from || null,
        crop: newLoad.crop || null,
        price_per_bushel: newLoad.price_per_bushel ? parseFloat(newLoad.price_per_bushel) : null,
        ticket_number: newLoad.ticket_number || null,
        crop_year: parseInt(newLoad.crop_year) || 2025,
      }),
    });
    const data = await res.json();
    if (data.load) {
      await loadGrainData();
      setShowAddLoad(false);
      setNewLoad({ date: new Date().toISOString().split("T")[0], driver_id: "", truck_id: "", customer_id: "", from: "", contract_reference: "", gross_weight_kg: "", dockage_percent: "", settlement_id: "", notes: "", crop: "", price_per_bushel: "", ticket_number: "", crop_year: "2025" });
    }
  }
  async function parseScaleTicket(file: File) {
    setTicketParsing(true);
    setTicketError(null);
    setParsedTicket(null);

    // Compress image if over 4MB using canvas
    async function compressImage(f: File): Promise<{ base64: string; mimeType: string }> {
      if (f.size <= 4 * 1024 * 1024) {
        const buffer = await f.arrayBuffer();
        const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
        return { base64, mimeType: f.type };
      }
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxDim = 2048;
          let w = img.width, h = img.height;
          if (w > maxDim || h > maxDim) {
            const ratio = Math.min(maxDim / w, maxDim / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const base64 = dataUrl.split(",")[1];
          resolve({ base64, mimeType: "image/jpeg" });
        };
        img.src = URL.createObjectURL(f);
      });
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setTicketPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Compress and convert to base64
    const { base64, mimeType } = await compressImage(file);

    try {
      const res = await fetch("/api/grain-loads/parse-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = await res.json();
      if (data.success) {
        setParsedTicket(data.data);
      } else {
        setTicketError(data.error || "Failed to parse ticket");
      }
    } catch {
      setTicketError("Network error — try again");
    } finally {
      setTicketParsing(false);
    }
  }

  function applyTicketToForm() {
    if (!parsedTicket) return;
    const netKg = parsedTicket.net_weight_kg || 0;
    const crop = parsedTicket.crop || "";
    const ticketBushels = parsedTicket.net_bushels;
    const calcBushels = netKg && crop ? Math.round(netKg / (KG_PER_BUSHEL[crop] || 27.22)) : null;
    const bushels = ticketBushels || calcBushels;
    setNewLoad({
      ...newLoad,
      date: parsedTicket.date || newLoad.date,
      gross_weight_kg: parsedTicket.gross_weight_kg?.toString() || "",
      dockage_percent: parsedTicket.dockage_percent?.toString() || "",
      contract_reference: parsedTicket.contract_reference || "",
      settlement_id: parsedTicket.delivery_number || "",
      ticket_number: parsedTicket.ticket_number || "",
      crop,
      price_per_bushel: "",
      crop_year: parsedTicket.date ? parsedTicket.date.split("-")[0] : "2025",
      notes: `Parsed from scale ticket. Grade: ${parsedTicket.grade || "N/A"}. ${bushels ? `${bushels.toLocaleString()} bu` : ""}. Moisture: ${parsedTicket.moisture_percent || "N/A"}%. ${parsedTicket.remarks || ""}`.trim(),
    });
    setShowTicketUpload(false);
    setShowAddLoad(true);
    setParsedTicket(null);
    setTicketPreview(null);
  }
  async function syncToLedger() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/finance/auto-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_grain_loads", cropYear: 2025 }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({ message: `✅ ${data.posted} posted, ${data.skipped} already synced${data.errors?.length > 0 ? `, ${data.errors.length} errors` : ""}`, type: "success" });
      } else {
        setSyncResult({ message: data.error || "Sync failed", type: "error" });
      }
    } catch {
      setSyncResult({ message: "Network error — try again", type: "error" });
    } finally {
      setSyncing(false);
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

  // Weight conversion
  const toDisplay = (kg: number) => weightUnit === "lb" ? kg * 2.20462 : kg;
  const unitLabel = weightUnit === "kg" ? "kg" : "lb";

  // Date filtered loads
  const filteredLoads = grainLoads.filter(l => {
    const d = l.date?.split("T")[0];
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  });

  // Summary stats for grain loads
  const totalLoads = grainLoads.length;
  const totalGrossKg = grainLoads.reduce((sum, l) => sum + (parseFloat(String(l.gross_weight_kg)) || 0), 0);
  const totalNetKg = grainLoads.reduce((sum, l) => sum + (parseFloat(String(l.net_weight_kg || l.gross_weight_kg)) || 0), 0);
  const totalGrossMT = totalGrossKg / 1000;
  const totalNetMT = totalNetKg / 1000;
  const filteredGrossKg = filteredLoads.reduce((sum, l) => sum + (parseFloat(String(l.gross_weight_kg)) || 0), 0);
  const filteredNetKg = filteredLoads.reduce((sum, l) => sum + (parseFloat(String(l.net_weight_kg || l.gross_weight_kg)) || 0), 0);

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
              <button onClick={() => setShowTicketUpload(true)} className="flex items-center gap-2 text-sm font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2.5 rounded-full hover:bg-[#DDE3D6] transition-colors">
                <Camera size={14} /> Scan Ticket
              </button>
              <button onClick={syncToLedger} disabled={syncing} className="flex items-center gap-2 text-sm font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2.5 rounded-full hover:bg-[#DDE3D6] transition-colors disabled:opacity-50">
                <BookOpen size={14} /> {syncing ? "Syncing..." : "Sync to Ledger"}
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
{/* Controls bar — unit toggle + date filter */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Unit:</span>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button onClick={() => setWeightUnit("kg")} className={`px-3 py-1 text-xs font-semibold transition-colors ${weightUnit === "kg" ? "bg-[#4A7C59] text-white" : "bg-white text-gray-600"}`}>KG</button>
                  <button onClick={() => setWeightUnit("lb")} className={`px-3 py-1 text-xs font-semibold transition-colors ${weightUnit === "lb" ? "bg-[#4A7C59] text-white" : "bg-white text-gray-600"}`}>LB</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">From:</span>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="text-sm border border-[#E4E7E0] rounded-lg px-3 py-1 focus:outline-none focus:border-[#4A7C59]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">To:</span>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="text-sm border border-[#E4E7E0] rounded-lg px-3 py-1 focus:outline-none focus:border-[#4A7C59]" />
              </div>
              {(filterFrom || filterTo) && (
                <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} className="text-xs text-red-500 font-semibold hover:underline">Clear Filter</button>
              )}
            </div>

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
            {/* Scale Ticket Upload */}
            {showTicketUpload && (
              <div className="p-4 bg-[#F5F5F3] rounded-[16px] space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-[#222527]">Scan Scale Ticket</p>
                  <button onClick={() => { setShowTicketUpload(false); setParsedTicket(null); setTicketPreview(null); setTicketError(null); }} className="text-sm text-[#7A8A7C] hover:text-[#222527]">✕</button>
                </div>
                {!parsedTicket && (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#C8DDD0] rounded-[12px] cursor-pointer hover:bg-[#EEF5F0] transition-colors">
                      <Camera size={24} className="text-[#7A8A7C] mb-2" />
                      <span className="text-sm text-[#7A8A7C]">{ticketParsing ? "Parsing ticket..." : "Take photo or upload scale ticket"}</span>
                      <span className="text-xs text-[#7A8A7C] mt-1">JPG, PNG, or PDF</span>
                      <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" disabled={ticketParsing} onChange={(e) => { const file = e.target.files?.[0]; if (file) parseScaleTicket(file); }} />
                    </label>
                    {ticketError && <p className="text-sm text-red-500 mt-2">{ticketError}</p>}
                  </div>
                )}
                {parsedTicket && (
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      {ticketPreview && <img src={ticketPreview} alt="Scale ticket" className="w-48 h-auto rounded-[8px] border border-[#E4E7E0]" />}
                      <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                        {(() => {
                          const uf = parsedTicket.uncertain_fields || [];
                          const f = (field: string, label: string, value: any, suffix?: string) => (
                            <div className={uf.includes(field) ? "bg-[#FFF8EC] border border-[#F5D78E] rounded px-1.5 py-0.5" : ""}>
                              <span className="text-[#7A8A7C]">{label}:</span>{" "}
                              <strong className={uf.includes(field) ? "text-[#D97706]" : ""}>{value}{suffix || ""}</strong>
                              {uf.includes(field) && <span className="text-[10px] text-[#D97706] ml-1">⚠ verify</span>}
                            </div>
                          );
                          return (<>
                            {f("date", "Date", parsedTicket.date)}
                            {f("receipt_number", "Receipt #", parsedTicket.receipt_number)}
                            <div><span className="text-[#7A8A7C]">Elevator:</span> <strong>{parsedTicket.elevator_name} — {parsedTicket.station_name}</strong></div>
                            {f("shipper_name", "Shipper", parsedTicket.shipper_name)}
                            {f("crop", "Crop", parsedTicket.crop)}
                            {f("grade", "Grade", parsedTicket.grade)}
                            {f("gross_weight_kg", "Gross", parsedTicket.gross_weight_kg?.toLocaleString(), " kg")}
                            {f("dockage_percent", "Dockage", parsedTicket.dockage_percent, "%")}
                            {f("net_weight_kg", "Net", parsedTicket.net_weight_kg?.toLocaleString(), " kg")}
                            {f("net_bushels", "Bushels", parsedTicket.net_bushels ? parsedTicket.net_bushels.toLocaleString() : parsedTicket.net_weight_kg && parsedTicket.crop ? `${Math.round(parsedTicket.net_weight_kg / (KG_PER_BUSHEL[parsedTicket.crop] || 27.22)).toLocaleString()} (calc)` : "—")}
                            {f("moisture_percent", "Moisture", parsedTicket.moisture_percent ? `${parsedTicket.moisture_percent}%` : "—")}
                            <div><span className="text-[#7A8A7C]">Protein:</span> <strong>{parsedTicket.protein_percent ? `${parsedTicket.protein_percent}%` : "—"}</strong></div>
                            <div className="col-span-2"><span className="text-[#7A8A7C]">Confidence:</span> <strong className={parsedTicket.confidence === "high" ? "text-[#4A7C59]" : "text-[#D97706]"}>{parsedTicket.confidence}</strong>
                              {uf.length > 0 && <span className="text-xs text-[#D97706] ml-2">({uf.length} field{uf.length > 1 ? "s" : ""} need review)</span>}
                            </div>
                          </>);
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyTicketToForm} className="bg-[#4A7C59] text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-[#3d6b4a]">Use This Data → Add Load</button>
                      <button onClick={() => { setParsedTicket(null); setTicketPreview(null); }} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-white">Retry</button>
                      <button onClick={() => { setShowTicketUpload(false); setParsedTicket(null); setTicketPreview(null); }} className="text-sm text-[#7A8A7C] px-5 py-2 rounded-full hover:bg-white">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {syncResult && (
              <div className={`p-3 rounded-[12px] text-sm font-medium ${syncResult.type === "success" ? "bg-[#EEF5F0] text-[#4A7C59]" : "bg-red-50 text-red-600"}`}>
                {syncResult.message}
              </div>
            )}
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
                  <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">From (Bin / Storage)</label>
                  <select value={newLoad.from} onChange={e => setNewLoad({...newLoad, from: e.target.value})} className={inputClass}>
                    <option value="">Select bin...</option>
                    {[...new Set(holdings.map(h => h.location))].map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
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
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crop *</label>
                    <select value={newLoad.crop} onChange={e => setNewLoad({...newLoad, crop: e.target.value})} className={inputClass}>
                      <option value="">Select crop...</option>
                      <option value="Canola">Canola</option>
                      <option value="HRS Wheat">HRS Wheat</option>
                      <option value="HRW Wheat">HRW Wheat</option>
                      <option value="Durum">Durum</option>
                      <option value="Barley">Barley</option>
                      <option value="Oats">Oats</option>
                      <option value="Peas">Peas</option>
                      <option value="Lentils">Lentils</option>
                      <option value="Flax">Flax</option>
                      <option value="Soybeans">Soybeans</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Price ($/bu)</label>
                    <input type="number" step="0.01" placeholder="e.g. 14.50" value={newLoad.price_per_bushel} onChange={e => setNewLoad({...newLoad, price_per_bushel: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Ticket #</label>
                    <input type="text" placeholder="e.g. 84521" value={newLoad.ticket_number} onChange={e => setNewLoad({...newLoad, ticket_number: e.target.value})} className={inputClass} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Crop Year</label>
                    <select value={newLoad.crop_year} onChange={e => setNewLoad({...newLoad, crop_year: e.target.value})} className={inputClass}>
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
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
                      <th className="text-left pb-3 pr-4">From</th>
                      <th className="text-left pb-3 pr-4">Crop</th>
                      <th className="text-right pb-3 pr-4">$/bu</th>
                      <th className="text-right pb-3 pr-4">Gross ({unitLabel})</th>
                      <th className="text-right pb-3 pr-4">Dockage</th>
                      <th className="text-right pb-3 pr-4">Net ({unitLabel})</th>
                      <th className="text-left pb-3 pr-4">Settlement</th>
                      <th className="pb-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F3]">
                    {filteredLoads.map(load => (
                      <tr key={load.id}>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.date?.split("T")[0]}</td>
                        <td className="py-3 pr-4 font-medium text-[#222527]">{load.driver_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.truck_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.customer_name || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.contract_reference || "—"}</td>
                        <td className="py-3 pr-4 text-[#7A8A7C]">{load.from || "—"}</td>
                        <td className="py-3 pr-4 font-medium text-[#222527]">{load.crop || "—"}</td>
                        <td className="py-3 pr-4 text-right text-[#7A8A7C]">{load.price_per_bushel ? `$${Number(load.price_per_bushel).toFixed(2)}` : "—"}</td>
                        <td className="py-3 pr-4 text-right font-medium">{load.gross_weight_kg ? toDisplay(Number(load.gross_weight_kg)).toLocaleString("en-CA", { maximumFractionDigits: 0 }) : "—"}</td>
                        <td className="py-3 pr-4 text-right text-[#7A8A7C]">{load.dockage_percent ? `${load.dockage_percent}%` : "—"}</td>
                        <td className="py-3 pr-4 text-right font-semibold text-[#4A7C59]">{load.net_weight_kg ? toDisplay(Number(load.net_weight_kg)).toLocaleString("en-CA", { maximumFractionDigits: 0 }) : "—"}</td>
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
                {/* Summary ribbon */}
                <div className="mt-3 flex items-center justify-end gap-8 bg-[#F5F5F3] rounded-xl px-4 py-3 text-sm">
                  {(filterFrom || filterTo) && (
                    <span className="text-xs text-[#7A8A7C] mr-auto">
                      Showing {filteredLoads.length} of {grainLoads.length} loads
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[#7A8A7C] font-medium">Total Gross:</span>
                    <span className="font-bold text-[#222527]">
                      {toDisplay(filteredGrossKg).toLocaleString("en-CA", { maximumFractionDigits: 0 })} {unitLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#7A8A7C] font-medium">Total Net:</span>
                    <span className="font-bold text-[#4A7C59]">
                      {toDisplay(filteredNetKg).toLocaleString("en-CA", { maximumFractionDigits: 0 })} {unitLabel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}