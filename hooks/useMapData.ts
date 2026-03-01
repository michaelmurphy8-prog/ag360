// hooks/useMapData.ts
// Data fetching hooks for Maps Command Center

"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { fieldToCoords } from "@/lib/lld-geocode";
import { detectOverlaps, type OverlapResult } from "@/lib/boundary-utils";
import type { FieldWithCoords, KPIs, YardMarker, WeatherPoint } from "@/lib/maps-types";

export function useMapData() {
  const { user } = useUser();
  const [fields, setFields] = useState<FieldWithCoords[]>([]);
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [cropBreakdown, setCropBreakdown] = useState<Record<string, { acres: number; count: number }>>({});
  const [yards, setYards] = useState<YardMarker[]>([]);
  const [weather, setWeather] = useState<WeatherPoint[]>([]);
  const [overlaps, setOverlaps] = useState<OverlapResult[]>([]);
  const [loading, setLoading] = useState(true);

  const cropYear = new Date().getFullYear();

  /* ── Fetch fields ────────────────────────────── */
  const fetchFields = useCallback(async () => {
    try {
      const res = await fetch(`/api/fields/summary?crop_year=${cropYear}`);
      const data = await res.json();
      setKpis(data.kpis || null);
      setCropBreakdown(data.cropBreakdown || {});
      const geo: FieldWithCoords[] = [];
      for (const f of data.fields || []) {
        const c = fieldToCoords(f);
        if (c) geo.push({ ...f, latitude: c.latitude, longitude: c.longitude });
      }
      setFields(geo);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [cropYear]);

  useEffect(() => { fetchFields(); }, [fetchFields]);

  /* ── Fetch yards ─────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await fetch("/api/inventory/yards", { headers: { "x-user-id": user.id } });
        const data = await res.json();
        const yds: YardMarker[] = (data.yards || [])
          .filter((y: any) => y.latitude && y.longitude)
          .map((y: any) => ({
            id: y.id, yard_name: y.yard_name,
            latitude: parseFloat(y.latitude), longitude: parseFloat(y.longitude),
            bin_count: y.bin_count || 0,
            total_capacity_bu: parseFloat(y.total_capacity_bu) || 0,
            total_stored_bu: parseFloat(y.total_stored_bu) || 0,
          }));
        setYards(yds);
      } catch (e) { console.error(e); }
    })();
  }, [user]);

  /* ── Detect overlaps ─────────────────────────── */
  useEffect(() => {
    if (fields.filter(f => f.boundary).length >= 2) {
      detectOverlaps(fields).then(setOverlaps);
    } else {
      setOverlaps([]);
    }
  }, [fields]);

  /* ── Fetch weather ───────────────────────────── */
  const fetchWeather = useCallback(async () => {
    if (fields.length === 0) return;
    try {
      const pts = fields.slice(0, 5);
      const results: WeatherPoint[] = [];
      for (const f of pts) {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${f.latitude}&longitude=${f.longitude}&current=temperature_2m,wind_speed_10m,precipitation&timezone=America/Regina`);
        const data = await res.json();
        if (data.current) results.push({
          latitude: f.latitude, longitude: f.longitude,
          temperature: data.current.temperature_2m,
          windspeed: data.current.wind_speed_10m,
          precipitation: data.current.precipitation,
        });
      }
      setWeather(results);
    } catch (e) { console.error(e); }
  }, [fields]);

  return {
    fields, kpis, cropBreakdown, yards, weather, overlaps,
    loading, cropYear, fetchFields, fetchWeather,
  };
}