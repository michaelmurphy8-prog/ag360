import { NextRequest, NextResponse } from "next/server";

const SWIFT_CURRENT = { lat: 50.2897, lon: -107.7939, name: "Swift Current, SK" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat") || SWIFT_CURRENT.lat;
  const lon = searchParams.get("lon") || SWIFT_CURRENT.lon;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,soil_temperature_0cm&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=America%2FRegina&forecast_days=7`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily || !data.current) {
      return NextResponse.json({ error: "Invalid weather data" }, { status: 500 });
    }

    return NextResponse.json({ weather: data, location: SWIFT_CURRENT.name });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}