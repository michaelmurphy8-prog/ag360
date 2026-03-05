// components/BinMap.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Plus, Trash2, X, Loader2, MapPin, Wind, Wifi, Package,
} from "lucide-react";
import { getCropColor, CANONICAL_CROPS } from "@/lib/crop-colors";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// ─── Types ──────────────────────────────────────────────
type Yard = {
  id: string;
  yard_name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  bin_count: number;
  total_capacity_bu: number;
  total_stored_bu: number;
};

type Bin = {
  id: string;
  yard_id: string;
  yard_name: string;
  bin_name: string;
  bin_type: string;
  capacity_bu: number;
  current_bu: number;
  crop: string | null;
  grade: string | null;
  moisture_pct: number | null;
  has_aeration: boolean;
  has_monitoring: boolean;
  notes: string | null;
  pos_x: number;
  pos_y: number;
  latitude: number | null;
  longitude: number | null;
  fill_pct: number;
};

type BinSummary = {
  total_bins: number;
  total_capacity_bu: number;
  total_stored_bu: number;
  utilization_pct: number;
  crop_breakdown: Record<string, number>;
};

const BIN_TYPES = [
  { value: "hopper", label: "Hopper" },
  { value: "flat_bottom", label: "Flat Bottom" },
  { value: "temporary", label: "Grain Bag / Temp" },
  { value: "shed", label: "Shed / Building" },
];

const GRADES = ["#1", "#2", "#3", "Feed", "Sample", "Tough", "Damp"];

const T = {
  bg: "var(--ag-bg-primary)", card: "var(--ag-bg-card)", border: "rgba(255,255,255,0.06)",
  text: "var(--ag-text-primary)", text2: "#CBD5E1", text3: "var(--ag-text-muted)", text4: "var(--ag-text-dim)",
  green: "var(--ag-green)", greenBg: "var(--ag-green-dim)",
  red: "var(--ag-red)", blue: "var(--ag-blue)",
};

const fmtNum = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 0 });

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 8,
  color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "auto" as any, background: "var(--ag-bg-card)",
};

// Default: Saskatchewan farmland
const DEFAULT_LAT = 52.1332;
const DEFAULT_LNG = -106.6700;
const DEFAULT_ZOOM = 16;

