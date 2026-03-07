"use client";
// app/mobile/pillars/page.tsx
// Pillar selector — Grain360 active, others Coming Soon

import { useRouter } from "next/navigation";

const PILLARS = [
  {
    id: "grain360",
    label: "Grain360",
    description: "Marketing · Inventory · Deliveries",
    icon: (
      // Wheat head — stem with alternating grain kernels
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Stem */}
        <line x1="12" y1="22" x2="12" y2="4"/>
        {/* Top kernel */}
        <ellipse cx="12" cy="4" rx="2.2" ry="1.4" fill="currentColor" stroke="none"/>
        {/* Left kernels */}
        <path d="M12 8 C10 7 8 7.5 8 9 C8 10.5 10 10.5 12 10"/>
        <path d="M12 13 C10 12 8 12.5 8 14 C8 15.5 10 15.5 12 15"/>
        {/* Right kernels */}
        <path d="M12 8 C14 7 16 7.5 16 9 C16 10.5 14 10.5 12 10"/>
        <path d="M12 13 C14 12 16 12.5 16 14 C16 15.5 14 15.5 12 15"/>
        {/* Awns (whiskers) at top */}
        <line x1="12" y1="4" x2="10" y2="1.5"/>
        <line x1="12" y1="4" x2="12" y2="1"/>
        <line x1="12" y1="4" x2="14" y2="1.5"/>
      </svg>
    ),
    active: true,
    color: "#C8A84B",
    colorDim: "rgba(200, 168, 75, 0.1)",
    border: "rgba(200, 168, 75, 0.35)",
  },
  {
    id: "cattle360",
    label: "Cattle360",
    description: "Herd · Health · Performance",
    icon: (
      // Texas longhorn — wide sweeping horns, broad head
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Wide longhorns */}
        <path d="M2 6 C4 5 7 6 9 9"/>
        <path d="M22 6 C20 5 17 6 15 9"/>
        {/* Horn tips curl */}
        <path d="M2 6 C1 4 2 2 3 3"/>
        <path d="M22 6 C23 4 22 2 21 3"/>
        {/* Head shape */}
        <path d="M9 9 C9 8 10 7.5 12 7.5 C14 7.5 15 8 15 9"/>
        <path d="M8 10 C8 9.5 8.5 9 9 9"/>
        <path d="M16 10 C16 9.5 15.5 9 15 9"/>
        {/* Face */}
        <path d="M8 10 C8 14 9 17 12 18 C15 17 16 14 16 10"/>
        {/* Muzzle */}
        <ellipse cx="12" cy="17.5" rx="3" ry="1.5"/>
        {/* Nostrils */}
        <circle cx="10.8" cy="17.5" r="0.4" fill="currentColor" stroke="none"/>
        <circle cx="13.2" cy="17.5" r="0.4" fill="currentColor" stroke="none"/>
        {/* Eyes */}
        <circle cx="10" cy="12" r="0.5" fill="currentColor" stroke="none"/>
        <circle cx="14" cy="12" r="0.5" fill="currentColor" stroke="none"/>
      </svg>
    ),
    active: false,
    color: "#6B8BA8",
    colorDim: "rgba(107, 139, 168, 0.06)",
    border: "rgba(107, 139, 168, 0.15)",
  },
  {
    id: "produce360",
    label: "Produce360",
    description: "Crops · Harvest · Quality",
    icon: (
      // Carrot — tapered body with leafy top
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Carrot body */}
        <path d="M10 8 L8 20 L12 22 L16 20 L14 8 Z"/>
        {/* Body lines/texture */}
        <line x1="10.5" y1="12" x2="13.5" y2="12"/>
        <line x1="9.5" y1="16" x2="14.5" y2="16"/>
        {/* Green tops — three leaves */}
        <path d="M12 8 C12 6 10 4 9 3 C9 5 10 7 12 8"/>
        <path d="M12 8 C12 5 12 3 12 2 C13 3 13 6 12 8"/>
        <path d="M12 8 C12 6 14 4 15 3 C15 5 14 7 12 8"/>
      </svg>
    ),
    active: false,
    color: "#6B8BA8",
    colorDim: "rgba(107, 139, 168, 0.06)",
    border: "rgba(107, 139, 168, 0.15)",
  },
  {
    id: "connect360",
    label: "Connect360",
    description: "Network · Jobs · Compliance",
    icon: (
      // AG text circled by network loop
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {/* Outer network ring with nodes */}
        <circle cx="12" cy="12" r="9.5" strokeDasharray="3 2.2"/>
        {/* Network nodes on ring */}
        <circle cx="12" cy="2.5" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="20.7" cy="17" r="1.2" fill="currentColor" stroke="none"/>
        <circle cx="3.3" cy="17" r="1.2" fill="currentColor" stroke="none"/>
        {/* Connection lines between nodes */}
        <line x1="12" y1="3.7" x2="19.8" y2="16.2" strokeWidth="1"/>
        <line x1="12" y1="3.7" x2="4.2" y2="16.2" strokeWidth="1"/>
        <line x1="4.5" y1="17" x2="19.5" y2="17" strokeWidth="1"/>
        {/* AG letters in center */}
        <text x="12" y="13.5" textAnchor="middle" fontSize="6" fontWeight="700" fontFamily="'DM Sans', sans-serif" fill="currentColor" stroke="none" letterSpacing="0.5">AG</text>
      </svg>
    ),
    active: false,
    color: "#6B8BA8",
    colorDim: "rgba(107, 139, 168, 0.06)",
    border: "rgba(107, 139, 168, 0.15)",
  },
];

