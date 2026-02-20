"use client";

import { useState, useEffect, useCallback } from 'react';
import { useUser } from "@clerk/nextjs";
import { Plus, Trash2, Package, TrendingUp, ArrowRightLeft } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"holdings" | "contracts" | "movements">("holdings");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [showAddMovement, setShowAddMovement] = useState(false);

  const [newHolding, setNewHolding] = useState<Holding>({ crop: "Canola", location: "", quantity_bu: 0, grade: "#1", moisture: 0, estimated_price: 0 });
  const [newContract, setNewContract] = useState<Contract>({ crop: "Canola", contract_type: "Cash Sale", quantity_bu: 0, price_per_bu: 0, elevator: "" });
  const [newMovement, setNewMovement] = useState<Movement>({ movement_type: "Delivery Out", crop: "Canola", quantity_bu: 0, movement_date: new Date().toISOString().split("T")[0] });

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
}, [headers])

  useEffect(() => {
    if (!user?.id) return;
    loadAll();
  }, [user?.id]);

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

  const totalBu = holdings.reduce((sum, h) => sum + Number(h.quantity_bu), 0);
  const totalValue = holdings.reduce((sum, h) => sum + Number(h.quantity_bu) * Number(h.estimated_price || 0), 0);
  const totalContracted = contracts.reduce((sum, c) => sum + Number(c.quantity_bu), 0);
  const unpriced = totalBu - totalContracted;
  function exportCSV() {
  const tab = activeTab;
  let rows: string[] = [];
  if (tab === "holdings") {
    rows = ["Crop,Location,Quantity (bu),Grade,Moisture,Est. Price,Value",
      ...holdings.map(h => `${h.crop},${h.location},${h.quantity_bu},${h.grade || ""},${h.moisture || ""},$${h.estimated_price || 0},$${(Number(h.quantity_bu) * Number(h.estimated_price || 0)).toFixed(0)}`)
    ];
  } else if (tab === "contracts") {
    rows = ["Crop,Type,Quantity (bu),Price/bu,Elevator,Delivery,Value",
      ...contracts.map(c => `${c.crop},${c.contract_type},${c.quantity_bu},$${c.price_per_bu || ""},${c.elevator || ""},${c.delivery_date || ""},$${(Number(c.quantity_bu) * Number(c.price_per_bu || 0)).toFixed(0)}`)
    ];
  } else {
    rows = ["Date,Type,Crop,Quantity (bu),From,To",
      ...movements.map(m => `${m.movement_date},${m.movement_type},${m.crop},${m.quantity_bu},${m.from_location || ""},${m.to_location || ""}`)
    ];
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
    <p className="text-sm text-[#7A8A7C] mt-1">Current holdings, contracted sales, and movement log</p>
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={exportCSV}
      className="flex items-center gap-2 text-sm font-semibold text-[#4A7C59] bg-[#EEF5F0] border border-[#C8DDD0] px-4 py-2.5 rounded-full hover:bg-[#DDE3D6] transition-colors"
    >
      Export CSV
    </button>
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
  </div>
</div>

      {/* KPI Strip */}
      <div className="grid grid-cols-4 gap-4">
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
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm overflow-hidden">
        <div className="flex border-b border-[#E4E7E0]">
          {([
            { key: "holdings", label: "Holdings", icon: Package },
            { key: "contracts", label: "Contracts", icon: TrendingUp },
            { key: "movements", label: "Movement Log", icon: ArrowRightLeft },
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

            {/* Crop Summary */}
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
      </div>
    </div>
  );
}