'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { Wheat, Tractor, TrendingUp, Users, AlertTriangle, CheckCircle, Clock, Sprout } from "lucide-react";
import Link from 'next/link'

const kpis = [
  { label: "Total Acres", value: "3,200", unit: "ac", delta: null },
  { label: "Assets Value", value: "$892,000", unit: "CAD", delta: "+2.1%" },
  { label: "Bushels On Hand", value: "48,000", unit: "bu", delta: null },
  { label: "Open Contracts", value: "4", unit: "contracts", delta: null },
  { label: "Net Worth Est.", value: "$2.4M", unit: "CAD", delta: "+4.3%" },
];

const alerts = [
  { type: "action", icon: AlertTriangle, color: "text-[#E8A838]", bg: "bg-[#FFF8EC]", message: "Canola basis improved +12¢ — review sell plan" },
  { type: "watch", icon: Clock, color: "text-[#3D7FD9]", bg: "bg-[#EEF4FF]", message: "Sprayer service due in 80 hours" },
  { type: "ok", icon: CheckCircle, color: "text-[#4A7C59]", bg: "bg-[#EEF5F0]", message: "All employees certified for harvest season" },
];

const modules = [
  { label: "Grain360", icon: Wheat, stats: "4 open contracts · 48,000 bu on hand", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", href: "/grain360" },
  { label: "Machinery", icon: Tractor, stats: "8 assets · 1 unit needs attention", status: "WATCH", statusColor: "bg-[#FFF8EC] text-[#E8A838]", href: "/machinery" },
  { label: "Marketing", icon: TrendingUp, stats: "68% of production contracted", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", href: "/marketing" },
  { label: "Labour & HR", icon: Users, stats: "6 employees · harvest crew ready", status: "ACTIVE", statusColor: "bg-[#EEF5F0] text-[#4A7C59]", href: "/labour" },
];
type SeedingEntry = {
  id: string
  crop: string
  seeding_date: string
  acres: number
  field_name: string
}

function getWindowStatus(seedingDate: string) {
  const seeded = new Date(seedingDate)
  const today = new Date()
  const daysIn = Math.floor((today.getTime() - seeded.getTime()) / (1000 * 60 * 60 * 24))
  if (daysIn < 0) return null
  if (daysIn <= 7) return { label: 'Pre-Seed / Just Seeded', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', urgent: false, advice: 'Pre-seed burnoff window. Apply glyphosate 1-3 days before seeding. Add Group 14 partner for resistance management.' }
  if (daysIn <= 21) return { label: 'Early Scout Window', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', urgent: true, advice: 'Scout for cutworms and flea beetles. Check for uneven emergence. Pre-emergence soil herbicide window closing soon.' }
  if (daysIn <= 42) return { label: 'In-Crop Spray Window', color: 'text-[#4A7C59]', bg: 'bg-green-50', border: 'border-green-200', urgent: true, advice: 'In-crop herbicide window is open. Scout weed pressure before spraying. Apply at 1-4 leaf stage for best results.' }
  if (daysIn <= 70) return { label: 'Fungicide Window', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', urgent: true, advice: 'Fungicide timing window. Cereals: apply at flag leaf to heading. Canola: apply at 20-50% bloom for sclerotinia. Timing is critical — do not miss this window.' }
  if (daysIn <= 100) return { label: 'Pre-Harvest Window', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', urgent: true, advice: 'Pre-harvest approaching. Check crop maturity. Canola: 60%+ seed colour change. Wheat: <30% grain moisture. Confirm PHI and buyer requirements before applying.' }
  if (daysIn <= 120) return { label: 'Harvest Approaching', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', urgent: true, advice: 'Crop approaching harvest maturity. Prepare equipment, arrange trucking, confirm bin space and elevator delivery windows.' }
  return null
}

export default function OverviewPage() {
  const { user } = useUser()
  const [seedingLog, setSeedingLog] = useState<SeedingEntry[]>([])

  useEffect(() => {
    async function fetchSeeding() {
      try {
        const res = await fetch('/api/agronomy/seeding', {
          headers: { 'x-user-id': user?.id || '' },
        })
        const json = await res.json()
        if (json.success) setSeedingLog(json.records)
      } catch { /* silent fail */ }
    }
    if (user?.id) fetchSeeding()
  }, [user?.id])

  const activeReminders = seedingLog
    .map(entry => ({ entry, status: getWindowStatus(entry.seeding_date) }))
    .filter(r => r.status !== null && r.status.urgent)
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#222527]">Farm Overview</h1>
        <p className="text-[#7A8A7C] text-sm mt-1">Murphy Farms · Saskatchewan, CA · Updated just now</p>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-5">
            <p className="text-xs font-semibold text-[#7A8A7C] uppercase tracking-wide">{kpi.label}</p>
            <p className="text-2xl font-bold text-[#222527] mt-1">{kpi.value}</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-[#7A8A7C]">{kpi.unit}</p>
              {kpi.delta && <span className="text-xs font-semibold text-[#4A7C59]">{kpi.delta}</span>}
            </div>
          </div>
        ))}
      </div>
      {/* Agronomy Reminders */}
        {activeReminders.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sprout size={16} className="text-[#4A7C59]" />
                <h2 className="text-sm font-semibold text-[#222527]">Agronomy Reminders</h2>
              </div>
              <Link href="/agronomy" className="text-xs text-[#4A7C59] hover:underline">
                View Spray Calendar →
              </Link>
            </div>
            <div className="space-y-2">
              {activeReminders.map(({ entry, status }) => {
                if (!status) return null
                const daysIn = Math.floor((new Date().getTime() - new Date(entry.seeding_date).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={entry.id} className={`rounded-xl border p-4 ${status.bg} ${status.border}`}>
                    <div className="flex items-start gap-3">
                      <Sprout size={16} className={`${status.color} mt-0.5 flex-shrink-0`} />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${status.color}`}>{entry.crop}</span>
                          {entry.field_name && <span className="text-xs text-[#7A8A7C]">· {entry.field_name}</span>}
                          {entry.acres && <span className="text-xs text-[#7A8A7C]">· {entry.acres} ac</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
                            Day {daysIn} — {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A8A7C] mt-1 leading-relaxed">{status.advice}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      <div className="grid grid-cols-3 gap-6"></div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-[#7A8A7C] uppercase tracking-wide">Modules</h2>
          <div className="grid grid-cols-2 gap-4">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <a key={mod.label} href={mod.href} className="bg-white rounded-[20px] border border-[#E4E7E0] shadow-sm p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-[12px] bg-[#DDE3D6] flex items-center justify-center">
                      <Icon size={20} className="text-[#4A7C59]" />
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${mod.statusColor}`}>{mod.status}</span>
                  </div>
                  <p className="text-base font-bold text-[#222527] mt-4">{mod.label}</p>
                  <p className="text-xs text-[#7A8A7C] mt-1">{mod.stats}</p>
                </a>
              );
            })}
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-[#7A8A7C] uppercase tracking-wide">Alerts & Actions</h2>
          <div className="bg-gradient-to-b from-[#DDE3D6] to-[#F5F5F3] rounded-[20px] border border-[#E4E7E0] p-5 space-y-3">
            {alerts.map((alert, i) => {
              const Icon = alert.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-[12px] ${alert.bg}`}>
                  <Icon size={16} className={`mt-0.5 shrink-0 ${alert.color}`} />
                  <p className="text-xs text-[#222527] leading-relaxed">{alert.message}</p>
                </div>
              );
            })}
          </div>
          <a href="/advisor" className="block bg-[#4A7C59] text-white rounded-[20px] p-5 hover:bg-[#3d6b4a] transition-colors">
            <p className="text-sm font-bold">Ask Lily</p>
            <p className="text-xs text-[#B8D4C0] mt-1">Get AI-powered advice for your farm right now.</p>
          </a>
        </div>
      </div>
    </div>
  );
}