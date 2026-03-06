"use client";
import { UserCog } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function AccountPage() {
  const { user } = useUser();
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
          <UserCog size={20} style={{ color: "var(--ag-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Account</h1>
          <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Your profile and subscription details</p>
        </div>
      </div>

      <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--ag-text-primary)" }}>Profile</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--ag-border)" }}>
            <span className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Name</span>
            <span className="text-sm font-medium" style={{ color: "var(--ag-text-primary)" }}>
              {user?.fullName ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--ag-border)" }}>
            <span className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Email</span>
            <span className="text-sm font-medium" style={{ color: "var(--ag-text-primary)" }}>
              {user?.primaryEmailAddress?.emailAddress ?? "—"}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-xs" style={{ color: "var(--ag-text-muted)" }}>User ID</span>
            <span className="text-xs font-mono" style={{ color: "var(--ag-text-muted)" }}>
              {user?.id ?? "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--ag-text-primary)" }}>Subscription</h2>
        <div className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid var(--ag-border)" }}>
          <span className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Plan</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--ag-accent-bg)", color: "var(--ag-accent)" }}>
            Pro Trial
          </span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-xs" style={{ color: "var(--ag-text-muted)" }}>Billing</span>
          <span className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Managed by AG360</span>
        </div>
      </div>
    </div>
  );
}