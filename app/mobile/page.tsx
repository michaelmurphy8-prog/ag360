"use client";
// app/mobile/page.tsx
// Splash screen — AG/360 wordmark, "For the Farmer", auto-advances to login

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MobileSplash() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/mobile/login");
    }, 2800);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes drawLine {
          from { width: 0; }
          to   { width: 72px; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10%       { transform: translate(-2%, -3%); }
          30%       { transform: translate(3%, -1%); }
          50%       { transform: translate(-1%, 4%); }
          70%       { transform: translate(4%, 1%); }
          90%       { transform: translate(-3%, 2%); }
        }

        .splash-wordmark {
          animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both;
        }
        .splash-tagline {
          animation: fadeUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.7s both;
        }
        .splash-line {
          animation: drawLine 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.1s both;
        }
        .splash-bottom {
          animation: fadeIn 0.6s ease 1.6s both;
        }
        .splash-dot {
          animation: pulse 2s ease-in-out 2s infinite;
        }
        .noise-overlay {
          position: absolute;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.04;
          pointer-events: none;
          animation: grain 8s steps(1) infinite;
        }
        .ambient-glow {
          position: absolute;
          width: 400px;
          height: 400px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(200, 168, 75, 0.08) 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -60%);
          pointer-events: none;
          animation: fadeIn 1.5s ease 0.5s both;
        }
      `}</style>

      {/* Background */}
      <div style={{ position: "absolute", inset: 0, background: "#070D18" }}>
        <div className="noise-overlay" />
        <div className="ambient-glow" />
      </div>

      {/* Center content */}
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          zIndex: 1,
        }}
      >
        {/* AG/360 Wordmark */}
        <div
          className="splash-wordmark"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: "clamp(72px, 22vw, 108px)",
            letterSpacing: "0.02em",
            lineHeight: 1,
            color: "#F0F4F8",
            userSelect: "none",
          }}
        >
          AG
          <span style={{ color: "#C8A84B" }}>/</span>
          360
        </div>

        {/* Divider line */}
        <div
          className="splash-line"
          style={{
            height: "1px",
            background: "linear-gradient(90deg, transparent, #C8A84B, transparent)",
            marginTop: "12px",
            marginBottom: "16px",
          }}
        />

        {/* Tagline */}
        <div
          className="splash-tagline"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 300,
            fontSize: "13px",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#6B8BA8",
          }}
        >
          For the Farmer
        </div>
      </div>

      {/* Bottom — loading indicator */}
      <div
        className="splash-bottom"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingBottom: "48px",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "6px" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="splash-dot"
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "#C8A84B",
                animationDelay: `${2 + i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "11px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#2A3F5A",
          }}
        >
          Grain360
        </span>
      </div>
    </>
  );
}