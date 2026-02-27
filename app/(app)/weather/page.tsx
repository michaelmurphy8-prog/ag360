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
  { name: "Canola", base: 5, target: 1500, color: "#34D399", gradient: "from-[#34D399]/20 to-[#34D399]/5" },
  { name: "Spring Wheat", base: 5, target: 1200, color: "#F59E0B", gradient: "from-[#F59E0B]/20 to-[#F59E0B]/5" },
  { name: "Barley", base: 5, target: 1100, color: "#818CF8", gradient: "from-[#818CF8]/20 to-[#818CF8]/5" },
  { name: "Peas", base: 4.5, target: 1000, color: "#38BDF8", gradient: "from-[#38BDF8]/20 to-[#38BDF8]/5" },
];

const WMO_ICONS: Record<number, { label: string; Icon: React.ElementType; color: string }> = {
  0:  { label: "Clear Sky", Icon: Sun, color: "#F59E0B" },
  1:  { label: "Mainly Clear", Icon: CloudSun, color: "#F59E0B" },
  2:  { label: "Partly Cloudy", Icon: CloudSun, color: "#94A3B8" },
  3:  { label: "Overcast", Icon: Cloud, color: "#64748B" },
  45: { label: "Foggy", Icon: CloudFog, color: "#64748B" },
  48: { label: "Icy Fog", Icon: CloudFog, color: "#64748B" },
  51: { label: "Light Drizzle", Icon: CloudDrizzle, color: "#38BDF8" },
  61: { label: "Light Rain", Icon: CloudRain, color: "#38BDF8" },
  63: { label: "Moderate Rain", Icon: CloudRain, color: "#3B82F6" },
  65: { label: "Heavy Rain", Icon: CloudRain, color: "#2563EB" },
  71: { label: "Light Snow", Icon: CloudSnow, color: "#CBD5E1" },
  73: { label: "Moderate Snow", Icon: Snowflake, color: "#E2E8F0" },
  75: { label: "Heavy Snow", Icon: Snowflake, color: "#F1F5F9" },
  80: { label: "Rain Showers", Icon: CloudDrizzle, color: "#38BDF8" },
  95: { label: "Thunderstorm", Icon: CloudLightning, color: "#818CF8" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWeatherInfo(code: number) {
  return WMO_ICONS[code] || { label: "Unknown", Icon: Cloud, color: "#64748B" };
}

function getFieldCondition(precipProb: number, windSpeed: number, temp: number) {
  if (temp < 5) return { label: "Too Cold", color: "#64748B", bg: "rgba(100,116,139,0.10)", border: "rgba(100,116,139,0.15)" };
  if (precipProb > 70) return { label: "Poor", color: "#EF4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.12)" };
  if (precipProb > 40 || windSpeed > 40) return { label: "Marginal", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.12)" };
  return { label: "Good", color: "#34D399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.12)" };
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
            <div key={d} className="w-2 h-2 rounded-full bg-[#34D399] animate-bounce" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!weather || !weather.daily || !weather.current) {
    return <p className="text-sm text-[#64748B]">Failed to load weather data.</p>;
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
          <h1 className="text-[28px] font-bold text-[#F1F5F9] tracking-tight">Weather</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={12} className="text-[#34D399]" />
            <p className="text-[13px] text-[#64748B]">{location}</p>
            <span className="text-[11px] text-[#34D399] font-mono ml-2">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── Hero: Current Conditions ──────────────────────── */}
      <div
        className="relative rounded-2xl border border-white/[0.06] p-8 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #111827 0%, #0F172A 50%, #111827 100%)" }}
      >
        {/* Subtle gradient glow behind icon */}
        <div
          className="absolute top-4 right-8 w-40 h-40 rounded-full blur-3xl opacity-20"
          style={{ backgroundColor: heroColor }}
        />

        <div className="relative flex items-start justify-between">
          {/* Left: temperature + info */}
          <div>
            <p className="font-mono text-[10px] font-semibold text-[#64748B] uppercase tracking-[2px] mb-3">
              Current Conditions
            </p>
            <div className="flex items-baseline gap-1">
              <p className="text-[72px] font-bold text-[#F1F5F9] leading-none tracking-tight">
                {Math.round(current.temperature_2m)}
              </p>
              <span className="text-[28px] font-light text-[#64748B]">°C</span>
            </div>
            <p className="text-[15px] text-[#94A3B8] mt-2">{heroLabel}</p>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Feels like {Math.round(current.apparent_temperature)}°C
            </p>

            {/* Trend indicator */}
            <div className="flex items-center gap-1.5 mt-4">
              {tempTrend === "warming" && <ArrowUpRight size={14} className="text-[#F59E0B]" />}
              {tempTrend === "cooling" && <ArrowDownRight size={14} className="text-[#38BDF8]" />}
              {tempTrend === "steady" && <Minus size={14} className="text-[#64748B]" />}
              <span className="text-[12px] text-[#64748B] font-medium capitalize">{tempTrend} trend</span>
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
            { icon: Droplets, label: "Humidity", value: `${current.relative_humidity_2m}%`, color: "#38BDF8" },
            { icon: Wind, label: "Wind", value: `${Math.round(current.wind_speed_10m)} km/h ${windDir(current.wind_direction_10m)}`, color: "#94A3B8" },
            { icon: CloudRain, label: "Precipitation", value: `${current.precipitation} mm`, color: "#818CF8" },
            { icon: Thermometer, label: "Soil Temp", value: `${Math.round(current.soil_temperature_0cm)}°C`, color: "#F59E0B" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 border border-white/[0.04]"
              style={{ background: `${stat.color}06` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} style={{ color: stat.color }} />
                <p className="font-mono text-[10px] text-[#64748B] uppercase tracking-[1px]">{stat.label}</p>
              </div>
              <p className="text-[18px] font-semibold text-[#F1F5F9]">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 7-Day Forecast ─────────────────────────────────── */}
      <div className="bg-[#111827] rounded-2xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="font-mono text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[2px]">7-Day Forecast</p>
          <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
            {[
              { label: "Good", color: "#34D399" },
              { label: "Marginal", color: "#F59E0B" },
              { label: "Poor", color: "#EF4444" },
              { label: "Too Cold", color: "#64748B" },
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
                    ? "bg-white/[0.06] border border-white/[0.08]"
                    : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]"
                }`}
              >
                <p className={`text-[11px] font-semibold mb-0.5 ${isToday ? "text-[#34D399]" : "text-[#F1F5F9]"}`}>
                  {isToday ? "Today" : DAYS[date.getDay()]}
                </p>
                <p className="text-[10px] text-[#475569] mb-3">
                  {MONTHS[date.getMonth()]} {date.getDate()}
                </p>

                <Icon size={22} style={{ color }} className="mb-3" />

                <p className="text-[15px] font-bold text-[#F1F5F9]">
                  {Math.round(daily.temperature_2m_max[i])}°
                </p>
                <p className="text-[12px] text-[#475569] mb-2">
                  {Math.round(daily.temperature_2m_min[i])}°
                </p>

                <div className="flex items-center gap-0.5 mb-2">
                  <Droplets size={9} className="text-[#38BDF8]" />
                  <p className="text-[10px] font-medium text-[#38BDF8]">{daily.precipitation_probability_max[i]}%</p>
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
      <div className="bg-[#111827] rounded-2xl border border-white/[0.06] p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="font-mono text-[11px] font-semibold text-[#94A3B8] uppercase tracking-[2px]">
            Growing Degree Days
          </p>
          <div className="flex gap-1.5">
            {GDD_CROPS.map(c => (
              <button
                key={c.name}
                onClick={() => setActiveGDD(c.name)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all duration-200"
                style={activeGDD === c.name
                  ? { backgroundColor: c.color, color: "#080C15", boxShadow: `0 0 12px ${c.color}30` }
                  : { backgroundColor: "transparent", color: "#64748B", border: "1px solid rgba(255,255,255,0.08)" }}
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
              <p className="text-[40px] font-bold text-[#F1F5F9] leading-none tracking-tight">
                {Math.round(totalEstimatedGDD)}
              </p>
              <span className="text-[14px] font-medium text-[#64748B] ml-1">GDD</span>
            </div>
            <p className="text-[12px] text-[#64748B] mt-1.5">
              Base {activeCrop.base}°C · Target {activeCrop.target} GDD
            </p>
          </div>
          <div className="text-right">
            <p className="text-[24px] font-bold" style={{ color: activeCrop.color }}>{gddPct}%</p>
            <p className="text-[11px] text-[#64748B]">to maturity</p>
          </div>
        </div>

        {/* Progress bar with gradient */}
        <div className="h-3 bg-white/[0.04] rounded-full overflow-hidden mb-6">
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
                <p className={`text-[11px] ${isToday ? "text-[#F1F5F9] font-semibold" : "text-[#64748B]"}`}>
                  {isToday ? "Today" : DAYS[date.getDay()]}
                </p>
                <div className="w-full h-20 bg-white/[0.03] rounded-lg overflow-hidden flex items-end p-0.5">
                  <div
                    className="w-full rounded-md transition-all duration-500"
                    style={{
                      height: `${barHeight}%`,
                      background: `linear-gradient(to top, ${activeCrop.color}90, ${activeCrop.color}40)`,
                      minHeight: gdd > 0 ? "4px" : "0px",
                    }}
                  />
                </div>
                <p className="text-[12px] font-semibold text-[#F1F5F9]">{gdd.toFixed(1)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}