"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Save, Plus, Trash2, CheckCircle, RefreshCw, ChevronDown } from "lucide-react";

// Standardized to crop-colors.ts — the platform-wide source of truth
import { CANONICAL_CROPS } from "@/lib/crop-colors";

const CROPS = CANONICAL_CROPS;

// Map legacy names to standardized names (for existing saved profiles)
const CROP_NAME_MAP: Record<string, string> = {
  "CWRS Wheat": "HRS Wheat",
  "Lentils": "Large Green Lentils",
  Soybeans: "Peas",
  Corn: "Barley",
};

function migrateCropName(name: string): string {
  return CROP_NAME_MAP[name] || name;
}

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
  actualYield: number;
};

type FarmProfile = {
  farmName: string;
  province: string;
  soilZone: string;
  totalAcres: number;
  storageCapacity: number;
  primaryElevator: string;
  riskProfile: string;
  cropYear: number;
  inventory: CropEntry[];
};

const defaultCrop = (): CropEntry => ({
  crop: "",
  mode: "forecast",
  bushels: 0,
  acres: 0,
  aph: 0,
  targetPrice: 0,
  landRent: 0,
  equipmentDepreciation: 0,
  insurance: 0,
  propertyTax: 0,
  overhead: 0,
  seed: 0,
  fertilizer: 0,
  herbicide: 0,
  fungicide: 0,
  insecticide: 0,
  fuel: 0,
  drying: 0,
  trucking: 0,
  elevation: 0,
  cropInsurance: 0,
  actualYield: 0,
});

function calcCrop(c: CropEntry) {
  const bu =
    c.mode === "on_hand" ? c.bushels || 0 : (c.acres || 0) * (c.aph || 0);
  const acres = c.mode === "on_hand" ? 0 : c.acres || 0;
  const fixedPerAcre =
    (c.landRent || 0) +
    (c.equipmentDepreciation || 0) +
    (c.insurance || 0) +
    (c.propertyTax || 0) +
    (c.overhead || 0);
  const variablePerAcre =
    (c.seed || 0) +
    (c.fertilizer || 0) +
    (c.herbicide || 0) +
    (c.fungicide || 0) +
    (c.insecticide || 0) +
    (c.fuel || 0) +
    (c.drying || 0) +
    (c.trucking || 0) +
    (c.elevation || 0) +
    (c.cropInsurance || 0);
  const totalCostPerAcre = fixedPerAcre + variablePerAcre;
  const totalCost = totalCostPerAcre * acres;
  const grossRevenue = bu * (c.targetPrice || 0);
  const netProfit = grossRevenue - totalCost;
  const breakEven =
    acres > 0 && (c.aph || 0) > 0 ? totalCostPerAcre / c.aph : 0;
  return {
    bu,
    acres,
    fixedPerAcre,
    variablePerAcre,
    totalCostPerAcre,
    totalCost,
    grossRevenue,
    netProfit,
    breakEven,
  };
}

