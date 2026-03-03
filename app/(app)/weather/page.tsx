"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Droplets, Wind, Thermometer, CloudRain,
  Sun, CloudSun, Cloud, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, Snowflake, MapPin,
  ArrowUpRight, ArrowDownRight, Minus,
  ShieldAlert, ShieldCheck, ShieldX,
  Clock, Eye, EyeOff, ChevronLeft, ChevronRight,
  ChevronDown,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────

const GDD_CROPS = [
  { name: "Canola", base: 5, target: 1500, color: "var(--ag-green)" },
  { name: "Spring Wheat", base: 5, target: 1200, color: "var(--ag-yellow)" },
  { name: "Barley", base: 5, target: 1100, color: "#818CF8" },
  { name: "Peas", base: 4.5, target: 1000, color: "var(--ag-blue)" },
];

const WMO: Record<number, { label: string; Icon: React.ElementType; color: string }> = {
  0:  { label: "Clear Sky",      Icon: Sun,            color: "var(--ag-yellow)" },
  1:  { label: "Mainly Clear",   Icon: CloudSun,       color: "var(--ag-yellow)" },
  2:  { label: "Partly Cloudy",  Icon: CloudSun,       color: "var(--ag-text-secondary)" },
  3:  { label: "Overcast",       Icon: Cloud,          color: "var(--ag-text-muted)" },
  45: { label: "Foggy",          Icon: CloudFog,       color: "var(--ag-text-muted)" },
  48: { label: "Icy Fog",        Icon: CloudFog,       color: "var(--ag-text-muted)" },
  51: { label: "Light Drizzle",  Icon: CloudDrizzle,   color: "var(--ag-blue)" },
  61: { label: "Light Rain",     Icon: CloudRain,      color: "var(--ag-blue)" },
  63: { label: "Moderate Rain",  Icon: CloudRain,      color: "#3B82F6" },
  65: { label: "Heavy Rain",     Icon: CloudRain,      color: "#2563EB" },
  71: { label: "Light Snow",     Icon: CloudSnow,      color: "#CBD5E1" },
  73: { label: "Moderate Snow",  Icon: Snowflake,      color: "#E2E8F0" },
  75: { label: "Heavy Snow",     Icon: Snowflake,      color: "var(--ag-text-primary)" },
  80: { label: "Rain Showers",   Icon: CloudDrizzle,   color: "var(--ag-blue)" },
  95: { label: "Thunderstorm",   Icon: CloudLightning, color: "#818CF8" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Types ───────────────────────────────────────────────────

type Hourly = {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  wind_direction_10m: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
};

type Daily = {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  precipitation_probability_max: number[];
  wind_speed_10m_max: number[];
  weather_code: number[];
};

type Current = {
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  precipitation: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  weather_code: number;
  soil_temperature_0cm: number;
};

type WData = { current: Current; hourly: Hourly; daily: Daily };
type SprayStatus = "good" | "marginal" | "poor";

// ─── Helpers ─────────────────────────────────────────────────

const wx = (code: number) => WMO[code] || { label: "Unknown", Icon: Cloud, color: "var(--ag-text-muted)" };

const fieldCond = (precip: number, wind: number, temp: number) => {
  if (temp < 5) return { label: "Too Cold", color: "var(--ag-text-muted)" };
  if (precip > 70) return { label: "Poor", color: "var(--ag-red)" };
  if (precip > 40 || wind > 40) return { label: "Marginal", color: "var(--ag-yellow)" };
  return { label: "Good", color: "var(--ag-green)" };
};

const calcGDD = (hi: number, lo: number, base: number) => Math.max(0, (hi + lo) / 2 - base);
const windLabel = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];

const fmtHour = (iso: string) => {
  const h = new Date(iso).getHours();
  return h === 0 ? "12AM" : h === 12 ? "12PM" : h > 12 ? `${h - 12}PM` : `${h}AM`;
};

function sprayCheck(wind: number, temp: number, hum: number, precip: number, hour: number) {
  const f = {
    wind:   { s: (wind < 15 ? "good" : wind < 25 ? "marginal" : "poor") as SprayStatus, l: "Wind",  d: `${Math.round(wind)} km/h` },
    temp:   { s: (temp >= 10 && temp <= 28 ? "good" : (temp >= 5 && temp < 10) || (temp > 28 && temp <= 32) ? "marginal" : "poor") as SprayStatus, l: "Temp", d: `${Math.round(temp)}°C` },
    hum:    { s: (hum < 70 ? "good" : hum < 85 ? "marginal" : "poor") as SprayStatus, l: "Humidity", d: `${Math.round(hum)}%` },
    precip: { s: (precip < 20 ? "good" : precip < 50 ? "marginal" : "poor") as SprayStatus, l: "Rain",  d: `${Math.round(precip)}%` },
    inv:    { s: ((hour >= 20 || hour < 5) && wind < 5 ? "poor" : (hour >= 18 || hour < 6) && wind < 8 ? "marginal" : "good") as SprayStatus, l: "Inv.", d: ((hour >= 18 || hour < 6) && wind < 8 ? "Risk" : "Low") },
  };
  const vals = Object.values(f).map(v => v.s);
  const overall: SprayStatus = vals.includes("poor") ? "poor" : vals.includes("marginal") ? "marginal" : "good";
  return { overall, factors: f };
}

// ─── Components ──────────────────────────────────────────────

/* ─ Interactive 24h Trend Chart ─ */
function TempTrend({ hourly, ni }: { hourly: Hourly; ni: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; temp: number; time: string; wind: number } | null>(null);

  const W = 520, H = 160, PX = 14, PY = 22;
  const s = Math.max(0, ni - 12), e = Math.min(hourly.time.length, ni + 12);
  const slice = hourly.temperature_2m.slice(s, e);
  const winds = hourly.wind_speed_10m.slice(s, e);
  const times = hourly.time.slice(s, e);
  const n = slice.length;
  if (n < 4) return null;

  const lo = Math.min(...slice), hi = Math.max(...slice), rng = hi - lo || 1;
  const pts = slice.map((t: number, i: number) => ({
    x: (i / (n - 1)) * (W - PX * 2) + PX,
    y: PY + (1 - (t - lo) / rng) * (H - PY * 2 - 6),
  }));

  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const cp = (pts[i - 1].x + pts[i].x) / 2;
    line += ` C ${cp} ${pts[i - 1].y}, ${cp} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  const area = line + ` L ${pts[n - 1].x} ${H - 8} L ${pts[0].x} ${H - 8} Z`;
  const np = pts[ni - s] || pts[0];
  const labels: { x: number; t: string }[] = [];
  for (let i = 0; i < n; i += 3) labels.push({ x: pts[i].x, t: fmtHour(times[i]) });
  const mi = slice.indexOf(lo), mx = slice.indexOf(hi);

  const handleMouse = useCallback((evt: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((evt.clientX - rect.left) / rect.width) * W;
    // Find closest point
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(pts[i].x - mouseX);
      if (d < minDist) { minDist = d; closest = i; }
    }
    if (minDist < 30) {
      setHover({ x: pts[closest].x, y: pts[closest].y, temp: slice[closest], time: fmtHour(times[closest]), wind: winds[closest] });
    } else {
      setHover(null);
    }
  }, [pts, slice, times, winds]);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-full cursor-crosshair" preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouse} onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="tf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ag-accent)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--ag-accent)" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {/* Grid */}
      {[0.25, 0.5, 0.75].map(p => (
        <line key={p} x1={PX} x2={W - PX} y1={PY + p * (H - PY * 2 - 6)} y2={PY + p * (H - PY * 2 - 6)}
          stroke="var(--ag-border)" strokeWidth="0.5" opacity="0.3" />
      ))}
      <path d={area} fill="url(#tf)" />
      <path d={line} fill="none" stroke="var(--ag-accent)" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      {/* Now marker */}
      <line x1={np.x} x2={np.x} y1={PY} y2={H - 12} stroke="var(--ag-accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.4" />
      <circle cx={np.x} cy={np.y} r="5" fill="var(--ag-accent)" stroke="var(--ag-bg-card)" strokeWidth="2.5" />
      <text x={np.x} y={PY - 7} textAnchor="middle" fontSize="8" fontWeight="700" fill="var(--ag-accent)" fontFamily="var(--ag-font-mono)">NOW</text>
      {/* Min/Max */}
      <text x={pts[mx].x} y={pts[mx].y - 10} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--ag-text-primary)" fontFamily="var(--ag-font-body)">{Math.round(hi)}°</text>
      <text x={pts[mi].x} y={pts[mi].y + 16} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--ag-text-muted)" fontFamily="var(--ag-font-body)">{Math.round(lo)}°</text>
      {/* Time labels */}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={H - 1} textAnchor="middle" fontSize="7" fill="var(--ag-text-dim)" fontFamily="var(--ag-font-mono)">{l.t}</text>
      ))}
      {/* Hover tooltip */}
      {hover && (
        <g>
          <line x1={hover.x} x2={hover.x} y1={PY} y2={H - 12} stroke="var(--ag-text-muted)" strokeWidth="0.8" strokeDasharray="2,2" />
          <circle cx={hover.x} cy={hover.y} r="4" fill="var(--ag-bg-card)" stroke="var(--ag-accent)" strokeWidth="2" />
          <rect x={hover.x - 36} y={hover.y - 38} width="72" height="28" rx="6"
            fill="var(--ag-bg-card)" stroke="var(--ag-border)" strokeWidth="1" />
          <text x={hover.x} y={hover.y - 24} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ag-text-primary)"
            fontFamily="var(--ag-font-body)">{Math.round(hover.temp)}°C</text>
          <text x={hover.x} y={hover.y - 14} textAnchor="middle" fontSize="7" fill="var(--ag-text-muted)"
            fontFamily="var(--ag-font-mono)">{hover.time} · {Math.round(hover.wind)} km/h</text>
        </g>
      )}
    </svg>
  );
}

/* ─ Spray Badge (compact overlay) ─ */
function SprayBadge({ hourly, ni }: { hourly: Hourly; ni: number }) {
  const h = new Date(hourly.time[ni]).getHours();
  const { overall, factors } = sprayCheck(hourly.wind_speed_10m[ni], hourly.temperature_2m[ni], hourly.relative_humidity_2m[ni], hourly.precipitation_probability[ni], h);
  const cfg = {
    good:     { label: "SPRAY: GO",      Icon: ShieldCheck, c: "var(--ag-green)",  bg: "var(--ag-green-dim)",   bd: "var(--ag-accent-border)" },
    marginal: { label: "SPRAY: CAUTION", Icon: ShieldAlert, c: "var(--ag-yellow)", bg: "rgba(245,158,11,0.06)", bd: "rgba(245,158,11,0.20)" },
    poor:     { label: "SPRAY: NO-GO",   Icon: ShieldX,     c: "var(--ag-red)",    bg: "var(--ag-red-dim)",     bd: "rgba(239,68,68,0.20)" },
  };
  const sc = cfg[overall];
  const dc = { good: "var(--ag-green)", marginal: "var(--ag-yellow)", poor: "var(--ag-red)" };

  return (
    <div className="rounded-xl border px-4 py-2.5 backdrop-blur-md" style={{ backgroundColor: sc.bg, borderColor: sc.bd }}>
      <div className="flex items-center gap-3 flex-wrap">
        <sc.Icon size={16} style={{ color: sc.c }} />
        <p className="font-mono text-[10px] font-bold uppercase tracking-[1.5px]" style={{ color: sc.c }}>{sc.label}</p>
        <div className="w-px h-3.5 opacity-20" style={{ backgroundColor: sc.c }} />
        <div className="flex gap-3">
          {Object.values(factors).map((f) => (
            <div key={f.l} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dc[f.s] }} />
              <span className="text-[8px] font-semibold text-ag-muted">{f.l}</span>
              <span className="text-[8px] font-bold text-ag-primary">{f.d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─ Mini Wind Direction Arrow (for KPI card) ─ */
function WindArrow({ deg, size = 28 }: { deg: number; size?: number }) {
  const r = size / 2 - 2;
  const a = (deg - 90) * Math.PI / 180;
  const tipX = size / 2 + Math.cos(a) * r;
  const tipY = size / 2 + Math.sin(a) * r;
  const bL = (deg - 90 + 145) * Math.PI / 180;
  const bR = (deg - 90 - 145) * Math.PI / 180;
  const bLen = 6;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ag-border)" strokeWidth="1.5" />
      <polygon
        points={`${tipX},${tipY} ${size / 2 + Math.cos(bL) * bLen},${size / 2 + Math.sin(bL) * bLen} ${size / 2},${size / 2} ${size / 2 + Math.cos(bR) * bLen},${size / 2 + Math.sin(bR) * bLen}`}
        fill="var(--ag-accent)" opacity="0.9" />
      <circle cx={size / 2} cy={size / 2} r="2" fill="var(--ag-bg-card)" stroke="var(--ag-accent)" strokeWidth="1.5" />
    </svg>
  );
}

/* ─ Hourly Strip with working scroll ─ */
function HourlyStrip({ hourly, ni }: { hourly: Hourly; ni: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => ni + i).filter(i => i < hourly.time.length);

  const scrollDir = (dir: number) => {
    if (ref.current) {
      ref.current.scrollLeft += dir * 320;
    }
  };

  return (
    <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: "var(--ag-accent)" }} />
          <p className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px]">Next 24 Hours</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => scrollDir(-1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors active:scale-95">
            <ChevronLeft size={14} className="text-ag-muted" />
          </button>
          <button onClick={() => scrollDir(1)}
            className="w-7 h-7 rounded-lg flex items-center justify-center border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors active:scale-95">
            <ChevronRight size={14} className="text-ag-muted" />
          </button>
        </div>
      </div>
      <div ref={ref} className="flex gap-1.5 overflow-x-auto pb-1"
        style={{ scrollBehavior: "smooth", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {hours.map((idx, i) => {
          const isNow = i === 0;
          const t = hourly.temperature_2m[idx];
          const w = hourly.wind_speed_10m[idx];
          const p = hourly.precipitation_probability[idx];
          const { Icon, color } = wx(hourly.weather_code[idx]);
          return (
            <div key={idx} className="flex-shrink-0 flex flex-col items-center py-2 px-2 rounded-xl transition-all"
              style={{ scrollSnapAlign: "start", minWidth: 54,
                backgroundColor: isNow ? "var(--ag-bg-active)" : "transparent",
                border: isNow ? "1px solid var(--ag-accent-border)" : "1px solid transparent" }}>
              <p className="text-[9px] font-semibold mb-1" style={{ color: isNow ? "var(--ag-accent)" : "var(--ag-text-muted)" }}>
                {isNow ? "Now" : fmtHour(hourly.time[idx])}</p>
              <Icon size={13} style={{ color }} className="mb-1" />
              <p className="text-[12px] font-bold text-ag-primary mb-0.5">{Math.round(t)}°</p>
              <div className="flex items-center gap-0.5">
                <Wind size={6} className="text-ag-muted" /><p className="text-[7px] text-ag-muted">{Math.round(w)}</p>
              </div>
              {p > 10 && <div className="flex items-center gap-0.5 mt-0.5">
                <Droplets size={6} style={{ color: "var(--ag-blue)" }} />
                <p className="text-[7px]" style={{ color: "var(--ag-blue)" }}>{p}%</p>
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════

export default function WeatherPage() {
  const [weather, setWeather] = useState<WData | null>(null);
  const [loc, setLoc] = useState("Swift Current, SK");
  const [loading, setLoading] = useState(true);
  const [activeGDD, setActiveGDD] = useState("Canola");
  const [showHourly, setShowHourly] = useState(true);
  const [expandDay, setExpandDay] = useState<number | null>(null);
  const [gddStart] = useState(new Date(new Date().getFullYear(), 3, 15));

  useEffect(() => {
    fetch("/api/weather").then(r => r.json()).then(d => {
      if (d.weather) { setWeather(d.weather); setLoc(d.location); }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5">{[0, 150, 300].map(d => (
        <div key={d} className="w-2 h-2 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}</div>
    </div>
  );

  if (!weather?.daily || !weather?.current || !weather?.hourly) return <p className="text-sm text-ag-muted">Failed to load weather data.</p>;

  const { current, hourly } = weather;

  // Slice daily to 7 days from today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIdx = weather.daily.time.findIndex((t: string) => t >= todayStr);
  const si = todayIdx >= 0 ? todayIdx : 0;
  const daily: Daily = {
    time: weather.daily.time.slice(si, si + 7),
    temperature_2m_max: weather.daily.temperature_2m_max.slice(si, si + 7),
    temperature_2m_min: weather.daily.temperature_2m_min.slice(si, si + 7),
    precipitation_sum: weather.daily.precipitation_sum.slice(si, si + 7),
    precipitation_probability_max: weather.daily.precipitation_probability_max.slice(si, si + 7),
    wind_speed_10m_max: weather.daily.wind_speed_10m_max.slice(si, si + 7),
    weather_code: weather.daily.weather_code.slice(si, si + 7),
  };

  const crop = GDD_CROPS.find(c => c.name === activeGDD)!;
  const now = new Date();

  // Now index
  const nowISO = now.toISOString().slice(0, 13);
  let ni = hourly.time.findIndex((t: string) => t.startsWith(nowISO));
  if (ni === -1) {
    const ms = now.getTime();
    ni = hourly.time.reduce((b: number, t: string, i: number) =>
      Math.abs(new Date(t).getTime() - ms) < Math.abs(new Date(hourly.time[b]).getTime() - ms) ? i : b, 0);
  }

  // GDD
  const daysSince = Math.max(0, Math.floor((now.getTime() - gddStart.getTime()) / 864e5));
  const weekGDD = daily.time.reduce((s: number, _: string, i: number) => s + calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], crop.base), 0);
  const totalGDD = daysSince * (weekGDD / daily.time.length) + weekGDD;
  const gddPct = Math.min(100, Math.round((totalGDD / crop.target) * 100));

  const { Icon: HeroIcon, label: heroLabel, color: heroColor } = wx(current.weather_code);
  const trend = daily.temperature_2m_max.length > 1 && daily.temperature_2m_max[1] > daily.temperature_2m_max[0] + 2
    ? "warming" : daily.temperature_2m_max.length > 1 && daily.temperature_2m_max[1] < daily.temperature_2m_max[0] - 2
    ? "cooling" : "steady";

  // Max precip for bar scaling in 7-day
  const maxPrecip = Math.max(...daily.precipitation_sum, 2);

  return (
    <div className="space-y-4 pb-16 w-full max-w-full overflow-x-hidden">

      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Weather</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={12} style={{ color: "var(--ag-green)" }} />
            <p className="text-[13px] text-ag-muted">{loc}</p>
            <span className="text-[11px] font-mono ml-2" style={{ color: "var(--ag-green)" }}>LIVE</span>
          </div>
        </div>
        <button onClick={() => setShowHourly(!showHourly)}
          className="flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all"
          style={{ color: showHourly ? "var(--ag-accent)" : "var(--ag-text-muted)",
            borderColor: showHourly ? "var(--ag-accent-border)" : "var(--ag-border)",
            backgroundColor: showHourly ? "var(--ag-accent-bg)" : "transparent" }}>
          {showHourly ? <Eye size={12} /> : <EyeOff size={12} />} Hourly
        </button>
      </div>

      {/* ══ HERO ════════════════════════════════════ */}
      <div className="relative rounded-2xl border border-[var(--ag-border)] p-6 overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--ag-bg-card) 0%, var(--ag-bg-primary) 50%, var(--ag-bg-card) 100%)" }}>
        <div className="absolute top-4 right-8 w-40 h-40 rounded-full blur-3xl opacity-15" style={{ backgroundColor: heroColor }} />

        {/* Top row: Temp + Chart + Today Summary */}
        <div className="relative flex items-start gap-4 max-w-full">
          {/* Left: temperature block */}
          <div className="flex-shrink-0 w-[140px]">
            <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[2px] mb-2">Current Conditions</p>
            <div className="flex items-baseline gap-0.5">
              <p className="text-[60px] font-bold text-ag-primary leading-none tracking-tight">{Math.round(current.temperature_2m)}</p>
              <span className="text-[22px] font-light text-ag-muted">°C</span>
            </div>
            <p className="text-[13px] text-ag-secondary mt-1">{heroLabel}</p>
            <p className="text-[11px] text-ag-muted mt-0.5">Feels like {Math.round(current.apparent_temperature)}°C</p>
            <div className="flex items-center gap-1 mt-2">
              {trend === "warming" && <ArrowUpRight size={12} style={{ color: "var(--ag-yellow)" }} />}
              {trend === "cooling" && <ArrowDownRight size={12} style={{ color: "var(--ag-blue)" }} />}
              {trend === "steady" && <Minus size={12} className="text-ag-muted" />}
              <span className="text-[10px] text-ag-muted font-medium capitalize">{trend}</span>
            </div>
          </div>

          {/* Center: LARGE trend chart */}
          <div className="flex-1 min-w-0 h-[150px]">
            <TempTrend hourly={hourly} ni={ni} />
          </div>

          {/* Right: Today's summary card */}
          <div className="flex-shrink-0 w-[150px] rounded-xl border border-[var(--ag-border)] p-3"
            style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <div className="flex items-center gap-2 mb-3">
              <HeroIcon size={28} style={{ color: heroColor }} strokeWidth={1.3} />
              <div>
                <p className="text-[11px] font-bold text-ag-primary">Today</p>
                <p className="text-[9px] text-ag-muted">{MONTHS[now.getMonth()]} {now.getDate()}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-ag-muted">High</span>
                <span className="font-bold text-ag-primary">{Math.round(daily.temperature_2m_max[0])}°</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-ag-muted">Low</span>
                <span className="font-bold text-ag-primary">{Math.round(daily.temperature_2m_min[0])}°</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-ag-muted">Wind</span>
                <span className="font-bold text-ag-primary">{Math.round(daily.wind_speed_10m_max[0])} km/h</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-ag-muted">Rain</span>
                <span className="font-bold" style={{ color: daily.precipitation_probability_max[0] > 50 ? "var(--ag-blue)" : "var(--ag-text-primary)" }}>
                  {daily.precipitation_probability_max[0]}%
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-ag-muted">Precip</span>
                <span className="font-bold text-ag-primary">{daily.precipitation_sum[0].toFixed(1)} mm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spray badge */}
        <div className="mt-4"><SprayBadge hourly={hourly} ni={ni} /></div>

        {/* KPI cards — Wind card gets compass arrow */}
        <div className="grid grid-cols-4 gap-2.5 mt-4">
          {/* Humidity */}
          <div className="rounded-xl p-3 border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets size={12} style={{ color: "var(--ag-blue)" }} />
              <p className="font-mono text-[8px] text-ag-muted uppercase tracking-[1px]">Humidity</p>
            </div>
            <p className="text-[16px] font-semibold text-ag-primary">{current.relative_humidity_2m}%</p>
          </div>

          {/* Wind — with compass arrow */}
          <div className="rounded-xl p-3 border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Wind size={12} style={{ color: "var(--ag-text-secondary)" }} />
              <p className="font-mono text-[8px] text-ag-muted uppercase tracking-[1px]">Wind</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[16px] font-semibold text-ag-primary">{Math.round(current.wind_speed_10m)} km/h</p>
                <p className="text-[9px] text-ag-muted mt-0.5">{windLabel(current.wind_direction_10m)}</p>
              </div>
              <WindArrow deg={current.wind_direction_10m} size={32} />
            </div>
          </div>

          {/* Precipitation */}
          <div className="rounded-xl p-3 border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <CloudRain size={12} style={{ color: "#818CF8" }} />
              <p className="font-mono text-[8px] text-ag-muted uppercase tracking-[1px]">Precipitation</p>
            </div>
            <p className="text-[16px] font-semibold text-ag-primary">{current.precipitation} mm</p>
          </div>

          {/* Soil Temp */}
          <div className="rounded-xl p-3 border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer size={12} style={{ color: "var(--ag-yellow)" }} />
              <p className="font-mono text-[8px] text-ag-muted uppercase tracking-[1px]">Soil Temp</p>
            </div>
            <p className="text-[16px] font-semibold text-ag-primary">{Math.round(current.soil_temperature_0cm)}°C</p>
          </div>
        </div>
      </div>

      {/* ══ HOURLY ═══════════════════════════════════ */}
      {showHourly && <HourlyStrip hourly={hourly} ni={ni} />}

      {/* ══ 7-DAY FORECAST (with integrated precip bars) ════ */}
      <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px]">7-Day Forecast</p>
          <div className="flex items-center gap-3 text-[9px] text-ag-muted">
            {[{ l: "Good", c: "var(--ag-green)" }, { l: "Marginal", c: "var(--ag-yellow)" }, { l: "Poor", c: "var(--ag-red)" }, { l: "Cold", c: "var(--ag-text-muted)" }].map(x => (
              <div key={x.l} className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: x.c }} /><span>{x.l}</span></div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daily.time.map((ds: string, i: number) => {
            const d = new Date(ds);
            const cond = fieldCond(daily.precipitation_probability_max[i], daily.wind_speed_10m_max[i], daily.temperature_2m_max[i]);
            const { Icon, color } = wx(daily.weather_code[i]);
            const today = i === 0;
            const exp = expandDay === i;
            const precipH = Math.max(2, (daily.precipitation_sum[i] / maxPrecip) * 24);

            return (
              <div key={i} className="flex flex-col items-center py-3 px-1 rounded-xl transition-all cursor-pointer hover:border-[var(--ag-border)]"
                style={{
                  backgroundColor: exp ? "var(--ag-bg-active)" : today ? "var(--ag-bg-active)" : "var(--ag-bg-hover)",
                  border: exp ? "1px solid var(--ag-accent-border)" : today ? "1px solid var(--ag-border)" : "1px solid transparent",
                }}
                onClick={() => setExpandDay(exp ? null : i)}>
                <p className="text-[10px] font-semibold mb-0.5" style={{ color: today ? "var(--ag-green)" : "var(--ag-text-primary)" }}>
                  {today ? "Today" : DAYS[d.getDay()]}</p>
                <p className="text-[9px] text-ag-dim mb-2">{MONTHS[d.getMonth()]} {d.getDate()}</p>
                <Icon size={18} style={{ color }} className="mb-2" />
                <p className="text-[14px] font-bold text-ag-primary">{Math.round(daily.temperature_2m_max[i])}°</p>
                <p className="text-[10px] text-ag-dim mb-1.5">{Math.round(daily.temperature_2m_min[i])}°</p>

                {/* Integrated precip bar */}
                <div className="w-full px-1 mb-1.5">
                  <div className="w-full h-[3px] rounded-full" style={{ backgroundColor: "var(--ag-bg-primary)" }}>
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${Math.min(100, (daily.precipitation_sum[i] / maxPrecip) * 100)}%`,
                      backgroundColor: daily.precipitation_sum[i] > 5 ? "var(--ag-blue)" : daily.precipitation_sum[i] > 0 ? "var(--ag-accent)" : "transparent",
                    }} />
                  </div>
                  <div className="flex items-center justify-center gap-0.5 mt-1">
                    <Droplets size={6} style={{ color: "var(--ag-blue)" }} />
                    <p className="text-[7px] font-medium" style={{ color: "var(--ag-blue)" }}>
                      {daily.precipitation_sum[i] > 0 ? `${daily.precipitation_sum[i].toFixed(1)}mm` : `${daily.precipitation_probability_max[i]}%`}
                    </p>
                  </div>
                </div>

                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cond.color }} />
                <ChevronDown size={9} className="mt-1 text-ag-dim transition-transform" style={{ transform: exp ? "rotate(180deg)" : "none" }} />
              </div>
            );
          })}
        </div>

        {/* Expanded detail */}
        {expandDay !== null && (() => {
          const i = expandDay;
          const d = new Date(daily.time[i]);
          const { label } = wx(daily.weather_code[i]);
          const cond = fieldCond(daily.precipitation_probability_max[i], daily.wind_speed_10m_max[i], daily.temperature_2m_max[i]);
          const g = calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], crop.base);
          return (
            <div className="mt-3 p-4 rounded-xl border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[13px] font-bold text-ag-primary mb-3">{DAYS[d.getDay()]}, {MONTHS[d.getMonth()]} {d.getDate()} — {label}</p>
              <div className="grid grid-cols-3 gap-x-8 gap-y-2">
                {[
                  { l: "High / Low", v: `${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°` },
                  { l: "Precipitation", v: `${daily.precipitation_sum[i].toFixed(1)} mm` },
                  { l: "Rain Probability", v: `${daily.precipitation_probability_max[i]}%` },
                  { l: "Max Wind", v: `${Math.round(daily.wind_speed_10m_max[i])} km/h` },
                  { l: "Field Condition", v: cond.label, c: cond.color },
                  { l: `GDD (${crop.name})`, v: g.toFixed(1) },
                ].map(r => (
                  <div key={r.l} className="flex justify-between text-[11px]">
                    <span className="text-ag-muted">{r.l}</span>
                    <span className="font-semibold" style={{ color: (r as { c?: string }).c || "var(--ag-text-primary)" }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ══ GDD ══════════════════════════════════════ */}
      <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-5">
        <div className="flex items-center justify-between mb-5">
          <p className="font-mono text-[10px] font-semibold text-ag-secondary uppercase tracking-[2px]">Growing Degree Days</p>
          <div className="flex gap-1.5">
            {GDD_CROPS.map(c => (
              <button key={c.name} onClick={() => setActiveGDD(c.name)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                style={activeGDD === c.name
                  ? { backgroundColor: c.color, color: "var(--ag-bg-base)", boxShadow: `0 0 12px ${c.color}30` }
                  : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid var(--ag-border)" }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-[36px] font-bold text-ag-primary leading-none">{Math.round(totalGDD)}</p>
              <span className="text-[12px] font-medium text-ag-muted ml-1">GDD</span>
            </div>
            <p className="text-[11px] text-ag-muted mt-1">Base {crop.base}°C · Target {crop.target} GDD</p>
          </div>
          <div className="text-right">
            <p className="text-[20px] font-bold" style={{ color: crop.color }}>{gddPct}%</p>
            <p className="text-[10px] text-ag-muted">to maturity</p>
          </div>
        </div>
        <div className="h-2 bg-[var(--ag-bg-hover)] rounded-full overflow-hidden mb-5">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${gddPct}%`, background: `linear-gradient(90deg, ${crop.color}80, ${crop.color})`, boxShadow: `0 0 8px ${crop.color}40` }} />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {daily.time.map((_: string, i: number) => {
            const g = calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], crop.base);
            const d = new Date(daily.time[i]);
            const h = Math.min(100, (g / 18) * 100);
            const today = i === 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <p className={`text-[10px] ${today ? "text-ag-primary font-semibold" : "text-ag-muted"}`}>{today ? "Today" : DAYS[d.getDay()]}</p>
                <div className="w-full h-14 bg-[var(--ag-bg-hover)] rounded-lg overflow-hidden flex items-end p-0.5">
                  <div className="w-full rounded-md transition-all duration-500"
                    style={{ height: `${h}%`, background: `linear-gradient(to top, ${crop.color}90, ${crop.color}40)`, minHeight: g > 0 ? "4px" : "0px" }} />
                </div>
                <p className="text-[10px] font-semibold text-ag-primary">{g.toFixed(1)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
