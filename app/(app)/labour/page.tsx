"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users, Plus, X, CheckCircle, AlertTriangle, Loader2, Search,
  Trash2, Edit2, Phone, Mail, Shield, Clock, Calendar,
  ChevronDown, ChevronLeft, ChevronRight, UserPlus, Award,
  AlertCircle, DollarSign, Briefcase, Heart,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────

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

type TimeEntry = {
  id: string; worker_id: string; entry_date: string; hours: number;
  description: string | null; worker_name: string; worker_role: string;
  hourly_rate: number | null; daily_rate: number | null;
};

type MonthlySummary = {
  worker_id: string; name: string; role: string;
  hourly_rate: number | null; daily_rate: number | null;
  total_hours: number; total_cost: number; days_worked: number;
};

// ─── Constants ───────────────────────────────────────────────

const WORKER_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "seasonal", label: "Seasonal" },
  { value: "contractor", label: "Contractor" },
  { value: "family", label: "Family" },
];

const CERT_TYPES = [
  "CDL / Class 1", "CDL / Class 3", "CDL / Class 5",
  "First Aid / CPR", "WHMIS",
  "Equipment Operator", "Confined Space",
  "Pesticide Applicator", "H2S Alive", "Other",
];

const TABS = ["Team Roster", "Certifications", "Time & Cost"] as const;
type Tab = typeof TABS[number];

// ─── Helpers ─────────────────────────────────────────────────

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

const typeLabel = (t: string) => WORKER_TYPES.find(w => w.value === t)?.label || t;

