"use client";

import { Moon, Sun, Mountain } from "lucide-react";
import { useTheme, THEME_META, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, typeof Moon> = {
  dark: Moon,
  "salt-pepper": Sun,
  "stone-path": Mountain,
};

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    const order: Theme[] = ["dark", "salt-pepper", "stone-path"];
    const next = () => {
      const idx = order.indexOf(theme);
      setTheme(order[(idx + 1) % order.length]);
    };
    const Icon = ICONS[theme];
    return (
      <button onClick={next} title={`Theme: ${THEME_META[theme].label}`}
        className="p-1.5 rounded-lg transition-colors hover:opacity-80"
        style={{ color: "var(--ag-text-muted)" }}>
        <Icon size={15} />
      </button>
    );
  }

  // Full theme picker (for Settings page)
  return (
    <div className="grid gap-3">
      {(Object.entries(THEME_META) as [Theme, typeof THEME_META["dark"]][]).map(([key, meta]) => {
        const active = theme === key;
        const Icon = ICONS[key];
        return (
          <button key={key} onClick={() => setTheme(key)}
            className="flex items-center gap-4 p-4 rounded-xl transition-all text-left"
            style={{
              backgroundColor: active ? "var(--ag-accent-bg)" : "var(--ag-bg-secondary)",
              border: `2px solid ${active ? "var(--ag-accent)" : "var(--ag-border)"}`,
            }}>
            <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: active ? "var(--ag-accent)" : "var(--ag-bg-hover)", color: active ? "var(--ag-accent-text)" : "var(--ag-text-muted)" }}>
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--ag-text-primary)" }}>{meta.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ag-text-muted)" }}>{meta.description}</p>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {meta.colors.map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border" style={{ backgroundColor: c, borderColor: active ? "var(--ag-accent-border)" : "var(--ag-border)" }} />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}