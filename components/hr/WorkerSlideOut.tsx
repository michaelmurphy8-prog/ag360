"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X, Phone, Mail, Heart, Calendar, Award, Clock,
  AlertTriangle, Edit2, ChevronRight, Briefcase, DollarSign,
  User, Shield,
} from "lucide-react";

type Worker = {
  id: string; name: string; role: string; worker_type: string; status: string;
  phone: string | null; email: string | null;
  emergency_contact: string | null; emergency_phone: string | null;
  hourly_rate: number | null; daily_rate: number | null;
  start_date: string | null; end_date: string | null; notes: string | null;
  cert_count: number; expired_certs: number; monthly_hours: number;
};

type Certification = {
  id: string; worker_id: string; cert_type: string; cert_number: string | null;
  issued_date: string | null; expiry_date: string | null; notes: string | null;
  worker_name: string; worker_role: string;
};

type RecentTime = {
  entry_date: string;
  hours: number;
};

const WORKER_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  full_time: { label: "Full-Time", color: "var(--ag-green)", bg: "var(--ag-green-dim, rgba(74,124,89,0.08))" },
  seasonal: { label: "Seasonal", color: "var(--ag-blue, #38BDF8)", bg: "rgba(56,189,248,0.08)" },
  contractor: { label: "Contractor", color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  family: { label: "Family", color: "var(--ag-yellow)", bg: "rgba(251,191,36,0.08)" },
};

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  const clean = d.slice(0, 10);
  const dt = new Date(clean + "T00:00:00");
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
};

