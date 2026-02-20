"use client";

import { useState, useEffect } from "react";
import { Droplets, Wind, Thermometer, CloudRain } from "lucide-react";

const GDD_CROPS = [
  { name: "Canola", base: 5, target: 1500, color: "#4A7C59" },
  { name: "Spring Wheat", base: 5, target: 1200, color: "#D97706" },
  { name: "Barley", base: 5, target: 1100, color: "#7C3AED" },
  { name: "Peas", base: 4.5, target: 1000, color: "#0891B2" },
];

const WMO_CODES: Record<number, { label: string; icon: string }> = {
  0: { label: "Clear Sky", icon: "☀️" },
  1: { label: "Mainly Clear", icon: "🌤️" },
  2: { label: "Partly Cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Icy Fog", icon: "🌫️" },
  51: { label: "Light Drizzle", icon: "🌦️" },
  61: { label: "Light Rain", icon: "🌧️" },
  63: { label: "Moderate Rain", icon: "🌧️" },
  65: { label: "Heavy Rain", icon: "🌧️" },
  71: { label: "Light Snow", icon: "🌨️" },
  73: { label: "Moderate Snow", icon: "❄️" },
  75: { label: "Heavy Snow", icon: "❄️" },
  80: { label: "Rain Showers", icon: "🌦️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getWeatherInfo(code: number) {
  return WMO_CODES[code] || { label: "Unknown", icon: "🌡️" };
}

function getFieldCondition(precipProb: number, windSpeed: number, temp: number) {
  if (temp < 5) return { label: "Too Cold", color: "#6B7280", bg: "#F3F4F6" };
  if (precipProb > 70) return { label: "Poor", color: "#D94F3D", bg: "#FDEEED" };
  if (precipProb > 40 || windSpeed > 40) return { label: "Marginal", color: "#D97706", bg: "#FFF8EC" };
  return { label: "Good", color: "#4A7C59", bg: "#EEF5F0" };
}

function calcGDD(maxTemp: number, minTemp: number, base: number) {
  const avg = (maxTemp + minTemp) / 2;
  return Math.max(0, avg - base);
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
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-[#4A7C59] animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!weather || !weather.daily || !weather.current) {
    return <p className="text-sm text-[#7A8A7C]">Failed to load weather data.</p>;
  }

  const current = weather.current;
  const daily = weather.daily;
  const activeCrop = GDD_CROPS.find(c => c.name === activeGDD)!;

  const now = new Date();
const daysSinceStart = Math.max(0, Math.floor((now.getTime() - gddStart.getTime()) / (1000 * 60 * 60 * 24)));
  const estimatedGDD = daily.time.reduce((sum, _, i) => {
    return sum + calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], activeCrop.base);
  }, 0);
  const totalEstimatedGDD = daysSinceStart * (estimatedGDD / daily.time.length) + estimatedGDD;
  const gddPct = Math.min(100, Math.round((totalEstimatedGDD / activeCrop.target) * 100));

  const windDir = (deg: number) => {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#222527]">Weather</h1>
          <p className="text-sm text-[#7A8A7C] mt-1">{location} · Updated live</p>
        </div>
        <div className="text-3xl">{getWeatherInfo(current.weather_code).icon}</div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Current Conditions</p>
            <p className="text-5xl font-bold text-[#222527] mt-1">{Math.round(current.temperature_2m)}°C</p>
            <p className="text-sm text-[#7A8A7C] mt-1">Feels like {Math.round(current.apparent_temperature)}°C · {getWeatherInfo(current.weather_code).label}</p>
          </div>
          <div className="text-7xl">{getWeatherInfo(current.weather_code).icon}</div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: Droplets, label: "Humidity", value: `${current.relative_humidity_2m}%` },
            { icon: Wind, label: "Wind", value: `${Math.round(current.wind_speed_10m)} km/h ${windDir(current.wind_direction_10m)}` },
            { icon: CloudRain, label: "Precip", value: `${current.precipitation} mm` },
            { icon: Thermometer, label: "Soil Temp", value: `${Math.round(current.soil_temperature_0cm)}°C` },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#F5F5F3] rounded-[12px] p-4">
              <stat.icon size={16} className="text-[#4A7C59] mb-2" />
              <p className="text-xs text-[#7A8A7C] font-semibold uppercase tracking-wide">{stat.label}</p>
              <p className="text-lg font-bold text-[#222527] mt-0.5">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-6">
        <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide mb-4">7-Day Forecast</p>
        <div className="grid grid-cols-7 gap-2">
          {daily.time.map((dateStr, i) => {
            const date = new Date(dateStr);
            const condition = getFieldCondition(daily.precipitation_probability_max[i], daily.wind_speed_10m_max[i], daily.temperature_2m_max[i]);
            const info = getWeatherInfo(daily.weather_code[i]);
            return (
              <div key={i} className="flex flex-col items-center p-3 rounded-[12px] bg-[#F5F5F3] gap-1">
                <p className="text-xs font-bold text-[#222527]">{i === 0 ? "Today" : DAYS[date.getDay()]}</p>
                <p className="text-xs text-[#7A8A7C]">{MONTHS[date.getMonth()]} {date.getDate()}</p>
                <div className="text-2xl my-1">{info.icon}</div>
                <p className="text-sm font-bold text-[#222527]">{Math.round(daily.temperature_2m_max[i])}°</p>
                <p className="text-xs text-[#7A8A7C]">{Math.round(daily.temperature_2m_min[i])}°</p>
                <p className="text-xs text-blue-500 font-semibold">{daily.precipitation_probability_max[i]}%</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1" style={{ color: condition.color, backgroundColor: condition.bg }}>
                  {condition.label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-[#7A8A7C]">
          <span>Field conditions:</span>
          {[
            { label: "Good", color: "#4A7C59", bg: "#EEF5F0" },
            { label: "Marginal", color: "#D97706", bg: "#FFF8EC" },
            { label: "Poor", color: "#D94F3D", bg: "#FDEEED" },
            { label: "Too Cold", color: "#6B7280", bg: "#F3F4F6" },
          ].map(c => (
            <span key={c.label} className="font-semibold px-2 py-0.5 rounded-full" style={{ color: c.color, backgroundColor: c.bg }}>{c.label}</span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">Growing Degree Days (GDD)</p>
          <div className="flex gap-2">
            {GDD_CROPS.map(c => (
              <button key={c.name} onClick={() => setActiveGDD(c.name)}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors"
                style={activeGDD === c.name
                  ? { backgroundColor: c.color, color: "white", borderColor: c.color }
                  : { backgroundColor: "white", color: "#7A8A7C", borderColor: "#E4E7E0" }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-[#222527]">{Math.round(totalEstimatedGDD)}</p>
              <p className="text-xs text-[#7A8A7C] mt-1">GDD accumulated · Base {activeCrop.base}°C · Target {activeCrop.target} GDD</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: activeCrop.color }}>{gddPct}% to maturity</p>
          </div>
          <div className="h-3 bg-[#F5F5F3] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${gddPct}%`, backgroundColor: activeCrop.color }} />
          </div>
          <div className="grid grid-cols-7 gap-2 mt-4">
            {daily.time.map((_, i) => {
              const gdd = calcGDD(daily.temperature_2m_max[i], daily.temperature_2m_min[i], activeCrop.base);
              const date = new Date(daily.time[i]);
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <p className="text-xs text-[#7A8A7C]">{i === 0 ? "Today" : DAYS[date.getDay()]}</p>
                  <div className="w-full bg-[#F5F5F3] rounded-full overflow-hidden h-16 flex items-end">
                    <div className="w-full rounded-full transition-all" style={{ height: `${Math.min(100, (gdd / 20) * 100)}%`, backgroundColor: activeCrop.color, opacity: 0.8 }} />
                  </div>
                  <p className="text-xs font-semibold text-[#222527]">{gdd.toFixed(1)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}