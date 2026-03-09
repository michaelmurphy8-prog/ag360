import { NextRequest, NextResponse } from "next/server";

const SWIFT_CURRENT = { lat: 50.2897, lon: -107.7939, name: "Swift Current, SK" };

async function geocode(location: string): Promise<{ lat: number; lon: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (!data.results?.length) return null;
    const r = data.results[0];
    const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(", ");
    return { lat: r.latitude, lon: r.longitude, name };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locationParam = searchParams.get("location");
  const latParam = searchParams.get("lat");
  const lonParam = searchParams.get("lon");

  let lat: number, lon: number, locationName: string;

  if (latParam && lonParam) {
    lat = parseFloat(latParam);
    lon = parseFloat(lonParam);
    locationName = locationParam || SWIFT_CURRENT.name;
  } else if (locationParam) {
    const geo = await geocode(locationParam);
    if (!geo) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }
    lat = geo.lat;
    lon = geo.lon;
    locationName = geo.name;
  } else {
    lat = SWIFT_CURRENT.lat;
    lon = SWIFT_CURRENT.lon;
    locationName = SWIFT_CURRENT.name;
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code,soil_temperature_0cm` +
      `&hourly=temperature_2m,wind_speed_10m,wind_direction_10m,relative_humidity_2m,precipitation_probability,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code` +
      `&timezone=auto&forecast_days=7&past_days=1`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.daily || !data.current || !data.hourly) {
      return NextResponse.json({ error: "Invalid weather data" }, { status: 500 });
    }

    return NextResponse.json({ weather: data, location: locationName });
  } catch (error) {
    console.error("Weather API error:", error);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}