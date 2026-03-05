"use client";

// components/marketing/LandingPage.tsx
// AG360 Marketing Landing Page

import React, { useState, useEffect, useRef, type ReactNode } from "react";

// ─── Types ───────────────────────────────────────────────────────────
interface EcoCardProps {
  title: string;
  tag: string;
  description: string;
  color: string;
  delay: number;
  inView: boolean;
  icon: ReactNode;
}

interface FeatureRowProps {
  icon: ReactNode;
  title: string;
  description: string;
  inView: boolean;
  delay: number;
}

interface CounterProps {
  end: number;
  suffix?: string;
  duration?: number;
  inView: boolean;
}

// ─── SVG Icon Components ─────────────────────────────────────────────
const Icons = {
  grain: (color = "var(--ag-green)") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M8 6c0 0-4 2-4 6s4 6 4 6M16 6c0 0 4 2 4 6s-4 6-4 6M8 12h8" />
    </svg>
  ),
  cattle: (color = "var(--ag-yellow)") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9l2-2m18-0l-2-2M6 7c0-2 2-4 6-4s6 2 6 4M6 7v4c0 4 2 8 6 10c4-2 6-6 6-10V7M10 14h4M10 11h.01M14 11h.01" />
    </svg>
  ),
  produce: (color = "#818CF8") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c-4 4-7 8-7 12a7 7 0 0014 0c0-4-3-8-7-12z" />
      <path d="M12 8v8M9 12h6" />
    </svg>
  ),
  connect: (color = "var(--ag-blue)") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
      <path d="M9 6h6M9 18h6M6 9v6M18 9v6" />
    </svg>
  ),
  analytics: (color = "var(--ag-text-secondary)") => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M7 17V13M12 17V9M17 17V5" />
    </svg>
  ),
  settings: (color = "var(--ag-text-secondary)") => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  lily: (color = "var(--ag-green)") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-4-4-8-7.5-8-12a8 8 0 0116 0c0 4.5-4 8-8 12z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  chartBar: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  calendar: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  camera: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  ),
  scale: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 7l9-4 9 4M5 21h14" /><path d="M3 7l3 8h0a5 5 0 003 0h0l3-8M12 7l3 8h0a5 5 0 003 0h0l3-8" />
    </svg>
  ),
  cloud: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  ),
  wrench: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  dollarSign: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  ledger: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><path d="M8 7h8M8 11h6M8 15h4" />
    </svg>
  ),
  flow: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  arrow: (color = "var(--ag-green)") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  ),
  brain: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 10-5.997.125 4 4 0 00-2.526 5.77 4 4 0 00.556 6.588A4 4 0 1012 18Z" />
      <path d="M12 5a3 3 0 115.997.125 4 4 0 012.526 5.77 4 4 0 01-.556 6.588A4 4 0 1112 18Z" />
      <path d="M15 13a4.5 4.5 0 01-3-4 4.5 4.5 0 01-3 4" /><path d="M17.599 6.5a3 3 0 00.399-1.375" /><path d="M6.003 5.125A3 3 0 006.401 6.5" /><path d="M3.477 10.896a4 4 0 01.585-.396" /><path d="M19.938 10.5a4 4 0 01.585.396" /><path d="M6 18a4 4 0 01-1.967-.516" /><path d="M19.967 17.484A4 4 0 0118 18" />
    </svg>
  ),
  trendingUp: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  ),
  shield: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  mapPin: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  users: (color = "var(--ag-green)") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
};

// ─── Intersection Observer Hook ───────────────────────────────────────
function useInView(options: IntersectionObserverInit = {}): [React.RefObject<HTMLDivElement | null>, boolean] {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsInView(true); observer.unobserve(el); } },
      { threshold: 0.05, ...options }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, isInView];
}

// ─── Animated Counter ─────────────────────────────────────────────────
function Counter({ end, suffix = "", duration = 2000, inView }: CounterProps) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, end, duration]);
  return <>{count.toLocaleString()}{suffix}</>;
}

