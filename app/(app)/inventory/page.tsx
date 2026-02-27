"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from "@clerk/nextjs";
import {
  Plus, Trash2, Package, TrendingUp, ArrowRightLeft, Truck, Pencil, Upload, MapPin,
  BookOpen, Camera, FileText, AlertTriangle, ChevronLeft, ChevronDown, ChevronUp,
  X, Loader2, CheckCircle, DollarSign, BarChart3, Scale, Wheat, Users, Settings2,
  Download, Filter, RotateCcw, ShieldCheck, XCircle, Eye,
} from "lucide-react";
import BinMap from "@/components/BinMap";

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

type TruckType = {
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

// ─── Shared Styles ────────────────────────────────────────────────────────────

const inputClass = "w-full text-sm border border-white/[0.10] rounded-lg px-3 py-2 bg-white/[0.04] text-[#F1F5F9] placeholder:text-[#475569] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const selectClass = "w-full text-sm border border-white/[0.10] rounded-lg px-3 py-2 bg-[#111827] text-[#F1F5F9] focus:outline-none focus:border-[#34D399]/50 transition-colors";
const labelClass = "text-[10px] text-[#64748B] font-semibold block mb-1 uppercase tracking-[1px]";
const btnPrimary = "flex items-center gap-1.5 bg-[#34D399] text-[#080C15] text-xs font-semibold px-5 py-2 rounded-full hover:bg-[#6EE7B7] transition-colors disabled:opacity-40";
const btnSecondary = "flex items-center gap-1.5 text-xs font-semibold text-[#34D399] bg-[#34D399]/[0.08] border border-[#34D399]/15 px-4 py-2 rounded-full hover:bg-[#34D399]/[0.14] transition-colors";
const btnGhost = "text-xs text-[#64748B] px-4 py-2 rounded-full hover:bg-white/[0.04] transition-colors";

function fmt(n: number) {
  return `$${Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, highlight, accent }: {
  label: string; value: string; sub: string;
  icon: React.ElementType; highlight?: boolean; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      highlight
        ? "bg-[#F59E0B]/[0.04] border-[#F59E0B]/15"
        : "bg-[#111827] border-white/[0.06]"
    }`}>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px]">{label}</p>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          highlight ? "bg-[#F59E0B]/[0.10]" : accent ? "bg-[#34D399]/[0.10]" : "bg-white/[0.04]"
        }`}>
          <Icon size={14} className={highlight ? "text-[#F59E0B]" : accent ? "text-[#34D399]" : "text-[#94A3B8]"} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-[#F59E0B]" : "text-[#F1F5F9]"}`}>{value}</p>
      <p className="text-[10px] text-[#475569] mt-1">{sub}</p>
    </div>
  );
}

// ─── Form Card Wrapper ────────────────────────────────────────────────────────

