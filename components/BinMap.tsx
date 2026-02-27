// components/BinMap.tsx
"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Plus, Trash2, X, Loader2, Edit2, Save, MapPin,
  ChevronDown, Droplets, Wind, Wifi, Package,
} from "lucide-react";
import { getCropColor, CANONICAL_CROPS } from "@/lib/crop-colors";

// ─── Types ──────────────────────────────────────────────
type Yard = {
  id: string;
  yard_name: string;
  location: string | null;
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
  bg: "#0B1120", card: "#111827", border: "rgba(255,255,255,0.06)",
  text: "#F1F5F9", text2: "#CBD5E1", text3: "#64748B", text4: "#475569",
  green: "#34D399", greenBg: "rgba(52,211,153,0.08)",
  red: "#F87171", blue: "#60A5FA",
};

const fmtNum = (n: number) => n.toLocaleString("en-CA", { maximumFractionDigits: 0 });

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: T.bg,
  border: `1px solid ${T.border}`, borderRadius: 8,
  color: T.text, fontSize: 13, outline: "none", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "auto" as any, background: "#111827",
};

// ─── Bin SVG Shape ──────────────────────────────────────
function BinIcon({
  bin, isSelected, onMouseDown, onClick,
}: {
  bin: Bin; isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  const fillPct = bin.fill_pct;
  const cropColor = bin.crop ? getCropColor(bin.crop) : "rgba(255,255,255,0.08)";
  const isEmpty = bin.current_bu === 0;
  const isRect = bin.bin_type === "shed" || bin.bin_type === "temporary";
  const size = Math.max(36, Math.min(56, Math.sqrt(bin.capacity_bu / 100) * 4));

  return (
    <g
      transform={`translate(${bin.pos_x}, ${bin.pos_y})`}
      onMouseDown={onMouseDown}
      onClick={onClick}
      style={{ cursor: "grab" }}
    >
      {/* Selection ring */}
      {isSelected && (
        isRect
          ? <rect x={-size - 4} y={-size * 0.7 - 4} width={(size + 4) * 2} height={(size * 0.7 + 4) * 2} rx={6} fill="none" stroke={T.green} strokeWidth={2} strokeDasharray="4 2" />
          : <circle cx={0} cy={0} r={size + 4} fill="none" stroke={T.green} strokeWidth={2} strokeDasharray="4 2" />
      )}

      {/* Bin shape — background */}
      {isRect ? (
        <rect x={-size} y={-size * 0.7} width={size * 2} height={size * 1.4} rx={4}
          fill={isEmpty ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)"}
          stroke={isEmpty ? "rgba(255,255,255,0.08)" : cropColor}
          strokeWidth={isEmpty ? 1 : 1.5}
          strokeDasharray={isEmpty ? "4 3" : "none"}
        />
      ) : (
        <circle cx={0} cy={0} r={size}
          fill={isEmpty ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.04)"}
          stroke={isEmpty ? "rgba(255,255,255,0.08)" : cropColor}
          strokeWidth={isEmpty ? 1 : 1.5}
          strokeDasharray={isEmpty ? "4 3" : "none"}
        />
      )}

      {/* Fill level — clipped */}
      {fillPct > 0 && (
        isRect ? (
          <>
            <defs>
              <clipPath id={`clip-rect-${bin.id}`}>
                <rect x={-size} y={-size * 0.7} width={size * 2} height={size * 1.4} rx={4} />
              </clipPath>
            </defs>
            <rect
              x={-size}
              y={-size * 0.7 + size * 1.4 * (1 - fillPct / 100)}
              width={size * 2}
              height={size * 1.4 * (fillPct / 100)}
              fill={cropColor}
              opacity={0.35}
              clipPath={`url(#clip-rect-${bin.id})`}
            />
          </>
        ) : (
          <>
            <defs>
              <clipPath id={`clip-circle-${bin.id}`}>
                <circle cx={0} cy={0} r={size} />
              </clipPath>
            </defs>
            <rect
              x={-size}
              y={-size + size * 2 * (1 - fillPct / 100)}
              width={size * 2}
              height={size * 2 * (fillPct / 100)}
              fill={cropColor}
              opacity={0.35}
              clipPath={`url(#clip-circle-${bin.id})`}
            />
          </>
        )
      )}

      {/* Fill % text */}
      <text x={0} y={-2} textAnchor="middle" dominantBaseline="central"
        fill={isEmpty ? T.text4 : T.text} fontSize={size > 40 ? 13 : 11} fontWeight={700}>
        {isEmpty ? "Empty" : `${fillPct}%`}
      </text>

      {/* Bin name */}
      <text x={0} y={isRect ? size * 0.7 + 16 : size + 14} textAnchor="middle"
        fill={T.text2} fontSize={10} fontWeight={600}>
        {bin.bin_name}
      </text>

      {/* Crop + bushels label */}
      <text x={0} y={isRect ? size * 0.7 + 28 : size + 26} textAnchor="middle"
        fill={T.text4} fontSize={9}>
        {bin.crop ? `${bin.crop} · ${fmtNum(bin.current_bu)} bu` : `${fmtNum(bin.capacity_bu)} bu cap`}
      </text>

      {/* Feature badges */}
      {bin.has_aeration && (
        <circle cx={isRect ? size - 6 : size * 0.6} cy={isRect ? -size * 0.7 + 6 : -size * 0.6} r={5} fill={T.blue} opacity={0.8} />
      )}
      {bin.has_monitoring && (
        <circle cx={isRect ? size - 6 : size * 0.6} cy={isRect ? -size * 0.7 + 18 : -size * 0.4} r={5} fill={T.green} opacity={0.8} />
      )}
    </g>
  );
}

// ═════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════
export default function BinMap() {
  const { user } = useUser();

  // State
  const [yards, setYards] = useState<Yard[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [summary, setSummary] = useState<BinSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeYard, setActiveYard] = useState<string | null>(null);

  // Modals
  const [showYardModal, setShowYardModal] = useState(false);
  const [showBinModal, setShowBinModal] = useState(false);
  const [editingBin, setEditingBin] = useState<Bin | null>(null);
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

  // Forms
  const [yardForm, setYardForm] = useState({ yard_name: "", location: "", notes: "" });
  const [binForm, setBinForm] = useState({
    bin_name: "", bin_type: "hopper", capacity_bu: "", current_bu: "",
    crop: "", grade: "", moisture_pct: "", has_aeration: false,
    has_monitoring: false, notes: "",
  });
  const [saving, setSaving] = useState(false);

  // SVG pan/zoom
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: -400, y: -300, w: 800, h: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);

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

  // ─── Yard CRUD ──────────────────────────────────────
  async function saveYard() {
    if (!user?.id || !yardForm.yard_name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/inventory/yards", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify(yardForm),
    });
    if (res.ok) {
      const data = await res.json();
      await fetchYards();
      setActiveYard(data.yard.id);
      setShowYardModal(false);
      setYardForm({ yard_name: "", location: "", notes: "" });
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
      bin_name: bin.bin_name,
      bin_type: bin.bin_type,
      capacity_bu: String(bin.capacity_bu),
      current_bu: String(bin.current_bu),
      crop: bin.crop || "",
      grade: bin.grade || "",
      moisture_pct: bin.moisture_pct ? String(bin.moisture_pct) : "",
      has_aeration: bin.has_aeration,
      has_monitoring: bin.has_monitoring,
      notes: bin.notes || "",
    });
    setShowBinModal(true);
  }

  async function saveBin() {
    if (!user?.id || !activeYard || !binForm.bin_name.trim() || !binForm.capacity_bu) return;
    setSaving(true);

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
      // Auto-place new bins in a grid
      ...(!editingBin ? {
        pos_x: (bins.length % 5) * 140 - 280,
        pos_y: Math.floor(bins.length / 5) * 140 - 140,
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
    setSelectedBin(null);
    await fetchBins();
    await fetchYards();
  }

  // ─── Drag Handling ──────────────────────────────────
  function handleBinMouseDown(binId: string, e: React.MouseEvent) {
    e.stopPropagation();
    const bin = bins.find((b) => b.id === binId);
    if (!bin || !svgRef.current) return;

    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

    setDragging(binId);
    setDragOffset({ x: svgPt.x - bin.pos_x, y: svgPt.y - bin.pos_y });
    setHasDragged(false);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (dragging && svgRef.current) {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgPt = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());

      setBins((prev) =>
        prev.map((b) =>
          b.id === dragging
            ? { ...b, pos_x: Math.round(svgPt.x - dragOffset.x), pos_y: Math.round(svgPt.y - dragOffset.y) }
            : b
        )
      );
      setHasDragged(true);
      return;
    }

    if (isPanning) {
      const dx = (e.clientX - panStart.x) * (viewBox.w / (svgRef.current?.clientWidth || 800));
      const dy = (e.clientY - panStart.y) * (viewBox.h / (svgRef.current?.clientHeight || 600));
      setViewBox((v) => ({ ...v, x: v.x - dx, y: v.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }

  async function handleMouseUp() {
    if (dragging && hasDragged && user?.id) {
      const bin = bins.find((b) => b.id === dragging);
      if (bin) {
        await fetch("/api/inventory/bins", {
          method: "PUT",
          headers: { "Content-Type": "application/json", "x-user-id": user.id },
          body: JSON.stringify({ id: bin.id, pos_x: bin.pos_x, pos_y: bin.pos_y }),
        });
      }
    }
    setDragging(null);
    setIsPanning(false);
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.target === svgRef.current || (e.target as SVGElement).tagName === "rect") {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setSelectedBin(null);
    }
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((v) => {
      const cx = v.x + v.w / 2;
      const cy = v.y + v.h / 2;
      const nw = v.w * scale;
      const nh = v.h * scale;
      return { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
    });
  }

  // ─── Render ─────────────────────────────────────────
  const activeYardData = yards.find((y) => y.id === activeYard);

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
      {/* ── Top Bar: Yard Selector + Actions ─────────── */}
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
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>Total Bins</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: T.text, marginTop: 2 }}>{summary.total_bins}</p>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>Total Capacity</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: T.text, marginTop: 2 }}>{fmtNum(summary.total_capacity_bu)} bu</p>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>Stored</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: T.text, marginTop: 2 }}>{fmtNum(summary.total_stored_bu)} bu</p>
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: T.text3, textTransform: "uppercase", letterSpacing: 1 }}>Utilization</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: summary.utilization_pct > 80 ? T.red : summary.utilization_pct > 50 ? "#F5A623" : T.green, marginTop: 2 }}>{summary.utilization_pct}%</p>
          </div>
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

      {/* ── SVG Canvas ───────────────────────────────── */}
      {activeYard ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden", position: "relative" }}>
          {/* Canvas label */}
          <div style={{ position: "absolute", top: 12, left: 16, zIndex: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: T.text4, fontWeight: 600 }}>{activeYardData?.yard_name}</span>
            <span style={{ fontSize: 10, color: T.text4 }}>Drag bins to arrange · Scroll to zoom · Click bin to edit</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            width="100%"
            height="520"
            style={{ background: "rgba(11,17,32,0.6)", cursor: isPanning ? "grabbing" : "default" }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect x={viewBox.x - 2000} y={viewBox.y - 2000} width={viewBox.w + 4000} height={viewBox.h + 4000} fill="url(#grid)" />

            {/* Bins */}
            {bins.map((bin) => (
              <BinIcon
                key={bin.id}
                bin={bin}
                isSelected={selectedBin === bin.id}
                onMouseDown={(e) => handleBinMouseDown(bin.id, e)}
                onClick={() => {
                  if (!hasDragged) {
                    setSelectedBin(bin.id);
                    openEditBin(bin);
                  }
                }}
              />
            ))}

            {/* Empty state */}
            {bins.length === 0 && (
              <text x={0} y={0} textAnchor="middle" dominantBaseline="central" fill={T.text4} fontSize={14}>
                Click &quot;Add Bin&quot; to place your first bin
              </text>
            )}
          </svg>
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
            Create a yard for each storage site on your operation, then add bins with capacity and current inventory.
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
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, width: 420, maxWidth: "90vw" }}
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
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>Location</label>
                <input style={inputStyle} value={yardForm.location} onChange={(e) => setYardForm({ ...yardForm, location: e.target.value })} placeholder="NW-36-21-14 W3" />
              </div>
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

            {/* Feature toggles */}
            <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                <input type="checkbox" checked={binForm.has_aeration} onChange={(e) => setBinForm({ ...binForm, has_aeration: e.target.checked })}
                  style={{ accentColor: T.green }} />
                <Wind size={12} style={{ color: T.blue }} /> Aeration
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.text2, cursor: "pointer" }}>
                <input type="checkbox" checked={binForm.has_monitoring} onChange={(e) => setBinForm({ ...binForm, has_monitoring: e.target.checked })}
                  style={{ accentColor: T.green }} />
                <Wifi size={12} style={{ color: T.green }} /> Monitoring
              </label>
            </div>

            {/* Fill preview */}
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