// ─── Topography Canvas (hero top-left) ───────────────────────────────
function TopographyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 600;
    const H = 520;
    canvas.width = W;
    canvas.height = H;

    let animFrame: number;
    let time = 0;

    // Elevation field — layered sine waves to simulate terrain
    const elevation = (x: number, y: number, t: number): number => {
      const nx = x / W;
      const ny = y / H;
      return (
        Math.sin(nx * 4.2 + t * 0.18) * 0.30 +
        Math.sin(ny * 3.7 - t * 0.12) * 0.25 +
        Math.sin((nx + ny) * 5.1 + t * 0.09) * 0.20 +
        Math.sin((nx * 2.3 - ny * 1.8) + t * 0.07) * 0.15 +
        Math.cos(nx * 7.0 + ny * 4.5 - t * 0.14) * 0.10
      );
    };

    const LEVELS = 10;
    // Marching squares edge interpolation
    const interp = (v0: number, v1: number, iso: number): number =>
      Math.abs(v1 - v0) < 0.0001 ? 0 : (iso - v0) / (v1 - v0);

    const draw = () => {
      time += 0.004;
      ctx.clearRect(0, 0, W, H);

      const GRID = 8; // cell size — smaller = more detail
      const cols = Math.ceil(W / GRID);
      const rows = Math.ceil(H / GRID);

      // Pre-compute elevation grid
      const grid: number[][] = [];
      for (let j = 0; j <= rows; j++) {
        grid[j] = [];
        for (let i = 0; i <= cols; i++) {
          grid[j][i] = elevation(i * GRID, j * GRID, time);
        }
      }

      for (let lvl = 0; lvl < LEVELS; lvl++) {
        const iso = -0.5 + (lvl / (LEVELS - 1));
        // Deeper bands = dimmer, higher bands = slightly brighter
        const t = lvl / (LEVELS - 1);
        const alpha = 0.06 + t * 0.10; // 0.06 → 0.16
        const isIndex = lvl % 3 === 0;
        ctx.strokeStyle = `rgba(52, 211, 153, ${isIndex ? alpha * 1.6 : alpha})`;
        ctx.lineWidth = isIndex ? 1.1 : 0.6;

        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          for (let i = 0; i < cols; i++) {
            const x0 = i * GRID, y0 = j * GRID;
            const x1 = x0 + GRID, y1 = y0 + GRID;
            const v00 = grid[j][i];
            const v10 = grid[j][i + 1];
            const v01 = grid[j + 1][i];
            const v11 = grid[j + 1][i + 1];

            // Marching squares case index
            const idx =
              (v00 >= iso ? 8 : 0) |
              (v10 >= iso ? 4 : 0) |
              (v11 >= iso ? 2 : 0) |
              (v01 >= iso ? 1 : 0);

            if (idx === 0 || idx === 15) continue;

            // Edge midpoints
            const top    = { x: x0 + interp(v00, v10, iso) * GRID, y: y0 };
            const right  = { x: x1, y: y0 + interp(v10, v11, iso) * GRID };
            const bottom = { x: x0 + interp(v01, v11, iso) * GRID, y: y1 };
            const left   = { x: x0, y: y0 + interp(v00, v01, iso) * GRID };

            const lines: [typeof top, typeof top][] = [];
            switch (idx) {
              case 1:  case 14: lines.push([left, bottom]); break;
              case 2:  case 13: lines.push([bottom, right]); break;
              case 3:  case 12: lines.push([left, right]); break;
              case 4:  case 11: lines.push([top, right]); break;
              case 5:           lines.push([top, left], [bottom, right]); break;
              case 6:  case 9:  lines.push([top, bottom]); break;
              case 7:  case 8:  lines.push([top, left]); break;
              case 10:          lines.push([top, right], [bottom, left]); break;
            }
            for (const [a, b] of lines) {
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
            }
          }
        }
        ctx.stroke();
      }
      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  return (
    <div style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: 600,
      height: 520,
      pointerEvents: "none",
      // Fade out toward center-right and bottom — no hard canvas edge
      maskImage: "radial-gradient(ellipse 70% 75% at 15% 20%, black 0%, transparent 100%)",
      WebkitMaskImage: "radial-gradient(ellipse 70% 75% at 15% 20%, black 0%, transparent 100%)",
      opacity: 0.85,
    }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

