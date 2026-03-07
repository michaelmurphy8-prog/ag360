"use client";
// app/mobile/grain360/page.tsx
// Grain360 mobile home — 5 feature cards

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const FEATURES = [
  {
    id: "ticket",
    route: "/mobile/ticket",
    label: "Grain Loads",
    description: "Submit & view delivery tickets",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    color: "#C8A84B",
    colorDim: "rgba(200, 168, 75, 0.08)",
    border: "rgba(200, 168, 75, 0.2)",
  },
  {
    id: "map",
    route: "/mobile/map",
    label: "Field Map",
    description: "Field boundaries & NDVI",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/>
        <line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    ),
    color: "#5BA85C",
    colorDim: "rgba(91, 168, 92, 0.08)",
    border: "rgba(91, 168, 92, 0.2)",
  },
  {
    id: "bins",
    route: "/mobile/bins",
    label: "Bin Levels",
    description: "Live grain storage overview",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    color: "#60A5FA",
    colorDim: "rgba(96, 165, 250, 0.08)",
    border: "rgba(96, 165, 250, 0.2)",
  },
  {
    id: "scout",
    route: "/mobile/scout",
    label: "Scout Report",
    description: "Log field issues + photos",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    color: "#A78BFA",
    colorDim: "rgba(167, 139, 250, 0.08)",
    border: "rgba(167, 139, 250, 0.2)",
  },
  {
    id: "timecard",
    route: "/mobile/timecard",
    label: "Time Clock",
    description: "Clock in · Clock out · Hours",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    color: "#F97316",
    colorDim: "rgba(249, 115, 22, 0.08)",
    border: "rgba(249, 115, 22, 0.2)",
  },
];

export default function Grain360Home() {
  const router = useRouter();
  const [farmName, setFarmName] = useState("Your Farm");
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    // Set greeting based on time
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Fetch farm name
    fetch("/api/farm-profile")
      .then((r) => r.json())
      .then((d) => {
        if (d?.farmName) setFarmName(d.farmName);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .g360-header { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0s both; }
        .feature-card-0 { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both; }
        .feature-card-1 { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both; }
        .feature-card-2 { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.20s both; }
        .feature-card-3 { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.26s both; }
        .feature-card-4 { animation: fadeUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.32s both; }
        .feature-card {
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.12s ease, box-shadow 0.12s ease;
          cursor: pointer;
        }
        .feature-card:active {
          transform: scale(0.97);
        }
      `}</style>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: "#070D18",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          className="g360-header"
          style={{
            padding: "28px 20px 20px",
            borderBottom: "1px solid #0D1726",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "2px",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "13px",
                color: "#4A6A8A",
                letterSpacing: "0.05em",
              }}
            >
              {greeting}
            </div>
            <div
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: "20px",
                letterSpacing: "0.04em",
                color: "#C8A84B",
              }}
            >
              GRAIN360
            </div>
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: "22px",
              color: "#F0F4F8",
            }}
          >
            {farmName}
          </div>
        </div>

        {/* Feature Cards */}
        <div
          style={{
            flex: 1,
            padding: "16px 16px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {FEATURES.map((f, i) => (
            <div
              key={f.id}
              className={`feature-card feature-card-${i}`}
              onClick={() => router.push(f.route)}
              style={{
                background: f.colorDim,
                border: `1px solid ${f.border}`,
                borderRadius: "16px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: `${f.colorDim}`,
                  border: `1px solid ${f.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: f.color,
                  flexShrink: 0,
                }}
              >
                {f.icon}
              </div>

              {/* Label */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: 600,
                    fontSize: "16px",
                    color: "#F0F4F8",
                    marginBottom: "2px",
                  }}
                >
                  {f.label}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: "13px",
                    color: "#4A6A8A",
                  }}
                >
                  {f.description}
                </div>
              </div>

              {/* Chevron */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2A3F5A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>

        {/* Back to pillars */}
        <div
          style={{
            padding: "0 16px 20px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <button
            onClick={() => router.push("/mobile/pillars")}
            style={{
              background: "none",
              border: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              color: "#2A3F5A",
              cursor: "pointer",
              letterSpacing: "0.06em",
              padding: "8px 16px",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ← Back to platforms
          </button>
        </div>
      </div>
    </>
  );
}