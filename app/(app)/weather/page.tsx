"use client";

import { useState, useEffect } from "react";
import {
  Droplets, Wind, Thermometer, CloudRain,
  Sun, CloudSun, Cloud, CloudDrizzle, CloudSnow,
  CloudLightning, CloudFog, Snowflake, MapPin,
  ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ─── Config ──────────────────────────────────────────────────

const GDD_CROPS = [
  { name: "Canola", base: 5, target: 1500, color: "var(--ag-green)", gradient: "from-[var(--ag-green)]/20 to-[var(--ag-green)]/5" },
  { name: "Spring Wheat", base: 5, target: 1200, color: "var(--ag-yellow)", gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5" },
  { name: "Barley", base: 5, target: 1100, color: "#818CF8", gradient: "from-[#818CF8]/20 to-[#818CF8]/5" },
  { name: "Peas", base: 4.5, target: 1000, color: "var(--ag-blue)", gradient: "from-[#38BDF8]/20 to-[#38BDF8]/5" },
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

function getWeatherInfo(code: number) {
  return WMO_ICONS[code] || { label: "Unknown", Icon: Cloud, color: "var(--ag-text-muted)" };
}

function getFieldCondition(precipProb: number, windSpeed: number, temp: number) {
  if (temp < 5) return { label: "Too Cold", color: "var(--ag-text-muted)", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.15)" };
  if (precipProb > 70) return { label: "Poor", color: "var(--ag-red)", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.12)" };
  if (precipProb > 40 || windSpeed > 40) return { label: "Marginal", color: "var(--ag-yellow)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.12)" };
  return { label: "Good", color: "var(--ag-green)", bg: "var(--ag-green-dim)", border: "rgba(52,211,153,0.12)" };
}

function calcGDD(maxTemp: number, minTemp: number, base: number) {
  return Math.max(0, (maxTemp + minTemp) / 2 - base);
}

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

// ═══════════════════════════════════════════════════════════════
//  WEATHER PAGE
// ═══════════════════════════════════════════════════════════════

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState("Swift Current, SK");
  const [loading, setLoading] = useState(true);
  const [activeGDD, setActiveGDD] = useState("Canola");
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

  if (!weather || !weather.daily || !weather.current) {
    return <p className="text-sm text-ag-muted">Failed to load weather data.</p>;
  }

  const current = weather.current;
  const daily = weather.daily;
  const activeCrop = GDD_CROPS.find(c => c.name === activeGDD)!;
  const now = new Date();
  const daysSinceStart = Math.max(0, Math.floor((now.getTime() - gddStart.getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedGDD = daily.time.reduce((sum, _, i) => sum + calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], activeCrop.base), 0);
  const totalEstimatedGDD = daysSinceStart * (estimatedGDD / daily.time.length) + estimatedGDD;
  const gddPct = Math.min(100, Math.round((totalEstimatedGDD / activeCrop.target) * 100));

  const windDir = (deg: number) => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  };

  const { Icon: HeroIcon, label: heroLabel, color: heroColor } = getWeatherInfo(current.weather_code);

  // Today vs yesterday temp trend (use first 2 days of forecast as proxy)
  const todayHigh = daily.temperature_2m_max[0];
  const tomorrowHigh = daily.temperature_2m_max[1];
  const tempTrend = tomorrowHigh > todayHigh + 2 ? "warming" : tomorrowHigh < todayHigh - 2 ? "cooling" : "steady";

  return (
    <div className="space-y-6 pb-16">

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-ag-primary tracking-tight">Weather</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={12} className="text-[var(--ag-green)]" />
            <p className="text-[13px] text-ag-muted">{location}</p>
            <span className="text-[11px] text-[var(--ag-green)] font-mono ml-2">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Hero: Current Conditions ──────────────────────── */}
      <div
        className="relative rounded-2xl border border-[var(--ag-border)] p-8 overflow-hidden"
        style={{ background: "linear-gradient(135deg, var(--ag-bg-card) 0%, var(--ag-bg-primary) 50%, var(--ag-bg-card) 100%)" }}
      >
        {/* Subtle gradient glow behind icon */}
        <div
          className="absolute top-4 right-8 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: heroColor }}
        />

        <div className="relative flex items-start justify-between">
          {/* Left: temperature + info */}
          <div>
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

            {/* Trend indicator */}
            <div className="flex items-center gap-1.5 mt-4">
              {tempTrend === "warming" && <ArrowUpRight size={14} className="text-[var(--ag-yellow)]" />}
              {tempTrend === "cooling" && <ArrowDownRight size={14} className="text-[var(--ag-blue)]" />}
              {tempTrend === "steady" && <Minus size={14} className="text-ag-muted" />}
              <span className="text-[12px] text-ag-muted font-medium capitalize">{tempTrend} trend</span>
            </div>
          </div>

          {/* Right: large weather icon */}
          <div className="relative">
            <HeroIcon size={96} className="opacity-90" style={{ color: heroColor }} strokeWidth={1.2} />
          </div>
        </div>

        {/* Stat pills */}
        <div className="grid grid-cols-4 gap-3 mt-8">
          {[
            { icon: Droplets, label: "Humidity", value: `${current.relative_humidity_2m}%`, color: "var(--ag-blue)" },
            { icon: Wind, label: "Wind", value: `${Math.round(current.wind_speed_10m)} km/h ${windDir(current.wind_direction_10m)}`, color: "var(--ag-text-secondary)" },
            { icon: CloudRain, label: "Precipitation", value: `${current.precipitation} mm`, color: "#818CF8" },
            { icon: Thermometer, label: "Soil Temp", value: `${Math.round(current.soil_temperature_0cm)}°C`, color: "var(--ag-yellow)" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 border border-white/[0.04]"
              style={{ background: `${stat.color}06` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} style={{ color: stat.color }} />
                <p className="font-mono text-[10px] text-ag-muted uppercase tracking-[1px]">{stat.label}</p>
              </div>
              <p className="text-[18px] font-semibold text-ag-primary">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

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
          {daily.time.map((dateStr, i) => {
            const date = new Date(dateStr);
            const condition = getFieldCondition(daily.precipitation_probability_max[i], daily.wind_speed_10m_max[i], daily.temperature_2m_max[i]);
            const { Icon, color } = getWeatherInfo(daily.weather_code[i]);
            const isToday = i === 0;

            return (
              <div
                key={i}
                className={`flex flex-col items-center py-4 px-2 rounded-xl transition-all ${
                  isToday
                    ? "bg-[var(--ag-bg-active)] border border-[var(--ag-border)]"
                    : "bg-white/[0.02] border border-transparent hover:bg-[var(--ag-bg-hover)] hover:border-[var(--ag-border)]"
                }`}
              >
                <p className={`text-[11px] font-semibold mb-0.5 ${isToday ? "text-[var(--ag-green)]" : "text-ag-primary"}`}>
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
                  <Droplets size={9} className="text-[var(--ag-blue)]" />
                  <p className="text-[10px] font-medium text-[var(--ag-blue)]">{daily.precipitation_probability_max[i]}%</p>
                </div>

                {/* Field condition dot */}
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: condition.color }}
                  title={condition.label}
                />
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
              <button
                key={c.name}
                onClick={() => setActiveGDD(c.name)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                style={activeGDD === c.name
                  ? { backgroundColor: c.color, color: "var(--ag-bg-base)", boxShadow: `0 0 12px ${c.color}30` }
                  : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* GDD Summary */}
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

        {/* Progress bar with gradient */}
        <div className="h-3 bg-[var(--ag-bg-hover)] rounded-full overflow-hidden mb-6">
          <div
            className="h-full rounded-full transition-all duration-500 relative"
            style={{
              width: `${gddPct}%`,
              background: `linear-gradient(90deg, ${activeCrop.color}80, ${activeCrop.color})`,
              boxShadow: `0 0 8px ${activeCrop.color}40`,
            }}
          />
        </div>

        {/* Daily GDD bars */}
        <div className="grid grid-cols-7 gap-3">
          {daily.time.map((_, i) => {
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
                  <div
                    className="w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${barHeight}%`,
                      background: `linear-gradient(to top, ${activeCrop.color}90, ${activeCrop.color}40)`,
                      minHeight: gdd > 0 ? "4px" : "0px",
                    }}
                  />
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