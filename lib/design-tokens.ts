// lib/design-tokens.ts
// AG360 Design System — shared tokens across the entire platform
// Extracted from the landing page design language

export const tokens = {
  // ─── Colors ────────────────────────────────────────────────
  colors: {
    // Backgrounds
    bg: {
      primary: "#080C15",      // Deepest dark — sidebar, modals
      secondary: "#0B1120",    // Main content area
      surface: "#111827",      // Cards, panels
      surfaceHover: "#1E293B", // Card hover state
      elevated: "#1E293B",     // Dropdowns, popovers
    },
    // Borders
    border: {
      subtle: "rgba(255, 255, 255, 0.06)",
      default: "rgba(255, 255, 255, 0.10)",
      strong: "rgba(255, 255, 255, 0.15)",
      accent: "rgba(52, 211, 153, 0.25)",
    },
    // Text
    text: {
      primary: "#F1F5F9",      // Headings, primary content
      secondary: "#94A3B8",    // Body text, descriptions
      tertiary: "#64748B",     // Muted, timestamps
      inverse: "#080C15",      // Text on light backgrounds
    },
    // Brand / Accent
    accent: {
      primary: "#34D399",      // Emerald — main brand color
      primaryHover: "#6EE7B7", // Lighter emerald
      primaryMuted: "rgba(52, 211, 153, 0.12)", // Backgrounds
      primaryBorder: "rgba(52, 211, 153, 0.25)",
    },
    // Pillar Colors
    pillars: {
      grain: "#34D399",        // Emerald
      cattle: "#F59E0B",       // Amber
      produce: "#818CF8",      // Indigo
      connect: "#38BDF8",      // Sky blue
    },
    // Semantic
    semantic: {
      success: "#34D399",
      warning: "#F59E0B",
      error: "#EF4444",
      info: "#38BDF8",
    },
  },

  // ─── Typography ────────────────────────────────────────────
  fonts: {
    heading: "'Instrument Serif', Georgia, serif",
    mono: "'JetBrains Mono', 'SF Mono', monospace",
    body: "'Inter', -apple-system, sans-serif",
  },

  // ─── Spacing ───────────────────────────────────────────────
  radius: {
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "20px",
  },

  // ─── Shadows ───────────────────────────────────────────────
  shadows: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.3)",
    md: "0 4px 12px rgba(0, 0, 0, 0.4)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.5)",
    glow: "0 0 20px rgba(52, 211, 153, 0.15)",
  },
} as const;

// Tailwind-compatible class mappings for quick reference
export const tw = {
  bgPrimary: "bg-[#080C15]",
  bgSecondary: "bg-[#0B1120]",
  bgSurface: "bg-[#111827]",
  bgSurfaceHover: "hover:bg-[#1E293B]",
  textPrimary: "text-[#F1F5F9]",
  textSecondary: "text-[#94A3B8]",
  textTertiary: "text-[#64748B]",
  accent: "text-[#34D399]",
  borderSubtle: "border-white/[0.06]",
  borderDefault: "border-white/[0.10]",
} as const;