// ─── Marker HTML Builder ────────────────────────────────
function buildMarkerHTML(bin: Bin): string {
  const cropColor = bin.crop ? getCropColor(bin.crop) : "rgba(255,255,255,0.15)";
  const isEmpty = bin.current_bu === 0;
  const fillPct = bin.fill_pct;
  const isRect = bin.bin_type === "shed" || bin.bin_type === "temporary";
  const size = Math.max(48, Math.min(72, Math.sqrt(bin.capacity_bu / 100) * 5));

  const badges = [
    bin.has_aeration ? `<span style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${T.blue};border:2px solid ${T.card}"></span>` : "",
    bin.has_monitoring ? `<span style="position:absolute;top:8px;right:-4px;width:10px;height:10px;border-radius:50%;background:${T.green};border:2px solid ${T.card}"></span>` : "",
  ].join("");

  if (isRect) {
    return `<div style="position:relative;width:${size * 1.4}px;height:${size}px;cursor:grab;user-select:none">
      ${badges}
      <div style="width:100%;height:100%;border-radius:6px;border:${isEmpty ? `1.5px dashed rgba(255,255,255,0.15)` : `2px solid ${cropColor}`};background:rgba(17,24,39,0.85);overflow:hidden;position:relative;backdrop-filter:blur(4px)">
        <div style="position:absolute;bottom:0;left:0;right:0;height:${fillPct}%;background:${cropColor};opacity:0.4;transition:height 0.3s"></div>
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;z-index:1">
          <span style="font-size:${size > 56 ? 14 : 12}px;font-weight:700;color:${isEmpty ? T.text4 : "#fff"}">${isEmpty ? "Empty" : fillPct + "%"}</span>
        </div>
      </div>
      <div style="text-align:center;margin-top:4px">
        <div style="font-size:10px;font-weight:600;color:#E2E8F0;text-shadow:0 1px 3px rgba(0,0,0,0.8)">${bin.bin_name}</div>
        <div style="font-size:9px;color:#94A3B8;text-shadow:0 1px 2px rgba(0,0,0,0.8)">${bin.crop ? bin.crop + " · " + fmtNum(bin.current_bu) + " bu" : fmtNum(bin.capacity_bu) + " bu cap"}</div>
      </div>
    </div>`;
  }

  return `<div style="position:relative;width:${size}px;height:${size}px;cursor:grab;user-select:none">
    ${badges}
    <div style="width:100%;height:100%;border-radius:50%;border:${isEmpty ? `1.5px dashed rgba(255,255,255,0.15)` : `2px solid ${cropColor}`};background:rgba(17,24,39,0.85);overflow:hidden;position:relative;backdrop-filter:blur(4px)">
      <div style="position:absolute;bottom:0;left:0;right:0;height:${fillPct}%;background:${cropColor};opacity:0.4;transition:height 0.3s"></div>
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;z-index:1">
        <span style="font-size:${size > 56 ? 14 : 12}px;font-weight:700;color:${isEmpty ? T.text4 : "#fff"}">${isEmpty ? "Empty" : fillPct + "%"}</span>
      </div>
    </div>
    <div style="text-align:center;margin-top:4px">
      <div style="font-size:10px;font-weight:600;color:#E2E8F0;text-shadow:0 1px 3px rgba(0,0,0,0.8)">${bin.bin_name}</div>
      <div style="font-size:9px;color:#94A3B8;text-shadow:0 1px 2px rgba(0,0,0,0.8)">${bin.crop ? bin.crop + " · " + fmtNum(bin.current_bu) + " bu" : fmtNum(bin.capacity_bu) + " bu cap"}</div>
    </div>
  </div>`;
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function BinMap() {
  const { user } = useUser();

  const [yards, setYards] = useState<Yard[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [summary, setSummary] = useState<BinSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeYard, setActiveYard] = useState<string | null>(null);

  const [showYardModal, setShowYardModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);

  const [yardForm, setYardForm] = useState({ yard_name: "", location: "", notes: "", latitude: "", longitude: "" });
  const [binForm, setBinForm] = useState({
    bin_name: "", bin_type: "hopper", capacity_bu: "", current_bu: "",
    crop: "", grade: "", moisture_pct: "", has_aeration: false,
    has_monitoring: false, notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // ─── Data Fetching ──────────────────────────────────
  const fetchYards = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch("/api/inventory/yards", { headers: { "x-user-id": user.id } });
    const data = await res.json();
    setYards(data.yards || []);
    if (data.yards?.length > 0 && !activeYard) {
      setActiveYard(data.yards[0].id);
    }
  }, [user?.id, activeYard]);

  const fetchBins = useCallback(async () => {
    if (!user?.id || !activeYard) return;
    const res = await fetch(`/api/inventory/bins?yard_id=${activeYard}`, { headers: { "x-user-id": user.id } });
    const data = await res.json();
    setBins(data.bins || []);
    setSummary(data.summary || null);
  }, [user?.id, activeYard]);

  useEffect(() => {
    setLoading(true);
    fetchYards().finally(() => setLoading(false));
  }, [fetchYards]);

  useEffect(() => { fetchBins(); }, [fetchBins]);

  // ─── Map Initialization ─────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !activeYard) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const yard = yards.find((y) => y.id === activeYard);
    const lat = yard?.latitude ? Number(yard.latitude) : DEFAULT_LAT;
    const lng = yard?.longitude ? Number(yard.longitude) : DEFAULT_LNG;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [lng, lat],
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, [activeYard, yards]);

  // ─── Render Markers ─────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onReady = () => {
      // Remove old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      const yard = yards.find((y) => y.id === activeYard);
      const yardLat = yard?.latitude ? Number(yard.latitude) : DEFAULT_LAT;
      const yardLng = yard?.longitude ? Number(yard.longitude) : DEFAULT_LNG;

      bins.forEach((bin, index) => {
        const binLat = bin.latitude ? Number(bin.latitude) : yardLat + (Math.floor(index / 5) - 1) * 0.0003;
        const binLng = bin.longitude ? Number(bin.longitude) : yardLng + ((index % 5) - 2) * 0.0004;

        const el = document.createElement("div");
        el.innerHTML = buildMarkerHTML(bin);
        el.style.cursor = "grab";

        const marker = new mapboxgl.Marker({
  element: el,
  draggable: true,
  anchor: "center",
  pitchAlignment: "viewport",
  rotationAlignment: "viewport",
})
          .setLngLat([binLng, binLat])
          .addTo(map);

        // Click to edit
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          openEditBin(bin);
        });

        // Save position on drag end
        marker.on("dragend", async () => {
          const lngLat = marker.getLngLat();
          if (user?.id) {
            await fetch("/api/inventory/bins", {
              method: "PUT",
              headers: { "Content-Type": "application/json", "x-user-id": user.id },
              body: JSON.stringify({
                id: bin.id,
                latitude: lngLat.lat,
                longitude: lngLat.lng,
                pos_x: 0, pos_y: 0,
              }),
            });
          }
        });

        markersRef.current.set(bin.id, marker);
      });
    };

    if (map.loaded()) {
      onReady();
    } else {
      map.on("load", onReady);
    }
  }, [bins, activeYard, yards, user?.id]);

  // ─── Yard CRUD ──────────────────────────────────────
  async function saveYard() {
    if (!user?.id || !yardForm.yard_name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/inventory/yards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({
        ...yardForm,
        latitude: yardForm.latitude ? Number(yardForm.latitude) : null,
        longitude: yardForm.longitude ? Number(yardForm.longitude) : null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchYards();
      setActiveYard(data.yard.id);
      setShowYardModal(false);
      setYardForm({ yard_name: "", location: "", notes: "", latitude: "", longitude: "" });
    }
    setSaving(false);
  }

  async function deleteYard(id: string) {
    if (!user?.id || !confirm("Delete this yard and ALL its bins?")) return;
    await fetch(`/api/inventory/yards?id=${id}`, { method: "DELETE", headers: { "x-user-id": user.id } });
    setActiveYard(null);
    await fetchYards();
  }

  // ─── Bin CRUD ───────────────────────────────────────
  function openNewBin() {
    setEditingBin(null);
    setBinForm({
      bin_name: "", bin_type: "hopper", capacity_bu: "", current_bu: "",
      crop: "", grade: "", moisture_pct: "", has_aeration: false,
      has_monitoring: false, notes: "",
    });
    setShowBinModal(true);
  }

  function openEditBin(bin: Bin) {
    setEditingBin(bin);
    setBinForm({
      bin_name: bin.bin_name, bin_type: bin.bin_type,
      capacity_bu: String(bin.capacity_bu), current_bu: String(bin.current_bu),
      crop: bin.crop || "", grade: bin.grade || "",
      moisture_pct: bin.moisture_pct ? String(bin.moisture_pct) : "",
      has_aeration: bin.has_aeration, has_monitoring: bin.has_monitoring,
      notes: bin.notes || "",
    });
    setShowBinModal(true);
  }

  async function saveBin() {
    if (!user?.id || !activeYard || !binForm.bin_name.trim() || !binForm.capacity_bu) return;
    setSaving(true);

    const yard = yards.find((y) => y.id === activeYard);
    const yardLat = yard?.latitude ? Number(yard.latitude) : DEFAULT_LAT;
    const yardLng = yard?.longitude ? Number(yard.longitude) : DEFAULT_LNG;

    const payload = {
      ...(editingBin ? { id: editingBin.id } : {}),
      yard_id: activeYard,
      bin_name: binForm.bin_name.trim(),
      bin_type: binForm.bin_type,
      capacity_bu: Number(binForm.capacity_bu),
      current_bu: Number(binForm.current_bu) || 0,
      crop: binForm.crop || null,
      grade: binForm.grade || null,
      moisture_pct: binForm.moisture_pct ? Number(binForm.moisture_pct) : null,
      has_aeration: binForm.has_aeration,
      has_monitoring: binForm.has_monitoring,
      notes: binForm.notes || null,
      ...(!editingBin ? {
        latitude: yardLat + (Math.floor(bins.length / 5) - 1) * 0.0003,
        longitude: yardLng + ((bins.length % 5) - 2) * 0.0004,
      } : {}),
    };

    const res = await fetch("/api/inventory/bins", {
      method: editingBin ? "PUT" : "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowBinModal(false);
      await fetchBins();
      await fetchYards();
    }
    setSaving(false);
  }

  async function deleteBin(id: string) {
    if (!user?.id || !confirm("Delete this bin?")) return;
    await fetch(`/api/inventory/bins?id=${id}`, { method: "DELETE", headers: { "x-user-id": user.id } });
    await fetchBins();
    await fetchYards();
  }

  // ─── Render ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 60, color: T.text3 }}>
        <Loader2 size={28} className="animate-spin" style={{ color: T.green, margin: "0 auto 12px" }} />
        <p style={{ fontSize: 13 }}>Loading bin map...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Top Bar ──────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {yards.length > 0 ? (
            <div style={{ display: "flex", gap: 4, background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, padding: 4 }}>
              {yards.map((y) => (
                <button key={y.id} onClick={() => setActiveYard(y.id)}
                  style={{
                    padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    background: activeYard === y.id ? "rgba(52,211,153,0.12)" : "transparent",
                    color: activeYard === y.id ? T.green : T.text3,
                  }}>
                  <MapPin size={11} />
                  {y.yard_name}
                  <span style={{ fontSize: 10, opacity: 0.6 }}>({y.bin_count})</span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: T.text3 }}>No yards yet — create one to get started</p>
          )}
          <button onClick={() => setShowYardModal(true)}
            style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text3, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <Plus size={12} /> Add Yard
          </button>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {activeYard && (
            <>
              <button onClick={openNewBin}
                style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: T.green, color: T.bg, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={13} /> Add Bin
              </button>
              <button onClick={() => activeYard && deleteYard(activeYard)}
                style={{ padding: "8px 12px", borderRadius: 10, border: `1px solid rgba(248,113,113,0.2)`, background: "rgba(248,113,113,0.06)", color: T.red, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                <Trash2 size={12} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Summary Strip ────────────────────────────── */}
      {summary && summary.total_bins > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Total Bins", value: String(summary.total_bins) },
            { label: "Total Capacity", value: `${fmtNum(summary.total_capacity_bu)} bu` },
            { label: "Stored", value: `${fmtNum(summary.total_stored_bu)} bu` },
            { label: "Utilization", value: `${summary.utilization_pct}%`, color: summary.utilization_pct > 80 ? T.red : summary.utilization_pct > 50 ? "#F5A623" : T.green },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: color || T.text, marginTop: 2 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Crop Breakdown ───────────────────────────── */}
      {summary && Object.keys(summary.crop_breakdown).length > 0 && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", padding: "10px 16px", background: T.card, borderRadius: 10, border: `1px solid ${T.border}` }}>
          {Object.entries(summary.crop_breakdown).map(([crop, bu]) => (
            <div key={crop} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: getCropColor(crop) }} />
              <span style={{ color: T.text2 }}>{crop}</span>
              <span style={{ color: T.text4 }}>{fmtNum(bu)} bu</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Map Canvas ───────────────────────────────── */}
      {activeYard ? (
        <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}>
          <div style={{ position: "absolute", top: 12, left: 56, zIndex: 10, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, background: "rgba(0,0,0,0.5)", padding: "4px 10px", borderRadius: 6, backdropFilter: "blur(4px)" }}>
              {yards.find((y) => y.id === activeYard)?.yard_name} · Drag bins to arrange · Click to edit
            </span>
          </div>
          <div ref={mapContainerRef} style={{ width: "100%", height: 560 }} />
        </div>
      ) : yards.length > 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: T.text3, background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <MapPin size={28} style={{ margin: "0 auto 12px", color: T.text4 }} />
          <p style={{ fontSize: 13 }}>Select a yard above to view the bin map</p>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 80, background: T.card, borderRadius: 14, border: `1px solid ${T.border}` }}>
          <Package size={36} style={{ margin: "0 auto 16px", color: T.text4 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, marginBottom: 8 }}>Set Up Your Bin Yard</h3>
          <p style={{ fontSize: 13, color: T.text3, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>
            Create a yard for each storage site, then add bins with capacity and current inventory.
          </p>
          <button onClick={() => setShowYardModal(true)}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.green, color: T.bg, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            <Plus size={14} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />Create Your First Yard
          </button>
        </div>
      )}

      {/* ═══ YARD MODAL ═══════════════════════════════ */}
      {showYardModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowYardModal(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 460, maxWidth: "90vw" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text }}>New Yard</h3>
              <button onClick={() => setShowYardModal(false)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer" }}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Yard Name *</label>
                <input style={inputStyle} value={yardForm.yard_name} onChange={(e) => setYardForm({ ...yardForm, yard_name: e.target.value })} placeholder="Home Yard" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Legal Location</label>
                <input style={inputStyle} value={yardForm.location} onChange={(e) => setYardForm({ ...yardForm, location: e.target.value })} placeholder="NW-36-21-14 W3" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Latitude</label>
                  <input style={inputStyle} type="number" step="0.0001" value={yardForm.latitude} onChange={(e) => setYardForm({ ...yardForm, latitude: e.target.value })} placeholder="52.1332" />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Longitude</label>
                  <input style={inputStyle} type="number" step="0.0001" value={yardForm.longitude} onChange={(e) => setYardForm({ ...yardForm, longitude: e.target.value })} placeholder="-106.6700" />
                </div>
              </div>
              <p style={{ fontSize: 11, color: T.text4, marginTop: -6 }}>
                Tip: Right-click your yard on Google Maps → &quot;What&apos;s here?&quot; to get coordinates
              </p>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</label>
                <input style={inputStyle} value={yardForm.notes} onChange={(e) => setYardForm({ ...yardForm, notes: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <button onClick={saveYard} disabled={saving || !yardForm.yard_name.trim()}
              style={{ marginTop: 20, width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: T.green, color: T.bg, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Creating..." : "Create Yard"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ BIN MODAL ════════════════════════════════ */}
      {showBinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowBinModal(false)}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 520, maxWidth: "90vw", maxHeight: "85vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text }}>{editingBin ? "Edit Bin" : "Add Bin"}</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {editingBin && (
                  <button onClick={() => { deleteBin(editingBin.id); setShowBinModal(false); }}
                    style={{ background: "none", border: "none", color: T.red, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
                <button onClick={() => setShowBinModal(false)} style={{ background: "none", border: "none", color: T.text3, cursor: "pointer" }}><X size={18} /></button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Bin Name *</label>
                <input style={inputStyle} value={binForm.bin_name} onChange={(e) => setBinForm({ ...binForm, bin_name: e.target.value })} placeholder="Bin 1" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Bin Type</label>
                <select style={selectStyle} value={binForm.bin_type} onChange={(e) => setBinForm({ ...binForm, bin_type: e.target.value })}>
                  {BIN_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Capacity (bu) *</label>
                <input style={inputStyle} type="number" value={binForm.capacity_bu} onChange={(e) => setBinForm({ ...binForm, capacity_bu: e.target.value })} placeholder="10000" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Current Bushels</label>
                <input style={inputStyle} type="number" value={binForm.current_bu} onChange={(e) => setBinForm({ ...binForm, current_bu: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Crop</label>
                <select style={selectStyle} value={binForm.crop} onChange={(e) => setBinForm({ ...binForm, crop: e.target.value })}>
                  <option value="">Empty</option>
                  {CANONICAL_CROPS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Grade</label>
                <select style={selectStyle} value={binForm.grade} onChange={(e) => setBinForm({ ...binForm, grade: e.target.value })}>
                  <option value="">—</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Moisture %</label>
                <input style={inputStyle} type="number" step="0.1" value={binForm.moisture_pct} onChange={(e) => setBinForm({ ...binForm, moisture_pct: e.target.value })} placeholder="12.5" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Notes</label>
                <input style={inputStyle} value={binForm.notes} onChange={(e) => setBinForm({ ...binForm, notes: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                <input type="checkbox" checked={binForm.has_aeration} onChange={(e) => setBinForm({ ...binForm, has_aeration: e.target.checked })} style={{ accentColor: T.green }} />
                <Wind size={12} style={{ color: T.blue }} /> Aeration
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                <input type="checkbox" checked={binForm.has_monitoring} onChange={(e) => setBinForm({ ...binForm, has_monitoring: e.target.checked })} style={{ accentColor: T.green }} />
                <Wifi size={12} style={{ color: T.green }} /> Monitoring
              </label>
            </div>
            {binForm.capacity_bu && (
              <div style={{ marginTop: 16, padding: 12, background: "rgba(255,255,255,0.02)", borderRadius: 8, border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: T.text3, marginBottom: 6 }}>
                  <span>{fmtNum(Number(binForm.current_bu) || 0)} / {fmtNum(Number(binForm.capacity_bu))} bu</span>
                  <span>{Number(binForm.capacity_bu) > 0 ? Math.round(((Number(binForm.current_bu) || 0) / Number(binForm.capacity_bu)) * 100) : 0}% full</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <div style={{
                    width: `${Number(binForm.capacity_bu) > 0 ? Math.min(100, ((Number(binForm.current_bu) || 0) / Number(binForm.capacity_bu)) * 100) : 0}%`,
                    height: "100%", borderRadius: 4,
                    background: binForm.crop ? getCropColor(binForm.crop) : T.green,
                    transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            )}
            <button onClick={saveBin} disabled={saving || !binForm.bin_name.trim() || !binForm.capacity_bu}
              style={{ marginTop: 20, width: "100%", padding: "10px 0", borderRadius: 10, border: "none", background: T.green, color: T.bg, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : editingBin ? "Update Bin" : "Add Bin"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}