// ─── Grid Canvas Background ──────────────────────────────────────────
function GridCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let animFrame: number;
    let time = 0;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const draw = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 60;
      const cols = Math.ceil(canvas.width / spacing) + 1;
      const rows = Math.ceil(canvas.height / spacing) + 1;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dist = Math.sqrt(Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2));
          const wave = Math.sin(dist * 0.003 - time) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(52, 211, 153, ${wave * 0.12})`;
          ctx.fill();
        }
      }
      for (let j = 0; j < rows; j++) {
        ctx.beginPath(); ctx.moveTo(0, j * spacing); ctx.lineTo(canvas.width, j * spacing);
        ctx.strokeStyle = "rgba(52, 211, 153, 0.03)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let i = 0; i < cols; i++) {
        ctx.beginPath(); ctx.moveTo(i * spacing, 0); ctx.lineTo(i * spacing, canvas.height); ctx.stroke();
      }
      animFrame = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animFrame); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }} />;
}

// ─── Product Ecosystem Card ──────────────────────────────────────────
function EcoCard({ title, tag, description, color, delay, inView, icon }: EcoCardProps) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: "28px 24px", position: "relative", overflow: "hidden",
        opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(40px)",
        transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
        cursor: "default", flex: "1 1 240px", minWidth: 240, maxWidth: 300,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = color + "40"; e.currentTarget.style.transform = "translateY(-4px)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: 0.6 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}12`, border: `1px solid ${color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: color, letterSpacing: 2, textTransform: "uppercase" }}>{tag}</span>
      </div>
      <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "var(--ag-text-primary)", margin: "0 0 10px", fontWeight: 400 }}>{title}</h3>
      <p style={{ color: "var(--ag-text-secondary)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>{description}</p>
    </div>
  );
}

// ─── Feature Row ─────────────────────────────────────────────────────
function FeatureRow({ icon, title, description, inView, delay }: FeatureRowProps) {
  return (
    <div style={{
      display: "flex", gap: 24, alignItems: "flex-start",
      opacity: inView ? 1 : 0, transform: inView ? "translateX(0)" : "translateX(-30px)",
      transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div>
        <h4 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "var(--ag-text-primary)", margin: "0 0 6px", fontWeight: 400 }}>{title}</h4>
        <p style={{ color: "var(--ag-text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Mockup ────────────────────────────────────────────────
function DashboardMockup({ inView }: { inView: boolean }) {
  return (
    <div style={{
      background: "linear-gradient(145deg, var(--ag-bg-base) 0%, var(--ag-bg-card) 100%)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden",
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0) scale(1)" : "translateY(60px) scale(0.95)",
      transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
      boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(52, 211, 153, 0.05)",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--ag-red)" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--ag-yellow)" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--ag-green)" }} />
        <span style={{ marginLeft: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ag-text-muted)" }}>ag360.farm/dashboard</span>
      </div>
      <div style={{ padding: "20px 20px 24px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Sidebar */}
        <div style={{ width: 170, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            {Icons.grain("var(--ag-green)")}
            <span style={{ color: "var(--ag-green)", fontSize: 12, fontWeight: 500 }}>Grain360</span>
          </div>
          {[
            { icon: Icons.cattle("var(--ag-text-muted)"), label: "Cattle360" },
            { icon: Icons.produce("var(--ag-text-muted)"), label: "Produce360" },
            { icon: Icons.connect("var(--ag-text-muted)"), label: "Connect360" },
            { icon: Icons.analytics("var(--ag-text-muted)"), label: "Analytics" },
            { icon: Icons.settings("var(--ag-text-muted)"), label: "Settings" },
          ].map((item, i) => (
            <div key={i} style={{ padding: "9px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              {item.icon}
              <span style={{ color: "var(--ag-text-dim)", fontSize: 12 }}>{item.label}</span>
            </div>
          ))}
        </div>
        {/* Main */}
        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
            {[
              { label: "Gross Revenue", value: "$847.2K", change: "+12.4%", up: true },
              { label: "Crop Position", value: "68%", change: "Sold", up: null },
              { label: "Avg Yield", value: "52 bu/ac", change: "+3.2 bu", up: true },
              { label: "Cost / Acre", value: "$312", change: "-$18", up: true },
            ].map((kpi, i) => (
              <div key={i} style={{
                padding: "14px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
              }}>
                <div style={{ color: "var(--ag-text-muted)", fontSize: 10, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kpi.label}</div>
                <div style={{ color: "var(--ag-text-primary)", fontSize: 20, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{kpi.value}</div>
                {kpi.change && (
                  <div style={{ color: kpi.up ? "var(--ag-green)" : kpi.up === false ? "var(--ag-red)" : "var(--ag-text-secondary)", fontSize: 11, marginTop: 3 }}>
                    {kpi.up ? "↑" : kpi.up === false ? "↓" : "●"} {kpi.change}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{
            padding: "16px 16px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            height: 160, position: "relative", overflow: "hidden",
          }}>
            <div style={{ color: "var(--ag-text-secondary)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>REVENUE BY CROP — 2024/25</div>
            <svg width="100%" height="110" viewBox="0 0 500 110" preserveAspectRatio="none" style={{ display: "block" }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ag-green)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="var(--ag-green)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,90 C50,80 100,65 150,58 C200,52 250,35 300,26 C350,18 400,22 450,13 L500,8 L500,110 L0,110Z" fill="url(#chartGrad)" />
              <path d="M0,90 C50,80 100,65 150,58 C200,52 250,35 300,26 C350,18 400,22 450,13 L500,8" fill="none" stroke="var(--ag-green)" strokeWidth="2" />
              {[0, 100, 200, 300, 400].map((x, i) => (
                <line key={i} x1={x} y1="0" x2={x} y2="110" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
              ))}
            </svg>
          </div>
          <div style={{
            padding: "12px 14px", borderRadius: 10,
            background: "linear-gradient(90deg, rgba(52, 211, 153, 0.06), rgba(52, 211, 153, 0.02))",
            border: "1px solid rgba(52, 211, 153, 0.12)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "rgba(52, 211, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {Icons.lily("var(--ag-green)")}
            </div>
            <div style={{ color: "var(--ag-text-secondary)", fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: "var(--ag-green)", fontWeight: 500 }}>Lily: </span>
              Canola basis has tightened $8/mt at Richardson — consider pricing 15% of remaining position before month-end.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Waitlist Form ───────────────────────────────────────────────────
function WaitlistForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", operationType: "", province: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!form.firstName || !form.email || !form.operationType || !form.province) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ textAlign: "center", padding: "48px 0" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 24px",
          background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: "var(--ag-text-primary)", marginBottom: 12 }}>
          You&apos;re on the list.
        </h3>
        <p style={{ color: "var(--ag-text-secondary)", fontSize: 15 }}>
          We&apos;ll be in touch when access opens for your region.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", borderRadius: 10, fontSize: 14,
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)",
    color: "var(--ag-text-primary)", fontFamily: "'Inter', sans-serif",
    outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ textAlign: "left" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="waitlist-grid">
        <input
          style={inputStyle}
          placeholder="First name *"
          value={form.firstName}
          onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
        />
        <input
          style={inputStyle}
          placeholder="Last name"
          value={form.lastName}
          onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
        />
      </div>
      <input
        style={{ ...inputStyle, marginBottom: 16 }}
        placeholder="Email address *"
        type="email"
        value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }} className="waitlist-grid">
        <select
          style={{ ...inputStyle, appearance: "none" as const }}
          value={form.operationType}
          onChange={e => setForm(f => ({ ...f, operationType: e.target.value }))}
        >
          <option value="">Operation type *</option>
          {["Grain", "Cattle", "Mixed", "Specialty Crop", "Other"].map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <select
          style={{ ...inputStyle, appearance: "none" as const }}
          value={form.province}
          onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
        >
          <option value="">Province *</option>
          {["AB", "SK", "MB", "BC", "ON", "QC", "Other"].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={status === "submitting"}
        style={{
          width: "100%", padding: "16px", borderRadius: 10, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #34D399, #10B981)",
          color: "#0B1120", fontWeight: 700, fontSize: 15, fontFamily: "'Inter', sans-serif",
          opacity: status === "submitting" ? 0.7 : 1, transition: "opacity 0.2s",
        }}
      >
        {status === "submitting" ? "Submitting..." : "Request Early Access →"}
      </button>
      {status === "error" && (
        <p style={{ color: "#F87171", fontSize: 13, textAlign: "center", marginTop: 12 }}>
          Something went wrong — please try again.
        </p>
      )}
      <p style={{ color: "var(--ag-text-muted)", fontSize: 12, textAlign: "center", marginTop: 16 }}>
        Western Canadian operations only. No spam, ever.
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  // Scroll to waitlist form
  const scrollToWaitlist = () => {
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [heroRef, heroInView] = useInView();
  const [ecoRef, ecoInView] = useInView();
  const [dashRef, dashInView] = useInView();
  const [featRef, featInView] = useInView();
  const [finRef, finInView] = useInView();
  const [statsRef, statsInView] = useInView();
  const [ctaRef, ctaInView] = useInView();
  const [lilyRef, lilyInView] = useInView();

  const navBg = scrollY > 60 ? "rgba(8, 12, 21, 0.85)" : "transparent";
  const navBorder = scrollY > 60 ? "rgba(255,255,255,0.06)" : "transparent";

  return (
    <div style={{
      background: "var(--ag-bg-base)", color: "var(--ag-text-primary)",
      fontFamily: "'Inter', -apple-system, sans-serif",
      minHeight: "100vh", overflowX: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { overflow-x: hidden; }
        ::selection { background: rgba(52, 211, 153, 0.3); }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(52, 211, 153, 0.1); } 50% { box-shadow: 0 0 40px rgba(52, 211, 153, 0.2); } }
        .cta-btn { position: relative; padding: 16px 36px; background: linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover)); color: var(--ag-accent-text); font-weight: 600; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; font-family: 'Inter', sans-serif; letter-spacing: 0.3px; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(52, 211, 153, 0.25); }
        .cta-btn-outline { padding: 16px 36px; background: transparent; color: #F1F5F9; font-weight: 500; font-size: 15px; border: 1px solid rgba(255,255,255,0.15); border-radius: 10px; cursor: pointer; transition: all 0.3s ease; font-family: 'Inter', sans-serif; }
        .cta-btn-outline:hover { border-color: rgba(52, 211, 153, 0.4); background: rgba(52, 211, 153, 0.05); }
        .nav-link { color: #94A3B8; text-decoration: none; font-size: 14px; font-weight: 400; transition: color 0.2s; cursor: pointer; }
        .nav-link:hover { color: #F1F5F9; }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .hero-title { font-size: 38px !important; line-height: 1.1 !important; }
          .section-padding { padding: 80px 20px !important; }
          .eco-grid { flex-direction: column !important; align-items: center !important; }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .hero-buttons { flex-direction: column !important; align-items: stretch !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .fin-grid { grid-template-columns: 1fr !important; }
          .waitlist-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ─── NAV ─────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 40px", height: 72,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: navBg, borderBottom: `1px solid ${navBorder}`,
        backdropFilter: scrollY > 60 ? "blur(20px)" : "none",
        transition: "all 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 20, color: "var(--ag-text-primary)", letterSpacing: -0.5 }}>AG</span>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", transform: "rotate(15deg)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 18, color: "var(--ag-green)", letterSpacing: 0.5 }}>360</span>
        </div>
        <div className="hide-mobile" style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <a className="nav-link" href="#ecosystem">Platform</a>
          <a className="nav-link" href="#features">Features</a>
          <a className="nav-link" href="#finance">Finance</a>
          <a className="nav-link" href="#dashboard">Product</a>
          <a className="nav-link" href="#lily">Lily AI</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a className="nav-link hide-mobile" style={{ fontSize: 14 }} href="/login">Log In</a>
          {/* CHANGED: "Request Access" → "Join Waitlist", scrolls to form */}
          <button className="cta-btn" style={{ padding: "10px 24px", fontSize: 13 }} onClick={scrollToWaitlist}>
            Join Waitlist
          </button>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight: "100vh", position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "120px 40px 80px", textAlign: "center", overflow: "hidden",
      }}>
        <GridCanvas />
        <TopographyCanvas />
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%, -50%)",
          width: 800, height: 800, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52, 211, 153, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 100,
            background: "rgba(52, 211, 153, 0.06)", border: "1px solid rgba(52, 211, 153, 0.15)",
            marginBottom: 40,
            animation: heroInView ? "fadeUp 0.8s ease" : "none",
            opacity: heroInView ? 1 : 0,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ag-green)", animation: "pulse-glow 2s infinite" }} />
            {/* CHANGED: "NOW IN PRIVATE BETA" → "NOW IN TESTING" */}
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ag-green)", letterSpacing: 1 }}>NOW IN TESTING</span>
          </div>

          {/* CHANGED: restructured headline — main line + separate green italic subtitle */}
          <h1 className="hero-title" style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 72, fontWeight: 400,
            lineHeight: 1.05, color: "var(--ag-text-primary)", marginBottom: 16,
            animation: heroInView ? "fadeUp 1s ease 0.15s both" : "none", opacity: 0,
          }}>
            The Ultimate Farm Command Center
          </h1>

          <p style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 26, fontWeight: 400,
            fontStyle: "italic", marginBottom: 32,
            background: "linear-gradient(135deg, #34D399, #10B981)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: heroInView ? "fadeUp 1s ease 0.25s both" : "none", opacity: 0,
          }}>
            For the farmer, by a farmer.
          </p>

          <p style={{
            fontSize: 17, color: "var(--ag-text-secondary)", lineHeight: 1.8, maxWidth: 700,
            margin: "0 auto 48px", fontWeight: 300,
            animation: heroInView ? "fadeUp 1s ease 0.4s both" : "none", opacity: 0,
          }}>
            AG360 is a unified operating layer for grain, cattle, and produce — with AI embedded
            across every module. Optimize agronomy, operations, and finance in one system.
            {/* CHANGED: "AGConnect" → "Connect360" */}
            Connect360 extends it into the ecosystem: employees, suppliers, and custom applicators.
          </p>

          <div className="hero-buttons" style={{
            display: "flex", gap: 16, justifyContent: "center", alignItems: "center",
            animation: heroInView ? "fadeUp 1s ease 0.45s both" : "none", opacity: 0,
          }}>
            {/* CHANGED: "Request Early Access" → "Join the Waitlist", removed "Watch the Demo" button */}
            <button className="cta-btn" onClick={scrollToWaitlist}>Join the Waitlist</button>
          </div>

          {/* CHANGED: cleaned up tagline wording */}
          <p style={{
            marginTop: 48, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "var(--ag-text-dim)", letterSpacing: 1.5,
            animation: heroInView ? "fadeIn 1s ease 0.8s both" : "none", opacity: 0,
          }}>
            BUILT FOR THE GRAIN · CATTLE · SPECIALTY CROP OPERATION
          </p>
        </div>

        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          animation: "float 3s ease infinite", opacity: 0.4,
        }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, var(--ag-accent))" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "var(--ag-text-muted)", letterSpacing: 2 }}>SCROLL</span>
        </div>
      </section>

      {/* ─── MANIFESTO BAR ───────────────────────────────────────────── */}
      <section style={{
        padding: "40px 40px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--ag-text-muted)",
          letterSpacing: 4, textTransform: "uppercase", maxWidth: 800, margin: "0 auto", lineHeight: 2,
        }}>
          This is not another ag app. This is infrastructure. Your farm ecosystem.
        </p>
      </section>

      {/* ─── STATS BAR (NEW) ─────────────────────────────────────────── */}
      <section ref={statsRef} style={{
        padding: "72px 40px",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="stats-grid" style={{
          maxWidth: 1000, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, textAlign: "center",
        }}>
          {[
            { label: "$60,000+",  sublabel: "Avg. annual farm software cost", note: "AG360 costs a fraction of this", red: true  },
            { label: "12",        sublabel: "Integrated modules",              note: null,                             red: false },
            { label: "40+",       sublabel: "Crop varieties supported",        note: null,                             red: false },
            { label: "99.9%",     sublabel: "Platform uptime",                 note: null,                             red: false },
          ].map((stat, i) => (
            <div key={i} style={{
              opacity: statsInView ? 1 : 0, transform: statsInView ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 42, fontWeight: 500,
                background: stat.red
                  ? "linear-gradient(135deg, #F87171, #EF4444)"
                  : "linear-gradient(135deg, #34D399, #10B981)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
              }}>
                {stat.label}
              </div>
              <div style={{
                color: stat.red ? "#F87171" : "var(--ag-text-muted)",
                fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: 1, textTransform: "uppercase",
              }}>
                {stat.sublabel}
              </div>
              {stat.note && (
                <div style={{ color: "var(--ag-text-muted)", fontSize: 11, marginTop: 6 }}>
                  {stat.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── COST SAVINGS BANNER (NEW) ───────────────────────────────── */}
      <section style={{ padding: "64px 40px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 3, textTransform: "uppercase" }}>
              THE COST PROBLEM
            </span>
            <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, fontWeight: 400, marginTop: 16, color: "var(--ag-text-primary)" }}>
              One platform. A fraction of the cost.
            </h2>
          </div>
          <div className="fin-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div style={{
              background: "rgba(248, 113, 113, 0.06)", border: "1px solid rgba(248, 113, 113, 0.20)",
              borderRadius: 16, padding: "32px 28px",
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#F87171", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>BEFORE AG360</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#F87171", marginBottom: 12 }}>$60,000+ / year</div>
              <p style={{ color: "var(--ag-text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                Across 5–10 fragmented platforms and external services. Each with its own login, data silo, and support contract.
              </p>
            </div>
            <div style={{
              background: "rgba(52, 211, 153, 0.06)", border: "1px solid rgba(52, 211, 153, 0.20)",
              borderRadius: 16, padding: "32px 28px",
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>WITH AG360</div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: "#34D399", marginBottom: 12 }}>A fraction. One platform.</div>
              <p style={{ color: "var(--ag-text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                AI embedded. Your data unified. Grain, cattle, produce, finance, and people — all under one roof. Special &amp; tailored pricing for maximum affordability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ECOSYSTEM ───────────────────────────────────────────────── */}
      <section id="ecosystem" ref={ecoRef} className="section-padding" style={{ padding: "80px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase",
            opacity: ecoInView ? 1 : 0, transition: "opacity 0.6s ease",
          }}>THE PLATFORM</span>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400,
            color: "var(--ag-text-primary)", marginTop: 16,
            opacity: ecoInView ? 1 : 0, transform: ecoInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}>Four pillars. One operating system.</h2>
          <p style={{
            color: "var(--ag-text-secondary)", fontSize: 16, marginTop: 16, maxWidth: 560, margin: "16px auto 0",
            opacity: ecoInView ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
          }}>
            Every module feeds every other module. Data flows, intelligence compounds.
          </p>
        </div>

        <div className="eco-grid" style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
          <EcoCard title="Grain360" tag="Crops" color="var(--ag-green)" delay={0.1} inView={ecoInView}
            icon={Icons.grain("var(--ag-green)")}
            description="Complete grain marketing, inventory, and agronomy management with real-time position tracking."
          />
          <EcoCard title="Cattle360" tag="Livestock" color="var(--ag-yellow)" delay={0.2} inView={ecoInView}
            icon={Icons.cattle("var(--ag-yellow)")}
            description="Herd management, feed optimization, and market timing for cow-calf and feedlot operations."
          />
          <EcoCard title="Produce360" tag="Specialty" color="#818CF8" delay={0.3} inView={ecoInView}
            icon={Icons.produce("#818CF8")}
            description="Specialty crop planning, food safety compliance, and direct-to-market channel management."
          />
          {/* CHANGED: "AGConnect" → "Connect360" */}
          <EcoCard title="Connect360" tag="People" color="var(--ag-blue)" delay={0.4} inView={ecoInView}
            icon={Icons.connect("var(--ag-blue)")}
            description="Connect your entire farm ecosystem — employees, suppliers, custom applicators, and advisors on one platform."
          />
        </div>
      </section>

      {/* ─── DASHBOARD SHOWCASE ──────────────────────────────────────── */}
      <section id="dashboard" ref={dashRef} className="section-padding" style={{
        padding: "80px 40px",
        background: "linear-gradient(180deg, transparent 0%, rgba(52, 211, 153, 0.02) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase" }}>THE PRODUCT</span>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "var(--ag-text-primary)", marginTop: 16,
              opacity: dashInView ? 1 : 0, transform: dashInView ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              Command your operation.{" "}
              <span style={{ fontStyle: "italic", color: "var(--ag-green)" }}>Every acre.</span>
            </h2>
          </div>
          <DashboardMockup inView={dashInView} />
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" ref={featRef} className="section-padding" style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase" }}>CAPABILITIES</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "var(--ag-text-primary)", marginTop: 16 }}>
            Built for how farms{" "}<span style={{ fontStyle: "italic" }}>actually</span>{" "}work.
          </h2>
        </div>
        <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px 60px" }}>
          <FeatureRow inView={featInView} delay={0.1} icon={Icons.chartBar()}
            title="Real-Time Crop Position"
            description="Know exactly what's sold, stored, contracted, and unpriced across every crop and delivery point — live."
          />
          <FeatureRow inView={featInView} delay={0.2} icon={Icons.calendar()}
            title="Dynamic Spray Calendar"
            description="Auto-generated from actual seeding dates. Not a static PDF — a living schedule that adapts to your operation."
          />
          <FeatureRow inView={featInView} delay={0.3} icon={Icons.brain()}
            title="AI Diagnostics & Problem Solving"
            description="Describe a symptom — unusual noise, error code, crop stress, or pest pressure — and Lily cross-references your farm data to diagnose and recommend action. Reduce costly technician call-outs."
          />
          <FeatureRow inView={featInView} delay={0.4} icon={Icons.trendingUp()}
            title="AI Marketing Plans"
            description="Lily builds fully customized grain marketing plans from your unpriced bushels, current futures, basis levels, and breakeven. Know what to price, when, and why."
          />
          <FeatureRow inView={featInView} delay={0.5} icon={Icons.camera()}
            title="Scout Photo AI"
            description="Snap a photo in the field. Lily identifies weeds, diseases, and growth stage, then recommends the right product and application window."
          />
          <FeatureRow inView={featInView} delay={0.6} icon={Icons.scale()}
            title="Grain Loads & Inventory"
            description="Track every load from field to elevator. Auto-deduct inventory, calculate shrink, and reconcile deliveries against contracts."
          />
          <FeatureRow inView={featInView} delay={0.7} icon={Icons.shield()}
            title="Hedge Tracker"
            description="Track futures positions, open contracts, and hedge ratios alongside your physical grain position. Know your net exposure at a glance."
          />
          <FeatureRow inView={featInView} delay={0.8} icon={Icons.mapPin()}
            title="Field Mapping & NDVI"
            description="Satellite vegetation index overlays on your actual field boundaries. Spot underperforming zones before you're standing in them."
          />
          <FeatureRow inView={featInView} delay={0.9} icon={Icons.cloud()}
            title="Weather Intelligence"
            description="Field-level forecasts, growing degree days, and spray-window indicators — not just a weather widget."
          />
          <FeatureRow inView={featInView} delay={1.0} icon={Icons.wrench()}
            title="Machinery Fleet Management"
            description="Track hours, maintenance, depreciation, and utilization across your entire fleet. Know your real cost per acre."
          />
          <FeatureRow inView={featInView} delay={1.1} icon={Icons.dollarSign()}
            title="Settlement Reconciliation"
            description="Import elevator PDFs and Lily auto-parses weight, grade, dockage, and price. Flag discrepancies before you sign off."
          />
          <FeatureRow inView={featInView} delay={1.2} icon={Icons.users()}
            title="Labour & Contractor Management"
            description="Track workers, custom applicators, and contractors in one place. Assign tasks, log hours, and feed costs directly into your field-level P&L."
          />
        </div>
      </section>

      {/* ─── FINANCE SECTION ─────────────────────────────────────────── */}
      <section id="finance" ref={finRef} style={{
        padding: "80px 40px",
        background: "linear-gradient(180deg, transparent 0%, rgba(52, 211, 153, 0.015) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase" }}>FINANCIAL INTELLIGENCE</span>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "var(--ag-text-primary)", marginTop: 16,
              opacity: finInView ? 1 : 0, transform: finInView ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              P&L that{" "}<span style={{ fontStyle: "italic", color: "var(--ag-green)" }}>writes itself.</span>
            </h2>
            <p style={{
              color: "var(--ag-text-secondary)", fontSize: 16, marginTop: 16, maxWidth: 600, margin: "16px auto 0",
              opacity: finInView ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
            }}>
              Every grain load, input purchase, fuel fill, and labour hour flows into your ledger automatically.
              No double-entry. No reconciliation nightmares. One source of truth.
            </p>
          </div>

          <div className="fin-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {[
              {
                icon: Icons.dollarSign(), title: "Field-Level P&L", delay: 0.1,
                desc: "Revenue, inputs, fuel, labour, and overhead allocated per field and per crop. Know your true profit per acre — not a farm-wide average.",
              },
              {
                icon: Icons.ledger(), title: "Integrated Ledger", delay: 0.2,
                desc: "Grain loads auto-post to the ledger. Input purchases sync from inventory. Fuel and labour entries flow in from their modules. One-click export to your accountant.",
              },
              {
                icon: Icons.flow(), title: "Integrated Network", delay: 0.3,
                desc: "Grain loads → Inventory → Ledger → P&L. Machinery hours → Cost per acre. Spray records → Input costs. Every module feeds finance automatically.",
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16, padding: "32px 28px", position: "relative", overflow: "hidden",
                opacity: finInView ? 1 : 0, transform: finInView ? "translateY(0)" : "translateY(30px)",
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${card.delay}s`,
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, var(--ag-accent), transparent)", opacity: 0.5 }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  {card.icon}
                </div>
                <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "var(--ag-text-primary)", margin: "0 0 10px", fontWeight: 400 }}>{card.title}</h3>
                <p style={{ color: "var(--ag-text-secondary)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Integration flow visual */}
          <div style={{
            marginTop: 48, padding: "28px 32px", borderRadius: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap",
            opacity: finInView ? 1 : 0, transition: "opacity 0.8s ease 0.5s",
          }}>
            {["Grain Loads", "→", "Inventory", "→", "Ledger", "→", "P&L", "→", "Accountant Export"].map((item, i) => (
              item === "→" ? (
                <span key={i} style={{ color: "var(--ag-green)", fontSize: 18, fontWeight: 600, flexShrink: 0, opacity: 0.9 }}>→</span>
              ) : (
                <span key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ag-green)",
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(52, 211, 153, 0.12)", border: "1px solid rgba(52, 211, 153, 0.30)",
                  whiteSpace: "nowrap",
                }}>{item}</span>
              )
            ))}
          </div>
        </div>
      </section>

      {/* ─── LILY AI ─────────────────────────────────────────────────── */}
      <section id="lily" ref={lilyRef} style={{ padding: "80px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 32px",
            background: "linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05))",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "scale(1)" : "scale(0.8)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            {Icons.lily("var(--ag-green)")}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase" }}>AI ADVISOR</span>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "var(--ag-text-primary)", marginTop: 16, marginBottom: 20,
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
          }}>
            Meet <span style={{ fontStyle: "italic", color: "var(--ag-green)" }}>Lily</span>
          </h2>
          <p style={{
            color: "var(--ag-text-secondary)", fontSize: 17, lineHeight: 1.8, maxWidth: 620, margin: "0 auto 48px",
            opacity: lilyInView ? 1 : 0, transition: "opacity 0.8s ease 0.3s",
          }}>
            Your AI agronomist that knows your farm — your crops, your inputs, your
            contracts, your history. Not a chatbot. A contextual intelligence layer that
            sees across your entire operation.
          </p>

          {/* Chat UI — original design preserved, two exchanges added */}
          <div style={{
            maxWidth: 560, margin: "0 auto",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)",
            borderRadius: 16, overflow: "hidden", textAlign: "left",
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.10)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ag-green)", animation: "pulse-glow 2s infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--ag-text-muted)" }}>Lily — Active</span>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Exchange 1 — Agronomy (original, preserved exactly) */}
              <div style={{ alignSelf: "flex-end", background: "rgba(52, 211, 153, 0.18)", border: "1px solid rgba(52, 211, 153, 0.40)", borderRadius: "14px 14px 4px 14px", padding: "12px 16px", maxWidth: "80%" }}>
                <p style={{ color: "var(--ag-text-primary)", fontSize: 14, margin: 0 }}>Should I be spraying my canola this week?</p>
              </div>
              <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "14px 14px 14px 4px", padding: "14px 18px", maxWidth: "85%" }}>
                <p style={{ color: "var(--ag-text-primary)", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                  Based on your seeding date of May 14 at NE-12, your canola is at 3-leaf stage.
                  Current forecast shows a 72-hour dry window starting Thursday.
                  <span style={{ color: "var(--ag-green)", fontWeight: 600 }}> Recommend applying Liberty 150 + Centurion this Thursday AM</span> —
                  wind forecast is 8 km/h NW, ideal conditions.
                </p>
              </div>

              {/* Exchange 2 — Marketing Plan (NEW) */}
              <div style={{ alignSelf: "flex-end", background: "rgba(52, 211, 153, 0.18)", border: "1px solid rgba(52, 211, 153, 0.40)", borderRadius: "14px 14px 4px 14px", padding: "12px 16px", maxWidth: "80%" }}>
                <p style={{ color: "var(--ag-text-primary)", fontSize: 14, margin: 0 }}>Build me a canola marketing plan for the rest of the year.</p>
              </div>
              <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: "14px 14px 14px 4px", padding: "14px 18px", maxWidth: "90%" }}>
                <p style={{ color: "var(--ag-text-primary)", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                  You have <span style={{ color: "var(--ag-green)", fontWeight: 600 }}>1,840 bu unpriced</span> across NE-12 and SW-7. December futures are at $18.42 — basis at Richardson has tightened $6/mt this week, which is favourable.
                  <br /><br />
                  <span style={{ color: "var(--ag-green)", fontWeight: 600 }}>Suggested plan:</span> Price 500 bu now to lock current basis. Hold 900 bu for a January target above $18.80 if the USDA report confirms tighter global stocks. Keep 440 bu flexible as a weather hedge through harvest.
                  <br /><br />
                  Your breakeven is <span style={{ color: "var(--ag-green)", fontWeight: 600 }}>$14.20/bu</span> — you have $4.22/bu of margin to work with at today&apos;s price.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── QUOTE ───────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400,
            fontStyle: "italic", color: "#CBD5E1", lineHeight: 1.65, marginBottom: 36,
          }}>
            {/* CHANGED: "World" → "world" */}
            &ldquo;I built AG360 because the best farm management tool in the world
            shouldn&apos;t be a spreadsheet. It should be an operating system, and your
            farm should be housed under one umbrella.&rdquo;
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--ag-accent), var(--ag-accent-hover))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 600, fontSize: 16, color: "var(--ag-bg-base)",
            }}>M</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "var(--ag-text-primary)", fontSize: 15, fontWeight: 500 }}>Mike Murphy</div>
              {/* CHANGED: "A farmer with ideas" → proper title */}
              <div style={{ color: "var(--ag-text-muted)", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>Founder &amp; CEO, AG360</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── WAITLIST (replaces old Final CTA section) ───────────────── */}
      <section id="waitlist" ref={ctaRef} style={{
        padding: "80px 40px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", bottom: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52, 211, 153, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 580, margin: "0 auto" }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--ag-green)", letterSpacing: 3, textTransform: "uppercase" }}>
            TESTING
          </span>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 52, fontWeight: 400, color: "var(--ag-text-primary)",
            marginTop: 16, marginBottom: 20,
            opacity: ctaInView ? 1 : 0, transform: ctaInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            Ready to run your farm{" "}
            <span style={{ fontStyle: "italic", color: "var(--ag-green)" }}>like a business?</span>
          </h2>
          <p style={{
            color: "var(--ag-text-secondary)", fontSize: 17, lineHeight: 1.7, marginBottom: 44,
            opacity: ctaInView ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
          }}>
            We&apos;re opening access to select Western Canadian operations first.
            Drop your details and we&apos;ll be in touch when your region goes live.
          </p>
          <div style={{ opacity: ctaInView ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }}>
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        padding: "48px 40px", borderTop: "1px solid rgba(255,255,255,0.04)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 20, maxWidth: 1280, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "var(--ag-text-secondary)", letterSpacing: -0.5 }}>AG</span>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)", transform: "rotate(15deg)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 13, color: "var(--ag-green)", letterSpacing: 0.5 }}>360</span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {/* CHANGED: Platform links to #ecosystem, Docs/Pricing greyed out, Contact mailto updated */}
          <a href="#ecosystem" style={{ color: "var(--ag-text-dim)", fontSize: 13, textDecoration: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ag-text-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ag-text-dim)")}>Platform</a>
          <span style={{ color: "#1E293B", fontSize: 13, cursor: "default" }} title="Coming soon">Documentation</span>
          <span style={{ color: "#1E293B", fontSize: 13, cursor: "default" }} title="Coming soon">Pricing</span>
          <a href="mailto:hello@ag360.farm" style={{ color: "var(--ag-text-dim)", fontSize: 13, textDecoration: "none", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--ag-text-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--ag-text-dim)")}>Contact</a>
        </div>
        {/* CHANGED: © 2025 → © 2026 */}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#334155" }}>
          © 2026 AG360. Built in Saskatchewan.
        </span>
      </footer>
    </div>
  );
}