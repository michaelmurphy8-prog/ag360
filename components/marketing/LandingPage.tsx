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
  grain: (color = "#34D399") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M8 6c0 0-4 2-4 6s4 6 4 6M16 6c0 0 4 2 4 6s-4 6-4 6M8 12h8" />
    </svg>
  ),
  cattle: (color = "#F59E0B") => (
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
  connect: (color = "#38BDF8") => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
      <path d="M9 6h6M9 18h6M6 9v6M18 9v6" />
    </svg>
  ),
  analytics: (color = "#94A3B8") => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18M7 17V13M12 17V9M17 17V5" />
    </svg>
  ),
  settings: (color = "#94A3B8") => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
    </svg>
  ),
  lily: (color = "#34D399") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c-4-4-8-7.5-8-12a8 8 0 0116 0c0 4.5-4 8-8 12z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  chartBar: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  calendar: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  ),
  camera: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  ),
  scale: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 7l9-4 9 4M5 21h14" /><path d="M3 7l3 8h0a5 5 0 003 0h0l3-8M12 7l3 8h0a5 5 0 003 0h0l3-8" />
    </svg>
  ),
  cloud: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z" />
    </svg>
  ),
  wrench: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  dollarSign: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  ),
  ledger: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /><path d="M8 7h8M8 11h6M8 15h4" />
    </svg>
  ),
  flow: (color = "#34D399") => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  arrow: (color = "#34D399") => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
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
      { threshold: 0.15, ...options }
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
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
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
      <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "#F1F5F9", margin: "0 0 10px", fontWeight: 400 }}>{title}</h3>
      <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.65, margin: 0 }}>{description}</p>
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
        <h4 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#F1F5F9", margin: "0 0 6px", fontWeight: 400 }}>{title}</h4>
        <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}