function FormCard({ title, onClose, children, accent }: {
  title: string; onClose: () => void; children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${
      accent ? "bg-[#F59E0B]/[0.03] border-[#F59E0B]/15" : "bg-[#111827] border-[#34D399]/15"
    }`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#F1F5F9]">{title}</h3>
        <button onClick={onClose} className="text-[#475569] hover:text-[#F1F5F9] transition-colors"><X size={16} /></button>
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const { user, isLoaded } = useUser();
  const [kpiUnit, setKpiUnit] = useState<"bu" | "mt">("bu");
  const [activeTab, setActiveTab] = useState<"holdings" | "contracts" | "movements" | "grain_loads" | "settlements" | "bin_map">("holdings");

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [newHolding, setNewHolding] = useState<Holding>({ crop: "Canola", location: "", quantity_bu: 0, grade: "#1", moisture: 0, estimated_price: 0 });
  const [newContract, setNewContract] = useState<Contract>({ crop: "Canola", contract_type: "Cash Sale", quantity_bu: 0, price_per_bu: 0, elevator: "" });
  const [newMovement, setNewMovement] = useState<Movement>({ movement_type: "Delivery Out", crop: "Canola", quantity_bu: 0, movement_date: new Date().toISOString().split("T")[0] });

  const [grainLoads, setGrainLoads] = useState<GrainLoad[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<TruckType[]>([]);
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
    driver_id: "", truck_id: "", customer_id: "", from: "", contract_reference: "",
    gross_weight_kg: "", dockage_percent: "", settlement_id: "", notes: "",
    crop: "", price_per_bushel: "", ticket_number: "", crop_year: "2025",
  });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [selectedSettlement, setSelectedSettlement] = useState<any | null>(null);
  const [settlementLines, setSettlementLines] = useState<any[]>([]);
  const [settlementParsing, setSettlementParsing] = useState(false);
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementAnalysis, setSettlementAnalysis] = useState<any | null>(null);
  const [showTicketUpload, setShowTicketUpload] = useState(false);
  const [ticketParsing, setTicketParsing] = useState(false);
  const [ticketPreview, setTicketPreview] = useState<string | null>(null);
  const [parsedTicket, setParsedTicket] = useState<any>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const [newDriver, setNewDriver] = useState({ driver_name: "", driver_id: "", phone: "" });
  const [newTruck, setNewTruck] = useState({ truck_name: "", truck_id: "", license_plate: "", capacity_mt: "" });
  const [newCustomer, setNewCustomer] = useState({ customer_name: "", customer_id: "", location: "" });

  const headers = { "x-user-id": user?.id || "" };

  // ─── Data Loading ─────────────────────────────────────────────────────────

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
          crop: i.crop, location: "Main Bin", quantity_bu: i.bushels || 0,
          grade: "#1", moisture: 0, estimated_price: i.targetPrice || 0,
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
    if (!isLoaded || !user?.id) return;
    loadAll(user.id);
    loadGrainData();
    loadSettlements();
  }, [isLoaded, user?.id]);

  // ─── CRUD Functions ───────────────────────────────────────────────────────

  async function addHolding() {
    const res = await fetch("/api/inventory/holdings", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
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
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item: { id } }),
    });
    setHoldings(holdings.filter(h => h.id !== id));
  }

  async function addContract() {
    const res = await fetch("/api/inventory/contracts", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item: newContract }),
    });
    const data = await res.json();
    setContracts([data.contract, ...contracts]);
    setShowAddContract(false);
    setNewContract({ crop: "Canola", contract_type: "Cash Sale", quantity_bu: 0, price_per_bu: 0, elevator: "" });
  }

  async function deleteContract(id: number) {
    await fetch("/api/inventory/contracts", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", item: { id } }),
    });
    setContracts(contracts.filter(c => c.id !== id));
  }

  async function logMovement(item: Movement) {
    const res = await fetch("/api/inventory/movements", {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
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

  // ─── Grain Load Functions ─────────────────────────────────────────────────

  async function addLoad() {
    const res = await fetch("/api/grain-loads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newLoad,
        gross_weight_kg: parseFloat(newLoad.gross_weight_kg) || null,
        dockage_percent: parseFloat(newLoad.dockage_percent) || null,
        from: newLoad.from || null, crop: newLoad.crop || null,
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
          if (w > maxDim || h > maxDim) { const ratio = Math.min(maxDim / w, maxDim / h); w = Math.round(w * ratio); h = Math.round(h * ratio); }
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
        };
        img.src = URL.createObjectURL(f);
      });
    }
    const reader = new FileReader();
    reader.onload = (e) => setTicketPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    const { base64, mimeType } = await compressImage(file);
    try {
      const res = await fetch("/api/grain-loads/parse-ticket", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mimeType }),
      });
      const data = await res.json();
      if (data.success) setParsedTicket(data.data);
      else setTicketError(data.error || "Failed to parse ticket");
    } catch { setTicketError("Network error — try again"); }
    finally { setTicketParsing(false); }
  }

  function applyTicketToForm() {
    if (!parsedTicket) return;
    const netKg = parsedTicket.net_weight_kg || 0;
    const crop = parsedTicket.crop || "";
    const ticketBushels = parsedTicket.net_bushels;
    const calcBushels = netKg && crop ? Math.round(netKg / (KG_PER_BUSHEL[crop] || 27.22)) : null;
    const bushels = ticketBushels || calcBushels;
    setNewLoad({
      ...newLoad, date: parsedTicket.date || newLoad.date,
      gross_weight_kg: parsedTicket.gross_weight_kg?.toString() || "",
      dockage_percent: parsedTicket.dockage_percent?.toString() || "",
      contract_reference: parsedTicket.contract_reference || "",
      settlement_id: parsedTicket.delivery_number || "",
      ticket_number: parsedTicket.ticket_number || "", crop,
      price_per_bushel: "",
      crop_year: parsedTicket.date ? parsedTicket.date.split("-")[0] : "2025",
      notes: `Parsed from scale ticket. Grade: ${parsedTicket.grade || "N/A"}. ${bushels ? `${bushels.toLocaleString()} bu` : ""}. Moisture: ${parsedTicket.moisture_percent || "N/A"}%. ${parsedTicket.remarks || ""}`.trim(),
    });
    setShowTicketUpload(false); setShowAddLoad(true);
    setParsedTicket(null); setTicketPreview(null);
  }

  async function syncToLedger() {
    setSyncing(true); setSyncResult(null);
    try {
      const res = await fetch("/api/finance/auto-post", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bulk_grain_loads", cropYear: 2025 }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({ message: `${data.posted} posted, ${data.skipped} already synced${data.errors?.length > 0 ? `, ${data.errors.length} errors` : ""}`, type: "success" });
      } else {
        setSyncResult({ message: data.error || "Sync failed", type: "error" });
      }
    } catch { setSyncResult({ message: "Network error — try again", type: "error" }); }
    finally { setSyncing(false); }
  }

  async function loadSettlements() {
    try { const res = await fetch("/api/settlements"); const data = await res.json(); setSettlements(data.settlements || []); } catch { /* ignore */ }
  }
  async function loadSettlementDetail(id: string) {
    try { const res = await fetch(`/api/settlements/${id}`); const data = await res.json(); setSelectedSettlement(data.settlement); setSettlementLines(data.lines || []); } catch { /* ignore */ }
  }
  async function parseSettlement(file: File) {
    setSettlementParsing(true); setSettlementError(null); setSettlementAnalysis(null);
    const buffer = await file.arrayBuffer();
    const base64 = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ""));
    try {
      const res = await fetch("/api/settlements/parse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64, filename: file.name }),
      });
      const data = await res.json();
      if (data.success) {
        setSettlementAnalysis(data.analysis); setSelectedSettlement(data.settlement);
        setSettlementLines(data.lines || []); await loadSettlements();
      } else { setSettlementError(data.error || "Failed to parse settlement"); }
    } catch { setSettlementError("Network error — try again"); }
    finally { setSettlementParsing(false); }
  }
  async function deleteSettlement(id: string) {
    if (!confirm("Delete this settlement?")) return;
    await fetch(`/api/settlements?id=${id}`, { method: "DELETE" });
    setSelectedSettlement(null); setSettlementLines([]); setSettlementAnalysis(null);
    await loadSettlements();
  }
  async function postSettlementToLedger(id: string) {
    if (!confirm("Post this settlement to the ledger? This will create a journal entry.")) return;
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "post_to_ledger" }),
      });
      const data = await res.json();
      if (data.success) { alert(data.message); await loadSettlementDetail(id); await loadSettlements(); }
      else { alert(`Error: ${data.error}`); }
    } catch { alert("Network error — try again"); }
  }

  async function updateLoad() {
    if (!editingLoad) return;
    const res = await fetch(`/api/grain-loads/${editingLoad.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: editingLoad.date, driver_id: editingLoad.driver_id || null,
        truck_id: editingLoad.truck_id || null, customer_id: editingLoad.customer_id || null,
        contract_reference: editingLoad.contract_reference || null,
        gross_weight_kg: editingLoad.gross_weight_kg,
        dockage_percent: editingLoad.dockage_percent || null,
        settlement_id: editingLoad.settlement_id || null,
        notes: editingLoad.notes || null,
      }),
    });
    const data = await res.json();
    if (data.load) { await loadGrainData(); setEditingLoad(null); }
  }

  async function deleteLoad(id: string) {
    if (!confirm("Delete this load?")) return;
    await fetch(`/api/grain-loads/${id}`, { method: "DELETE" });
    await loadGrainData();
  }

  async function addDriver() {
    const res = await fetch("/api/drivers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newDriver) });
    const data = await res.json();
    if (data.driver) { setDrivers([...drivers, data.driver]); setNewDriver({ driver_name: "", driver_id: "", phone: "" }); }
  }
  async function addTruck() {
    const res = await fetch("/api/trucks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newTruck, capacity_mt: parseFloat(newTruck.capacity_mt) || null }) });
    const data = await res.json();
    if (data.truck) { setTrucks([...trucks, data.truck]); setNewTruck({ truck_name: "", truck_id: "", license_plate: "", capacity_mt: "" }); }
  }
  async function addCustomer() {
    const res = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newCustomer) });
    const data = await res.json();
    if (data.customer) { setCustomers([...customers, data.customer]); setNewCustomer({ customer_name: "", customer_id: "", location: "" }); }
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
        driver_id: driver?.id || null, truck_id: truck?.id || null, customer_id: customer?.id || null,
        contract_reference: row.contract_reference || row.contract || null,
        gross_weight_kg: parseFloat(row.gross_weight_kg || row.gross_weight) || null,
        dockage_percent: parseFloat(row.dockage_percent || row.dockage) || null,
        settlement_id: row.settlement_id || null, notes: row.notes || null,
      };
    }).filter(l => l.gross_weight_kg);
    if (loads.length === 0) { setBulkUploadError("No valid loads found. Check your CSV format."); return; }
    const res = await fetch("/api/grain-loads/bulk-upload", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loads }),
    });
    const data = await res.json();
    if (data.inserted) { await loadGrainData(); setShowBulkUpload(false); alert(`Successfully uploaded ${data.inserted} loads.`); }
    else { setBulkUploadError("Upload failed. Please try again."); }
  }

  function downloadTemplate() {
    const template = "date,driver,driver_id,truck,truck_id,customer,contract_reference,gross_weight_kg,dockage_percent,settlement_id,notes\n2026-02-23,John Smith,D01,Truck 1,T01,Viterra Swift Current,C-2026-001,35000,1.5,S-001,\n";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ag360-grain-loads-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const toDisplay = (kg: number) => weightUnit === "lb" ? kg * 2.20462 : kg;
  const unitLabel = weightUnit === "kg" ? "kg" : "lb";

  const filteredLoads = grainLoads.filter(l => {
    const d = l.date?.split("T")[0];
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  });

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
    const a = document.createElement("a"); a.href = url; a.download = `ag360-${tab}-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F1F5F9]">Inventory</h1>
          <p className="text-sm text-[#64748B] mt-1">Holdings, contracts, movements, grain loads, and settlements</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className={btnSecondary}>
            <Download size={13} /> Export CSV
          </button>
          {activeTab === "grain_loads" ? (
            <>
              <button onClick={() => setShowBulkUpload(true)} className={btnSecondary}><Upload size={13} /> Bulk Upload</button>
              <button onClick={() => setShowTicketUpload(true)} className={btnSecondary}><Camera size={13} /> Scan Ticket</button>
              <button onClick={syncToLedger} disabled={syncing} className={btnSecondary + " disabled:opacity-40"}>
                {syncing ? <Loader2 size={13} className="animate-spin" /> : <BookOpen size={13} />}
                {syncing ? "Syncing..." : "Sync to Ledger"}
              </button>
              <button onClick={() => setShowAddLoad(true)} className={btnPrimary}><Plus size={14} /> Add Load</button>
            </>
          ) : (
            <button
              onClick={() => {
                if (activeTab === "holdings") setShowAddHolding(true);
                if (activeTab === "contracts") setShowAddContract(true);
                if (activeTab === "movements") setShowAddMovement(true);
              }}
              className={btnPrimary}
            >
              <Plus size={14} /> Add {activeTab === "holdings" ? "Holding" : activeTab === "contracts" ? "Contract" : "Movement"}
            </button>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      {activeTab !== "grain_loads" && activeTab !== "settlements" ? (
        <>
          <div className="flex justify-end mb-2">
            <div className="flex items-center bg-white/[0.04] rounded-full p-0.5 text-xs font-semibold border border-white/[0.06]">
              <button onClick={() => setKpiUnit("bu")} className={`px-3 py-1 rounded-full transition-all ${kpiUnit === "bu" ? "bg-[#34D399] text-[#080C15]" : "text-[#64748B]"}`}>bu</button>
              <button onClick={() => setKpiUnit("mt")} className={`px-3 py-1 rounded-full transition-all ${kpiUnit === "mt" ? "bg-[#34D399] text-[#080C15]" : "text-[#64748B]"}`}>MT</button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <KpiCard icon={Package} label="Total On Hand"
              value={kpiUnit === "bu" ? `${Math.floor(totalBu).toLocaleString()} bu` : `${Math.floor(totalBu * 0.02722).toLocaleString()} MT`}
              sub="across all bins" />
            <KpiCard icon={DollarSign} label="Estimated Value" value={fmt(Math.floor(totalValue))} sub="at target prices" accent />
            <KpiCard icon={TrendingUp} label="Contracted"
              value={kpiUnit === "bu" ? `${Math.floor(totalContracted).toLocaleString()} bu` : `${Math.floor(totalContracted * 0.02722).toLocaleString()} MT`}
              sub="committed sales" />
            <KpiCard icon={AlertTriangle} label="Unpriced"
              value={kpiUnit === "bu" ? `${Math.floor(unpriced).toLocaleString()} bu` : `${Math.floor(unpriced * 0.02722).toLocaleString()} MT`}
              sub={unpriced > 0 ? "needs a home" : "fully contracted"}
              highlight={unpriced > 0} />
          </div>
        </>
      ) : activeTab === "grain_loads" ? (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard icon={Truck} label="Total Loads" value={`${totalLoads}`} sub="all time" />
          <KpiCard icon={Scale} label="Gross Weight" value={`${totalGrossMT.toFixed(1)} MT`} sub={`${totalGrossKg.toLocaleString()} kg`} />
          <KpiCard icon={BarChart3} label="Net Weight" value={`${totalNetMT.toFixed(1)} MT`} sub={`${totalNetKg.toLocaleString()} kg`} accent />
          <KpiCard icon={AlertTriangle} label="Avg Dockage"
            value={grainLoads.filter(l => l.dockage_percent).length > 0 ? `${(grainLoads.filter(l => l.dockage_percent).reduce((s, l) => s + parseFloat(String(l.dockage_percent)), 0) / grainLoads.filter(l => l.dockage_percent).length).toFixed(2)}%` : "—"}
            sub="average across loads"
            highlight={grainLoads.filter(l => l.dockage_percent).length > 0 && (grainLoads.filter(l => l.dockage_percent).reduce((s, l) => s + parseFloat(String(l.dockage_percent)), 0) / grainLoads.filter(l => l.dockage_percent).length) > 3}
          />
        </div>
      ) : null}

      {/* Tabs */}
      <div className="bg-[#111827] rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {([
            { key: "holdings", label: "Holdings", icon: Package },
            { key: "contracts", label: "Contracts", icon: TrendingUp },
            { key: "movements", label: "Movement Log", icon: ArrowRightLeft },
            { key: "grain_loads", label: "Grain Loads", icon: Truck },
            { key: "settlements", label: "Settlements", icon: FileText },
            { key: "bin_map", label: "Bin Map", icon: MapPin },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === key
                  ? "border-[#34D399] text-[#34D399]"
                  : "border-transparent text-[#64748B] hover:text-[#F1F5F9]"
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ═══════════════ HOLDINGS TAB ═══════════════ */}
        {activeTab === "holdings" && (
          <div className="p-6 space-y-4">
            {showAddHolding && (
              <FormCard title="Add Holding" onClose={() => setShowAddHolding(false)}>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>Crop</label><select value={newHolding.crop} onChange={e => setNewHolding({...newHolding, crop: e.target.value})} className={selectClass}>{CROPS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className={labelClass}>Location / Bin</label><input type="text" placeholder="North Bin" value={newHolding.location} onChange={e => setNewHolding({...newHolding, location: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Quantity (bu)</label><input type="number" value={newHolding.quantity_bu || ""} onChange={e => setNewHolding({...newHolding, quantity_bu: Number(e.target.value)})} className={inputClass} /></div>
                  <div><label className={labelClass}>Grade</label><select value={newHolding.grade} onChange={e => setNewHolding({...newHolding, grade: e.target.value})} className={selectClass}>{GRADES.map(g => <option key={g}>{g}</option>)}</select></div>
                  <div><label className={labelClass}>Moisture (%)</label><input type="number" step="0.1" value={newHolding.moisture || ""} onChange={e => setNewHolding({...newHolding, moisture: Number(e.target.value)})} className={inputClass} /></div>
                  <div><label className={labelClass}>Est. Price ($/bu)</label><input type="number" step="0.01" value={newHolding.estimated_price || ""} onChange={e => setNewHolding({...newHolding, estimated_price: Number(e.target.value)})} className={inputClass} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addHolding} className={btnPrimary}>Save</button>
                  <button onClick={() => setShowAddHolding(false)} className={btnGhost}>Cancel</button>
                </div>
              </FormCard>
            )}
            {holdings.length === 0 ? (
              <div className="text-center py-12">
                <Package size={28} className="mx-auto text-[#475569] mb-2" />
                <p className="text-sm text-[#64748B]">No holdings yet — add a bin or check your Farm Profile inventory.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                      <th className="text-left pb-3 pr-6">Crop</th>
                      <th className="text-left pb-3 pr-6">Location</th>
                      <th className="text-right pb-3 pr-6">Quantity</th>
                      <th className="text-left pb-3 pr-6">Grade</th>
                      <th className="text-right pb-3 pr-6">Moisture</th>
                      <th className="text-right pb-3 pr-6">Est. Price</th>
                      <th className="text-right pb-3">Value</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {holdings.map((h, i) => (
                      <tr key={h.id || i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-6 font-semibold text-[#F1F5F9]">{h.crop}</td>
                        <td className="py-3 pr-6 text-[#94A3B8]">{h.location}</td>
                        <td className="py-3 pr-6 text-right font-semibold text-[#F1F5F9] font-mono">{Number(h.quantity_bu).toLocaleString()} bu</td>
                        <td className="py-3 pr-6"><span className="text-[10px] bg-white/[0.04] border border-white/[0.06] px-2 py-0.5 rounded text-[#94A3B8]">{h.grade || "—"}</span></td>
                        <td className="py-3 pr-6 text-right text-[#64748B]">{h.moisture ? `${h.moisture}%` : "—"}</td>
                        <td className="py-3 pr-6 text-right text-[#94A3B8]">{h.estimated_price ? `$${h.estimated_price}/bu` : "—"}</td>
                        <td className="py-3 text-right font-semibold text-[#34D399]">{fmt(Number(h.quantity_bu) * Number(h.estimated_price || 0))}</td>
                        <td className="py-3 text-right">
                          {h.id && <button onClick={() => deleteHolding(h.id!)} className="text-[#EF4444]/40 hover:text-[#EF4444] transition-colors"><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ CONTRACTS TAB ═══════════════ */}
        {activeTab === "contracts" && (
          <div className="p-6 space-y-4">
            {showAddContract && (
              <FormCard title="Add Contract" onClose={() => setShowAddContract(false)}>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>Crop</label><select value={newContract.crop} onChange={e => setNewContract({...newContract, crop: e.target.value})} className={selectClass}>{CROPS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className={labelClass}>Contract Type</label><select value={newContract.contract_type} onChange={e => setNewContract({...newContract, contract_type: e.target.value})} className={selectClass}>{CONTRACT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label className={labelClass}>Quantity (bu)</label><input type="number" value={newContract.quantity_bu || ""} onChange={e => setNewContract({...newContract, quantity_bu: Number(e.target.value)})} className={inputClass} /></div>
                  <div><label className={labelClass}>Price ($/bu)</label><input type="number" step="0.01" value={newContract.price_per_bu || ""} onChange={e => setNewContract({...newContract, price_per_bu: Number(e.target.value)})} className={inputClass} /></div>
                  <div><label className={labelClass}>Elevator</label><input type="text" placeholder="Viterra Swift Current" value={newContract.elevator || ""} onChange={e => setNewContract({...newContract, elevator: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Delivery Date</label><input type="date" value={newContract.delivery_date || ""} onChange={e => setNewContract({...newContract, delivery_date: e.target.value})} className={inputClass} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addContract} className={btnPrimary}>Save</button>
                  <button onClick={() => setShowAddContract(false)} className={btnGhost}>Cancel</button>
                </div>
              </FormCard>
            )}
            {/* Crop position cards */}
            {holdings.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[...new Set(holdings.map(h => h.crop))].map(crop => {
                  const totalHeld = holdings.filter(h => h.crop === crop).reduce((s, h) => s + Number(h.quantity_bu), 0);
                  const totalSold = contracts.filter(c => c.crop === crop).reduce((s, c) => s + Number(c.quantity_bu), 0);
                  const pct = totalHeld > 0 ? Math.min(100, Math.round((totalSold / totalHeld) * 100)) : 0;
                  return (
                    <div key={crop} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <p className="text-sm font-bold text-[#F1F5F9]">{crop}</p>
                      <div className="flex justify-between text-[10px] text-[#64748B] mt-1">
                        <span>{totalSold.toLocaleString()} bu sold</span>
                        <span>{totalHeld.toLocaleString()} bu total</span>
                      </div>
                      <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-[#34D399] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] font-semibold text-[#34D399] mt-1">{pct}% contracted</p>
                    </div>
                  );
                })}
              </div>
            )}
            {contracts.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp size={28} className="mx-auto text-[#475569] mb-2" />
                <p className="text-sm text-[#64748B]">No contracts yet — add your first sale.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                      <th className="text-left pb-3 pr-6">Crop</th>
                      <th className="text-left pb-3 pr-6">Type</th>
                      <th className="text-right pb-3 pr-6">Quantity</th>
                      <th className="text-right pb-3 pr-6">Price</th>
                      <th className="text-left pb-3 pr-6">Elevator</th>
                      <th className="text-left pb-3 pr-6">Delivery</th>
                      <th className="text-right pb-3">Value</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {contracts.map((c, i) => (
                      <tr key={c.id || i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-6 font-semibold text-[#F1F5F9]">{c.crop}</td>
                        <td className="py-3 pr-6"><span className="text-[10px] bg-[#34D399]/[0.08] text-[#34D399] font-semibold px-2 py-1 rounded-full">{c.contract_type}</span></td>
                        <td className="py-3 pr-6 text-right font-mono text-[#F1F5F9]">{Number(c.quantity_bu).toLocaleString()} bu</td>
                        <td className="py-3 pr-6 text-right text-[#94A3B8]">{c.price_per_bu ? `$${c.price_per_bu}/bu` : "—"}</td>
                        <td className="py-3 pr-6 text-[#64748B]">{c.elevator || "—"}</td>
                        <td className="py-3 pr-6 text-[#64748B]">{c.delivery_date || "—"}</td>
                        <td className="py-3 text-right font-semibold text-[#34D399]">{c.price_per_bu ? fmt(Number(c.quantity_bu) * Number(c.price_per_bu)) : "—"}</td>
                        <td className="py-3 text-right">
                          {c.id && <button onClick={() => deleteContract(c.id!)} className="text-[#EF4444]/40 hover:text-[#EF4444] transition-colors"><Trash2 size={14} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ MOVEMENTS TAB ═══════════════ */}
        {activeTab === "movements" && (
          <div className="p-6 space-y-4">
            {showAddMovement && (
              <FormCard title="Log Movement" onClose={() => setShowAddMovement(false)}>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>Type</label><select value={newMovement.movement_type} onChange={e => setNewMovement({...newMovement, movement_type: e.target.value})} className={selectClass}>{MOVEMENT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label className={labelClass}>Crop</label><select value={newMovement.crop} onChange={e => setNewMovement({...newMovement, crop: e.target.value})} className={selectClass}>{CROPS.map(c => <option key={c}>{c}</option>)}</select></div>
                  <div><label className={labelClass}>Quantity (bu)</label><input type="number" value={newMovement.quantity_bu || ""} onChange={e => setNewMovement({...newMovement, quantity_bu: Number(e.target.value)})} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>From</label>
                    <select value={newMovement.from_location || ""} onChange={e => setNewMovement({...newMovement, from_location: e.target.value})} className={selectClass}>
                      <option value="">Select bin...</option>
                      {[...new Set(holdings.map(h => h.location))].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      <option value="other">Other...</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>To</label><input type="text" placeholder="Viterra Swift Current" value={newMovement.to_location || ""} onChange={e => setNewMovement({...newMovement, to_location: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Date</label><input type="date" value={newMovement.movement_date} onChange={e => setNewMovement({...newMovement, movement_date: e.target.value})} className={inputClass} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={addMovement} className={btnPrimary}>Save</button>
                  <button onClick={() => setShowAddMovement(false)} className={btnGhost}>Cancel</button>
                </div>
              </FormCard>
            )}
            {movements.length === 0 ? (
              <div className="text-center py-12">
                <ArrowRightLeft size={28} className="mx-auto text-[#475569] mb-2" />
                <p className="text-sm text-[#64748B]">No movements logged yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                      <th className="text-left pb-3">Date</th>
                      <th className="text-left pb-3">Type</th>
                      <th className="text-left pb-3">Crop</th>
                      <th className="text-right pb-3 pr-6">Quantity</th>
                      <th className="text-left pb-3 pr-6">From</th>
                      <th className="text-left pb-3">To</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {movements.map((m, i) => (
                      <tr key={m.id || i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 text-[#64748B] font-mono text-[11px]">{m.movement_date}</td>
                        <td className="py-3"><span className="text-[10px] bg-white/[0.04] border border-white/[0.06] text-[#94A3B8] font-semibold px-2 py-1 rounded-full">{m.movement_type}</span></td>
                        <td className="py-3 font-semibold text-[#F1F5F9]">{m.crop}</td>
                        <td className="py-3 text-right pr-6 font-mono text-[#F1F5F9]">{Number(m.quantity_bu).toLocaleString()} bu</td>
                        <td className="py-3 pr-6 text-[#64748B]">{m.from_location || "—"}</td>
                        <td className="py-3 text-[#64748B]">{m.to_location || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ GRAIN LOADS TAB ═══════════════ */}
        {activeTab === "grain_loads" && (
          <div className="p-6 space-y-4">
            {/* Controls bar */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px]">Unit:</span>
                <div className="flex rounded-lg border border-white/[0.10] overflow-hidden">
                  <button onClick={() => setWeightUnit("kg")} className={`px-3 py-1 text-xs font-semibold transition-all ${weightUnit === "kg" ? "bg-[#34D399] text-[#080C15]" : "bg-transparent text-[#64748B]"}`}>KG</button>
                  <button onClick={() => setWeightUnit("lb")} className={`px-3 py-1 text-xs font-semibold transition-all ${weightUnit === "lb" ? "bg-[#34D399] text-[#080C15]" : "bg-transparent text-[#64748B]"}`}>LB</button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter size={12} className="text-[#475569]" />
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} className="text-sm border border-white/[0.10] rounded-lg px-3 py-1 bg-white/[0.04] text-[#F1F5F9] focus:outline-none focus:border-[#34D399]/50" />
                <span className="text-[10px] text-[#475569]">to</span>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} className="text-sm border border-white/[0.10] rounded-lg px-3 py-1 bg-white/[0.04] text-[#F1F5F9] focus:outline-none focus:border-[#34D399]/50" />
              </div>
              {(filterFrom || filterTo) && (
                <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} className="text-[10px] text-[#EF4444] font-semibold flex items-center gap-1 hover:text-[#EF4444]/80">
                  <RotateCcw size={10} /> Clear
                </button>
              )}
            </div>

            {/* Manage bar */}
            <div className="flex items-center gap-3 pb-3 border-b border-white/[0.06]">
              <span className="font-mono text-[10px] text-[#475569] font-semibold uppercase tracking-[1.5px]">Manage:</span>
              {[
                { label: "Drivers", count: drivers.length, show: showManageDrivers, toggle: () => setShowManageDrivers(!showManageDrivers) },
                { label: "Trucks", count: trucks.length, show: showManageTrucks, toggle: () => setShowManageTrucks(!showManageTrucks) },
                { label: "Customers", count: customers.length, show: showManageCustomers, toggle: () => setShowManageCustomers(!showManageCustomers) },
              ].map(({ label, count, show, toggle }) => (
                <button key={label} onClick={toggle}
                  className={`text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    show ? "bg-[#34D399]/[0.10] text-[#34D399] border border-[#34D399]/20" : "bg-white/[0.04] border border-white/[0.06] text-[#94A3B8] hover:text-[#F1F5F9]"
                  }`}>
                  <Settings2 size={10} /> {label} ({count})
                </button>
              ))}
            </div>

            {/* Manage Drivers */}
            {showManageDrivers && (
              <FormCard title="Drivers" onClose={() => setShowManageDrivers(false)}>
                {drivers.length > 0 && (
                  <div className="space-y-1 mb-3">{drivers.map(d => (
                    <div key={d.id} className="flex items-center gap-3 text-sm text-[#94A3B8]">
                      <Users size={12} className="text-[#475569]" />
                      <span className="font-medium text-[#F1F5F9]">{d.driver_name}</span>
                      {d.driver_id && <span className="text-[#64748B]">ID: {d.driver_id}</span>}
                      {d.phone && <span className="text-[#64748B]">{d.phone}</span>}
                    </div>
                  ))}</div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Driver Name *" value={newDriver.driver_name} onChange={e => setNewDriver({...newDriver, driver_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Driver ID (e.g. D01)" value={newDriver.driver_id} onChange={e => setNewDriver({...newDriver, driver_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Phone" value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addDriver} disabled={!newDriver.driver_name} className={btnPrimary}>Add Driver</button>
              </FormCard>
            )}

            {/* Manage Trucks */}
            {showManageTrucks && (
              <FormCard title="Trucks" onClose={() => setShowManageTrucks(false)}>
                {trucks.length > 0 && (
                  <div className="space-y-1 mb-3">{trucks.map(t => (
                    <div key={t.id} className="flex items-center gap-3 text-sm text-[#94A3B8]">
                      <Truck size={12} className="text-[#475569]" />
                      <span className="font-medium text-[#F1F5F9]">{t.truck_name}</span>
                      {t.truck_id && <span className="text-[#64748B]">ID: {t.truck_id}</span>}
                      {t.license_plate && <span className="text-[#64748B]">{t.license_plate}</span>}
                    </div>
                  ))}</div>
                )}
                <div className="grid grid-cols-4 gap-3">
                  <input type="text" placeholder="Truck Name *" value={newTruck.truck_name} onChange={e => setNewTruck({...newTruck, truck_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Truck ID (e.g. T01)" value={newTruck.truck_id} onChange={e => setNewTruck({...newTruck, truck_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="License Plate" value={newTruck.license_plate} onChange={e => setNewTruck({...newTruck, license_plate: e.target.value})} className={inputClass} />
                  <input type="number" placeholder="Capacity (MT)" value={newTruck.capacity_mt} onChange={e => setNewTruck({...newTruck, capacity_mt: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addTruck} disabled={!newTruck.truck_name} className={btnPrimary}>Add Truck</button>
              </FormCard>
            )}

            {/* Manage Customers */}
            {showManageCustomers && (
              <FormCard title="Customers" onClose={() => setShowManageCustomers(false)}>
                {customers.length > 0 && (
                  <div className="space-y-1 mb-3">{customers.map(c => (
                    <div key={c.id} className="flex items-center gap-3 text-sm text-[#94A3B8]">
                      <Users size={12} className="text-[#475569]" />
                      <span className="font-medium text-[#F1F5F9]">{c.customer_name}</span>
                      {c.location && <span className="text-[#64748B]">{c.location}</span>}
                    </div>
                  ))}</div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" placeholder="Customer Name *" value={newCustomer.customer_name} onChange={e => setNewCustomer({...newCustomer, customer_name: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Customer ID" value={newCustomer.customer_id} onChange={e => setNewCustomer({...newCustomer, customer_id: e.target.value})} className={inputClass} />
                  <input type="text" placeholder="Location (e.g. Swift Current)" value={newCustomer.location} onChange={e => setNewCustomer({...newCustomer, location: e.target.value})} className={inputClass} />
                </div>
                <button onClick={addCustomer} disabled={!newCustomer.customer_name} className={btnPrimary}>Add Customer</button>
              </FormCard>
            )}

            {/* Scale Ticket Upload */}
            {showTicketUpload && (
              <FormCard title="Scan Scale Ticket" onClose={() => { setShowTicketUpload(false); setParsedTicket(null); setTicketPreview(null); setTicketError(null); }}>
                {!parsedTicket && (
                  <div>
                    <label className="flex flex-col items-center justify-center w-full h-32 border border-dashed border-[#34D399]/30 rounded-xl cursor-pointer hover:bg-[#34D399]/[0.02] transition-colors">
                      {ticketParsing ? <Loader2 size={24} className="text-[#34D399] animate-spin mb-2" /> : <Camera size={24} className="text-[#475569] mb-2" />}
                      <span className="text-sm text-[#64748B]">{ticketParsing ? "Parsing ticket..." : "Take photo or upload scale ticket"}</span>
                      <span className="text-[10px] text-[#475569] mt-1">JPG, PNG, or PDF</span>
                      <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" disabled={ticketParsing} onChange={(e) => { const file = e.target.files?.[0]; if (file) parseScaleTicket(file); }} />
                    </label>
                    {ticketError && <p className="text-sm text-[#EF4444] mt-2 flex items-center gap-1"><XCircle size={13} /> {ticketError}</p>}
                  </div>
                )}
                {parsedTicket && (
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      {ticketPreview && <img src={ticketPreview} alt="Scale ticket" className="w-48 h-auto rounded-lg border border-white/[0.10]" />}
                      <div className="flex-1 grid grid-cols-2 gap-2 text-sm">
                        {(() => {
                          const uf = parsedTicket.uncertain_fields || [];
                          const f = (field: string, label: string, value: any, suffix?: string) => (
                            <div className={uf.includes(field) ? "bg-[#F59E0B]/[0.06] border border-[#F59E0B]/15 rounded px-1.5 py-0.5" : ""}>
                              <span className="text-[#64748B]">{label}:</span>{" "}
                              <strong className={uf.includes(field) ? "text-[#F59E0B]" : "text-[#F1F5F9]"}>{value}{suffix || ""}</strong>
                              {uf.includes(field) && <span className="text-[9px] text-[#F59E0B] ml-1 flex items-center gap-0.5 inline-flex"><AlertTriangle size={8} /> verify</span>}
                            </div>
                          );
                          return (<>
                            {f("date", "Date", parsedTicket.date)}
                            {f("receipt_number", "Receipt #", parsedTicket.receipt_number)}
                            <div><span className="text-[#64748B]">Elevator:</span> <strong className="text-[#F1F5F9]">{parsedTicket.elevator_name} — {parsedTicket.station_name}</strong></div>
                            {f("shipper_name", "Shipper", parsedTicket.shipper_name)}
                            {f("crop", "Crop", parsedTicket.crop)}
                            {f("grade", "Grade", parsedTicket.grade)}
                            {f("gross_weight_kg", "Gross", parsedTicket.gross_weight_kg?.toLocaleString(), " kg")}
                            {f("dockage_percent", "Dockage", parsedTicket.dockage_percent, "%")}
                            {f("net_weight_kg", "Net", parsedTicket.net_weight_kg?.toLocaleString(), " kg")}
                            {f("net_bushels", "Bushels", parsedTicket.net_bushels ? parsedTicket.net_bushels.toLocaleString() : parsedTicket.net_weight_kg && parsedTicket.crop ? `${Math.round(parsedTicket.net_weight_kg / (KG_PER_BUSHEL[parsedTicket.crop] || 27.22)).toLocaleString()} (calc)` : "—")}
                            {f("moisture_percent", "Moisture", parsedTicket.moisture_percent ? `${parsedTicket.moisture_percent}%` : "—")}
                            <div><span className="text-[#64748B]">Protein:</span> <strong className="text-[#F1F5F9]">{parsedTicket.protein_percent ? `${parsedTicket.protein_percent}%` : "—"}</strong></div>
                            <div className="col-span-2"><span className="text-[#64748B]">Confidence:</span> <strong className={parsedTicket.confidence === "high" ? "text-[#34D399]" : "text-[#F59E0B]"}>{parsedTicket.confidence}</strong>
                              {uf.length > 0 && <span className="text-[10px] text-[#F59E0B] ml-2">({uf.length} field{uf.length > 1 ? "s" : ""} need review)</span>}
                            </div>
                          </>);
                        })()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={applyTicketToForm} className={btnPrimary}>Use This Data → Add Load</button>
                      <button onClick={() => { setParsedTicket(null); setTicketPreview(null); }} className={btnGhost}>Retry</button>
                      <button onClick={() => { setShowTicketUpload(false); setParsedTicket(null); setTicketPreview(null); }} className={btnGhost}>Cancel</button>
                    </div>
                  </div>
                )}
              </FormCard>
            )}

            {/* Sync result */}
            {syncResult && (
              <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${
                syncResult.type === "success"
                  ? "bg-[#34D399]/[0.06] border border-[#34D399]/15 text-[#34D399]"
                  : "bg-[#EF4444]/[0.06] border border-[#EF4444]/15 text-[#EF4444]"
              }`}>
                {syncResult.type === "success" ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {syncResult.message}
              </div>
            )}

            {/* Add Load Form */}
            {showAddLoad && (
              <FormCard title="Add Grain Load" onClose={() => setShowAddLoad(false)}>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>Date *</label><input type="date" value={newLoad.date} onChange={e => setNewLoad({...newLoad, date: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Driver</label>
                    <select value={newLoad.driver_id} onChange={e => setNewLoad({...newLoad, driver_id: e.target.value})} className={selectClass}>
                      <option value="">Select driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}{d.driver_id ? ` (${d.driver_id})` : ""}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Truck</label>
                    <select value={newLoad.truck_id} onChange={e => setNewLoad({...newLoad, truck_id: e.target.value})} className={selectClass}>
                      <option value="">Select truck...</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_name}{t.license_plate ? ` — ${t.license_plate}` : ""}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Customer</label>
                    <select value={newLoad.customer_id} onChange={e => setNewLoad({...newLoad, customer_id: e.target.value})} className={selectClass}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}{c.location ? ` — ${c.location}` : ""}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>From (Bin / Storage)</label>
                    <select value={newLoad.from} onChange={e => setNewLoad({...newLoad, from: e.target.value})} className={selectClass}>
                      <option value="">Select bin...</option>
                      {[...new Set(holdings.map(h => h.location))].map(loc => <option key={loc} value={loc}>{loc}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Contract Reference</label><input type="text" placeholder="e.g. C-2026-001" value={newLoad.contract_reference} onChange={e => setNewLoad({...newLoad, contract_reference: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Settlement ID</label><input type="text" placeholder="e.g. S-001" value={newLoad.settlement_id} onChange={e => setNewLoad({...newLoad, settlement_id: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Crop *</label>
                    <select value={newLoad.crop} onChange={e => setNewLoad({...newLoad, crop: e.target.value})} className={selectClass}>
                      <option value="">Select crop...</option>
                      {["Canola", "HRS Wheat", "HRW Wheat", "Durum", "Barley", "Oats", "Peas", "Lentils", "Flax", "Soybeans"].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Price ($/bu)</label><input type="number" step="0.01" placeholder="e.g. 14.50" value={newLoad.price_per_bushel} onChange={e => setNewLoad({...newLoad, price_per_bushel: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Ticket #</label><input type="text" placeholder="e.g. 84521" value={newLoad.ticket_number} onChange={e => setNewLoad({...newLoad, ticket_number: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Crop Year</label>
                    <select value={newLoad.crop_year} onChange={e => setNewLoad({...newLoad, crop_year: e.target.value})} className={selectClass}>
                      <option value="2024">2024</option><option value="2025">2025</option><option value="2026">2026</option>
                    </select>
                  </div>
                  <div><label className={labelClass}>Gross Weight (kg) *</label><input type="number" placeholder="e.g. 35000" value={newLoad.gross_weight_kg} onChange={e => setNewLoad({...newLoad, gross_weight_kg: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Dockage (%)</label><input type="number" step="0.01" placeholder="e.g. 1.5" value={newLoad.dockage_percent} onChange={e => setNewLoad({...newLoad, dockage_percent: e.target.value})} className={inputClass} /></div>
                  <div>
                    <label className={labelClass}>Net Weight (kg)</label>
                    <input type="number" readOnly
                      value={newLoad.gross_weight_kg && newLoad.dockage_percent
                        ? (parseFloat(newLoad.gross_weight_kg) - (parseFloat(newLoad.gross_weight_kg) * parseFloat(newLoad.dockage_percent) / 100)).toFixed(0)
                        : newLoad.gross_weight_kg || ""
                      }
                      className={inputClass + " opacity-60 cursor-not-allowed"}
                    />
                  </div>
                </div>
                <div><label className={labelClass}>Notes</label><input type="text" placeholder="Any additional notes" value={newLoad.notes} onChange={e => setNewLoad({...newLoad, notes: e.target.value})} className={inputClass} /></div>
                <div className="flex gap-2">
                  <button onClick={addLoad} disabled={!newLoad.date || !newLoad.gross_weight_kg} className={btnPrimary}>Save Load</button>
                  <button onClick={() => setShowAddLoad(false)} className={btnGhost}>Cancel</button>
                </div>
              </FormCard>
            )}

            {/* Edit Load Form */}
            {editingLoad && (
              <FormCard title="Edit Load" onClose={() => setEditingLoad(null)} accent>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className={labelClass}>Date</label><input type="date" value={editingLoad.date} onChange={e => setEditingLoad({...editingLoad, date: e.target.value})} className={inputClass} /></div>
                  <div><label className={labelClass}>Driver</label>
                    <select value={editingLoad.driver_id || ""} onChange={e => setEditingLoad({...editingLoad, driver_id: e.target.value})} className={selectClass}>
                      <option value="">Select driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Truck</label>
                    <select value={editingLoad.truck_id || ""} onChange={e => setEditingLoad({...editingLoad, truck_id: e.target.value})} className={selectClass}>
                      <option value="">Select truck...</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Customer</label>
                    <select value={editingLoad.customer_id || ""} onChange={e => setEditingLoad({...editingLoad, customer_id: e.target.value})} className={selectClass}>
                      <option value="">Select customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_name}</option>)}
                    </select>
                  </div>
                  <div><label className={labelClass}>Gross Weight (kg)</label><input type="number" value={editingLoad.gross_weight_kg || ""} onChange={e => setEditingLoad({...editingLoad, gross_weight_kg: parseFloat(e.target.value)})} className={inputClass} /></div>
                  <div><label className={labelClass}>Dockage (%)</label><input type="number" step="0.01" value={editingLoad.dockage_percent || ""} onChange={e => setEditingLoad({...editingLoad, dockage_percent: parseFloat(e.target.value)})} className={inputClass} /></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={updateLoad} className={btnPrimary}>Save Changes</button>
                  <button onClick={() => setEditingLoad(null)} className={btnGhost}>Cancel</button>
                </div>
              </FormCard>
            )}

            {/* Bulk Upload */}
            {showBulkUpload && (
              <FormCard title="Bulk Upload Loads" onClose={() => setShowBulkUpload(false)}>
                <p className="text-xs text-[#64748B]">Upload a CSV file with your load data. Driver, truck, and customer names must match your pre-populated lists exactly.</p>
                <button onClick={downloadTemplate} className="text-xs text-[#34D399] font-semibold hover:text-[#6EE7B7] flex items-center gap-1"><Download size={11} /> Download Template CSV</button>
                <input type="file" accept=".csv" onChange={handleBulkUpload} className="text-sm text-[#94A3B8]" />
                {bulkUploadError && <p className="text-xs text-[#EF4444] flex items-center gap-1"><XCircle size={12} /> {bulkUploadError}</p>}
              </FormCard>
            )}

            {/* Loads Table */}
            {grainLoads.length === 0 ? (
              <div className="text-center py-12">
                <Truck size={28} className="mx-auto text-[#475569] mb-2" />
                <p className="text-sm text-[#64748B]">No loads recorded yet — add your first load or bulk upload.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                      <th className="text-left pb-3 pr-3">Date</th>
                      <th className="text-left pb-3 pr-3">Driver</th>
                      <th className="text-left pb-3 pr-3">Truck</th>
                      <th className="text-left pb-3 pr-3">Customer</th>
                      <th className="text-left pb-3 pr-3">Contract</th>
                      <th className="text-left pb-3 pr-3">From</th>
                      <th className="text-left pb-3 pr-3">Crop</th>
                      <th className="text-right pb-3 pr-3">$/bu</th>
                      <th className="text-right pb-3 pr-3">Gross ({unitLabel})</th>
                      <th className="text-right pb-3 pr-3">Dockage</th>
                      <th className="text-right pb-3 pr-3">Net ({unitLabel})</th>
                      <th className="text-left pb-3 pr-3">Settlement</th>
                      <th className="pb-3 w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredLoads.map(load => (
                      <tr key={load.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 pr-3 text-[#64748B] font-mono text-[11px]">{load.date?.split("T")[0]}</td>
                        <td className="py-3 pr-3 font-medium text-[#F1F5F9]">{load.driver_name || "—"}</td>
                        <td className="py-3 pr-3 text-[#94A3B8]">{load.truck_name || "—"}</td>
                        <td className="py-3 pr-3 text-[#94A3B8]">{load.customer_name || "—"}</td>
                        <td className="py-3 pr-3 text-[#64748B]">{load.contract_reference || "—"}</td>
                        <td className="py-3 pr-3 text-[#64748B]">{load.from || "—"}</td>
                        <td className="py-3 pr-3 font-medium text-[#F1F5F9]">{load.crop || "—"}</td>
                        <td className="py-3 pr-3 text-right text-[#94A3B8]">{load.price_per_bushel ? `$${Number(load.price_per_bushel).toFixed(2)}` : "—"}</td>
                        <td className="py-3 pr-3 text-right font-mono font-medium text-[#F1F5F9]">{load.gross_weight_kg ? toDisplay(Number(load.gross_weight_kg)).toLocaleString("en-CA", { maximumFractionDigits: 0 }) : "—"}</td>
                        <td className="py-3 pr-3 text-right text-[#64748B]">{load.dockage_percent ? `${load.dockage_percent}%` : "—"}</td>
                        <td className="py-3 pr-3 text-right font-mono font-semibold text-[#34D399]">{load.net_weight_kg ? toDisplay(Number(load.net_weight_kg)).toLocaleString("en-CA", { maximumFractionDigits: 0 }) : "—"}</td>
                        <td className="py-3 pr-3 text-[#64748B]">{load.settlement_id || "—"}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingLoad(load)} className="text-[#475569] hover:text-[#34D399] transition-colors"><Pencil size={13} /></button>
                            <button onClick={() => deleteLoad(load.id)} className="text-[#475569] hover:text-[#EF4444] transition-colors"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Summary ribbon */}
                <div className="mt-3 flex items-center justify-end gap-8 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 text-sm">
                  {(filterFrom || filterTo) && (
                    <span className="text-[10px] text-[#475569] mr-auto">
                      Showing {filteredLoads.length} of {grainLoads.length} loads
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B] font-medium">Total Gross:</span>
                    <span className="font-bold font-mono text-[#F1F5F9]">{toDisplay(filteredGrossKg).toLocaleString("en-CA", { maximumFractionDigits: 0 })} {unitLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B] font-medium">Total Net:</span>
                    <span className="font-bold font-mono text-[#34D399]">{toDisplay(filteredNetKg).toLocaleString("en-CA", { maximumFractionDigits: 0 })} {unitLabel}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ SETTLEMENTS TAB ═══════════════ */}
        {activeTab === "settlements" && (
          <div className="p-6 space-y-4">
            {selectedSettlement && (
              <button onClick={() => { setSelectedSettlement(null); setSettlementLines([]); setSettlementAnalysis(null); }} className="flex items-center gap-1 text-sm text-[#64748B] hover:text-[#F1F5F9] mb-2 transition-colors">
                <ChevronLeft size={14} /> Back to all settlements
              </button>
            )}

            {!selectedSettlement && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className={btnPrimary + " cursor-pointer"}>
                    <Upload size={14} /> Upload Settlement PDF
                    <input type="file" accept=".pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) parseSettlement(file); e.target.value = ""; }} />
                  </label>
                  {settlementParsing && (
                    <span className="text-sm text-[#64748B] flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-[#34D399]" /> Parsing with AI... this may take 30-60 seconds
                    </span>
                  )}
                </div>
                {settlementError && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#EF4444]/[0.06] border border-[#EF4444]/15 text-[#EF4444] text-sm font-medium">
                    <XCircle size={14} /> {settlementError}
                  </div>
                )}

                {settlements.length === 0 && !settlementParsing ? (
                  <div className="text-center py-12">
                    <FileText size={28} className="mx-auto text-[#475569] mb-2" />
                    <p className="text-sm text-[#64748B]">No settlements yet — upload a PDF to get started.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                          <th className="text-left pb-3 pr-3">Settlement #</th>
                          <th className="text-left pb-3 pr-3">Terminal</th>
                          <th className="text-left pb-3 pr-3">Date</th>
                          <th className="text-left pb-3 pr-3">Crop</th>
                          <th className="text-right pb-3 pr-3">Loads</th>
                          <th className="text-right pb-3 pr-3">Net (MT)</th>
                          <th className="text-right pb-3 pr-3">Net Payable</th>
                          <th className="text-left pb-3 pr-3">Status</th>
                          <th className="text-left pb-3 pr-3">Flags</th>
                          <th className="pb-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {settlements.map((s) => {
                          const flags = typeof s.flags === "string" ? JSON.parse(s.flags) : s.flags || {};
                          const totalFlags = (flags.dockage_outliers || 0) + (flags.price_mismatches || 0) + (flags.math_errors || 0);
                          return (
                            <tr key={s.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => loadSettlementDetail(s.id)}>
                              <td className="py-3 pr-3 font-semibold text-[#F1F5F9]">{s.settlement_number || "—"}</td>
                              <td className="py-3 pr-3 text-[#94A3B8]">{s.terminal_name} {s.terminal_location ? `— ${s.terminal_location}` : ""}</td>
                              <td className="py-3 pr-3 text-[#64748B] font-mono text-[11px]">{s.issue_date?.split("T")[0]}</td>
                              <td className="py-3 pr-3"><span className="text-[10px] bg-[#34D399]/[0.08] text-[#34D399] font-semibold px-2 py-0.5 rounded-full">{s.crop}</span></td>
                              <td className="py-3 pr-3 text-right text-[#F1F5F9]">{s.total_loads}</td>
                              <td className="py-3 pr-3 text-right font-mono text-[#94A3B8]">{Number(s.total_net_weight_mt).toLocaleString("en-CA", { maximumFractionDigits: 1 })}</td>
                              <td className="py-3 pr-3 text-right font-semibold text-[#34D399]">${Number(s.net_payable).toLocaleString("en-CA", { maximumFractionDigits: 2 })}</td>
                              <td className="py-3 pr-3">
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  s.status === "posted" ? "bg-[#34D399]/[0.08] text-[#34D399]"
                                    : s.status === "reviewed" ? "bg-[#38BDF8]/[0.08] text-[#38BDF8]"
                                    : "bg-[#F59E0B]/[0.08] text-[#F59E0B]"
                                }`}>{s.status}</span>
                              </td>
                              <td className="py-3 pr-3">
                                {totalFlags > 0 ? (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#F59E0B]"><AlertTriangle size={12} /> {totalFlags}</span>
                                ) : (
                                  <CheckCircle size={13} className="text-[#34D399]" />
                                )}
                              </td>
                              <td className="py-3">
                                <button onClick={(e) => { e.stopPropagation(); deleteSettlement(s.id); }} className="text-[#475569] hover:text-[#EF4444] transition-colors"><Trash2 size={13} /></button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Settlement Detail View */}
            {selectedSettlement && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#F1F5F9]">
                      {selectedSettlement.terminal_name} — Settlement #{selectedSettlement.settlement_number}
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      {selectedSettlement.terminal_location} • {selectedSettlement.issue_date?.split("T")[0]} • {selectedSettlement.crop} • {selectedSettlement.grade || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedSettlement.status !== "posted" && (
                      <button onClick={() => postSettlementToLedger(selectedSettlement.id)} className={btnPrimary}>
                        <BookOpen size={14} /> Post to Ledger
                      </button>
                    )}
                    <span className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                      selectedSettlement.status === "posted" ? "bg-[#34D399]/[0.08] text-[#34D399]" : "bg-[#F59E0B]/[0.08] text-[#F59E0B]"
                    }`}>{selectedSettlement.status}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <KpiCard icon={DollarSign} label="Net Payable"
                    value={`$${Number(selectedSettlement.net_payable).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`}
                    sub={`Gross: $${Number(selectedSettlement.gross_payable).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`}
                    accent />
                  <KpiCard icon={Truck} label="Total Loads"
                    value={selectedSettlement.total_loads}
                    sub={`${Number(selectedSettlement.total_net_weight_mt).toLocaleString("en-CA", { maximumFractionDigits: 1 })} MT net`} />
                  <KpiCard icon={AlertTriangle} label="Avg Dockage"
                    value={`${Number(selectedSettlement.avg_dockage_pct).toFixed(2)}%`}
                    sub={`${Number(selectedSettlement.total_dockage_mt).toLocaleString("en-CA", { maximumFractionDigits: 1 })} MT total`}
                    highlight={Number(selectedSettlement.avg_dockage_pct) > 4} />
                  <KpiCard icon={BarChart3} label="Price / MT"
                    value={`$${Number(selectedSettlement.price_per_mt).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`}
                    sub={`${Number(selectedSettlement.total_bushels).toLocaleString()} bu total`} />
                </div>

                {/* Adjustment Details */}
                {settlementAnalysis?.adjustment_details && settlementAnalysis.adjustment_details.length > 0 && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="font-mono text-[10px] font-semibold text-[#94A3B8] uppercase tracking-[1.5px] mb-3">Adjustments / Deductions</p>
                    <div className="space-y-1.5">
                      {settlementAnalysis.adjustment_details.map((adj: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-[#94A3B8]">{adj.name}</span>
                          <span className={`font-medium font-mono ${adj.amount < 0 ? "text-[#EF4444]" : "text-[#F1F5F9]"}`}>${adj.amount.toLocaleString("en-CA", { maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flag Summary */}
                {(() => {
                  const flags = typeof selectedSettlement.flags === "string" ? JSON.parse(selectedSettlement.flags) : selectedSettlement.flags || {};
                  const totalFlags = (flags.dockage_outliers || 0) + (flags.price_mismatches || 0) + (flags.math_errors || 0) + (flags.partial_loads || 0);
                  if (totalFlags === 0) return (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#34D399]/[0.06] border border-[#34D399]/15 text-[#34D399] text-sm font-medium">
                      <ShieldCheck size={14} /> No irregularities found — all loads look clean
                    </div>
                  );
                  return (
                    <div className="p-3 rounded-xl bg-[#F59E0B]/[0.04] border border-[#F59E0B]/15 text-sm space-y-1">
                      <p className="font-semibold text-[#F59E0B] flex items-center gap-1"><AlertTriangle size={14} /> {totalFlags} flag{totalFlags > 1 ? "s" : ""} detected</p>
                      {flags.dockage_outliers > 0 && <p className="text-[#94A3B8]">• {flags.dockage_outliers} dockage outlier{flags.dockage_outliers > 1 ? "s" : ""} (above 1.5x average)</p>}
                      {flags.price_mismatches > 0 && <p className="text-[#94A3B8]">• {flags.price_mismatches} price mismatch{flags.price_mismatches > 1 ? "es" : ""}</p>}
                      {flags.math_errors > 0 && <p className="text-[#94A3B8]">• {flags.math_errors} math discrepanc{flags.math_errors > 1 ? "ies" : "y"}</p>}
                      {flags.partial_loads > 0 && <p className="text-[#94A3B8]">• {flags.partial_loads} partial load{flags.partial_loads > 1 ? "s" : ""} (&lt;50% avg weight)</p>}
                    </div>
                  );
                })()}

                {/* Line Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[1.5px] border-b border-white/[0.06]">
                        <th className="text-left pb-3 pr-3">#</th>
                        <th className="text-left pb-3 pr-3">Date</th>
                        <th className="text-left pb-3 pr-3">Receipt/CPER</th>
                        <th className="text-right pb-3 pr-3">Unload (MT)</th>
                        <th className="text-right pb-3 pr-3">Dockage %</th>
                        <th className="text-right pb-3 pr-3">Dockage (MT)</th>
                        <th className="text-right pb-3 pr-3">Net (MT)</th>
                        <th className="text-right pb-3 pr-3">Moisture</th>
                        <th className="text-right pb-3 pr-3">$/MT</th>
                        <th className="text-right pb-3">Gross $</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {settlementLines.map((line) => {
                        const flags = typeof line.flags === "string" ? JSON.parse(line.flags) : line.flags || {};
                        const hasFlag = flags.dockage_outlier || flags.dockage_high || flags.price_mismatch || flags.math_error || flags.partial_load;
                        const isRed = flags.dockage_outlier === "red";
                        const isAmber = flags.dockage_high === "amber" || flags.price_mismatch || flags.partial_load;
                        const rowBg = isRed ? "bg-[#EF4444]/[0.04]" : isAmber ? "bg-[#F59E0B]/[0.04]" : "hover:bg-white/[0.02]";
                        return (
                          <tr key={line.id} className={rowBg + " transition-colors"}>
                            <td className="py-2.5 pr-3 text-[#64748B]">
                              {line.line_number}
                              {hasFlag && <AlertTriangle size={11} className={`inline ml-1 ${isRed ? "text-[#EF4444]" : "text-[#F59E0B]"}`} />}
                            </td>
                            <td className="py-2.5 pr-3 text-[#64748B] font-mono text-[11px]">{line.delivery_date?.split("T")[0]}</td>
                            <td className="py-2.5 pr-3 font-medium text-[#F1F5F9]">{line.receipt_number || line.cper_number || "—"}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-[#94A3B8]">{line.unload_weight_mt ? Number(line.unload_weight_mt).toFixed(3) : "—"}</td>
                            <td className={`py-2.5 pr-3 text-right font-mono font-medium ${isRed ? "text-[#EF4444] font-bold" : isAmber && flags.dockage_high ? "text-[#F59E0B] font-bold" : "text-[#94A3B8]"}`}>
                              {line.dockage_pct ? `${Number(line.dockage_pct).toFixed(2)}%` : "—"}
                            </td>
                            <td className="py-2.5 pr-3 text-right font-mono text-[#64748B]">{line.dockage_mt ? Number(line.dockage_mt).toFixed(3) : "—"}</td>
                            <td className="py-2.5 pr-3 text-right font-mono font-semibold text-[#34D399]">{line.net_weight_mt ? Number(line.net_weight_mt).toFixed(3) : "—"}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-[#64748B]">{line.moisture_pct ? `${Number(line.moisture_pct).toFixed(1)}%` : "—"}</td>
                            <td className="py-2.5 pr-3 text-right font-mono text-[#94A3B8]">${line.price_per_mt ? Number(line.price_per_mt).toFixed(2) : "—"}</td>
                            <td className="py-2.5 text-right font-mono font-medium text-[#F1F5F9]">${line.gross_amount ? Number(line.gross_amount).toLocaleString("en-CA", { maximumFractionDigits: 2 }) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === "bin_map" && (
          <div className="p-6">
            <BinMap />
          </div>
        )}
      </div>
    </div>
  );
}