"use client"
import { useState, useEffect, useCallback } from "react"
import { useUser } from "@clerk/nextjs"
import { Plus, Edit2, Trash2, MapPin, Clock, Loader2, X, Info } from "lucide-react"

// ─── Theme (matches marketing page) ─────────────────────────
const T = {
  bg: "var(--ag-bg-primary)", card: "var(--ag-bg-card)",
  border: "rgba(255,255,255,0.06)", borderHover: "rgba(255,255,255,0.12)",
  text: "var(--ag-text-primary)", text2: "#CBD5E1",
  text3: "var(--ag-text-muted)", text4: "var(--ag-text-dim)",
  green: "var(--ag-green)", greenBg: "var(--ag-green-dim)",
  red: "var(--ag-red)", redBg: "var(--ag-red-dim)",
  gold: "#F5A623", goldBg: "rgba(245,166,35,0.08)",
  border2: "rgba(255,255,255,0.12)",
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 12px",
  background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 8, color: T.text, fontSize: 13,
  outline: "none", boxSizing: "border-box",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: T.text3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Commodity list ───────────────────────────────────────────
const COMMODITIES = [
  "Canola",
  "CWRS Wheat",
  "CNHR Wheat",
  "CWRW Wheat",
  "Durum",
  "Feed Barley",
  "Malt Barley",
  "Oats",
  "Flax",
  "Yellow Peas",
  "Large Green Lentils",
  "Small Green Lentils",
  "Small Red Lentils",
  "Chickpeas",
  "Soybeans",
  "Canary Seed",
  "Rye",
  "Other",
]

const COMPANIES = [
  "Bunge",
  "Cargill",
  "P&H",
  "Paterson",
  "Richardson Pioneer",
  "G3",
  "Other",
]

// ─── Freshness helper ─────────────────────────────────────────
function freshness(updatedAt: string): { label: string; stale: boolean } {
  const hrs = (Date.now() - new Date(updatedAt).getTime()) / 3_600_000
  if (hrs < 1) return { label: "Just updated", stale: false }
  if (hrs < 24) return { label: `${Math.floor(hrs)}h ago`, stale: false }
  const days = Math.floor(hrs / 24)
  return { label: `${days}d ago`, stale: days >= 2 }
}

// ─── Types ────────────────────────────────────────────────────
interface LocalBid {
  id: string
  company: string
  location: string
  commodity: string
  cash_price: number
  basis: number | null
  delivery_month: string | null
  notes: string | null
  updated_at: string
}

// ─── Component ───────────────────────────────────────────────
export default function LocalCashBids() {
  const { user } = useUser()
  const [bids, setBids] = useState<LocalBid[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [fCompany, setFCompany]     = useState("")
  const [fLocation, setFLocation]   = useState("")
  const [fCommodity, setFCommodity] = useState("")
  const [fPrice, setFPrice]         = useState("")
  const [fBasis, setFBasis]         = useState("")
  const [fDelivery, setFDelivery]   = useState("")
  const [fNotes, setFNotes]         = useState("")

  const resetForm = () => {
    setFCompany(""); setFLocation(""); setFCommodity("")
    setFPrice(""); setFBasis(""); setFDelivery(""); setFNotes("")
    setEditingId(null)
  }

  const fetchBids = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/grain360/local-cash-bids")
      const d = await res.json()
      setBids(d.bids || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { fetchBids() }, [fetchBids])

  const openNew = () => { resetForm(); setShowModal(true) }

  const openEdit = (b: LocalBid) => {
    setEditingId(b.id)
    setFCompany(b.company)
    setFLocation(b.location)
    setFCommodity(b.commodity)
    setFPrice(String(b.cash_price))
    setFBasis(b.basis != null ? String(b.basis) : "")
    setFDelivery(b.delivery_month || "")
    setFNotes(b.notes || "")
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!fCompany || !fLocation || !fCommodity || !fPrice) return
    setSaving(true)
    const body = {
      ...(editingId ? { id: editingId } : {}),
      company: fCompany, location: fLocation, commodity: fCommodity,
      cash_price: parseFloat(fPrice),
      basis: fBasis ? parseFloat(fBasis) : null,
      delivery_month: fDelivery || null,
      notes: fNotes || null,
    }
    try {
      await fetch("/api/grain360/local-cash-bids", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      setShowModal(false)
      resetForm()
      fetchBids()
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this bid?")) return
    await fetch(`/api/grain360/local-cash-bids?id=${id}`, { method: "DELETE" })
    fetchBids()
  }

  // Group bids by company + location
  const grouped = bids.reduce((acc, b) => {
    const key = `${b.company} — ${b.location}`
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {} as Record<string, LocalBid[]>)

  return (
    <>
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
  <h3 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0 }}>Local Cash Bids</h3>
  <div style={{ position: "relative" }}
    onMouseEnter={e => (e.currentTarget.querySelector('.lcb-tooltip') as HTMLElement).style.opacity = "1"}
    onMouseLeave={e => (e.currentTarget.querySelector('.lcb-tooltip') as HTMLElement).style.opacity = "0"}
  >
    <Info size={14} style={{ color: T.text4, cursor: "default", display: "block" }} />
    <div className="lcb-tooltip" style={{
      position: "absolute", left: "50%", top: "calc(100% + 8px)",
      transform: "translateX(-50%)", width: 260, padding: "10px 12px",
      background: "#1E293B", border: `1px solid ${T.border2}`,
      borderRadius: 10, fontSize: 12, color: T.text2, lineHeight: 1.5,
      opacity: 0, transition: "opacity 0.15s", pointerEvents: "none",
      zIndex: 50, boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
    }}>
      <strong style={{ color: T.text, display: "block", marginBottom: 4 }}>Where to find cash bids</strong>
      Call your local elevator or check their website. In Saskatchewan: Bunge, Cargill, P&H, Richardson Pioneer, and G3 all post daily bids. Update these whenever you call — prices are only as fresh as your last entry.
      <div style={{ position: "absolute", left: "50%", top: -5, transform: "translateX(-50%) rotate(45deg)", width: 8, height: 8, background: "#1E293B", borderLeft: `1px solid ${T.border2}`, borderTop: `1px solid ${T.border2}` }} />
    </div>
  </div>
</div>
            <p style={{ fontSize: 11, color: T.text4, margin: 0 }}>Elevator prices near your operation — update when you call your elevator</p>
          </div>
          <button
            onClick={openNew}
            style={{ background: T.gold, color: "#000", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={13} /> Add Bid
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Loader2 size={22} className="animate-spin" style={{ color: T.gold }} />
          </div>
        ) : bids.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <MapPin size={24} style={{ color: T.text4, margin: "0 auto 10px" }} />
            <p style={{ color: T.text2, fontSize: 14, marginBottom: 4 }}>No cash bids yet</p>
            <p style={{ color: T.text4, fontSize: 12, marginBottom: 16 }}>Call your elevator and add today&apos;s bids to track local prices</p>
            <button onClick={openNew} style={{ background: T.gold, color: "#000", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Add First Bid
            </button>
          </div>
        ) : (
          // Grouped by location
          Object.entries(grouped).map(([locationKey, locationBids]) => {
            const latestUpdate = locationBids.reduce((latest, b) =>
              b.updated_at > latest ? b.updated_at : latest, locationBids[0].updated_at)
            const { label: freshnessLabel, stale } = freshness(latestUpdate)

            return (
              <div key={locationKey} style={{ borderBottom: `1px solid ${T.border}` }}>
                {/* Location subheader */}
                <div style={{ padding: "10px 20px", background: "rgba(255,255,255,0.02)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MapPin size={12} style={{ color: T.text4 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text2 }}>{locationKey}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: stale ? T.gold : T.text4 }}>
                    <Clock size={10} />
                    <span>{freshnessLabel}</span>
                    {stale && <span style={{ color: T.gold, fontWeight: 600 }}>— update recommended</span>}
                  </div>
                </div>

                {/* Bids table */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {["Commodity", "Cash Price", "Basis", "Delivery", "Notes", ""].map(h => (
                        <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontSize: 10, fontWeight: 600, color: T.text4, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {locationBids.map(b => (
                      <tr key={b.id}
                        style={{ borderBottom: `1px solid ${T.border}` }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "10px 16px", fontSize: 13, fontWeight: 500, color: T.text }}>{b.commodity}</td>
                        <td style={{ padding: "10px 16px", fontSize: 14, fontWeight: 700, color: T.green }}>
                          ${Number(b.cash_price).toFixed(2)}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 600, color: b.basis != null ? (Number(b.basis) >= 0 ? T.green : T.red) : T.text4 }}>
                          {b.basis != null ? `${Number(b.basis) >= 0 ? "+" : ""}${Number(b.basis).toFixed(2)}` : "—"}
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: T.text3 }}>{b.delivery_month || "—"}</td>
                        <td style={{ padding: "10px 16px", fontSize: 11, color: T.text4, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.notes || "—"}</td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <button onClick={() => openEdit(b)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                              <Edit2 size={13} style={{ color: T.text3 }} />
                            </button>
                            <button onClick={() => handleDelete(b.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                              <Trash2 size={13} style={{ color: T.red }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })
        )}
      </div>

      {/* ── Add/Edit Modal ───────────────────────────────────── */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={() => { setShowModal(false); resetForm() }} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />
          <div style={{ position: "relative", background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, width: 520, maxHeight: "90vh", overflow: "auto", padding: 28, zIndex: 101 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
                {editingId ? "Edit Cash Bid" : "Add Cash Bid"}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm() }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} style={{ color: T.text3 }} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Company *">
                <select value={fCompany} onChange={e => setFCompany(e.target.value)} style={inputStyle}>
                  <option value="">Select company...</option>
                  {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Location *">
                <input
                  value={fLocation}
                  onChange={e => setFLocation(e.target.value)}
                  placeholder="e.g. Swift Current"
                  style={inputStyle}
                />
              </Field>
              <Field label="Commodity *">
                <select value={fCommodity} onChange={e => setFCommodity(e.target.value)} style={inputStyle}>
                  <option value="">Select commodity...</option>
                  {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Cash Price ($/bu) *">
                <input
                  type="number" step="0.01"
                  value={fPrice}
                  onChange={e => setFPrice(e.target.value)}
                  placeholder="e.g. 13.42"
                  style={inputStyle}
                />
              </Field>
              <Field label="Basis ($/bu)">
                <input
                  type="number" step="0.01"
                  value={fBasis}
                  onChange={e => setFBasis(e.target.value)}
                  placeholder="e.g. -1.05"
                  style={inputStyle}
                />
              </Field>
              <Field label="Delivery Month">
                <input
                  value={fDelivery}
                  onChange={e => setFDelivery(e.target.value)}
                  placeholder="e.g. Apr 2026"
                  style={inputStyle}
                />
              </Field>
            </div>
            <Field label="Notes">
              <input
                value={fNotes}
                onChange={e => setFNotes(e.target.value)}
                placeholder="Optional — grade, protein, conditions..."
                style={inputStyle}
              />
            </Field>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${T.border}`, background: "transparent", color: T.text2, fontSize: 13, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !fCompany || !fLocation || !fCommodity || !fPrice}
                style={{ padding: "9px 24px", borderRadius: 8, border: "none", background: !fCompany || !fLocation || !fCommodity || !fPrice ? T.text4 : T.gold, color: "#000", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
              >
                {saving ? "Saving..." : editingId ? "Update Bid" : "Add Bid"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}