// ─── Dashboard Mockup (compact KPIs) ────────────────────────────────
function DashboardMockup({ inView }: { inView: boolean }) {
  return (
    <div style={{
      background: "linear-gradient(145deg, #0C1220 0%, #111827 100%)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden",
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0) scale(1)" : "translateY(60px) scale(0.95)",
      transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.2s",
      boxShadow: "0 40px 100px rgba(0,0,0,0.5), 0 0 60px rgba(52, 211, 153, 0.05)",
    }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#EF4444" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#F59E0B" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22C55E" }} />
        <span style={{ marginLeft: 16, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#64748B" }}>ag360.farm/dashboard</span>
      </div>
      <div style={{ padding: "20px 20px 24px", display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Sidebar */}
        <div style={{ width: 170, flexShrink: 0, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.2)", display: "flex", alignItems: "center", gap: 8 }}>
            {Icons.grain("#34D399")}
            <span style={{ color: "#34D399", fontSize: 12, fontWeight: 500 }}>Grain360</span>
          </div>
          {[
            { icon: Icons.cattle("#64748B"), label: "Cattle360" },
            { icon: Icons.produce("#64748B"), label: "Produce360" },
            { icon: Icons.connect("#64748B"), label: "Connect360" },
            { icon: Icons.analytics("#64748B"), label: "Analytics" },
            { icon: Icons.settings("#64748B"), label: "Settings" },
          ].map((item, i) => (
            <div key={i} style={{ padding: "9px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              {item.icon}
              <span style={{ color: "#475569", fontSize: 12 }}>{item.label}</span>
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
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ color: "#64748B", fontSize: 10, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{kpi.label}</div>
                <div style={{ color: "#F1F5F9", fontSize: 20, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{kpi.value}</div>
                {kpi.change && (
                  <div style={{ color: kpi.up ? "#34D399" : kpi.up === false ? "#EF4444" : "#94A3B8", fontSize: 11, marginTop: 3 }}>
                    {kpi.up ? "↑" : kpi.up === false ? "↓" : "●"} {kpi.change}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{
            padding: "16px 16px 12px", borderRadius: 10,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            height: 160, position: "relative", overflow: "hidden",
          }}>
            <div style={{ color: "#94A3B8", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", marginBottom: 12 }}>REVENUE BY CROP — 2024/25</div>
            <svg width="100%" height="110" viewBox="0 0 500 110" preserveAspectRatio="none" style={{ display: "block" }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#34D399" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,90 C50,80 100,65 150,58 C200,52 250,35 300,26 C350,18 400,22 450,13 L500,8 L500,110 L0,110Z" fill="url(#chartGrad)" />
              <path d="M0,90 C50,80 100,65 150,58 C200,52 250,35 300,26 C350,18 400,22 450,13 L500,8" fill="none" stroke="#34D399" strokeWidth="2" />
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
              {Icons.lily("#34D399")}
            </div>
            <div style={{ color: "#94A3B8", fontSize: 12, lineHeight: 1.5 }}>
              <span style={{ color: "#34D399", fontWeight: 500 }}>Lily: </span>
              Canola basis has tightened $8/mt at Richardson — consider pricing 15% of remaining position before month-end.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

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
      background: "#080C15", color: "#F1F5F9",
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
        .cta-btn { position: relative; padding: 16px 36px; background: linear-gradient(135deg, #34D399, #10B981); color: #080C15; font-weight: 600; font-size: 15px; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; font-family: 'Inter', sans-serif; letter-spacing: 0.3px; }
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
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 20, color: "#F1F5F9", letterSpacing: -0.5 }}>AG</span>
          <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.2)", transform: "rotate(15deg)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 18, color: "#34D399", letterSpacing: 0.5 }}>360</span>
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
          <button className="cta-btn" style={{ padding: "10px 24px", fontSize: 13 }} onClick={() => window.location.href = '/signup'}>Request Access</button>
        </div>
      </nav>

      {/* ─── HERO ────────────────────────────────────────────────────── */}
      <section ref={heroRef} style={{
        minHeight: "100vh", position: "relative",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "120px 40px 80px", textAlign: "center", overflow: "hidden",
      }}>
        <GridCanvas />
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
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", animation: "pulse-glow 2s infinite" }} />
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#34D399", letterSpacing: 1 }}>NOW IN PRIVATE BETA</span>
          </div>

          <h1 className="hero-title" style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 72, fontWeight: 400,
            lineHeight: 1.05, color: "#F1F5F9", marginBottom: 28,
            animation: heroInView ? "fadeUp 1s ease 0.15s both" : "none", opacity: 0,
          }}>
            The operating system{" "}
            <span style={{
              fontStyle: "italic",
              background: "linear-gradient(135deg, #34D399, #6EE7B7)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              for the farmer, by a farmer
            </span>
          </h1>

          <p style={{
            fontSize: 17, color: "#94A3B8", lineHeight: 1.8, maxWidth: 700,
            margin: "0 auto 48px", fontWeight: 300,
            animation: heroInView ? "fadeUp 1s ease 0.3s both" : "none", opacity: 0,
          }}>
            AG360 is a unified operating layer for grain, cattle, and produce — with AI embedded
            across every module. Optimize agronomy, operations, and finance in one system.
            AGConnect extends it into the ecosystem: employees, suppliers, and custom applicators.
          </p>

          <div className="hero-buttons" style={{
            display: "flex", gap: 16, justifyContent: "center", alignItems: "center",
            animation: heroInView ? "fadeUp 1s ease 0.45s both" : "none", opacity: 0,
          }}>
            <button className="cta-btn" onClick={() => window.location.href = '/signup'}>Request Early Access</button>
            <button className="cta-btn-outline">Watch the Demo ↗</button>
          </div>

          <p style={{
            marginTop: 48, fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11, color: "#475569", letterSpacing: 1.5,
            animation: heroInView ? "fadeIn 1s ease 0.8s both" : "none", opacity: 0,
          }}>
            BUILT FOR YOU, THE GRAIN · CATTLE · SPECIALTY CROP OPERATIONS
          </p>
        </div>

        <div style={{
          position: "absolute", bottom: 40, left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
          animation: "float 3s ease infinite", opacity: 0.4,
        }}>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, transparent, #34D399)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#64748B", letterSpacing: 2 }}>SCROLL</span>
        </div>
      </section>

      {/* ─── MANIFESTO BAR ───────────────────────────────────────────── */}
      <section style={{
        padding: "60px 40px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        textAlign: "center",
      }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#64748B",
          letterSpacing: 4, textTransform: "uppercase", maxWidth: 800, margin: "0 auto", lineHeight: 2,
        }}>
          This is not another ag app. This is infrastructure. Your farm ecosystem.
        </p>
      </section>

      {/* ─── ECOSYSTEM ───────────────────────────────────────────────── */}
      <section id="ecosystem" ref={ecoRef} className="section-padding" style={{ padding: "120px 40px", maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
            color: "#34D399", letterSpacing: 3, textTransform: "uppercase",
            opacity: ecoInView ? 1 : 0, transition: "opacity 0.6s ease",
          }}>THE PLATFORM</span>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400,
            color: "#F1F5F9", marginTop: 16,
            opacity: ecoInView ? 1 : 0, transform: ecoInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s",
          }}>Four pillars. One operating system.</h2>
          <p style={{
            color: "#94A3B8", fontSize: 16, marginTop: 16, maxWidth: 560, margin: "16px auto 0",
            opacity: ecoInView ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
          }}>
            Every module feeds every other module. Data flows, intelligence compounds.
          </p>
        </div>

        <div className="eco-grid" style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
          <EcoCard title="Grain360" tag="Crops" color="#34D399" delay={0.1} inView={ecoInView}
            icon={Icons.grain("#34D399")}
            description="Complete grain marketing, inventory, and agronomy management with real-time position tracking."
          />
          <EcoCard title="Cattle360" tag="Livestock" color="#F59E0B" delay={0.2} inView={ecoInView}
            icon={Icons.cattle("#F59E0B")}
            description="Herd management, feed optimization, and market timing for cow-calf and feedlot operations."
          />
          <EcoCard title="Produce360" tag="Specialty" color="#818CF8" delay={0.3} inView={ecoInView}
            icon={Icons.produce("#818CF8")}
            description="Specialty crop planning, food safety compliance, and direct-to-market channel management."
          />
          <EcoCard title="Connect360" tag="People" color="#38BDF8" delay={0.4} inView={ecoInView}
            icon={Icons.connect("#38BDF8")}
            description="Connect your entire farm ecosystem — employees, suppliers, custom applicators, and advisors on one platform."
          />
        </div>
      </section>

      {/* ─── DASHBOARD SHOWCASE ──────────────────────────────────────── */}
      <section id="dashboard" ref={dashRef} className="section-padding" style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, transparent 0%, rgba(52, 211, 153, 0.02) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 3, textTransform: "uppercase" }}>THE PRODUCT</span>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "#F1F5F9", marginTop: 16,
              opacity: dashInView ? 1 : 0, transform: dashInView ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              Command your operation.{" "}
              <span style={{ fontStyle: "italic", color: "#34D399" }}>Every acre.</span>
            </h2>
          </div>
          <DashboardMockup inView={dashInView} />
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section id="features" ref={featRef} className="section-padding" style={{ padding: "120px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 72 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 3, textTransform: "uppercase" }}>CAPABILITIES</span>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "#F1F5F9", marginTop: 16 }}>
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
          <FeatureRow inView={featInView} delay={0.3} icon={Icons.camera()}
            title="Scout Photo AI"
            description="Snap a photo in the field. Lily identifies weeds, diseases, and growth stage, then recommends action."
          />
          <FeatureRow inView={featInView} delay={0.4} icon={Icons.scale()}
            title="Grain Loads & Inventory"
            description="Track every load from field to elevator. Auto-deduct inventory, calculate shrink, and reconcile deliveries."
          />
          <FeatureRow inView={featInView} delay={0.5} icon={Icons.cloud()}
            title="Weather Intelligence"
            description="Field-level forecasts, growing degree days, and spray-window indicators — not just a weather widget."
          />
          <FeatureRow inView={featInView} delay={0.6} icon={Icons.wrench()}
            title="Machinery Fleet Management"
            description="Track hours, maintenance, depreciation, and utilization across your entire fleet. Know your real cost per acre."
          />
        </div>
      </section>

      {/* ─── FINANCE SECTION (NEW) ───────────────────────────────────── */}
      <section id="finance" ref={finRef} style={{
        padding: "120px 40px",
        background: "linear-gradient(180deg, transparent 0%, rgba(52, 211, 153, 0.015) 50%, transparent 100%)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 72 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 3, textTransform: "uppercase" }}>FINANCIAL INTELLIGENCE</span>
            <h2 style={{
              fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "#F1F5F9", marginTop: 16,
              opacity: finInView ? 1 : 0, transform: finInView ? "translateY(0)" : "translateY(20px)",
              transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
            }}>
              P&L that{" "}<span style={{ fontStyle: "italic", color: "#34D399" }}>writes itself.</span>
            </h2>
            <p style={{
              color: "#94A3B8", fontSize: 16, marginTop: 16, maxWidth: 600, margin: "16px auto 0",
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
                icon: Icons.flow(), title: "Everything Integrates", delay: 0.3,
                desc: "Grain loads → Inventory → Ledger → P&L. Machinery hours → Cost per acre. Spray records → Input costs. Every module feeds finance automatically.",
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 16, padding: "32px 28px", position: "relative", overflow: "hidden",
                opacity: finInView ? 1 : 0, transform: finInView ? "translateY(0)" : "translateY(30px)",
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${card.delay}s`,
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, transparent, #34D399, transparent)", opacity: 0.5 }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  {card.icon}
                </div>
                <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: "#F1F5F9", margin: "0 0 10px", fontWeight: 400 }}>{card.title}</h3>
                <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{card.desc}</p>
              </div>
            ))}
          </div>

          {/* Integration flow visual */}
          <div style={{
            marginTop: 48, padding: "28px 32px", borderRadius: 14,
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap",
            opacity: finInView ? 1 : 0, transition: "opacity 0.8s ease 0.5s",
          }}>
            {["Grain Loads", "→", "Inventory", "→", "Ledger", "→", "P&L", "→", "Accountant Export"].map((item, i) => (
              item === "→" ? (
                <div key={i} style={{ opacity: 0.5, flexShrink: 0 }}>{Icons.arrow("#34D399")}</div>
              ) : (
                <span key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#94A3B8",
                  padding: "8px 16px", borderRadius: 8,
                  background: "rgba(52, 211, 153, 0.05)", border: "1px solid rgba(52, 211, 153, 0.1)",
                  whiteSpace: "nowrap",
                }}>{item}</span>
              )
            ))}
          </div>
        </div>
      </section>

      {/* ─── LILY AI ─────────────────────────────────────────────────── */}
      <section id="lily" ref={lilyRef} style={{ padding: "120px 40px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 32px",
            background: "linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(52, 211, 153, 0.05))",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "scale(1)" : "scale(0.8)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            {Icons.lily("#34D399")}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#34D399", letterSpacing: 3, textTransform: "uppercase" }}>AI ADVISOR</span>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 48, fontWeight: 400, color: "#F1F5F9", marginTop: 16, marginBottom: 20,
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
          }}>
            Meet <span style={{ fontStyle: "italic", color: "#34D399" }}>Lily</span>
          </h2>
          <p style={{
            color: "#94A3B8", fontSize: 17, lineHeight: 1.8, maxWidth: 620, margin: "0 auto 48px",
            opacity: lilyInView ? 1 : 0, transition: "opacity 0.8s ease 0.3s",
          }}>
            Your AI agronomist that knows your farm — your crops, your inputs, your
            contracts, your history. Not a chatbot. A contextual intelligence layer that
            sees across your entire operation.
          </p>

          <div style={{
            maxWidth: 560, margin: "0 auto",
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 16, overflow: "hidden", textAlign: "left",
            opacity: lilyInView ? 1 : 0, transform: lilyInView ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", animation: "pulse-glow 2s infinite" }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#64748B" }}>Lily — Active</span>
            </div>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ alignSelf: "flex-end", background: "rgba(52, 211, 153, 0.08)", border: "1px solid rgba(52, 211, 153, 0.15)", borderRadius: "14px 14px 4px 14px", padding: "12px 16px", maxWidth: "80%" }}>
                <p style={{ color: "#E2E8F0", fontSize: 14, margin: 0 }}>Should I be spraying my canola this week?</p>
              </div>
              <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "14px 14px 14px 4px", padding: "14px 18px", maxWidth: "85%" }}>
                <p style={{ color: "#CBD5E1", fontSize: 14, margin: 0, lineHeight: 1.7 }}>
                  Based on your seeding date of May 14 at NE-12, your canola is at 3-leaf stage.
                  Current forecast shows a 72-hour dry window starting Thursday.
                  <span style={{ color: "#34D399", fontWeight: 500 }}> Recommend applying Liberty 150 + Centurion this Thursday AM</span> —
                  wind forecast is 8 km/h NW, ideal conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS ───────────────────────────────────────────────────── */}
      <section ref={statsRef} style={{
        padding: "100px 40px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div className="stats-grid" style={{
          maxWidth: 1000, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 40, textAlign: "center",
        }}>
          {[
            { value: 30000, suffix: "+", label: "Lines of production code" },
            { value: 12, suffix: "", label: "Integrated modules" },
            { value: 50, suffix: "+", label: "Crop varieties supported" },
            { value: 99.9, suffix: "%", label: "Uptime on Vercel Edge" },
          ].map((stat, i) => (
            <div key={i} style={{
              opacity: statsInView ? 1 : 0, transform: statsInView ? "translateY(0)" : "translateY(20px)",
              transition: `all 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
            }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace", fontSize: 42, fontWeight: 500,
                background: "linear-gradient(135deg, #34D399, #6EE7B7)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8,
              }}>
                <Counter end={stat.value} suffix={stat.suffix} inView={statsInView} />
              </div>
              <div style={{ color: "#64748B", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: "uppercase" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── QUOTE ───────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 40px", textAlign: "center" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>
          <div style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 28, fontWeight: 400,
            fontStyle: "italic", color: "#CBD5E1", lineHeight: 1.65, marginBottom: 36,
          }}>
            "I built AG360 because the best farm management tool in the World
            shouldn't be a spreadsheet. It should be an operating system, and your
            farm should be housed under one umbrella."
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, #34D399, #10B981)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 600, fontSize: 16, color: "#080C15",
            }}>M</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ color: "#F1F5F9", fontSize: 15, fontWeight: 500 }}>Mike Murphy</div>
              <div style={{ color: "#64748B", fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>A farmer with ideas</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────────────── */}
      <section ref={ctaRef} style={{
        padding: "120px 40px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", bottom: "-20%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(52, 211, 153, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "relative", zIndex: 2, maxWidth: 650, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Instrument Serif', serif", fontSize: 52, fontWeight: 400, color: "#F1F5F9", marginBottom: 20,
            opacity: ctaInView ? 1 : 0, transform: ctaInView ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }}>
            Ready to run your farm{" "}
            <span style={{ fontStyle: "italic", color: "#34D399" }}>like a business?</span>
          </h2>
          <p style={{
            color: "#94A3B8", fontSize: 17, lineHeight: 1.7, marginBottom: 44,
            opacity: ctaInView ? 1 : 0, transition: "opacity 0.8s ease 0.2s",
          }}>
            AG360 is in private beta with select Western Canadian operations.
            Request access and see what your farm data can actually do.
          </p>
          <div style={{
            display: "flex", gap: 16, justifyContent: "center",
            opacity: ctaInView ? 1 : 0, transition: "opacity 0.8s ease 0.3s",
          }}>
            <button className="cta-btn" onClick={() => window.location.href = '/signup'}>Request Early Access</button>
            <button className="cta-btn-outline" onClick={() => window.location.href = '/demo'}>Book a Demo</button>
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
          <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 15, color: "#94A3B8", letterSpacing: -0.5 }}>AG</span>
          <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)", transform: "rotate(15deg)" }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 13, color: "#34D399", letterSpacing: 0.5 }}>360</span>
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          {["Platform", "Documentation", "Pricing", "Contact"].map(link => (
            <a key={link} style={{ color: "#475569", fontSize: 13, textDecoration: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#94A3B8")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
            >{link}</a>
          ))}
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#334155" }}>
          © 2025 AG360. Built in Saskatchewan.
        </span>
      </footer>
    </div>
  );
}