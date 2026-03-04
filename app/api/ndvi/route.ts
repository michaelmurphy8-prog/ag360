import { NextRequest, NextResponse } from "next/server";

// Module-level token cache (persists across requests in same serverless instance)
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getSentinelToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch("https://services.sentinel-hub.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.SENTINEL_HUB_CLIENT_ID!,
      client_secret: process.env.SENTINEL_HUB_CLIENT_SECRET!,
    }),
  });

  if (!res.ok) throw new Error(`Sentinel Hub auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // 1 min buffer
  return cachedToken!;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bbox = searchParams.get("bbox"); // minLon,minLat,maxLon,maxLat

  if (!bbox) return NextResponse.json({ error: "bbox required" }, { status: 400 });

  const [minLon, minLat, maxLon, maxLat] = bbox.split(",").map(Number);
  if ([minLon, minLat, maxLon, maxLat].some(isNaN)) {
    return NextResponse.json({ error: "Invalid bbox" }, { status: 400 });
  }

  try {
    const token = await getSentinelToken();

    // NDVI evalscript — red→yellow→green colour ramp
    const evalscript = `//VERSION=3
function setup() {
  return {
    input: ["B04", "B08", "dataMask"],
    output: { bands: 4 }
  };
}
function evaluatePixel(samples) {
  let ndvi = (samples.B08 - samples.B04) / (samples.B08 + samples.B04);
  let r, g, b;
  if (ndvi < 0) { r=0.5; g=0; b=0; }
  else if (ndvi < 0.2) { r=1; g=ndvi*2.5; b=0; }
  else if (ndvi < 0.4) { r=1-(ndvi-0.2)*5; g=0.8; b=0; }
  else if (ndvi < 0.6) { r=0; g=0.6+(ndvi-0.4)*2; b=0; }
  else { r=0; g=0.3+(1-ndvi)*0.3; b=0; }
  return [r, g, b, samples.dataMask * 0.8];
}`;

    const body = {
      input: {
        bounds: {
          bbox: [minLon, minLat, maxLon, maxLat],
          properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
        },
        data: [{
          type: "sentinel-2-l2a",
          dataFilter: {
            timeRange: {
              from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // last 30 days
              to: new Date().toISOString(),
            },
            maxCloudCoverage: 30,
            mosaickingOrder: "leastCC", // least cloud cover first
          },
        }],
      },
      output: {
        width: 512,
        height: 512,
        responses: [{ identifier: "default", format: { type: "image/png" } }],
      },
      evalscript,
    };

    const ndviRes = await fetch("https://services.sentinel-hub.com/api/v1/process", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!ndviRes.ok) {
      const err = await ndviRes.text();
      console.error("Sentinel Hub error:", err);
      return NextResponse.json({ error: "Sentinel Hub request failed", detail: err }, { status: 502 });
    }

    const imageBuffer = await ndviRes.arrayBuffer();
    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=43200", // cache 12 hours
      },
    });
  } catch (err: any) {
    console.error("NDVI API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}