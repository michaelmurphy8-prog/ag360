"use client";

import { useState, useEffect, useRef } from "react";
import {
  Droplets, Wind, Thermometer, CloudRain,
  Sun, CloudSun, Cloud, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, Snowflake, MapPin,
  ArrowUpRight, ArrowDownRight, Minus,
  Shield, ShieldAlert, ShieldCheck, ShieldX,
  Clock, Eye, EyeOff,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────

const GDD_CROPS = [
  { name: "Canola", base: 5, target: 1500, color: "var(--ag-green)" },
  { name: "Spring Wheat", base: 5, target: 1200, color: "var(--ag-yellow)" },
  { name: "Barley", base: 5, target: 1100, color: "#818CF8" },
  { name: "Peas", base: 4.5, target: 1000, color: "var(--ag-blue)" },
];

const WMO_ICONS: Record<number, { label: string; Icon: React.ElementType; color: string }> = {
  0:  { label: "Clear Sky", Icon: Sun, color: "var(--ag-yellow)" },
  1:  { label: "Mainly Clear", Icon: CloudSun, color: "var(--ag-yellow)" },
  2:  { label: "Partly Cloudy", Icon: CloudSun, color: "var(--ag-text-secondary)" },
  3:  { label: "Overcast", Icon: Cloud, color: "var(--ag-text-muted)" },
  45: { label: "Foggy", Icon: CloudFog, color: "var(--ag-text-muted)" },
  48: { label: "Icy Fog", Icon: CloudFog, color: "var(--ag-text-muted)" },
  51: { label: "Light Drizzle", Icon: CloudDrizzle, color: "var(--ag-blue)" },
  61: { label: "Light Rain", Icon: CloudRain, color: "var(--ag-blue)" },
  63: { label: "Moderate Rain", Icon: CloudRain, color: "#3B82F6" },
  65: { label: "Heavy Rain", Icon: CloudRain, color: "#2563EB" },
  71: { label: "Light Snow", Icon: CloudSnow, color: "#CBD5E1" },
  73: { label: "Moderate Snow", Icon: Snowflake, color: "#E2E8F0" },
  75: { label: "Heavy Snow", Icon: Snowflake, color: "var(--ag-text-primary)" },
  80: { label: "Rain Showers", Icon: CloudDrizzle, color: "var(--ag-blue)" },
  95: { label: "Thunderstorm", Icon: CloudLightning, color: "#818CF8" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Types ───────────────────────────────────────────────────

type HourlyData = {
  time: string[];
  temperature_2m: number[];
  wind_speed_10m: number[];
  relative_humidity_2m: number[];
  precipitation_probability: number[];
  weather_code: number[];
};

type WeatherData = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    soil_temperature_0cm: number;
  };
  hourly: HourlyData;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
};

type SprayFactor = "good" | "marginal" | "poor";

// ─── Helpers ─────────────────────────────────────────────────

function getWeatherInfo(code: number) {
  return WMO_ICONS[code] || { label: "Unknown", Icon: Cloud, color: "var(--ag-text-muted)" };
}

function getFieldCondition(precipProb: number, windSpeed: number, temp: number) {
  if (temp < 5) return { label: "Too Cold", color: "var(--ag-text-muted)" };
  if (precipProb > 70) return { label: "Poor", color: "var(--ag-red)" };
  if (precipProb > 40 || windSpeed > 40) return { label: "Marginal", color: "var(--ag-yellow)" };
  return { label: "Good", color: "var(--ag-green)" };
}

function calcGDD(maxTemp: number, minTemp: number, base: number) {
  return Math.max(0, (maxTemp + minTemp) / 2 - base);
}

function getSprayFactors(wind: number, temp: number, humidity: number, precipProb: number, hour: number) {
  const factors: Record<string, { status: SprayFactor; label: string; detail: string }> = {
    wind: {
      status: wind < 15 ? "good" : wind < 25 ? "marginal" : "poor",
      label: "Wind",
      detail: `${Math.round(wind)} km/h`,
    },
    temp: {
      status: temp >= 10 && temp <= 28 ? "good" : (temp >= 5 && temp < 10) || (temp > 28 && temp <= 32) ? "marginal" : "poor",
      label: "Temp",
      detail: `${Math.round(temp)}°C`,
    },
    humidity: {
      status: humidity < 70 ? "good" : humidity < 85 ? "marginal" : "poor",
      label: "Humidity",
      detail: `${Math.round(humidity)}%`,
    },
    precip: {
      status: precipProb < 20 ? "good" : precipProb < 50 ? "marginal" : "poor",
      label: "Rain Risk",
      detail: `${Math.round(precipProb)}%`,
    },
    inversion: {
      status: (hour >= 18 || hour < 6) && wind < 8 ? "marginal" : (hour >= 20 || hour < 5) && wind < 5 ? "poor" : "good",
      label: "Inversion",
      detail: (hour >= 18 || hour < 6) && wind < 8 ? "Risk" : "Low",
    },
  };
  const values = Object.values(factors).map(f => f.status);
  const overall: SprayFactor = values.includes("poor") ? "poor" : values.includes("marginal") ? "marginal" : "good";
  return { overall, factors };
}

function windDir(deg: number) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function formatHour(isoStr: string) {
  const d = new Date(isoStr);
  const h = d.getHours();
  if (h === 0) return "12AM";
  if (h === 12) return "12PM";
  return h > 12 ? `${h - 12}PM` : `${h}AM`;
}

// ─── 24h Temperature Trend (SVG) ─────────────────────────────

function TempTrendChart({ hourly, nowIndex }: { hourly: HourlyData; nowIndex: number }) {
  const W = 420, H = 130, PX = 10, PY = 18;
  const start = Math.max(0, nowIndex - 12);
  const end = Math.min(hourly.time.length, nowIndex + 12);
  const slice = hourly.temperature_2m.slice(start, end);
  const times = hourly.time.slice(start, end);
  const n = slice.length;
  if (n < 4) return null;

  const minT = Math.min(...slice);
  const maxT = Math.max(...slice);
  const range = maxT - minT || 1;
  const nowX = ((nowIndex - start) / (n - 1)) * (W - PX * 2) + PX;

  const pts = slice.map((t, i) => ({
    x: (i / (n - 1)) * (W - PX * 2) + PX,
    y: PY + (1 - (t - minT) / range) * (H - PY * 2),
  }));

  // Build smooth line
  let path = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const area = path + ` L ${pts[pts.length - 1].x} ${H - 4} L ${pts[0].x} ${H - 4} Z`;

  // Time labels (every 4h)
  const labels: { x: number; text: string }[] = [];
  for (let i = 0; i < n; i += 4) {
    labels.push({ x: pts[i].x, text: formatHour(times[i]) });
  }

  // Min/max markers
  const minIdx = slice.indexOf(minT);
  const maxIdx = slice.indexOf(maxT);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ag-accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--ag-accent)" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--ag-accent)" stopOpacity="0.4" />
          <stop offset="50%" stopColor="var(--ag-accent)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--ag-accent)" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line key={pct} x1={PX} x2={W - PX} y1={PY + pct * (H - PY * 2)} y2={PY + pct * (H - PY * 2)}
          stroke="var(--ag-grid-line)" strokeWidth="0.5" />
      ))}

      {/* Area fill */}
      <path d={area} fill="url(#trendFill)" />

      {/* Line */}
      <path d={path} fill="none" stroke="url(#trendLine)" strokeWidth="2" strokeLinecap="round" />

      {/* Now marker */}
      <line x1={nowX} x2={nowX} y1={PY - 4} y2={H - 8}
        stroke="var(--ag-accent)" strokeWidth="1" strokeDasharray="3,3" opacity="0.6" />
      <circle cx={nowX} cy={pts[nowIndex - start]?.y || H / 2} r="4"
        fill="var(--ag-accent)" stroke="var(--ag-bg-card)" strokeWidth="2" />
      <text x={nowX} y={PY - 6} textAnchor="middle"
        fontSize="8" fontWeight="600" fontFamily="var(--ag-font-mono)" fill="var(--ag-accent)">NOW</text>

      {/* Min/Max labels */}
      <text x={pts[maxIdx].x} y={pts[maxIdx].y - 8} textAnchor="middle"
        fontSize="9" fontWeight="700" fontFamily="var(--ag-font-body)" fill="var(--ag-text-primary)">
        {Math.round(maxT)}°
      </text>
      <text x={pts[minIdx].x} y={pts[minIdx].y + 14} textAnchor="middle"
        fontSize="9" fontWeight="600" fontFamily="var(--ag-font-body)" fill="var(--ag-text-muted)">
        {Math.round(minT)}°
      </text>

      {/* Time labels */}
      {labels.map((l, i) => (
        <text key={i} x={l.x} y={H - 0} textAnchor="middle"
          fontSize="7" fontFamily="var(--ag-font-mono)" fill="var(--ag-text-dim)">
          {l.text}
        </text>
      ))}
    </svg>
  );
}