export default function PillarSelector() {
  const router = useRouter();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .pillar-header { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .pillar-card-0 { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
        .pillar-card-1 { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both; }
        .pillar-card-2 { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.29s both; }
        .pillar-card-3 { animation: fadeUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.36s both; }
        .pillar-card-active {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .pillar-card-active:active {
          transform: scale(0.97);
        }
      `}</style>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#070D18",
          padding: "32px 20px 24px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div className="pillar-header" style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: "32px",
              letterSpacing: "0.03em",
              color: "#F0F4F8",
              lineHeight: 1,
              marginBottom: "6px",
            }}
          >
            AG<span style={{ color: "#C8A84B" }}>/</span>360
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              fontSize: "20px",
              color: "#F0F4F8",
              marginBottom: "4px",
            }}
          >
            Select your platform
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              color: "#4A6A8A",
            }}
          >
            Choose a module to get started
          </div>
        </div>

        {/* Pillar Grid — 2x2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            flex: 1,
          }}
        >
          {PILLARS.map((p, i) => (
            <div
              key={p.id}
              className={`pillar-card-${i}${p.active ? " pillar-card-active" : ""}`}
              onClick={() => p.active && router.push("/mobile/grain360")}
              style={{
                background: p.colorDim,
                border: `1px solid ${p.border}`,
                borderRadius: "18px",
                padding: "22px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                cursor: p.active ? "pointer" : "default",
                opacity: p.active ? 1 : 0.5,
                position: "relative",
                minHeight: "140px",
              }}
            >
              {/* Coming Soon Badge */}
              {!p.active && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "rgba(107, 139, 168, 0.15)",
                    border: "1px solid rgba(107, 139, 168, 0.25)",
                    borderRadius: "20px",
                    padding: "3px 8px",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "9px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#4A6A8A",
                  }}
                >
                  Soon
                </div>
              )}

              {/* Active badge */}
              {p.active && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#4ADE80",
                    boxShadow: "0 0 8px rgba(74, 222, 128, 0.6)",
                  }}
                />
              )}

              <div style={{ 
                color: p.active ? p.color : "#2A3F5A",
                marginBottom: "2px"
              }}>
                {p.icon}
              </div>

              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    color: p.active ? p.color : "#4A6A8A",
                    marginBottom: "3px",
                  }}
                >
                  {p.label}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "11px",
                    color: p.active ? "#6B8BA8" : "#2A3F5A",
                    lineHeight: 1.4,
                  }}
                >
                  {p.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: "28px",
            textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            color: "#1E3050",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          AG360 Technologies · For the Farmer
        </div>
      </div>
    </>
  );
}