"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Save, Plus, Trash2 } from "lucide-react";

const CROPS = ["Canola", "CWRS Wheat", "Durum", "Barley", "Oats", "Peas", "Lentils", "Flax", "Soybeans", "Corn"];
const PROVINCES = ["Alberta", "Saskatchewan", "Manitoba", "Ontario"];
const SOIL_ZONES = ["Dark Brown", "Brown", "Black", "Grey", "Thin Black"];
const RISK_PROFILES = ["Conservative", "Balanced", "Aggressive"];

type InventoryMode = "on_hand" | "forecast";

type CropEntry = {
  crop: string;
  mode: InventoryMode;
  bushels: number;
  acres: number;
  aph: number;
  targetPrice: number;
  landRent: number;
  equipmentDepreciation: number;
  insurance: number;
  propertyTax: number;
  overhead: number;
  seed: number;
  fertilizer: number;
  herbicide: number;
  fungicide: number;
  insecticide: number;
  fuel: number;
  drying: number;
  trucking: number;
  elevation: number;
  cropInsurance: number;
};

type FarmProfile = {
  farmName: string;
  province: string;
  soilZone: string;
  totalAcres: number;
  storageCapacity: number;
  primaryElevator: string;
  riskProfile: string;
  inventory: CropEntry[];
};

const defaultCrop = (): CropEntry => ({
  crop: "", mode: "forecast", bushels: 0, acres: 0, aph: 0, targetPrice: 0,
  landRent: 0, equipmentDepreciation: 0, insurance: 0, propertyTax: 0, overhead: 0,
  seed: 0, fertilizer: 0, herbicide: 0, fungicide: 0, insecticide: 0,
  fuel: 0, drying: 0, trucking: 0, elevation: 0, cropInsurance: 0,
});

function calcCrop(c: CropEntry) {
  const bu = c.mode === "on_hand" ? (c.bushels || 0) : (c.acres || 0) * (c.aph || 0);
  const acres = c.mode === "on_hand" ? 0 : (c.acres || 0);
  const fixedPerAcre = (c.landRent || 0) + (c.equipmentDepreciation || 0) + (c.insurance || 0) + (c.propertyTax || 0) + (c.overhead || 0);
  const variablePerAcre = (c.seed || 0) + (c.fertilizer || 0) + (c.herbicide || 0) + (c.fungicide || 0) + (c.insecticide || 0) + (c.fuel || 0) + (c.drying || 0) + (c.trucking || 0) + (c.elevation || 0) + (c.cropInsurance || 0);
  const totalCostPerAcre = fixedPerAcre + variablePerAcre;
  const totalCost = totalCostPerAcre * acres;
  const grossRevenue = bu * (c.targetPrice || 0);
  const netProfit = grossRevenue - totalCost;
  const breakEven = acres > 0 && (c.aph || 0) > 0 ? totalCostPerAcre / c.aph : 0;
  return { bu, acres, fixedPerAcre, variablePerAcre, totalCostPerAcre, totalCost, grossRevenue, netProfit, breakEven };
}