// ─── Spray Window Indicator ──────────────────────────────────

function SprayWindowBanner({ hourly, nowIndex }: { hourly: HourlyData; nowIndex: number }) {
  const hour = new Date(hourly.time[nowIndex]).getHours();
  const { overall, factors } = getSprayFactors(
    hourly.wind_speed_10m[nowIndex],
    hourly.temperature_2m[nowIndex],
    hourly.relative_humidity_2m[nowIndex],
    hourly.precipitation_probability[nowIndex],
    hour,
  );

  const statusMap = {
    good: {
      label: "SPRAY WINDOW OPEN",
      Icon: ShieldCheck,
      color: "var(--ag-green)",
      bg: "var(--ag-green-dim)",
      border: "var(--ag-accent-border)",
    },
    marginal: {
      label: "MARGINAL CONDITIONS",
      Icon: ShieldAlert,
      color: "var(--ag-yellow)",
      bg: "rgba(245,158,11,0.06)",
      border: "rgba(245,158,11,0.15)",
    },
    poor: {
      label: "SPRAY WINDOW CLOSED",
      Icon: ShieldX,
      color: "var(--ag-red)",
      bg: "var(--ag-red-dim)",
      border: "rgba(239,68,68,0.15)",
    },
  };

  const s = statusMap[overall];
  const factorDotColor = { good: "var(--ag-green)", marginal: "var(--ag-yellow)", poor: "var(--ag-red)" };

  // Find next window change (scan forward up to 24h)
  let nextChangeHour = null;
  for (let i = nowIndex + 1; i < Math.min(nowIndex + 24, hourly.time.length); i++) {
    const h = new Date(hourly.time[i]).getHours();
    const future = getSprayFactors(hourly.wind_speed_10m[i], hourly.temperature_2m[i], hourly.relative_humidity_2m[i], hourly.precipitation_probability[i], h);
    if (future.overall !== overall) {
      nextChangeHour = i - nowIndex;
      break;
    }
  }

  return (
    <div className="rounded-2xl border p-5 transition-all"
      style={{ backgroundColor: s.bg, borderColor: s.border }}>
      <div className="flex items-center gap-5 flex-wrap lg:flex-nowrap">
        {/* Status icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
          <s.Icon size={24} style={{ color: s.color }} />
        </div>

        {/* Status text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[2px]"
              style={{ color: s.color }}>{s.label}</p>
            
          </div>
          <p className="text-[12px] text-ag-muted mt-0.5">
            {overall === "good" && "All conditions favorable for spraying"}
            {overall === "marginal" && "Proceed with caution — check individual factors"}
            {overall === "poor" && "One or more conditions unfavorable — delay spraying"}
            {nextChangeHour && (
              <span className="ml-2 font-medium" style={{ color: "var(--ag-text-secondary)" }}>
                · Changes in ~{nextChangeHour}h
              </span>
            )}
          </p>
        </div>

        {/* Factor breakdown */}
        <div className="flex gap-3 flex-wrap justify-end">
          {Object.values(factors).map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: factorDotColor[f.status] }} />
              <p className="text-[10px] font-semibold text-ag-muted">{f.label}</p>
              <p className="text-[11px] font-bold text-ag-primary">{f.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Hourly Forecast Strip ───────────────────────────────────

function HourlyStrip({ hourly, nowIndex }: { hourly: HourlyData; nowIndex: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = Array.from({ length: 24 }, (_, i) => nowIndex + i).filter(i => i < hourly.time.length);

  useEffect(() => {
    // Scroll to show "now" near the left
    scrollRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: "var(--ag-accent)" }} />
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">
            Next 24 Hours
          </p>
        </div>
      </div>
      <div ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
        style={{ scrollSnapType: "x mandatory" }}>
        {hours.map((idx, i) => {
          const isNow = i === 0;
          const temp = hourly.temperature_2m[idx];
          const wind = hourly.wind_speed_10m[idx];
          const precip = hourly.precipitation_probability[idx];
          const { Icon, color } = getWeatherInfo(hourly.weather_code[idx]);

          return (
            <div key={idx}
              className="flex-shrink-0 flex flex-col items-center py-3 px-3 rounded-xl transition-all"
              style={{
                scrollSnapAlign: "start",
                minWidth: 68,
                backgroundColor: isNow ? "var(--ag-bg-active)" : "var(--ag-bg-hover)",
                border: isNow ? "1px solid var(--ag-accent-border)" : "1px solid transparent",
              }}>
              <p className="text-[10px] font-semibold mb-2"
                style={{ color: isNow ? "var(--ag-accent)" : "var(--ag-text-muted)" }}>
                {isNow ? "Now" : formatHour(hourly.time[idx])}
              </p>
              <Icon size={16} style={{ color }} className="mb-2" />
              <p className="text-[14px] font-bold text-ag-primary mb-1">
                {Math.round(temp)}°
              </p>
              <div className="flex items-center gap-0.5 mb-0.5">
                <Wind size={8} className="text-ag-muted" />
                <p className="text-[9px] text-ag-muted">{Math.round(wind)}</p>
              </div>
              {precip > 10 && (
                <div className="flex items-center gap-0.5">
                  <Droplets size={8} className="text-[var(--ag-blue)]" />
                  <p className="text-[9px] text-[var(--ag-blue)]">{precip}%</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  WEATHER PAGE
// ═══════════════════════════════════════════════════════════════

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState("Swift Current, SK");
  const [loading, setLoading] = useState(true);
  const [activeGDD, setActiveGDD] = useState("Canola");
  const [showHourly, setShowHourly] = useState(true);
  const [gddStart] = useState(new Date(new Date().getFullYear(), 3, 15));

  useEffect(() => {
    fetch("/api/weather")
      .then(r => r.json())
      .then(data => {
        if (data.weather) {
          setWeather(data.weather);
          setLocation(data.location);
        }
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex gap-1.5">
          {[0, 150, 300].map(d => (
            <div key={d} className="w-2 h-2 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!weather || !weather.daily || !weather.current || !weather.hourly) {
    return <p className="text-sm text-ag-muted">Failed to load weather data.</p>;
  }

  const current = weather.current;
  const daily = weather.daily;
  const hourly = weather.hourly;
  const activeCrop = GDD_CROPS.find(c => c.name === activeGDD)!;
  const now = new Date();

  // Find current hour index in hourly data
  const nowISO = now.toISOString().slice(0, 13);
  let nowIndex = hourly.time.findIndex(t => t.startsWith(nowISO));
  if (nowIndex === -1) {
    // Fallback: find closest hour
    const nowMs = now.getTime();
    nowIndex = hourly.time.reduce((best: number, t: string, i: number) => {
      return Math.abs(new Date(t).getTime() - nowMs) < Math.abs(new Date(hourly.time[best]).getTime() - nowMs) ? i : best;
    }, 0);
  }

  // GDD calculations
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - gddStart.getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedGDD = daily.time.reduce((sum: number, _: string, i: number) => sum + calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], activeCrop.base), 0);
  const totalEstimatedGDD = daysSinceStart * (estimatedGDD / daily.time.length) + estimatedGDD;
  const gddPct = Math.min(100, Math.round((totalEstimatedGDD / activeCrop.target) * 100));

  const { Icon: HeroIcon, label: heroLabel, color: heroColor } = getWeatherInfo(current.weather_code);
  const todayHigh = daily.temperature_2m_max[0];
  const tomorrowHigh = daily.temperature_2m_max[1];
  const tempTrend = tomorrowHigh > todayHigh + 2 ? "warming" : tomorrowHigh < todayHigh - 2 ? "cooling" : "steady";

  return (
    <div className="space-y-5 pb-16 w-full max-w-full overflow-x-hidden">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Weather</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={12} style={{ color: "var(--ag-green)" }} />
            <p className="text-[13px] text-ag-muted">{location}</p>
            <span className="text-[11px] font-mono ml-2" style={{ color: "var(--ag-green)" }}>LIVE</span>
          </div>
        </div>
        <button onClick={() => setShowHourly(!showHourly)}
          className="flex items-center gap-2 text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all"
          style={{
            color: showHourly ? "var(--ag-accent)" : "var(--ag-text-muted)",
            borderColor: showHourly ? "var(--ag-accent-border)" : "var(--ag-border)",
            backgroundColor: showHourly ? "var(--ag-accent-bg)" : "transparent",
          }}>
          {showHourly ? <Eye size={12} /> : <EyeOff size={12} />}
          Hourly
        </button>
      </div>

      {/* ── Hero: Current Conditions + 24h Trend ──────────── */}
      <div
        className="relative rounded-2xl border border-[var(--ag-border)] p-8 overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--ag-bg-card) 0%, var(--ag-bg-primary) 50%, var(--ag-bg-card) 100%)" }}
      >
        <div className="absolute top-4 right-8 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: heroColor }} />

        <div className="relative flex items-start gap-6 overflow-hidden max-w-full">
          {/* Left: temperature */}
          <div className="flex-shrink-0 w-48">
            <p className="font-mono text-[10px] font-semibold text-ag-muted uppercase tracking-[2px] mb-3">
              Current Conditions
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-[72px] font-bold text-ag-primary leading-none tracking-tight">
                {Math.round(current.temperature_2m)}
              </p>
              <span className="text-[28px] font-light text-ag-muted">°C</span>
            </div>
            <p className="text-[15px] text-ag-secondary mt-2">{heroLabel}</p>
            <p className="text-[13px] text-ag-muted mt-0.5">
              Feels like {Math.round(current.apparent_temperature)}°C
            </p>
            <div className="flex items-center gap-1.5 mt-4">
              {tempTrend === "warming" && <ArrowUpRight size={14} style={{ color: "var(--ag-yellow)" }} />}
              {tempTrend === "cooling" && <ArrowDownRight size={14} style={{ color: "var(--ag-blue)" }} />}
              {tempTrend === "steady" && <Minus size={14} className="text-ag-muted" />}
              <span className="text-[12px] text-ag-muted font-medium capitalize">{tempTrend} trend</span>
            </div>
          </div>

          {/* Center: 24h temperature trend chart */}
          <div className="flex-1 min-w-0 h-[130px] hidden lg:block">
            <TempTrendChart hourly={hourly} nowIndex={nowIndex} />
          </div>

          {/* Right: weather icon */}
          <div className="flex-shrink-0 relative">
            <HeroIcon size={96} className="opacity-90" style={{ color: heroColor }} strokeWidth={1.2} />
          </div>
        </div>

        {/* KPI stat pills (FIXED backgrounds) */}
        <div className="grid grid-cols-4 gap-3 mt-8">
          {[
            { icon: Droplets, label: "Humidity", value: `${current.relative_humidity_2m}%`, color: "var(--ag-blue)" },
            { icon: Wind, label: "Wind", value: `${Math.round(current.wind_speed_10m)} km/h ${windDir(current.wind_direction_10m)}`, color: "var(--ag-text-secondary)" },
            { icon: CloudRain, label: "Precipitation", value: `${current.precipitation} mm`, color: "#818CF8" },
            { icon: Thermometer, label: "Soil Temp", value: `${Math.round(current.soil_temperature_0cm)}°C`, color: "var(--ag-yellow)" },
          ].map((stat) => (
            <div key={stat.label}
              className="rounded-xl p-4 border border-[var(--ag-border)]"
              style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} style={{ color: stat.color }} />
                <p className="font-mono text-[10px] text-ag-muted uppercase tracking-[1px]">{stat.label}</p>
              </div>
              <p className="text-[18px] font-semibold text-ag-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Spray Window Indicator ─────────────────────────── */}
      <SprayWindowBanner hourly={hourly} nowIndex={nowIndex} />

      {/* ── Hourly Strip (toggleable) ─────────────────────── */}
      {showHourly && <HourlyStrip hourly={hourly} nowIndex={nowIndex} />}

      {/* ── 7-Day Forecast ─────────────────────────────────── */}
      <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">7-Day Forecast</p>
          <div className="flex items-center gap-3 text-[10px] text-ag-muted">
            {[
              { label: "Good", color: "var(--ag-green)" },
              { label: "Marginal", color: "var(--ag-yellow)" },
              { label: "Poor", color: "var(--ag-red)" },
              { label: "Too Cold", color: "var(--ag-text-muted)" },
            ].map(c => (
              <div key={c.label} className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {daily.time.map((dateStr: string, i: number) => {
            const date = new Date(dateStr);
            const condition = getFieldCondition(daily.precipitation_probability_max[i], daily.wind_speed_10m_max[i], daily.temperature_2m_max[i]);
            const { Icon, color } = getWeatherInfo(daily.weather_code[i]);
            const isToday = i === 0;

            return (
              <div key={i}
                className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
                  isToday
                    ? "border border-[var(--ag-border)]"
                    : "border border-transparent hover:border-[var(--ag-border)]"
                }`}
                style={{
                  backgroundColor: isToday ? "var(--ag-bg-active)" : "var(--ag-bg-hover)",
                }}>
                <p className="text-[11px] font-semibold mb-0.5"
                  style={{ color: isToday ? "var(--ag-green)" : "var(--ag-text-primary)" }}>
                  {isToday ? "Today" : DAYS[date.getDay()]}
                </p>
                <p className="text-[10px] text-ag-dim mb-3">
                  {MONTHS[date.getMonth()]} {date.getDate()}
                </p>
                <Icon size={22} style={{ color }} className="mb-3" />
                <p className="text-[15px] font-bold text-ag-primary">
                  {Math.round(daily.temperature_2m_max[i])}°
                </p>
                <p className="text-[12px] text-ag-dim mb-2">
                  {Math.round(daily.temperature_2m_min[i])}°
                </p>
                <div className="flex items-center gap-0.5 mb-2">
                  <Droplets size={9} style={{ color: "var(--ag-blue)" }} />
                  <p className="text-[10px] font-medium" style={{ color: "var(--ag-blue)" }}>{daily.precipitation_probability_max[i]}%</p>
                </div>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: condition.color }} title={condition.label} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Growing Degree Days ─────────────────────────────── */}
      <div className="bg-[var(--ag-bg-card)] rounded-2xl border border-[var(--ag-border)] p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-[11px] font-semibold text-ag-secondary uppercase tracking-[2px]">
            Growing Degree Days
          </p>
          <div className="flex gap-1.5">
            {GDD_CROPS.map(c => (
              <button key={c.name} onClick={() => setActiveGDD(c.name)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                style={activeGDD === c.name
                  ? { backgroundColor: c.color, color: "var(--ag-bg-base)", boxShadow: `0 0 12px ${c.color}30` }
                  : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid var(--ag-border)" }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-baseline gap-1">
              <p className="text-[40px] font-bold text-ag-primary leading-none tracking-tight">
                {Math.round(totalEstimatedGDD)}
              </p>
              <span className="text-[14px] font-medium text-ag-muted ml-1">GDD</span>
            </div>
            <p className="text-[12px] text-ag-muted mt-1.5">
              Base {activeCrop.base}°C · Target {activeCrop.target} GDD
            </p>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-bold" style={{ color: activeCrop.color }}>{gddPct}%</p>
            <p className="text-[11px] text-ag-muted">to maturity</p>
          </div>
        </div>

        <div className="h-3 bg-[var(--ag-bg-hover)] rounded-full overflow-hidden mb-6">
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${gddPct}%`,
              background: `linear-gradient(90deg, ${activeCrop.color}80, ${activeCrop.color})`,
              boxShadow: `0 0 8px ${activeCrop.color}40`,
            }} />
        </div>

        <div className="grid grid-cols-7 gap-3">
          {daily.time.map((_: string, i: number) => {
            const gdd = calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], activeCrop.base);
            const date = new Date(daily.time[i]);
            const barHeight = Math.min(100, (gdd / 18) * 100);
            const isToday = i === 0;
            return (
              <div key={i} className="flex flex-col items-center gap-2">
                <p className={`text-[11px] ${isToday ? "text-ag-primary font-semibold" : "text-ag-muted"}`}>
                  {isToday ? "Today" : DAYS[date.getDay()]}
                </p>
                <div className="w-full h-20 bg-[var(--ag-bg-hover)] rounded-lg overflow-hidden flex items-end p-0.5">
                  <div className="w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${barHeight}%`,
                      background: `linear-gradient(to top, ${activeCrop.color}90, ${activeCrop.color}40)`,
                      minHeight: gdd > 0 ? "4px" : "0px",
                    }} />
                </div>
                <p className="text-[12px] font-semibold text-ag-primary">{gdd.toFixed(1)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