const certStatus = (expiry: string | null): { label: string; color: string; bg: string } => {
  if (!expiry) return { label: "No Expiry", color: "var(--ag-text-muted)", bg: "transparent" };
  const clean = expiry.slice(0, 10);
  const diff = (new Date(clean + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return { label: "Expired", color: "var(--ag-red)", bg: "var(--ag-red-dim)" };
  if (diff < 30) return { label: "Expiring Soon", color: "var(--ag-yellow)", bg: "rgba(251,191,36,0.08)" };
  return { label: "Valid", color: "var(--ag-green)", bg: "var(--ag-green-dim)" };
};

const getMonday = (d: Date) => {
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 6 : day - 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
};

const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Styles ──────────────────────────────────────────────────

const inputClass = "w-full bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-[var(--ag-text-primary)] placeholder-[var(--ag-text-dim)] focus:outline-none focus:border-[var(--ag-accent)]/50 transition-colors";
const selectClass = "bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg px-3 py-2 text-sm text-[var(--ag-text-primary)] focus:outline-none focus:border-[var(--ag-accent)]/50 transition-colors";
const labelClass = "block text-[10px] uppercase tracking-[2px] font-mono font-semibold text-[var(--ag-text-muted)] mb-1.5";

// ═══════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════

export default function LabourPage() {
  const { user } = useUser();
  const [tab, setTab] = useState<Tab>("Team Roster");
  const [loading, setLoading] = useState(true);

  // Data
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [certs, setCerts] = useState<Certification[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [timeWorkers, setTimeWorkers] = useState<{ id: string; name: string; role: string; hourly_rate: number | null; daily_rate: number | null }[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [certFilter, setCertFilter] = useState("all");

  // Modals
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [showCertModal, setShowCertModal] = useState(false);
  const [editWorker, setEditWorker] = useState<Worker | null>(null);
  const [editCert, setEditCert] = useState<Certification | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Time tracking
  const [weekOf, setWeekOf] = useState(() => getMonday(new Date()));
  const [timeGrid, setTimeGrid] = useState<Record<string, Record<string, number>>>({});
  const [timeSaving, setTimeSaving] = useState(false);
  const [timeView, setTimeView] = useState<"weekly" | "monthly">("weekly");
  const [monthOf, setMonthOf] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });

  // ─── Fetchers ────────────────────────────────────────────

  const fetchWorkers = useCallback(async () => {
    const r = await fetch("/api/hr/workers");
    const d = await r.json();
    if (d.workers) setWorkers(d.workers);
  }, []);

  const fetchCerts = useCallback(async () => {
    const r = await fetch("/api/hr/certifications");
    const d = await r.json();
    if (d.certifications) setCerts(d.certifications);
  }, []);

  const fetchTimeEntries = useCallback(async (monday: Date) => {
    const iso = monday.toISOString().slice(0, 10);
    const r = await fetch(`/api/hr/time-entries?week_of=${iso}`);
    const d = await r.json();
    if (d.entries) setTimeEntries(d.entries);
    if (d.workers) setTimeWorkers(d.workers);

    // Build grid
    const grid: Record<string, Record<string, number>> = {};
    if (d.workers) {
      for (const w of d.workers) {
        grid[w.id] = {};
        for (let i = 0; i < 7; i++) {
          const dayStr = addDays(monday, i).toISOString().slice(0, 10);
          grid[w.id][dayStr] = 0;
        }
      }
    }
    if (d.entries) {
      for (const e of d.entries) {
        if (grid[e.worker_id]) grid[e.worker_id][e.entry_date] = Number(e.hours);
      }
    }
    setTimeGrid(grid);
  }, []);

  const fetchMonthlySummary = useCallback(async (m: string) => {
    const r = await fetch(`/api/hr/time-entries?month=${m}`);
    const d = await r.json();
    if (d.summary) setMonthlySummary(d.summary);
  }, []);

  useEffect(() => {
    Promise.all([fetchWorkers(), fetchCerts(), fetchTimeEntries(weekOf)]).then(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "Time & Cost") {
      if (timeView === "weekly") fetchTimeEntries(weekOf);
      if (timeView === "monthly") fetchMonthlySummary(monthOf);
    }
  }, [tab, timeView, monthOf, weekOf]);

  // ─── Worker CRUD ─────────────────────────────────────────

  const saveWorker = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string | null> = {};
    fd.forEach((v, k) => { body[k] = v.toString() || null; });

    if (editWorker) body.id = editWorker.id;
    const method = editWorker ? "PUT" : "POST";
    await fetch("/api/hr/workers", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await fetchWorkers();
    setShowWorkerModal(false);
    setEditWorker(null);
    setSaving(false);
  };

  const deleteWorker = async (id: string) => {
    await fetch("/api/hr/workers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchWorkers();
    await fetchCerts();
    setDeleteConfirm(null);
  };

  // ─── Cert CRUD ───────────────────────────────────────────

  const saveCert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string | null> = {};
    fd.forEach((v, k) => { body[k] = v.toString() || null; });

    if (editCert) body.id = editCert.id;
    const method = editCert ? "PUT" : "POST";
    await fetch("/api/hr/certifications", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    await fetchCerts();
    setShowCertModal(false);
    setEditCert(null);
    setSaving(false);
  };

  const deleteCert = async (id: string) => {
    await fetch("/api/hr/certifications", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    await fetchCerts();
    setDeleteConfirm(null);
  };

  // ─── Time Entry Save ────────────────────────────────────

  const saveTimeGrid = async () => {
    setTimeSaving(true);
    const entries: { worker_id: string; entry_date: string; hours: number }[] = [];
    for (const [workerId, days] of Object.entries(timeGrid)) {
      for (const [date, hours] of Object.entries(days)) {
        entries.push({ worker_id: workerId, entry_date: date, hours });
      }
    }
    await fetch("/api/hr/time-entries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entries }) });
    await fetchTimeEntries(weekOf);
    setTimeSaving(false);
  };

  // ─── Filtered Workers ────────────────────────────────────

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      if (search && !w.name.toLowerCase().includes(search.toLowerCase()) && !w.role.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all" && w.worker_type !== typeFilter) return false;
      return true;
    });
  }, [workers, search, typeFilter]);

  const filteredCerts = useMemo(() => {
    return certs.filter(c => {
      if (search && !c.worker_name.toLowerCase().includes(search.toLowerCase()) && !c.cert_type.toLowerCase().includes(search.toLowerCase())) return false;
      if (certFilter === "expired") { const s = certStatus(c.expiry_date); return s.label === "Expired"; }
      if (certFilter === "expiring") { const s = certStatus(c.expiry_date); return s.label === "Expiring Soon"; }
      if (certFilter === "valid") { const s = certStatus(c.expiry_date); return s.label === "Valid"; }
      return true;
    });
  }, [certs, search, certFilter]);

  // ─── Ribbon Stats ────────────────────────────────────────

  const activeWorkers = workers.filter(w => w.status === "active").length;
  const seasonalWorkers = workers.filter(w => w.worker_type === "seasonal" && w.status === "active").length;
  const expiringCerts = certs.filter(c => { const s = certStatus(c.expiry_date); return s.label === "Expiring Soon" || s.label === "Expired"; }).length;
  const monthlyLabourCost = workers.reduce((sum, w) => {
    const hrs = Number(w.monthly_hours) || 0;
    if (w.hourly_rate) return sum + hrs * Number(w.hourly_rate);
    return sum;
  }, 0);

  // ─── Loading ─────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex gap-1.5">{[0, 150, 300].map(d => (
        <div key={d} className="w-2 h-2 rounded-full bg-[var(--ag-accent)] animate-bounce" style={{ animationDelay: `${d}ms` }} />
      ))}</div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-4 pb-16 w-full max-w-full overflow-x-hidden">

      {/* ── Header ──────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold text-[var(--ag-text-primary)] tracking-tight">Labour & HR</h1>
          <p className="text-[13px] text-[var(--ag-text-muted)] mt-0.5">Manage your workforce, certifications, and labour costs</p>
        </div>
        <button onClick={() => { setEditWorker(null); setShowWorkerModal(true); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all"
          style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }}>
          <UserPlus size={14} /> Add Worker
        </button>
      </div>

      {/* ── KPI Ribbon ──────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Active Workers", value: String(activeWorkers), color: "var(--ag-accent)" },
          { icon: Briefcase, label: "Seasonal", value: String(seasonalWorkers), color: "var(--ag-blue, #3B82F6)" },
          { icon: AlertCircle, label: "Certs Expiring/Expired", value: String(expiringCerts), color: expiringCerts > 0 ? "var(--ag-red)" : "var(--ag-green)" },
          { icon: DollarSign, label: "Monthly Labour Cost", value: fmtMoney(monthlyLabourCost), color: "var(--ag-yellow)" },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-xl p-4 border border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-card)" }}>
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon size={14} style={{ color: kpi.color }} />
              <p className="font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">{kpi.label}</p>
            </div>
            <p className="text-[20px] font-bold text-[var(--ag-text-primary)]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-[var(--ag-border)]">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2.5 text-[12px] font-semibold transition-all relative"
            style={{ color: tab === t ? "var(--ag-accent)" : "var(--ag-text-muted)" }}>
            {t}
            {tab === t && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ backgroundColor: "var(--ag-accent)" }} />}
          </button>
        ))}
        <div className="flex-1" />
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ag-text-dim)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-[var(--ag-text-primary)] placeholder-[var(--ag-text-dim)] focus:outline-none focus:border-[var(--ag-accent)]/50 w-52" />
        </div>
      </div>

      {/* ══ TAB: TEAM ROSTER ══════════════════════ */}
      {tab === "Team Roster" && (
        <div>
          {/* Filters */}
          <div className="flex gap-2 mb-4">
            {[{ value: "all", label: "All" }, ...WORKER_TYPES].map(f => (
              <button key={f.value} onClick={() => setTypeFilter(f.value)}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                style={typeFilter === f.value
                  ? { backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }
                  : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid var(--ag-border)" }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-[var(--ag-border)] overflow-hidden" style={{ backgroundColor: "var(--ag-bg-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Name</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Role</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Type</th>
                  <th className="text-center py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Status</th>
                  <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Rate</th>
                  <th className="text-center py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Certs</th>
                  <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Hrs (Month)</th>
                  <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkers.length === 0 && (
                  <tr><td colSpan={8} className="py-12 text-center text-[var(--ag-text-muted)]">
                    {workers.length === 0 ? "No workers yet — click Add Worker to get started." : "No workers match your filters."}
                  </td></tr>
                )}
                {filteredWorkers.map(w => (
                  <tr key={w.id} className="border-b border-[var(--ag-border)] transition-colors hover:bg-[var(--ag-bg-hover)]">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-[var(--ag-text-primary)]">{w.name}</p>
                      {w.phone && <p className="text-[10px] text-[var(--ag-text-dim)] flex items-center gap-1 mt-0.5"><Phone size={8} /> {w.phone}</p>}
                    </td>
                    <td className="py-3 px-4 text-[var(--ag-text-secondary)]">{w.role}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: w.worker_type === "full_time" ? "var(--ag-green-dim)" : w.worker_type === "seasonal" ? "rgba(56,189,248,0.08)" : w.worker_type === "contractor" ? "rgba(167,139,250,0.08)" : "rgba(251,191,36,0.08)",
                          color: w.worker_type === "full_time" ? "var(--ag-green)" : w.worker_type === "seasonal" ? "var(--ag-blue, #38BDF8)" : w.worker_type === "contractor" ? "#A78BFA" : "var(--ag-yellow)",
                        }}>
                        {typeLabel(w.worker_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: w.status === "active" ? "var(--ag-green-dim)" : "var(--ag-red-dim, rgba(239,68,68,0.08))",
                          color: w.status === "active" ? "var(--ag-green)" : "var(--ag-red)",
                        }}>
                        {w.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ag-text-primary)] font-medium">
                      {w.hourly_rate ? `${fmtMoney(w.hourly_rate)}/hr` : w.daily_rate ? `${fmtMoney(w.daily_rate)}/day` : "—"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-semibold" style={{ color: Number(w.expired_certs) > 0 ? "var(--ag-red)" : "var(--ag-text-primary)" }}>
                        {w.cert_count}
                      </span>
                      {Number(w.expired_certs) > 0 && <AlertTriangle size={10} className="inline ml-1" style={{ color: "var(--ag-red)" }} />}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ag-text-primary)] font-medium">{Number(w.monthly_hours).toFixed(1)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditWorker(w); setShowWorkerModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
                          <Edit2 size={12} className="text-[var(--ag-text-muted)]" />
                        </button>
                        {deleteConfirm === w.id ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => deleteWorker(w.id)} className="text-[9px] font-bold px-2 py-1 rounded" style={{ backgroundColor: "var(--ag-red-dim, rgba(239,68,68,0.08))", color: "var(--ag-red)" }}>Yes</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-[9px] font-bold px-2 py-1 rounded text-[var(--ag-text-muted)]">No</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(w.id)}
                            className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
                            <Trash2 size={12} className="text-[var(--ag-text-dim)]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB: CERTIFICATIONS ════════════════════ */}
      {tab === "Certifications" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {[{ value: "all", label: "All" }, { value: "valid", label: "Valid" }, { value: "expiring", label: "Expiring" }, { value: "expired", label: "Expired" }].map(f => (
                <button key={f.value} onClick={() => setCertFilter(f.value)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={certFilter === f.value
                    ? { backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }
                    : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid var(--ag-border)" }}>
                  {f.label}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditCert(null); setShowCertModal(true); }}
              className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all border border-[var(--ag-border)] text-[var(--ag-text-secondary)] hover:text-[var(--ag-text-primary)] hover:border-[var(--ag-accent)]">
              <Award size={12} /> Add Certification
            </button>
          </div>

          <div className="rounded-2xl border border-[var(--ag-border)] overflow-hidden" style={{ backgroundColor: "var(--ag-bg-card)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Worker</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Certification</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Number</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Issued</th>
                  <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Expiry</th>
                  <th className="text-center py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Status</th>
                  <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCerts.length === 0 && (
                  <tr><td colSpan={7} className="py-12 text-center text-[var(--ag-text-muted)]">
                    {certs.length === 0 ? "No certifications tracked yet." : "No certifications match your filters."}
                  </td></tr>
                )}
                {filteredCerts.map(c => {
                  const st = certStatus(c.expiry_date);
                  return (
                    <tr key={c.id} className="border-b border-[var(--ag-border)] transition-colors hover:bg-[var(--ag-bg-hover)]">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[var(--ag-text-primary)]">{c.worker_name}</p>
                        <p className="text-[10px] text-[var(--ag-text-dim)]">{c.worker_role}</p>
                      </td>
                      <td className="py-3 px-4 text-[var(--ag-text-primary)] font-medium">{c.cert_type}</td>
                      <td className="py-3 px-4 text-[var(--ag-text-secondary)]">{c.cert_number || "—"}</td>
                      <td className="py-3 px-4 text-[var(--ag-text-secondary)]">{fmtDate(c.issued_date)}</td>
                      <td className="py-3 px-4 text-[var(--ag-text-secondary)]">{fmtDate(c.expiry_date)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditCert(c); setShowCertModal(true); }}
                            className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
                            <Edit2 size={12} className="text-[var(--ag-text-muted)]" />
                          </button>
                          {deleteConfirm === c.id ? (
                            <div className="flex items-center gap-1">
                              <button onClick={() => deleteCert(c.id)} className="text-[9px] font-bold px-2 py-1 rounded" style={{ backgroundColor: "var(--ag-red-dim, rgba(239,68,68,0.08))", color: "var(--ag-red)" }}>Yes</button>
                              <button onClick={() => setDeleteConfirm(null)} className="text-[9px] font-bold px-2 py-1 rounded text-[var(--ag-text-muted)]">No</button>
                            </div>
                          ) : (
                            <button onClick={() => setDeleteConfirm(c.id)}
                              className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)] transition-colors">
                              <Trash2 size={12} className="text-[var(--ag-text-dim)]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ TAB: TIME & COST ══════════════════════ */}
      {tab === "Time & Cost" && (
        <div>
          {/* View toggle + nav */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {(["weekly", "monthly"] as const).map(v => (
                <button key={v} onClick={() => setTimeView(v)}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all capitalize"
                  style={timeView === v
                    ? { backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)" }
                    : { backgroundColor: "transparent", color: "var(--ag-text-muted)", border: "1px solid var(--ag-border)" }}>
                  {v}
                </button>
              ))}
            </div>

            {timeView === "weekly" ? (
              <div className="flex items-center gap-3">
                <button onClick={() => { const nw = addDays(weekOf, -7); setWeekOf(nw); fetchTimeEntries(nw); }}
                  className="p-1.5 rounded-lg border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors">
                  <ChevronLeft size={14} className="text-[var(--ag-text-muted)]" />
                </button>
                <p className="text-[12px] font-semibold text-[var(--ag-text-primary)]">
                  Week of {fmtDate(weekOf.toISOString().slice(0, 10))}
                </p>
                <button onClick={() => { const nw = addDays(weekOf, 7); setWeekOf(nw); fetchTimeEntries(nw); }}
                  className="p-1.5 rounded-lg border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors">
                  <ChevronRight size={14} className="text-[var(--ag-text-muted)]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => {
                  const [y, m] = monthOf.split("-").map(Number);
                  const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
                  setMonthOf(prev);
                }}
                  className="p-1.5 rounded-lg border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors">
                  <ChevronLeft size={14} className="text-[var(--ag-text-muted)]" />
                </button>
                <p className="text-[12px] font-semibold text-[var(--ag-text-primary)]">
                  {new Date(monthOf + "-01T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long" })}
                </p>
                <button onClick={() => {
                  const [y, m] = monthOf.split("-").map(Number);
                  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
                  setMonthOf(next);
                }}
                  className="p-1.5 rounded-lg border border-[var(--ag-border)] hover:bg-[var(--ag-bg-active)] transition-colors">
                  <ChevronRight size={14} className="text-[var(--ag-text-muted)]" />
                </button>
              </div>
            )}
          </div>

          {/* Weekly Grid */}
          {timeView === "weekly" && (
            <div className="rounded-2xl border border-[var(--ag-border)] overflow-hidden" style={{ backgroundColor: "var(--ag-bg-card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                    <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px] w-40">Worker</th>
                    {DAY_LABELS.map((d, i) => {
                      const dayDate = addDays(weekOf, i);
                      const isToday = dayDate.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
                      return (
                        <th key={d} className="text-center py-3 px-2 font-mono text-[9px] uppercase tracking-[1.5px] w-20"
                          style={{ color: isToday ? "var(--ag-accent)" : "var(--ag-text-muted)" }}>
                          {d}<br /><span className="text-[8px] font-normal">{dayDate.getDate()}</span>
                        </th>
                      );
                    })}
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px] w-20">Total</th>
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px] w-24">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {timeWorkers.length === 0 && (
                    <tr><td colSpan={10} className="py-12 text-center text-[var(--ag-text-muted)]">No active workers. Add workers first.</td></tr>
                  )}
                  {timeWorkers.map(w => {
                    const weekTotal = Object.values(timeGrid[w.id] || {}).reduce((s, h) => s + h, 0);
                    const cost = w.hourly_rate ? weekTotal * Number(w.hourly_rate) : 0;
                    return (
                      <tr key={w.id} className="border-b border-[var(--ag-border)]">
                        <td className="py-2 px-4">
                          <p className="font-semibold text-[var(--ag-text-primary)] text-[12px]">{w.name}</p>
                          <p className="text-[9px] text-[var(--ag-text-dim)]">{w.role}</p>
                        </td>
                        {DAY_LABELS.map((_, i) => {
                          const dayStr = addDays(weekOf, i).toISOString().slice(0, 10);
                          return (
                            <td key={i} className="py-2 px-1 text-center">
                              <input type="number" min="0" max="24" step="0.5"
                                value={timeGrid[w.id]?.[dayStr] || ""}
                                onChange={e => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setTimeGrid(prev => ({
                                    ...prev,
                                    [w.id]: { ...prev[w.id], [dayStr]: val }
                                  }));
                                }}
                                className="w-14 text-center bg-[var(--ag-bg-primary)] border border-[var(--ag-border)] rounded-lg py-1.5 text-[12px] text-[var(--ag-text-primary)] focus:outline-none focus:border-[var(--ag-accent)]/50"
                                placeholder="0" />
                            </td>
                          );
                        })}
                        <td className="py-2 px-4 text-right font-semibold text-[var(--ag-text-primary)]">{weekTotal.toFixed(1)}</td>
                        <td className="py-2 px-4 text-right font-semibold" style={{ color: "var(--ag-accent)" }}>{fmtMoney(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {timeWorkers.length > 0 && (
                <div className="flex justify-end p-4 border-t border-[var(--ag-border)]">
                  <button onClick={saveTimeGrid} disabled={timeSaving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all"
                    style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)", opacity: timeSaving ? 0.6 : 1 }}>
                    {timeSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {timeSaving ? "Saving..." : "Save Hours"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Monthly Summary */}
          {timeView === "monthly" && (
            <div className="rounded-2xl border border-[var(--ag-border)] overflow-hidden" style={{ backgroundColor: "var(--ag-bg-card)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--ag-border)]" style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                    <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Worker</th>
                    <th className="text-left py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Role</th>
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Rate</th>
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Days Worked</th>
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Hours</th>
                    <th className="text-right py-3 px-4 font-mono text-[9px] text-[var(--ag-text-muted)] uppercase tracking-[1.5px]">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlySummary.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-[var(--ag-text-muted)]">No time entries for this month.</td></tr>
                  )}
                  {monthlySummary.map(s => (
                    <tr key={s.worker_id} className="border-b border-[var(--ag-border)]">
                      <td className="py-3 px-4 font-semibold text-[var(--ag-text-primary)]">{s.name}</td>
                      <td className="py-3 px-4 text-[var(--ag-text-secondary)]">{s.role}</td>
                      <td className="py-3 px-4 text-right text-[var(--ag-text-primary)]">
                        {s.hourly_rate ? `${fmtMoney(s.hourly_rate)}/hr` : s.daily_rate ? `${fmtMoney(s.daily_rate)}/day` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-[var(--ag-text-primary)]">{Number(s.days_worked)}</td>
                      <td className="py-3 px-4 text-right text-[var(--ag-text-primary)] font-medium">{Number(s.total_hours).toFixed(1)}</td>
                      <td className="py-3 px-4 text-right font-bold" style={{ color: "var(--ag-accent)" }}>{fmtMoney(Number(s.total_cost))}</td>
                    </tr>
                  ))}
                  {monthlySummary.length > 0 && (
                    <tr style={{ backgroundColor: "var(--ag-bg-secondary)" }}>
                      <td colSpan={4} className="py-3 px-4 font-bold text-[var(--ag-text-primary)]">Total</td>
                      <td className="py-3 px-4 text-right font-bold text-[var(--ag-text-primary)]">
                        {monthlySummary.reduce((s, r) => s + Number(r.total_hours), 0).toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold" style={{ color: "var(--ag-accent)" }}>
                        {fmtMoney(monthlySummary.reduce((s, r) => s + Number(r.total_cost), 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ WORKER MODAL ══════════════════════════ */}
      {showWorkerModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowWorkerModal(false); setEditWorker(null); }}>
          <div className="w-full max-w-lg rounded-2xl border border-[var(--ag-border)] p-6 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: "var(--ag-bg-card)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--ag-text-primary)]">{editWorker ? "Edit Worker" : "Add Worker"}</h2>
              <button onClick={() => { setShowWorkerModal(false); setEditWorker(null); }} className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)]"><X size={16} className="text-[var(--ag-text-muted)]" /></button>
            </div>

            <form onSubmit={saveWorker} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input name="name" defaultValue={editWorker?.name || ""} required className={inputClass} placeholder="Full name" />
                </div>
                <div>
                  <label className={labelClass}>Role</label>
                  <input name="role" defaultValue={editWorker?.role || ""} className={inputClass} placeholder="e.g. Equipment Operator" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Type</label>
                  <select name="worker_type" defaultValue={editWorker?.worker_type || "full_time"} className={`${selectClass} w-full`}>
                    {WORKER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select name="status" defaultValue={editWorker?.status || "active"} className={`${selectClass} w-full`}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input name="phone" defaultValue={editWorker?.phone || ""} className={inputClass} placeholder="306-555-0123" />
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input name="email" type="email" defaultValue={editWorker?.email || ""} className={inputClass} placeholder="name@example.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Emergency Contact</label>
                  <input name="emergency_contact" defaultValue={editWorker?.emergency_contact || ""} className={inputClass} placeholder="Contact name" />
                </div>
                <div>
                  <label className={labelClass}>Emergency Phone</label>
                  <input name="emergency_phone" defaultValue={editWorker?.emergency_phone || ""} className={inputClass} placeholder="306-555-0456" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Hourly Rate ($)</label>
                  <input name="hourly_rate" type="number" step="0.01" defaultValue={editWorker?.hourly_rate || ""} className={inputClass} placeholder="25.00" />
                </div>
                <div>
                  <label className={labelClass}>Daily Rate ($)</label>
                  <input name="daily_rate" type="number" step="0.01" defaultValue={editWorker?.daily_rate || ""} className={inputClass} placeholder="300.00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input name="start_date" type="date" defaultValue={editWorker?.start_date?.slice(0, 10) || ""} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input name="end_date" type="date" defaultValue={editWorker?.end_date?.slice(0, 10) || ""} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea name="notes" defaultValue={editWorker?.notes || ""} rows={2} className={inputClass} placeholder="Any additional notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowWorkerModal(false); setEditWorker(null); }}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--ag-border)] text-[var(--ag-text-muted)] hover:text-[var(--ag-text-primary)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all"
                  style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  {saving ? "Saving..." : editWorker ? "Update Worker" : "Add Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ CERTIFICATION MODAL ═══════════════════ */}
      {showCertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCertModal(false); setEditCert(null); }}>
          <div className="w-full max-w-md rounded-2xl border border-[var(--ag-border)] p-6"
            style={{ backgroundColor: "var(--ag-bg-card)" }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[var(--ag-text-primary)]">{editCert ? "Edit Certification" : "Add Certification"}</h2>
              <button onClick={() => { setShowCertModal(false); setEditCert(null); }} className="p-1.5 rounded-lg hover:bg-[var(--ag-bg-active)]"><X size={16} className="text-[var(--ag-text-muted)]" /></button>
            </div>

            <form onSubmit={saveCert} className="space-y-4">
              <div>
                <label className={labelClass}>Worker *</label>
                <select name="worker_id" defaultValue={editCert?.worker_id || ""} required className={`${selectClass} w-full`}>
                  <option value="">Select a worker...</option>
                  {workers.filter(w => w.status === "active").map(w => (
                    <option key={w.id} value={w.id}>{w.name} — {w.role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Certification Type *</label>
                <select name="cert_type" defaultValue={editCert?.cert_type || ""} required className={`${selectClass} w-full`}>
                  <option value="">Select type...</option>
                  {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Certificate Number</label>
                <input name="cert_number" defaultValue={editCert?.cert_number || ""} className={inputClass} placeholder="License or certificate #" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Issued Date</label>
                  <input name="issued_date" type="date" defaultValue={editCert?.issued_date?.slice(0, 10) || ""} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Expiry Date</label>
                  <input name="expiry_date" type="date" defaultValue={editCert?.expiry_date?.slice(0, 10) || ""} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea name="notes" defaultValue={editCert?.notes || ""} rows={2} className={inputClass} placeholder="Any notes..." />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowCertModal(false); setEditCert(null); }}
                  className="px-4 py-2 text-sm font-medium rounded-xl border border-[var(--ag-border)] text-[var(--ag-text-muted)] hover:text-[var(--ag-text-primary)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl transition-all"
                  style={{ backgroundColor: "var(--ag-accent)", color: "var(--ag-bg-base)", opacity: saving ? 0.6 : 1 }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                  {saving ? "Saving..." : editCert ? "Update" : "Add Certification"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}