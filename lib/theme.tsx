"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Theme = "dark" | "salt-pepper" | "stone-path" | "open-field";

export const THEME_META: Record<Theme, {
  label: string;
  subtitle: string;
  icon: string;
  colors: string[];
}> = {
  dark: {
    label: "Dark",
    subtitle: "Deep navy — built for the cab",
    icon: "🌙",
    colors: ["#080C15", "#0F1729", "#34D399", "#34D399", "#F87171"],
  },
  "salt-pepper": {
    label: "Salt & Pepper",
    subtitle: "Refined charcoal — sharp & modern",
    icon: "◼",
    colors: ["#161618", "#232326", "#F0F0F0", "#63E6BE", "#FF6B6B"],
  },
  "stone-path": {
    label: "Stone Path",
    subtitle: "Warm earth — calm & grounded",
    icon: "🪨",
    colors: ["#1F1D19", "#2E2B26", "#A3B86C", "#A3B86C", "#D4735A"],
  },
  "open-field": {
    label: "Open Field",
    subtitle: "Airy & alive — rooted in nature",
    icon: "🌿",
    colors: ["#E5E2DC", "#F4F1EB", "#6B8F71", "#6B8F71", "#B07060"],
  },
};

export const THEME_ORDER: Theme[] = ["dark", "salt-pepper", "stone-path", "open-field"];

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  "family=Inter:wght@300;400;500;600;700" +
  "&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700" +
  "&family=Outfit:wght@400;500;600;700" +
  "&family=IBM+Plex+Mono:wght@400;500;600;700" +
  "&family=JetBrains+Mono:wght@400;500;600;700" +
  "&family=Source+Sans+3:wght@300;400;500;600;700" +
  "&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700" +
  "&family=Source+Code+Pro:wght@400;500;600" +
  "&display=swap";

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ag360-theme") as Theme | null;
    if (saved && saved in THEME_META) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("ag360-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  };

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}