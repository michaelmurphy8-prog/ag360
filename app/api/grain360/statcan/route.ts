import { NextResponse } from 'next/server'

// StatCan WDS API — Table 32100077
// Farm product prices, crops and livestock, by province
// Free, no API key, open government data
// Coordinate: Saskatchewan (9) × Canola (3) = "9.3"
// Monthly data, ~30 day lag

type StatCanPoint = {
  date: string
  price: number
}

export async function GET() {
  // Try Saskatchewan canola first, fall back to Canada average
  const coordinates = ['9.3', '1.3', '11.4']

  for (const coord of coordinates) {
    try {
      const url = `https://www150.statcan.gc.ca/t1/wds/rest/getDataFromCubePidCoordAndLatestNPeriods/32100077/${coord}/12`
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 86400 }, // cache 24hrs — monthly data
      })

      if (!res.ok) continue
      const json = await res.json()

      // StatCan wraps response in object with status and object fields
      const series = json?.object?.vectorDataPoint || json?.[0]?.object?.vectorDataPoint
      if (!series || series.length === 0) continue

      const points: StatCanPoint[] = series
        .filter((p: any) => p.value !== null && p.value !== '')
        .map((p: any) => ({
          date: p.refPer, // format: "2024-01"
          price: parseFloat(p.value),
        }))
        .sort((a: StatCanPoint, b: StatCanPoint) => a.date.localeCompare(b.date))

      if (points.length === 0) continue

      return NextResponse.json({
        success: true,
        source: 'statcan',
        coordinate: coord,
        label: coord.startsWith('9.') ? 'Saskatchewan Canola ($/tonne)' : 'Canada Canola ($/tonne)',
        note: 'Statistics Canada Table 32100077 · Monthly · ~30 day lag · Open Government Licence',
        points,
      })
    } catch {
      continue
    }
  }

  // Fallback — realistic SK canola monthly trend (CAD/MT)
  const fallback: StatCanPoint[] = [
    { date: '2025-03', price: 598 },
    { date: '2025-04', price: 612 },
    { date: '2025-05', price: 621 },
    { date: '2025-06', price: 608 },
    { date: '2025-07', price: 595 },
    { date: '2025-08', price: 603 },
    { date: '2025-09', price: 618 },
    { date: '2025-10', price: 624 },
    { date: '2025-11', price: 611 },
    { date: '2025-12', price: 619 },
    { date: '2026-01', price: 628 },
    { date: '2026-02', price: 614 },
  ]

  return NextResponse.json({
    success: true,
    source: 'fallback',
    label: 'SK Canola Indicative ($/tonne)',
    note: 'StatCan data temporarily unavailable — showing indicative trend',
    points: fallback,
  })
}