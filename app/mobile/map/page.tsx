"use client";
// app/mobile/map/page.tsx

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCropColor as _getCropColor } from "@/lib/crop-colors";

function getCropColor(crop?: string | null): string {
  if (!crop) return "#C8A84B"; // AG360 gold fallback
  return _getCropColor(crop);
}

interface Field {
  id: string;
  field_name: string;
  acres: string | number | null;
  crop_type?: string | null;
  soil_type?: string | null;
  boundary?: {
    geometry?: {
      type: string;
      coordinates: any;
    };
    [key: string]: any;
  } | null;
}



// ── Wind particle canvas overlay ──────────────────────────────────────────────
function WindCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<any[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Wind direction: SW→NE (Saskatchewan prevailing)
    const windAngle = -40 * (Math.PI / 180);
    const windSpeed = 2.2;
    const vx = Math.cos(windAngle) * windSpeed;
    const vy = Math.sin(windAngle) * windSpeed;
    const COUNT = 150;

    function spawn() {
      const W = canvas!.width, H = canvas!.height;
      const fromEdge = Math.random() < 0.5;
      return {
        x: fromEdge ? -20 : Math.random() * W,
        y: fromEdge ? Math.random() * H : H + 20,
        speed: 1.0 + Math.random() * 1.6,
        opacity: 0.25 + Math.random() * 0.4,
        width: 1.0 + Math.random() * 1.4,
        life: Math.random() * 0.3,
      };
    }

    particlesRef.current = Array.from({ length: COUNT }, spawn);

    function draw() {
      const W = canvas!.width, H = canvas!.height;
      ctx!.clearRect(0, 0, W, H);

      for (const p of particlesRef.current) {
        p.life += 0.007 * p.speed;
        if (p.life > 1) {
          Object.assign(p, spawn(), { life: 0 });
          continue;
        }

        const fade = p.life < 0.1 ? p.life / 0.1
          : p.life > 0.78 ? 1 - (p.life - 0.78) / 0.22
          : 1;

        const tailLen = 24 + p.speed * 12;
        const nx = p.x + vx * p.speed;
        const ny = p.y + vy * p.speed;
        const tx = p.x - (vx / windSpeed) * tailLen;
        const ty = p.y - (vy / windSpeed) * tailLen;

        const grad = ctx!.createLinearGradient(tx, ty, nx, ny);
        grad.addColorStop(0, `rgba(200,230,255,0)`);
        grad.addColorStop(0.6, `rgba(210,235,255,${p.opacity * fade * 0.35})`);
        grad.addColorStop(1, `rgba(220,240,255,${p.opacity * fade})`);

        ctx!.beginPath();
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(nx, ny);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = p.width;
        ctx!.lineCap = "round";
        ctx!.stroke();

        p.x = nx;
        p.y = ny;

        if (p.x > W + 80 || p.y < -80) {
          Object.assign(p, spawn(), { life: 0 });
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    if (active) draw();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function MobileMap() {
  const router = useRouter();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [windOn, setWindOn] = useState(false);
  const [windKmh, setWindKmh] = useState<number | null>(null);

  // Fetch live wind speed from Open-Meteo using farm centroid
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=49.935&longitude=-107.748&current=wind_speed_10m&wind_speed_unit=kmh&timezone=America%2FRegina")
      .then((r) => r.json())
      .then((d) => {
        const spd = d?.current?.wind_speed_10m;
        if (typeof spd === "number") setWindKmh(Math.round(spd));
      })
      .catch(() => {});
  }, []);

  // Load fields
  useEffect(() => {
    Promise.all([
      fetch("/api/fields").then((r) => r.json()),
      fetch("/api/agronomy/seeding").then((r) => r.json()),
    ])
      .then(([fieldData, seedingData]) => {
        const rawFields: Field[] = Array.isArray(fieldData)
          ? fieldData
          : fieldData.fields || [];

        // Build field_name → most recent crop lookup
        const seedingRecords: any[] = Array.isArray(seedingData)
          ? seedingData
          : seedingData.records || seedingData.data || [];

        const cropByFieldName: Record<string, string> = {};
        // Sort by seeding_date desc so first match = most recent
        const sorted = [...seedingRecords].sort(
          (a, b) => new Date(b.seeding_date).getTime() - new Date(a.seeding_date).getTime()
        );
        for (const s of sorted) {
          const name = (s.field_name || "").toLowerCase().trim();
          if (name && s.crop && !cropByFieldName[name]) {
            cropByFieldName[name] = s.crop;
          }
        }

        // Attach crop to each field
        const enriched = rawFields.map((f) => ({
          ...f,
          crop_type: cropByFieldName[(f.field_name || "").toLowerCase().trim()] || null,
        }));

        setFields(enriched);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Init Mapbox
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    import("mapbox-gl").then((mod) => {
      const mapboxgl = (mod as any).default || mod;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: [-107.748, 49.935],
        zoom: 11,
        attributionControl: false,
      });

      mapRef.current = map;

      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right"
      );

      map.on("load", () => setMapLoaded(true));

      map.on("click", "fields-fill", (e: any) => {
        const props = e.features?.[0]?.properties;
        if (props?.fieldId) {
          const f = fields.find((x) => x.id === props.fieldId);
          if (f) setSelectedField(f);
        }
      });

      map.on("mouseenter", "fields-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "fields-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add boundaries once map + fields ready
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || fields.length === 0) return;

    const features = fields
      .filter((f) => f.boundary?.geometry)
      .map((f) => ({
        type: "Feature" as const,
        properties: {
          fieldId: f.id,
          name: f.field_name,
          acres: f.acres,
          color: getCropColor(f.crop_type),
        },
        geometry: f.boundary!.geometry!,
      }));

    if (features.length === 0) return;

    const geojson = { type: "FeatureCollection" as const, features };

    if (map.getSource("fields")) {
      (map.getSource("fields") as any).setData(geojson);
    } else {
      map.addSource("fields", { type: "geojson", data: geojson });

      map.addLayer({
        id: "fields-fill",
        type: "fill",
        source: "fields",
        paint: {
          "fill-color": ["get", "color"],
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "fields-border",
        type: "line",
        source: "fields",
        paint: {
          "line-color": ["get", "color"],
          "line-width": 3,
          "line-opacity": 1,
        },
      });

      map.addLayer({
        id: "fields-label",
        type: "symbol",
        source: "fields",
        layout: {
          "text-field": ["get", "name"],
          "text-size": 12,
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-anchor": "center",
        },
        paint: {
          "text-color": "#FFFFFF",
          "text-halo-color": "rgba(0,0,0,0.75)",
          "text-halo-width": 1.5,
        },
      });
    }

    // Fit to boundaries
    import("mapbox-gl").then((mod) => {
      const mapboxgl = (mod as any).default || mod;
      const bounds = new mapboxgl.LngLatBounds();
      features.forEach((f) => {
        const coords = f.geometry.type === "Polygon"
          ? f.geometry.coordinates[0]
          : f.geometry.coordinates.flat(Infinity).filter((_: any, i: number) => i % 1 === 0);
        // Walk coordinate pairs
        const flat = f.geometry.type === "Polygon"
          ? f.geometry.coordinates[0]
          : f.geometry.coordinates.flat(2);
        flat.forEach((c: number[]) => {
          if (Array.isArray(c) && c.length >= 2) bounds.extend([c[0], c[1]]);
        });
      });
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, duration: 1200 });
      }
    });
  }, [mapLoaded, fields]);

  // Update click handler when fields change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.off("click", "fields-fill");
    map.on("click", "fields-fill", (e: any) => {
      const props = e.features?.[0]?.properties;
      if (props?.fieldId) {
        const f = fields.find((x) => x.id === props.fieldId);
        if (f) setSelectedField(f);
      }
    });
  }, [fields]);

  const fieldsWithBoundary = fields.filter((f) => f.boundary?.geometry);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @import url('https://api.mapbox.com/mapbox-gl-js/v3.1.2/mapbox-gl.css');

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1); }
        }
        .info-sheet { animation: slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }

        .map-btn {
          background: rgba(7,13,24,0.88);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #D0DCE8;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 9px 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          -webkit-tap-highlight-color: transparent;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
          white-space: nowrap;
        }
        .map-btn:active { opacity: 0.8; }
        .wind-active {
          background: rgba(100,160,255,0.18) !important;
          border-color: rgba(130,190,255,0.5) !important;
          color: #90C8FF !important;
        }
        .field-chip {
          background: rgba(7,13,24,0.82);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 6px 13px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          cursor: pointer;
          border: 1px solid transparent;
          -webkit-tap-highlight-color: transparent;
        }
        .mapboxgl-ctrl-bottom-right { bottom: 80px !important; right: 12px !important; }
        .mapboxgl-ctrl-attrib { display: none !important; }
      `}</style>

      <div style={{
        flex: 1,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "#070D18",
        overflow: "hidden",
      }}>

        {/* Map */}
        <div ref={mapContainer} style={{ position: "absolute", inset: 0 }} />

        {/* Wind particles */}
        <WindCanvas active={windOn} />

        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0,
            background: "#070D18",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 20,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "8px", height: "8px", borderRadius: "50%",
                    background: "#C8A84B",
                    animation: "pulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#4A6A8A" }}>
                Loading fields…
              </div>
            </div>
          </div>
        )}

        {/* ── Floating header ── */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          zIndex: 10,
          padding: "16px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}>
          <button className="map-btn" onClick={() => router.back()} style={{ padding: "9px 10px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div style={{
            flex: 1,
            background: "rgba(7,13,24,0.88)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px",
            padding: "9px 14px",
          }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "15px", color: "#F0F4F8", lineHeight: 1 }}>
              Field Map
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#4A6A8A", marginTop: "2px" }}>
              {fieldsWithBoundary.length} of {fields.length} field{fields.length !== 1 ? "s" : ""} mapped
            </div>
          </div>

          {/* Wind toggle */}
          <button
            className={`map-btn${windOn ? " wind-active" : ""}`}
            onClick={() => setWindOn((v) => !v)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
              <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
              <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
            </svg>
            {windKmh !== null ? `${windKmh} km/h` : "Wind"}
          </button>
        </div>

        {/* ── Field chips strip ── */}
        {!loading && fields.length > 0 && !selectedField && (
          <div style={{
            position: "absolute",
            bottom: 0, left: 0, right: 0,
            zIndex: 10,
            padding: "16px 14px 26px",
            background: "linear-gradient(to top, rgba(7,13,24,0.92) 50%, transparent)",
          }}>
            <div style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              paddingBottom: "2px",
              scrollbarWidth: "none",
            }}>
              {fields.map((f) => {
                const hasBoundary = !!f.boundary?.geometry;
                const color = getCropColor(f.crop_type);
                return (
                  <div
                    key={f.id}
                    className="field-chip"
                    style={{
                      borderColor: hasBoundary ? `${color}60` : "#1A2940",
                      color: hasBoundary ? color : "#2A3F5A",
                    }}
                    onClick={() => hasBoundary && setSelectedField(f)}
                  >
                    {f.field_name}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No boundaries empty state */}
        {!loading && fieldsWithBoundary.length === 0 && fields.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: "24px", left: "16px", right: "16px",
            zIndex: 10,
          }}>
            <div style={{
              background: "rgba(7,13,24,0.92)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              border: "1px solid #1A2940",
              borderRadius: "16px",
              padding: "18px",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "15px", color: "#F0F4F8", marginBottom: "4px" }}>
                No field boundaries drawn
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#4A6A8A" }}>
                Draw boundaries in Maps on the web app
              </div>
            </div>
          </div>
        )}

        {/* ── Selected field info sheet ── */}
        {selectedField && (
          <div
            className="info-sheet"
            style={{
              position: "absolute",
              bottom: 0, left: 0, right: 0,
              zIndex: 20,
              background: "rgba(7,13,24,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: "1px solid #1A2940",
              borderRadius: "20px 20px 0 0",
              padding: "8px 20px 36px",
            }}
          >
            {/* Drag handle */}
            <div style={{
              width: "36px", height: "4px",
              background: "#1A2940", borderRadius: "2px",
              margin: "8px auto 16px",
            }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 700, fontSize: "20px", color: "#F0F4F8",
                  marginBottom: "4px",
                }}>
                  {selectedField.field_name}
                </div>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: "14px", fontWeight: 500,
                  color: getCropColor(selectedField.crop_type),
                }}>
                  {selectedField.crop_type || "No crop assigned"}
                </div>
              </div>
              <button
                onClick={() => setSelectedField(null)}
                style={{
                  background: "#0D1726", border: "1px solid #1A2940",
                  borderRadius: "10px", width: "36px", height: "36px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "#4A6A8A",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginTop: "16px",
            }}>
              {[
                {
                  label: "Acres",
                  value: selectedField.acres
                    ? parseFloat(String(selectedField.acres)).toLocaleString()
                    : "—",
                },
                {
                  label: "Soil Type",
                  value: selectedField.soil_type || "—",
                },
              ].map((s) => (
                <div key={s.label} style={{
                  background: "#0D1726",
                  border: "1px solid #1A2940",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "10px", color: "#4A6A8A",
                    textTransform: "uppercase", letterSpacing: "0.1em",
                    marginBottom: "5px",
                  }}>
                    {s.label}
                  </div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 700, fontSize: "18px", color: "#F0F4F8",
                  }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}