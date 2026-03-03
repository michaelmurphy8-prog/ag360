"use client";

import { Moon, Sun, Mountain, Leaf } from "lucide-react";
import { useTheme, THEME_META, THEME_ORDER, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, React.ComponentType<{ size?: number }>> = {
  dark: Moon,
  "salt-pepper": Sun,
  "stone-path": Mountain,
  "open-field": Leaf,
};

export function ThemeToggleCompact() {
  const { theme, setTheme } = useTheme();
  const next = () => {
    const idx = THEME_ORDER.indexOf(theme);
    setTheme(THEME_ORDER[(idx + 1) % THEME_ORDER.length]);
  };
  const Icon = ICONS[theme];
  return (
    <button onClick={next} title={"Theme: " + THEME_META[theme].label}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: "var(--ag-text-muted)" }}>
      <Icon size={15} />
    </button>
  );
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {THEME_ORDER.map((key) => {
        const meta = THEME_META[key];
        const active = theme === key;
        const Icon = ICONS[key];
        return (
          <button key={key} onClick={() => setTheme(key)}
            style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "16px 20px", borderRadius: 14,
              backgroundColor: active ? "var(--ag-accent-bg)" : "var(--ag-bg-card)",
              border: "2px solid " + (active ? "var(--ag-accent)" : "var(--ag-border)"),
              cursor: "pointer", transition: "all 0.2s",
              textAlign: "left" as const, width: "100%",
            }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              backgroundColor: active ? "var(--ag-accent-bg)" : "var(--ag-bg-hover)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ag-text-secondary)",
            }}>
              <Icon size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ag-text-primary)",
                fontFamily: "var(--ag-font-display)" }}>{meta.label}</div>
              <div style={{ fontSize: 12, color: "var(--ag-text-muted)", marginTop: 2 }}>
                {meta.subtitle}</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {meta.colors.map((c, i) => (
                <div key={i} style={{ width: 14, height: 14, borderRadius: "50%",
                  backgroundColor: c, border: "1px solid var(--ag-border-solid)" }} />
              ))}
            </div>
            {active && <div style={{ width: 8, height: 8, borderRadius: "50%",
              backgroundColor: "var(--ag-accent)", flexShrink: 0 }} />}
          </button>
        );
      })}
    </div>
  );
}