"use client";
// app/mobile/bins/page.tsx
// Live bin levels — real bin silhouette, search, crop colours, capacity warnings

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Bin {
  id: string;
  bin_name: string;
  crop: string | null;
  current_bu: number;
  capacity_bu: number;
  yard_name: string | null;
  notes: string | null;
}

interface YardGroup {
  yard: string;
  bins: Bin[];
}

const CROP_COLORS: Record<string, string> = {
  canola:       "#C8A84B",
  wheat:        "#E8C97A",
  "hrs wheat":  "#E8C97A",
  durum:        "#F0D080",
  barley:       "#A8C870",
  oats:         "#88B860",
  flax:         "#8090C8",
  lentils:      "#C89060",
  peas:         "#90C890",
  chickpeas:    "#D4A870",
  mustard:      "#D4C040",
  default:      "#60A5FA",
};

function getCropColor(crop: string | null): string {
  if (!crop) return "#2A3F5A";
  const key = crop.toLowerCase();
  for (const [k, v] of Object.entries(CROP_COLORS)) {
    if (key.includes(k)) return v;
  }
  return CROP_COLORS.default;
}

function BinGauge({ bin }: { bin: Bin }) {
  const pct = bin.capacity_bu > 0
    ? Math.min(100, Math.round((bin.current_bu / bin.capacity_bu) * 100))
    : 0;

  const color = getCropColor(bin.crop);
  const isEmpty = bin.current_bu === 0;
  const isFull = pct >= 95;
  const isNearFull = pct >= 80 && pct < 95;
  const statusColor = isFull ? "#F97316" : isNearFull ? "#FBBF24" : color;

  // SVG bin dimensions
  const W = 110;
  const H = 150;
  const cx = W / 2;
  const rx = 44;
  const ry = 9;
  const roofPeak = 8;
  const bodyTop = 40;
  const bodyBot = H - 12;
  const bodyH = bodyBot - bodyTop;
  const fillH = bodyH * pct / 100;
  const fillTop = bodyBot - fillH;

  return (
    <div style={{
      background: "#0D1726",
      border: `1px solid ${isEmpty ? "#1A2940" : `${statusColor}35`}`,
      borderRadius: "18px",
      padding: "16px",
      display: "flex",
      gap: "14px",
      alignItems: "center",
    }}>

      {/* Grain Bin SVG */}
      <div style={{ flexShrink: 0 }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={`fg-${bin.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={statusColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={statusColor} stopOpacity="0.5" />
            </linearGradient>
            <clipPath id={`bc-${bin.id}`}>
              <rect x={cx - rx} y={bodyTop} width={rx * 2} height={bodyH} />
            </clipPath>
          </defs>

          {/* Cylinder body */}
          <rect x={cx - rx} y={bodyTop} width={rx * 2} height={bodyH} fill="#060D1A" />

          {/* Fill */}
          {pct > 0 && (
            <g clipPath={`url(#bc-${bin.id})`}>
              <rect x={cx - rx} y={fillTop} width={rx * 2} height={fillH + ry}
                fill={`url(#fg-${bin.id})`} />
              <ellipse cx={cx} cy={fillTop} rx={rx} ry={ry}
                fill={statusColor} opacity="0.65" />
              <ellipse cx={cx} cy={fillTop} rx={rx} ry={ry}
                fill="none" stroke={statusColor} strokeWidth="1.5" opacity="0.9" />
            </g>
          )}

          {/* Side borders */}
          <line x1={cx - rx} y1={bodyTop} x2={cx - rx} y2={bodyBot} stroke="#1E3050" strokeWidth="1" />
          <line x1={cx + rx} y1={bodyTop} x2={cx + rx} y2={bodyBot} stroke="#1E3050" strokeWidth="1" />

          {/* Corrugation bands */}
          {[0.25, 0.5, 0.75].map((f, i) => (
            <line key={i}
              x1={cx - rx} y1={bodyTop + bodyH * f}
              x2={cx + rx} y2={bodyTop + bodyH * f}
              stroke="#1A2940" strokeWidth="1" opacity="0.7"
            />
          ))}

          {/* Bottom ellipse */}
          <ellipse cx={cx} cy={bodyBot} rx={rx} ry={ry}
            fill="#060D1A" stroke="#1E3050" strokeWidth="1" />

          {/* Top rim ellipse */}
          <ellipse cx={cx} cy={bodyTop} rx={rx} ry={ry}
            fill="#0A1520" stroke="#1E3050" strokeWidth="1" />

          {/* Cone roof */}
          <path
            d={`M ${cx - rx} ${bodyTop + ry * 0.6} L ${cx} ${roofPeak} L ${cx + rx} ${bodyTop + ry * 0.6}`}
            fill="#0A1520" stroke="#1E3050" strokeWidth="1" strokeLinejoin="round"
          />
          {/* Roof ridge */}
          <circle cx={cx} cy={roofPeak} r="3.5" fill="#162030" stroke="#1E3050" strokeWidth="1" />

          {/* % label */}
          <text
            x={cx} y={bodyTop + bodyH * 0.55}
            textAnchor="middle"
            fontFamily="'DM Sans', sans-serif"
            fontWeight="700" fontSize="18"
            fill={isEmpty ? "#2A3F5A" : "#F0F4F8"}
            style={{ userSelect: "none" }}
          >
            {pct}%
          </text>
        </svg>
      </div>

      {/* Info panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
        <div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700, fontSize: "17px", color: "#F0F4F8",
            marginBottom: "2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {bin.bin_name}
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "13px",
            color: isEmpty ? "#2A3F5A" : statusColor,
            fontWeight: 500,
          }}>
            {bin.crop || "Empty"}
          </div>
        </div>

        <div style={{ background: "#070D18", borderRadius: "10px", padding: "10px 12px" }}>
          <div style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700, fontSize: "22px",
            color: isEmpty ? "#2A3F5A" : "#F0F4F8",
            lineHeight: 1, marginBottom: "3px",
          }}>
            {bin.current_bu.toLocaleString()}
            <span style={{ fontSize: "12px", color: "#4A6A8A", fontWeight: 400, marginLeft: "4px" }}>bu</span>
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A" }}>
            of {bin.capacity_bu.toLocaleString()} bu capacity
          </div>
        </div>

        {/* Fill bar */}
        <div style={{ height: "5px", background: "#070D18", borderRadius: "3px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: `linear-gradient(90deg, ${statusColor}80, ${statusColor})`,
            borderRadius: "3px",
            transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
          }} />
        </div>

        {isFull && (
          <div style={{
            background: "rgba(249,115,22,0.1)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: "8px", padding: "6px 10px",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px", fontWeight: 600, color: "#F97316",
          }}>
            ⚠ NEAR CAPACITY
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileBins() {
  const router = useRouter();
  const [yards, setYards] = useState<YardGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [totalBu, setTotalBu] = useState(0);
  const [totalCapacity, setTotalCapacity] = useState(0);
  const [search, setSearch] = useState("");

  async function fetchBins() {
    try {
      const res = await fetch("/api/inventory/bins");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bins");

      const bins: Bin[] = data.bins || [];
      setTotalBu(data.total_stored_bu ?? bins.reduce((s, b) => s + (b.current_bu || 0), 0));
      setTotalCapacity(data.total_capacity_bu ?? bins.reduce((s, b) => s + (b.capacity_bu || 0), 0));

      const yardMap: Record<string, Bin[]> = {};
      for (const bin of bins) {
        const yard = bin.yard_name || "Main Yard";
        if (!yardMap[yard]) yardMap[yard] = [];
        yardMap[yard].push(bin);
      }
      setYards(Object.entries(yardMap).map(([yard, bins]) => ({ yard, bins })));
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e.message || "Could not load bins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBins();
    const interval = setInterval(fetchBins, 60_000);
    return () => clearInterval(interval);
  }, []);

  const filteredYards = useMemo(() => {
    if (!search.trim()) return yards;
    const q = search.toLowerCase();
    return yards
      .map((g) => ({
        ...g,
        bins: g.bins.filter(
          (b) =>
            b.bin_name.toLowerCase().includes(q) ||
            (b.crop || "").toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.bins.length > 0);
  }, [yards, search]);

  const overallPct = totalCapacity > 0 ? Math.round((totalBu / totalCapacity) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .bins-header  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0s both; }
        .bins-search  { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.06s both; }
        .bins-summary { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .bins-list    { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.15s both; }
        .skeleton {
          background: linear-gradient(90deg, #0D1726 25%, #1A2940 50%, #0D1726 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 16px; height: 150px;
        }
        .search-input {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 12px;
          color: #F0F4F8;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 12px 16px 12px 42px;
          width: 100%; outline: none;
          box-sizing: border-box;
          -webkit-appearance: none;
          transition: border-color 0.2s;
        }
        .search-input::placeholder { color: #2A3F5A; }
        .search-input:focus { border-color: #C8A84B; }
        .refresh-btn {
          background: none;
          border: 1px solid #1A2940;
          border-radius: 8px;
          color: #4A6A8A;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 7px 13px;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          white-space: nowrap;
          transition: border-color 0.2s, color 0.2s;
        }
        .refresh-btn:active { border-color: #C8A84B; color: #C8A84B; }
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#070D18", overflow: "hidden" }}>

        {/* Header */}
        <div className="bins-header" style={{
          padding: "20px 16px 14px",
          borderBottom: "1px solid #0D1726",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <button onClick={() => router.back()} style={{
            background: "none", border: "none", color: "#4A6A8A",
            cursor: "pointer", padding: "4px", display: "flex", alignItems: "center",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F4F8", lineHeight: 1 }}>
              Bin Levels
            </div>
            {lastUpdated && (
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A", marginTop: "2px" }}>
                Updated {lastUpdated.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
          <button className="refresh-btn" onClick={fetchBins}>↻ Refresh</button>
        </div>

        {/* Search */}
        <div className="bins-search" style={{ padding: "10px 16px 0" }}>
          <div style={{ position: "relative" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#2A3F5A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              type="search"
              placeholder="Search bins or crops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Summary */}
        {!loading && !error && totalCapacity > 0 && !search && (
          <div className="bins-summary" style={{
            margin: "10px 16px 0",
            background: "#0D1726", border: "1px solid #1A2940",
            borderRadius: "14px", padding: "14px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
              <div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "22px", color: "#F0F4F8" }}>
                  {totalBu.toLocaleString()}
                </span>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#4A6A8A", marginLeft: "4px" }}>
                  bu on farm
                </span>
              </div>
              <span style={{
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "16px",
                color: overallPct >= 80 ? "#F97316" : "#C8A84B",
              }}>
                {overallPct}% full
              </span>
            </div>
            <div style={{ height: "6px", background: "#070D18", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${overallPct}%`,
                background: overallPct >= 80 ? "linear-gradient(90deg,#C8A84B,#F97316)" : "linear-gradient(90deg,#C8A84B,#E8C97A)",
                borderRadius: "3px", transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A", marginTop: "6px" }}>
              {totalCapacity.toLocaleString()} bu total capacity
            </div>
          </div>
        )}

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 32px", WebkitOverflowScrolling: "touch" as any }}>

          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" />)}
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.2)",
              borderRadius: "14px", padding: "20px", textAlign: "center",
              fontFamily: "'DM Sans', sans-serif", color: "#F08080", fontSize: "14px",
            }}>
              {error}
            </div>
          )}

          {!loading && !error && filteredYards.length === 0 && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "48px", gap: "10px" }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1A2940" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", color: "#2A3F5A" }}>
                {search ? `No bins matching "${search}"` : "No bins set up yet"}
              </div>
            </div>
          )}

          <div className="bins-list">
            {filteredYards.map((group) => (
              <div key={group.yard} style={{ marginBottom: "20px" }}>
                {filteredYards.length > 1 && (
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase",
                    color: "#2A3F5A", marginBottom: "8px", paddingLeft: "2px",
                  }}>
                    {group.yard}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {group.bins.map((bin) => <BinGauge key={bin.id} bin={bin} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}