const fmtMoney = (n: number | null) => {
  if (n === null || n === undefined) return "—";
  return `$${Number(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const certStatus = (expiry: string | null): { label: string; color: string; bg: string } => {
  if (!expiry) return { label: "No Expiry", color: "var(--ag-text-muted)", bg: "transparent" };
  const clean = expiry.slice(0, 10);
  const diff = (new Date(clean + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "Expired", color: "var(--ag-red)", bg: "var(--ag-red-dim, rgba(239,68,68,0.08))" };
  if (diff < 30) return { label: "Expiring Soon", color: "var(--ag-yellow)", bg: "rgba(251,191,36,0.08)" };
  return { label: "Valid", color: "var(--ag-green)", bg: "var(--ag-green-dim, rgba(74,124,89,0.08))" };
};

const daysSince = (d: string | null): string => {
  if (!d) return "";
  const start = new Date(d.slice(0, 10) + "T00:00:00").getTime();
  const now = Date.now();
  const days = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const yrs = Math.floor(days / 365);
  const mo = Math.floor((days % 365) / 30);
  return mo > 0 ? `${yrs}y ${mo}mo` : `${yrs}y`;
};

export default function WorkerSlideOut({
  worker,
  allCerts,
  onClose,
  onEdit,
}: {
  worker: Worker;
  allCerts: Certification[];
  onClose: () => void;
  onEdit: (w: Worker) => void;
}) {
  const [recentTime, setRecentTime] = useState<RecentTime[]>([]);
  const [loadingTime, setLoadingTime] = useState(true);

  const workerCerts = allCerts.filter(c => c.worker_id === worker.id);
  const typeInfo = WORKER_TYPES[worker.worker_type] || WORKER_TYPES.full_time;

  // Fetch recent time entries for this worker (last 4 weeks)
  useEffect(() => {
    const fetchTime = async () => {
      setLoadingTime(true);
      try {
        const now = new Date();
        const fourWeeksAgo = new Date(now);
        fourWeeksAgo.setDate(now.getDate() - 28);
        // Fetch current and 3 prior weeks
        const weeks = [];
        for (let i = 0; i < 4; i++) {
          const mon = new Date(fourWeeksAgo);
          mon.setDate(fourWeeksAgo.getDate() + i * 7);
          const day = mon.getDay();
          mon.setDate(mon.getDate() - (day === 0 ? 6 : day - 1));
          weeks.push(mon.toISOString().slice(0, 10));
        }
        const allEntries: RecentTime[] = [];
        for (const w of weeks) {
          const r = await fetch(`/api/hr/time-entries?week_of=${w}`);
          const d = await r.json();
          if (d.entries) {
            for (const e of d.entries) {
              if (e.worker_id === worker.id && Number(e.hours) > 0) {
                allEntries.push({ entry_date: e.entry_date.slice(0, 10), hours: Number(e.hours) });
              }
            }
          }
        }
        allEntries.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
        setRecentTime(allEntries);
      } catch {
        setRecentTime([]);
      }
      setLoadingTime(false);
    };
    fetchTime();
  }, [worker.id]);

  const totalRecentHours = recentTime.reduce((s, e) => s + e.hours, 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[440px] max-w-[90vw] z-50 border-l border-[var(--ag-border)] overflow-y-auto shadow-2xl"
        style={{ backgroundColor: "var(--ag-bg-card)" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-[var(--ag-border)] px-6 py-4 flex items-center justify-between"
          style={{ backgroundColor: "var(--ag-bg-card)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold"
              style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}>
              {worker.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-[var(--ag-text-primary)]">{worker.name}</h2>
              <p className="text-[11px] text-[var(--ag-text-muted)]">{worker.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(worker)}
              className="p-2 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
              <Edit2 size={14} className="text-[var(--ag-text-muted)]" />
            </button>
            <button onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
              <X size={14} className="text-[var(--ag-text-muted)]" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Status badges */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: typeInfo.bg, color: typeInfo.color }}>
              {typeInfo.label}
            </span>
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: worker.status === "active" ? "var(--ag-green-dim, rgba(74,124,89,0.08))" : "var(--ag-red-dim, rgba(239,68,68,0.08))",
                color: worker.status === "active" ? "var(--ag-green)" : "var(--ag-red)",
              }}>
              {worker.status === "active" ? "Active" : "Inactive"}
            </span>
            {worker.start_date && (
              <span className="text-[10px] text-[var(--ag-text-dim)] ml-auto">
                Tenure: {daysSince(worker.start_date)}
              </span>
            )}
          </div>

          {/* Contact Info */}
          <div className="rounded-xl border border-[var(--ag-border)] p-4 space-y-3" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
            <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">Contact</p>
            <div className="space-y-2">
              {worker.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={12} className="text-[var(--ag-text-dim)]" />
                  <span className="text-[13px] text-[var(--ag-text-primary)]">{worker.phone}</span>
                </div>
              )}
              {worker.email && (
                <div className="flex items-center gap-2.5">
                  <Mail size={12} className="text-[var(--ag-text-dim)]" />
                  <span className="text-[13px] text-[var(--ag-text-primary)]">{worker.email}</span>
                </div>
              )}
              {!worker.phone && !worker.email && (
                <p className="text-[12px] text-[var(--ag-text-dim)] italic">No contact info on file</p>
              )}
            </div>
          </div>

          {/* Emergency Contact */}
          {(worker.emergency_contact || worker.emergency_phone) && (
            <div className="rounded-xl border px-4 py-3 space-y-2"
              style={{ backgroundColor: "rgba(239,68,68,0.03)", borderColor: "var(--ag-red, #EF4444)" }}>
              <div className="flex items-center gap-2">
                <Heart size={11} style={{ color: "var(--ag-red)" }} />
                <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">Emergency Contact</p>
              </div>
              <div className="flex items-center gap-4">
                {worker.emergency_contact && (
                  <span className="text-[13px] font-semibold text-[var(--ag-text-primary)]">{worker.emergency_contact}</span>
                )}
                {worker.emergency_phone && (
                  <span className="text-[13px] text-[var(--ag-text-secondary)] flex items-center gap-1">
                    <Phone size={10} /> {worker.emergency_phone}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Pay & Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--ag-border)] p-3" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)] mb-1.5">Rate</p>
              <p className="text-[16px] font-bold text-[var(--ag-text-primary)]">
                {worker.hourly_rate ? `${fmtMoney(worker.hourly_rate)}/hr` : worker.daily_rate ? `${fmtMoney(worker.daily_rate)}/day` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--ag-border)] p-3" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)] mb-1.5">This Month</p>
              <p className="text-[16px] font-bold" style={{ color: "var(--ag-accent)" }}>
                {Number(worker.monthly_hours).toFixed(1)} hrs
              </p>
            </div>
            <div className="rounded-xl border border-[var(--ag-border)] p-3" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)] mb-1.5">Start Date</p>
              <p className="text-[13px] font-medium text-[var(--ag-text-primary)]">{fmtDate(worker.start_date)}</p>
            </div>
            <div className="rounded-xl border border-[var(--ag-border)] p-3" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)] mb-1.5">End Date</p>
              <p className="text-[13px] font-medium text-[var(--ag-text-primary)]">{fmtDate(worker.end_date)}</p>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={13} style={{ color: "var(--ag-accent)" }} />
                <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">
                  Certifications ({workerCerts.length})
                </p>
              </div>
            </div>
            {workerCerts.length === 0 ? (
              <p className="text-[12px] text-[var(--ag-text-dim)] italic pl-1">No certifications on file</p>
            ) : (
              <div className="space-y-2">
                {workerCerts.map(c => {
                  const st = certStatus(c.expiry_date);
                  return (
                    <div key={c.id} className="rounded-lg border border-[var(--ag-border)] px-3 py-2.5 flex items-center justify-between"
                      style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                      <div>
                        <p className="text-[12px] font-semibold text-[var(--ag-text-primary)]">{c.cert_type}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {c.cert_number && <span className="text-[10px] text-[var(--ag-text-dim)]">#{c.cert_number}</span>}
                          <span className="text-[10px] text-[var(--ag-text-dim)]">Exp: {fmtDate(c.expiry_date)}</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Time Entries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={13} style={{ color: "var(--ag-accent)" }} />
                <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)]">
                  Recent Hours (4 weeks)
                </p>
              </div>
              <span className="text-[11px] font-semibold" style={{ color: "var(--ag-accent)" }}>
                {totalRecentHours.toFixed(1)} hrs
              </span>
            </div>
            {loadingTime ? (
              <div className="flex justify-center py-4">
                <div className="flex gap-1">{[0, 150, 300].map(d => (
                  <div key={d} className="w-1.5 h-1.5 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}</div>
              </div>
            ) : recentTime.length === 0 ? (
              <p className="text-[12px] text-[var(--ag-text-dim)] italic pl-1">No time entries in the last 4 weeks</p>
            ) : (
              <div className="space-y-1">
                {recentTime.slice(0, 14).map((e, i) => {
                  const dayName = new Date(e.entry_date + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short" });
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-[var(--ag-bg-hover)] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[var(--ag-text-dim)] w-7">{dayName}</span>
                        <span className="text-[11px] text-[var(--ag-text-secondary)]">{fmtDate(e.entry_date)}</span>
                      </div>
                      <span className="text-[12px] font-semibold text-[var(--ag-text-primary)]">{e.hours}h</span>
                    </div>
                  );
                })}
                {recentTime.length > 14 && (
                  <p className="text-[10px] text-[var(--ag-text-dim)] text-center pt-1">+{recentTime.length - 14} more entries</p>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          {worker.notes && (
            <div className="rounded-xl border border-[var(--ag-border)] p-4" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
              <p className="text-[9px] font-mono uppercase tracking-[2px] font-semibold text-[var(--ag-text-muted)] mb-2">Notes</p>
              <p className="text-[12px] text-[var(--ag-text-secondary)] leading-relaxed">{worker.notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}