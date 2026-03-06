"use client";
import { Shield } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
          <Shield size={20} style={{ color: "var(--ag-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Data & Privacy</h1>
          <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>How AG360 handles your farm data</p>
        </div>
      </div>

      <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ag-text-primary)" }}>Our Commitment</h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--ag-text-muted)" }}>
          Your farm data belongs to you. AG360 does not sell, share, or use your operational data for any purpose other than delivering the platform to you. All data is stored in encrypted, Canadian-region cloud infrastructure.
        </p>
      </div>

      <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ag-text-primary)" }}>What We Store</h2>
        <div className="space-y-2">
          {[
            ["Farm Profile", "Name, acreage, crop inventory — entered by you"],
            ["Field & Agronomy Data", "Seeding, spray, and harvest records"],
            ["Financial Records", "Journal entries, grain loads, settlements"],
            ["Scout Reports & Photos", "Field observations and images"],
            ["Usage Data", "Feature usage to improve the platform"],
          ].map(([title, desc]) => (
            <div key={title} className="flex gap-3 py-2" style={{ borderBottom: "1px solid var(--ag-border)" }}>
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: "var(--ag-accent)" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--ag-text-primary)" }}>{title}</p>
                <p className="text-xs" style={{ color: "var(--ag-text-muted)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--ag-text-primary)" }}>Data Requests</h2>
        <p className="text-sm mb-4" style={{ color: "var(--ag-text-muted)" }}>
          To request a full data export or account deletion, contact us directly.
        </p>
        <a href="mailto:hello@ag360.farm"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: "var(--ag-accent-bg)", color: "var(--ag-accent)" }}>
          hello@ag360.farm
        </a>
      </div>
    </div>
  );
}