function fmt(n: number) {
  const safe = isNaN(n) || !isFinite(n) ? 0 : n;
  return `$${Math.abs(safe).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
export default function FarmProfilePage() {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<FarmProfile>({
    farmName: "",
    province: "Saskatchewan",
    soilZone: "Black",
    totalAcres: 0,
    storageCapacity: 0,
    primaryElevator: "",
    riskProfile: "Balanced",
    inventory: [defaultCrop()],
  });

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/farm-profile", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((data) => { if (data.profile) setProfile(data.profile); });
  }, [user?.id]);

  async function saveProfile() {
    if (!user?.id) return;
    setSaving(true);
    await fetch("/api/farm-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({ profile }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function updateCrop(index: number, field: string, value: unknown) {
    const updated = [...profile.inventory];
    updated[index] = { ...updated[index], [field]: value };
    setProfile({ ...profile, inventory: updated });
  }

  function addCrop() {
    setProfile({ ...profile, inventory: [...profile.inventory, defaultCrop()] });
  }

  function removeCrop(index: number) {
    setProfile({ ...profile, inventory: profile.inventory.filter((_, i) => i !== index) });
  }

  const totalGross = profile.inventory.reduce((sum, c) => sum + calcCrop(c).grossRevenue, 0);
  const totalCost = profile.inventory.reduce((sum, c) => sum + calcCrop(c).totalCost, 0);
  const totalNet = totalGross - totalCost;

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Farm Profile</h1>
          <p className="text-[#7A8A7C] text-sm mt-1">Lily uses this to personalize every recommendation to your operation</p>
        </div>
        <button
          onClick={saveProfile}
          className="flex items-center gap-2 bg-[#4A7C59] text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-[#3d6b4a] transition-colors"
        >
          <Save size={14} />
          {saving ? "Saving..." : saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </div>

      {/* Profit Summary Strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Gross Revenue</p>
          <p className="text-2xl font-bold text-[#222527] mt-1">{fmt(totalGross)}</p>
          <p className="text-xs text-[#7A8A7C] mt-1">CAD · all crops</p>
        </div>
        <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Total Costs</p>
          <p className="text-2xl font-bold text-[#222527] mt-1">{fmt(totalCost)}</p>
          <p className="text-xs text-[#7A8A7C] mt-1">CAD · fixed + variable</p>
        </div>
        <div className={`rounded-[20px] border shadow-sm p-5 ${totalNet >= 0 ? "bg-[#EEF5F0] border-[#C8DDD0]" : "bg-[#FDEEED] border-[#F5C6C2]"}`}>
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Net Profit</p>
          <p className={`text-2xl font-bold mt-1 ${totalNet >= 0 ? "text-[#4A7C59]" : "text-[#D94F3D]"}`}>
            {totalNet < 0 ? "-" : ""}{fmt(totalNet)}
          </p>
          <p className="text-xs text-[#7A8A7C] mt-1">CAD · estimated</p>
        </div>
      </div>

      {/* Farm Details */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-6 space-y-5">
        <h2 className="text-sm font-bold text-[#222527]">Farm Details</h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Farm Name", key: "farmName", type: "text", placeholder: "Murphy Farms" },
            { label: "Total Acres", key: "totalAcres", type: "number", placeholder: "3200" },
            { label: "Storage Capacity (bu)", key: "storageCapacity", type: "number", placeholder: "50000" },
            { label: "Primary Elevator", key: "primaryElevator", type: "text", placeholder: "Viterra Yorkton" },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{f.label}</label>
              <input
                type={f.type}
                value={(profile as never)[f.key] || ""}
                onChange={(e) => setProfile({ ...profile, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                placeholder={f.placeholder}
                className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59]"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Province</label>
            <select value={profile.province} onChange={(e) => setProfile({ ...profile, province: e.target.value })} className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white">
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Soil Zone</label>
            <select value={profile.soilZone} onChange={(e) => setProfile({ ...profile, soilZone: e.target.value })} className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white">
              {SOIL_ZONES.map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Risk Profile</label>
          <div className="flex gap-2">
            {RISK_PROFILES.map((r) => (
              <button key={r} onClick={() => setProfile({ ...profile, riskProfile: r })}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-colors ${profile.riskProfile === r ? "bg-[#4A7C59] text-white border-[#4A7C59]" : "bg-white text-[#7A8A7C] border-[#E4E7E0] hover:border-[#4A7C59]"}`}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Crop Tabs */}
      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E7E0]">
          <h2 className="text-sm font-bold text-[#222527]">Crops, Inventory & Cost Calculator</h2>
          <button onClick={addCrop} className="flex items-center gap-1 text-xs font-semibold text-[#4A7C59] hover:text-[#3d6b4a]">
            <Plus size={12} /> Add Crop
          </button>
        </div>

        {/* Crop Tab Headers */}
        <div className="flex border-b border-[#E4E7E0] px-6 gap-2 overflow-x-auto">
          {profile.inventory.map((c, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`text-xs font-semibold px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${activeTab === i ? "border-[#4A7C59] text-[#4A7C59]" : "border-transparent text-[#7A8A7C] hover:text-[#222527]"}`}>
              {c.crop || `Crop ${i + 1}`}
            </button>
          ))}
        </div>

        {profile.inventory.map((crop, index) => {
          if (index !== activeTab) return null;
          const calc = calcCrop(crop);
          return (
            <div key={index} className="p-6 space-y-6">
              {/* Crop Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <select value={crop.crop} onChange={(e) => updateCrop(index, "crop", e.target.value)}
                    className="text-sm font-semibold border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white">
                    <option value="">Select crop</option>
                    {CROPS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <div className="flex rounded-full border border-[#E4E7E0] overflow-hidden">
                    {(["on_hand", "forecast"] as InventoryMode[]).map((mode) => (
                      <button key={mode} onClick={() => updateCrop(index, "mode", mode)}
                        className={`text-xs font-semibold px-4 py-1.5 transition-colors ${crop.mode === mode ? "bg-[#4A7C59] text-white" : "text-[#7A8A7C] hover:bg-[#F5F5F3]"}`}>
                        {mode === "on_hand" ? "On Hand" : "Forecast"}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => removeCrop(index)} className="text-xs text-[#D94F3D] hover:text-red-700 flex items-center gap-1">
                  <Trash2 size={12} /> Remove
                </button>
              </div>

              {/* Inventory Inputs */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-[#F5F5F3] rounded-[12px]">
                {crop.mode === "on_hand" ? (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Bushels On Hand</label>
                    <input type="number" value={crop.bushels || ""} onChange={(e) => updateCrop(index, "bushels", Number(e.target.value))}
                      placeholder="0" className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Acres</label>
                      <input type="number" value={crop.acres || ""} onChange={(e) => updateCrop(index, "acres", Number(e.target.value))}
                        placeholder="0" className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">APH (bu/ac)</label>
                      <input type="number" value={crop.aph || ""} onChange={(e) => updateCrop(index, "aph", Number(e.target.value))}
                        placeholder="0" className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Forecast (bu)</label>
                      <div className="text-sm font-bold text-[#4A7C59] px-3 py-2">{(crop.acres * crop.aph).toLocaleString()} bu</div>
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Target Price ($/bu)</label>
                  <input type="number" value={crop.targetPrice || ""} onChange={(e) => updateCrop(index, "targetPrice", Number(e.target.value))}
                    placeholder="0.00" step="0.01" className="w-full text-sm border border-[#E4E7E0] rounded-[10px] px-3 py-2 outline-none focus:border-[#4A7C59] bg-white" />
                </div>
              </div>

              {/* Costs */}
              <div className="grid grid-cols-2 gap-6">
                {/* Fixed Costs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#222527] uppercase tracking-wide">Fixed Costs ($/acre)</h3>
                  {[
                    { label: "Land Rent / Mortgage", key: "landRent" },
                    { label: "Equipment Depreciation", key: "equipmentDepreciation" },
                    { label: "Insurance", key: "insurance" },
                    { label: "Property Tax", key: "propertyTax" },
                    { label: "Overhead / Admin", key: "overhead" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-4">
                      <label className="text-xs text-[#7A8A7C] flex-1">{f.label}</label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#7A8A7C]">$</span>
                        <input type="number" value={(crop as never)[f.key] || ""}
                          onChange={(e) => updateCrop(index, f.key, Number(e.target.value))}
                          placeholder="0" className="w-24 text-sm text-right border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 outline-none focus:border-[#4A7C59]" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E4E7E0]">
                    <span className="text-xs font-bold text-[#222527]">Total Fixed</span>
                    <span className="text-sm font-bold text-[#222527]">{fmt(calc.fixedPerAcre)}/ac</span>
                  </div>
                </div>

                {/* Variable Costs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#222527] uppercase tracking-wide">Variable Costs ($/acre)</h3>
                  {[
                    { label: "Seed", key: "seed" },
                    { label: "Fertilizer (N/P/K/S)", key: "fertilizer" },
                    { label: "Herbicide", key: "herbicide" },
                    { label: "Fungicide", key: "fungicide" },
                    { label: "Insecticide", key: "insecticide" },
                    { label: "Fuel & Labour", key: "fuel" },
                    { label: "Drying", key: "drying" },
                    { label: "Trucking", key: "trucking" },
                    { label: "Elevation Fees", key: "elevation" },
                    { label: "Crop Insurance Premium", key: "cropInsurance" },
                  ].map((f) => (
                    <div key={f.key} className="flex items-center justify-between gap-4">
                      <label className="text-xs text-[#7A8A7C] flex-1">{f.label}</label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#7A8A7C]">$</span>
                        <input type="number" value={(crop as never)[f.key] || ""}
                          onChange={(e) => updateCrop(index, f.key, Number(e.target.value))}
                          placeholder="0" className="w-24 text-sm text-right border border-[#E4E7E0] rounded-[8px] px-2 py-1.5 outline-none focus:border-[#4A7C59]" />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E4E7E0]">
                    <span className="text-xs font-bold text-[#222527]">Total Variable</span>
                    <span className="text-sm font-bold text-[#222527]">{fmt(calc.variablePerAcre)}/ac</span>
                  </div>
                </div>
              </div>

              {/* Crop Profit Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-[#F5F5F3] rounded-[12px]">
                <div>
                  <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Total Cost/Acre</p>
                  <p className="text-lg font-bold text-[#222527] mt-1">{fmt(calc.totalCostPerAcre)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Break-Even ($/bu)</p>
                  <p className="text-lg font-bold text-[#222527] mt-1">{fmt(calc.breakEven)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Gross Revenue</p>
                  <p className="text-lg font-bold text-[#222527] mt-1">{fmt(calc.grossRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Net Profit</p>
                  <p className={`text-lg font-bold mt-1 ${calc.netProfit >= 0 ? "text-[#4A7C59]" : "text-[#D94F3D]"}`}>
                    {calc.netProfit < 0 ? "-" : ""}{fmt(calc.netProfit)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}