function fmt(n: number) {
  const safe = isNaN(n) || !isFinite(n) ? 0 : n;
  return `$${Math.abs(safe).toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const inputClass =
  "w-full text-sm border border-[var(--ag-border-solid)] rounded-[10px] px-3 py-2 outline-none focus:border-[var(--ag-accent)]/50 bg-[var(--ag-bg-hover)] text-ag-primary placeholder:text-ag-muted";
const selectClass =
  "w-full text-sm border border-[var(--ag-border-solid)] rounded-[10px] px-3 py-2 outline-none focus:border-[var(--ag-accent)]/50 bg-[var(--ag-bg-card)] text-ag-primary";
const costInputClass =
  "w-24 text-sm text-right border border-[var(--ag-border-solid)] rounded-[8px] px-2 py-1.5 outline-none focus:border-[var(--ag-accent)]/50 bg-[var(--ag-bg-hover)] text-ag-primary";

// Generate crop year options (current year -2 to +1)
const currentYear = new Date().getFullYear();
const CROP_YEARS = [
  currentYear + 1,
  currentYear,
  currentYear - 1,
  currentYear - 2,
];

export default function FarmProfilePage() {
  const { user } = useUser();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "synced" | "error"
  >("idle");
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState<FarmProfile>({
    farmName: "",
    province: "Saskatchewan",
    soilZone: "Black",
    totalAcres: 0,
    storageCapacity: 0,
    primaryElevator: "",
    riskProfile: "Balanced",
    cropYear: currentYear,
    inventory: [defaultCrop()],
  });

  useEffect(() => {
    if (!user?.id) return;
    fetch("/api/farm-profile", { headers: { "x-user-id": user.id } })
      .then((r) => r.json())
      .then((data) => {
        if (data.profile) {
          // Migrate legacy crop names
          const migratedProfile = {
            ...data.profile,
            cropYear: data.profile.cropYear || currentYear,
            inventory: (data.profile.inventory || [defaultCrop()]).map(
              (c: CropEntry) => ({
                ...c,
                crop: migrateCropName(c.crop),
              })
            ),
          };
          setProfile(migratedProfile);
        }
      });
  }, [user?.id]);

  // Sync crop inventory to crop_plans table for Marketing
  async function syncCropPlans() {
    if (!user?.id) return;

    // Filter to only forecast crops with valid data
    const cropEntries = profile.inventory
      .filter(
        (c) =>
          c.crop &&
          CROPS.includes(c.crop) &&
          ((c.mode === "forecast" && c.acres > 0 && c.aph > 0) ||
            (c.mode === "on_hand" && c.bushels > 0))
      )
      .map((c) => ({
        crop: c.crop,
        crop_year: profile.cropYear,
        acres: c.mode === "forecast" ? c.acres : 0,
        target_yield_bu: c.mode === "forecast" ? c.aph : c.bushels,
        actual_yield_bu: c.actualYield > 0 ? c.actualYield : null, // on_hand: store total bu as yield with 1 acre
        notes:
          c.mode === "on_hand"
            ? `On-hand inventory: ${c.bushels.toLocaleString()} bu`
            : undefined,
      }));

    if (cropEntries.length === 0) return;

    setSyncing(true);
    try {
      const res = await fetch("/api/farm/crop-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user.id,
        },
        body: JSON.stringify(cropEntries),
      });

      if (res.ok) {
        setSyncStatus("synced");
        setTimeout(() => setSyncStatus("idle"), 4000);
      } else {
        setSyncStatus("error");
        setTimeout(() => setSyncStatus("idle"), 4000);
      }
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 4000);
    }
    setSyncing(false);
  }

  async function saveProfile() {
    if (!user?.id) return;
    setSaving(true);

    // Save JSONB profile
    await fetch("/api/farm-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({ profile }),
    });

    // Sync to crop_plans for Marketing
    await syncCropPlans();

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
    setProfile({
      ...profile,
      inventory: [...profile.inventory, defaultCrop()],
    });
    setActiveTab(profile.inventory.length);
  }

  function removeCrop(index: number) {
    const updated = profile.inventory.filter((_, i) => i !== index);
    setProfile({ ...profile, inventory: updated });
    if (activeTab >= updated.length) setActiveTab(Math.max(0, updated.length - 1));
  }

  const totalGross = profile.inventory.reduce(
    (sum, c) => sum + calcCrop(c).grossRevenue,
    0
  );
  const totalCost = profile.inventory.reduce(
    (sum, c) => sum + calcCrop(c).totalCost,
    0
  );
  const totalNet = totalGross - totalCost;
  const totalAcresPlanted = profile.inventory.reduce(
    (sum, c) => sum + (c.mode === "forecast" ? c.acres || 0 : 0),
    0
  );
  const totalProduction = profile.inventory.reduce(
    (sum, c) => sum + calcCrop(c).bu,
    0
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">
            Farm Profile
          </h1>
          <p className="text-[13px] text-ag-muted mt-1">
            Lily uses this to personalize every recommendation to your operation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Sync Status Indicator */}
          {syncStatus === "synced" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--ag-green)] bg-[var(--ag-accent)]/[0.08] px-3 py-1.5 rounded-full border border-[var(--ag-accent-border)]">
              <RefreshCw size={11} />
              Synced to Marketing
            </span>
          )}
          {syncStatus === "error" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--ag-red)] bg-[var(--ag-red-dim)] px-3 py-1.5 rounded-full border border-[var(--ag-red)]/20">
              Sync failed
            </span>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-200"
            style={{
              background: saved
                ? "rgba(52,211,153,0.12)"
                : "linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover))",
              color: saved ? "var(--ag-green)" : "var(--ag-bg-base)",
              border: saved ? "1px solid rgba(52,211,153,0.25)" : "none",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saved ? (
              <CheckCircle size={14} />
            ) : syncing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving
              ? "Saving & Syncing..."
              : saved
                ? "Saved & Synced"
                : "Save Profile"}
          </button>
        </div>
      </div>

      {/* Profit Summary Strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[11px] font-bold text-ag-primary uppercase tracking-[1.5px]">
            Gross Revenue
          </p>
          <p className="text-2xl font-bold text-ag-primary mt-1">
            {fmt(totalGross)}
          </p>
          <p className="text-xs text-ag-muted mt-1">CAD · all crops</p>
        </div>
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[11px] font-bold text-ag-primary uppercase tracking-[1.5px]">
            Total Costs
          </p>
          <p className="text-2xl font-bold text-ag-primary mt-1">
            {fmt(totalCost)}
          </p>
          <p className="text-xs text-ag-muted mt-1">CAD · fixed + variable</p>
        </div>
        <div
          className={`rounded-xl border p-5 ${totalNet >= 0 ? "bg-[var(--ag-accent)]/[0.06] border-[var(--ag-accent-border)]" : "bg-[var(--ag-red)]/[0.06] border-[var(--ag-red)]/20"}`}
        >
          <p className="font-mono text-[11px] font-bold text-ag-primary uppercase tracking-[1.5px]">
            Net Profit
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${totalNet >= 0 ? "text-[var(--ag-green)]" : "text-[var(--ag-red)]"}`}
          >
            {totalNet < 0 ? "-" : ""}
            {fmt(totalNet)}
          </p>
          <p className="text-xs text-ag-muted mt-1">CAD · estimated</p>
        </div>
        <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-5">
          <p className="font-mono text-[11px] font-bold text-ag-primary uppercase tracking-[1.5px]">
            Total Production
          </p>
          <p className="text-2xl font-bold text-ag-primary mt-1">
            {totalProduction.toLocaleString()}
          </p>
          <p className="text-xs text-ag-muted mt-1">
            bushels · {totalAcresPlanted.toLocaleString()} acres
          </p>
        </div>
      </div>

      {/* Farm Details */}
      <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] p-6 space-y-5">
        <h2 className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">
          Farm Details
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Farm Name",
              key: "farmName",
              type: "text",
              placeholder: "Murphy Farms",
            },
            {
              label: "Total Acres",
              key: "totalAcres",
              type: "number",
              placeholder: "3200",
            },
            {
              label: "Storage Capacity (bu)",
              key: "storageCapacity",
              type: "number",
              placeholder: "50000",
            },
            {
              label: "Primary Elevator",
              key: "primaryElevator",
              type: "text",
              placeholder: "Viterra Yorkton",
            },
          ].map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                {f.label}
              </label>
              <input
                type={f.type}
                value={(profile as never)[f.key] || ""}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    [f.key]:
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
                placeholder={f.placeholder}
                className={inputClass}
              />
            </div>
          ))}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
              Province
            </label>
            <select
              value={profile.province}
              onChange={(e) =>
                setProfile({ ...profile, province: e.target.value })
              }
              className={selectClass}
            >
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
              Soil Zone
            </label>
            <select
              value={profile.soilZone}
              onChange={(e) =>
                setProfile({ ...profile, soilZone: e.target.value })
              }
              className={selectClass}
            >
              {SOIL_ZONES.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
            Risk Profile
          </label>
          <div className="flex gap-2">
            {RISK_PROFILES.map((r) => (
              <button
                key={r}
                onClick={() => setProfile({ ...profile, riskProfile: r })}
                className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-200 ${
                  profile.riskProfile === r
                    ? "bg-[var(--ag-accent)] text-[var(--ag-accent-text)] border-[var(--ag-accent)]"
                    : "bg-transparent text-ag-muted border-[var(--ag-border-solid)] hover:text-[var(--ag-text-secondary)] hover:border-white/[0.15]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Crop Tabs */}
      <div className="bg-[var(--ag-bg-card)] rounded-xl border border-[var(--ag-border)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ag-border)]">
          <div className="flex items-center gap-4">
            <h2 className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">
              Crops, Inventory & Cost Calculator
            </h2>
            {/* Crop Year Selector */}
            <div className="relative">
              <select
                value={profile.cropYear}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    cropYear: Number(e.target.value),
                  })
                }
                className="appearance-none text-xs font-semibold bg-[var(--ag-bg-hover)] border border-[var(--ag-border-solid)] rounded-full px-3 py-1.5 pr-7 text-ag-primary outline-none focus:border-[var(--ag-accent)]/50 cursor-pointer"
              >
                {CROP_YEARS.map((y) => (
                  <option key={y} value={y} className="bg-[var(--ag-bg-card)]">
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={10}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ag-muted pointer-events-none"
              />
            </div>
          </div>
          <button
            onClick={addCrop}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--ag-green)] hover:text-[var(--ag-green)] transition-colors"
          >
            <Plus size={12} /> Add Crop
          </button>
        </div>

        {/* Crop Tab Headers */}
        <div className="flex border-b border-[var(--ag-border)] px-6 gap-2 overflow-x-auto">
          {profile.inventory.map((c, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`text-xs font-semibold px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === i
                  ? "border-[var(--ag-accent)] text-[var(--ag-green)]"
                  : "border-transparent text-ag-muted hover:text-[var(--ag-text-secondary)]"
              }`}
            >
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
                  <select
                    value={crop.crop}
                    onChange={(e) =>
                      updateCrop(index, "crop", e.target.value)
                    }
                    className="text-sm font-semibold border border-[var(--ag-border-solid)] rounded-[10px] px-3 py-2 outline-none focus:border-[var(--ag-accent)]/50 bg-[var(--ag-bg-card)] text-ag-primary"
                  >
                    <option value="">Select crop</option>
                    {CROPS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <div className="flex rounded-full border border-[var(--ag-border-solid)] overflow-hidden">
                    {(["on_hand", "forecast"] as InventoryMode[]).map(
                      (mode) => (
                        <button
                          key={mode}
                          onClick={() => updateCrop(index, "mode", mode)}
                          className={`text-xs font-semibold px-4 py-1.5 transition-colors ${
                            crop.mode === mode
                              ? "bg-[var(--ag-accent)] text-[var(--ag-accent-text)]"
                              : "text-ag-muted hover:bg-[var(--ag-bg-hover)]"
                          }`}
                        >
                          {mode === "on_hand" ? "On Hand" : "Forecast"}
                        </button>
                      )
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeCrop(index)}
                  className="text-xs text-[var(--ag-red)] hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} /> Remove
                </button>
              </div>

              {/* Inventory Inputs */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                {crop.mode === "on_hand" ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                      Bushels On Hand
                    </label>
                    <input
                      type="number"
                      value={crop.bushels || ""}
                      onChange={(e) =>
                        updateCrop(index, "bushels", Number(e.target.value))
                      }
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                        Acres
                      </label>
                      <input
                        type="number"
                        value={crop.acres || ""}
                        onChange={(e) =>
                          updateCrop(index, "acres", Number(e.target.value))
                        }
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                        APH (bu/ac)
                      </label>
                      <input
                        type="number"
                        value={crop.aph || ""}
                        onChange={(e) =>
                          updateCrop(index, "aph", Number(e.target.value))
                        }
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                        Forecast (bu)
                      </label>
                      <div className="text-sm font-bold text-[var(--ag-green)] px-3 py-2">
                        {(crop.acres * crop.aph).toLocaleString()} bu
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                        Actual Yield (bu/ac)
                      </label>
                      <input
                        type="number"
                        value={crop.actualYield || ""}
                        onChange={(e) =>
                          updateCrop(index, "actualYield", Number(e.target.value))
                        }
                        placeholder="Post-harvest"
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                    Target Price ($/bu)
                  </label>
                  <input
                    type="number"
                    value={crop.targetPrice || ""}
                    onChange={(e) =>
                      updateCrop(
                        index,
                        "targetPrice",
                        Number(e.target.value)
                      )
                    }
                    placeholder="0.00"
                    step="0.01"
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Costs */}
              <div className="grid grid-cols-2 gap-6">
                {/* Fixed Costs */}
                <div className="space-y-3">
                  <h3 className="font-mono text-[10px] font-bold text-ag-secondary uppercase tracking-[1.5px]">
                    Fixed Costs ($/acre)
                  </h3>
                  {[
                    { label: "Land Rent / Mortgage", key: "landRent" },
                    {
                      label: "Equipment Depreciation",
                      key: "equipmentDepreciation",
                    },
                    { label: "Insurance", key: "insurance" },
                    { label: "Property Tax", key: "propertyTax" },
                    { label: "Overhead / Admin", key: "overhead" },
                  ].map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <label className="text-xs text-ag-muted flex-1">
                        {f.label}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ag-muted">$</span>
                        <input
                          type="number"
                          value={(crop as never)[f.key] || ""}
                          onChange={(e) =>
                            updateCrop(index, f.key, Number(e.target.value))
                          }
                          placeholder="0"
                          className={costInputClass}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--ag-border)]">
                    <span className="text-xs font-bold text-ag-primary">
                      Total Fixed
                    </span>
                    <span className="text-sm font-bold text-ag-primary">
                      {fmt(calc.fixedPerAcre)}/ac
                    </span>
                  </div>
                </div>

                {/* Variable Costs */}
                <div className="space-y-3">
                  <h3 className="font-mono text-[10px] font-bold text-ag-secondary uppercase tracking-[1.5px]">
                    Variable Costs ($/acre)
                  </h3>
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
                    {
                      label: "Crop Insurance Premium",
                      key: "cropInsurance",
                    },
                  ].map((f) => (
                    <div
                      key={f.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <label className="text-xs text-ag-muted flex-1">
                        {f.label}
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-ag-muted">$</span>
                        <input
                          type="number"
                          value={(crop as never)[f.key] || ""}
                          onChange={(e) =>
                            updateCrop(index, f.key, Number(e.target.value))
                          }
                          placeholder="0"
                          className={costInputClass}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--ag-border)]">
                    <span className="text-xs font-bold text-ag-primary">
                      Total Variable
                    </span>
                    <span className="text-sm font-bold text-ag-primary">
                      {fmt(calc.variablePerAcre)}/ac
                    </span>
                  </div>
                </div>
              </div>

              {/* Crop Profit Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                <div>
                  <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                    Total Cost/Acre
                  </p>
                  <p className="text-lg font-bold text-ag-primary mt-1">
                    {fmt(calc.totalCostPerAcre)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                    Break-Even ($/bu)
                  </p>
                  <p className="text-lg font-bold text-ag-primary mt-1">
                    {fmt(calc.breakEven)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                    Gross Revenue
                  </p>
                  <p className="text-lg font-bold text-ag-primary mt-1">
                    {fmt(calc.grossRevenue)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[1.5px]">
                    Net Profit
                  </p>
                  <p
                    className={`text-lg font-bold mt-1 ${calc.netProfit >= 0 ? "text-[var(--ag-green)]" : "text-[var(--ag-red)]"}`}
                  >
                    {calc.netProfit < 0 ? "-" : ""}
                    {fmt(calc.netProfit)}
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