"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "dark" | "salt-pepper" | "stone-path";

export const THEME_META: Record<Theme, { label: string; description: string; colors: string[] }> = {
  dark: {
    label: "Dark",
    description: "Deep navy — great for cab screens and low light",
    colors: ["#080C15", "#0F1629", "#1E293B", "#34D399"],
  },
  "salt-pepper": {
    label: "Salt & Pepper",
    description: "Clean minimal white and gray tones",
    colors: ["#FFFFFF", "#D4D4D4", "#B3B3B3", "#2B2B2B"],
  },
  "stone-path": {
    label: "Stone Path",
    description: "Warm earthy grays — calm and approachable",
    colors: ["#E8E5DF", "#A5A58D", "#968F83", "#A49A87"],
  },
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({ theme: "dark", setTheme: () => {} });

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

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}