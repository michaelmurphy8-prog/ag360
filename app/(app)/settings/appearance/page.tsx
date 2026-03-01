"use client";

import { Palette, Monitor } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useTheme, THEME_META } from "@/lib/theme";

export default function AppearancePage() {
  const { theme } = useTheme();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
            <Palette size={20} style={{ color: "var(--ag-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Appearance</h1>
            <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Customize how AG360 looks on your device</p>
          </div>
        </div>
      </div>

      {/* Theme Section */}
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={16} style={{ color: "var(--ag-text-secondary)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--ag-text-primary)" }}>Theme</h2>
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--ag-text-muted)" }}>
          Choose a color scheme. Currently using <span className="font-semibold" style={{ color: "var(--ag-accent)" }}>{THEME_META[theme].label}</span>.
        </p>
        <ThemeToggle />
      </div>

      {/* Future sections placeholder */}
      <div className="mt-6 rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: "var(--ag-text-primary)" }}>Display</h2>
        <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>
          Font size, density, and layout preferences coming soon.
        </p>
      </div>
    </div>
  );
}