"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: number;
}

export default function SlideOutPanel({ open, onClose, title, subtitle, children, width = 480 }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.2s ease",
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 50,
          width, maxWidth: "100vw",
          background: "var(--ag-bg-card)",
          borderLeft: "1px solid var(--ag-border-solid)",
          boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
          transform: open ? "translateX(0)" : `translateX(${width}px)`,
          transition: "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex", flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "20px 24px 16px",
          borderBottom: "1px solid var(--ag-border)",
          flexShrink: 0,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ag-text-primary)", margin: 0 }}>{title}</h2>
            {subtitle && <p style={{ fontSize: 12, color: "var(--ag-text-muted)", marginTop: 3 }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              background: "var(--ag-bg-hover)", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--ag-text-muted)", flexShrink: 0, marginLeft: 12,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {children}
        </div>
      </div>
    </>
  );
}