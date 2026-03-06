"use client";
import { Bell } from "lucide-react";
import { useState } from "react";

const NOTIFICATIONS = [
  { id: "maintenance", label: "Maintenance Windows", description: "Scheduled downtime and platform updates" },
  { id: "features", label: "New Features", description: "When new AG360 modules or tools are released" },
  { id: "reminders", label: "Task Reminders", description: "In-app reminder alerts for your to-do items" },
  { id: "market", label: "Market Alerts", description: "Price movements on your watchlist crops" },
];

export default function NotificationsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({
    maintenance: true, features: true, reminders: true, market: false,
  });

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
          <Bell size={20} style={{ color: "var(--ag-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Notifications</h1>
          <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Control what AG360 notifies you about</p>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--ag-text-primary)" }}>Preferences</h2>
        <div className="space-y-1">
          {NOTIFICATIONS.map((n, i) => (
            <div key={n.id} className="flex items-center justify-between py-3"
              style={{ borderBottom: i < NOTIFICATIONS.length - 1 ? "1px solid var(--ag-border)" : "none" }}>
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ag-text-primary)" }}>{n.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--ag-text-muted)" }}>{n.description}</p>
              </div>
              <button onClick={() => setEnabled(prev => ({ ...prev, [n.id]: !prev[n.id] }))}
                className="relative w-10 h-6 rounded-full transition-colors shrink-0 ml-4"
                style={{ backgroundColor: enabled[n.id] ? "var(--ag-accent)" : "var(--ag-bg-active)" }}>
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: enabled[n.id] ? "calc(100% - 20px)" : "4px" }} />
              </button>
            </div>
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: "var(--ag-text-muted)" }}>
          Note: Email notifications require a verified email address. Full notification delivery coming in a future release.
        </p>
      </div>
    </div>
  );
}