"use client";
// app/mobile/ticket/page.tsx
// Grain load ticket — submit a load with bin/field, truck, driver, weights, destination

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CANONICAL_CROPS } from "@/lib/crop-colors";

interface Driver { id: string; driver_name: string; }
interface Truck  { id: string; truck_name: string;  }
interface Bin    { id: string; bin_name: string; yard_name: string | null; crop: string | null; }
interface Contract { id: string; contract_number: string | null; crop: string | null; elevator: string | null; quantity_bu: number; contract_type: string | null; }
interface Load   {
  id: string;
  date: string;
  ticket_number: string | null;
  crop: string | null;
  from: string | null;
  gross_weight_kg: number | null;
  net_weight_kg: number | null;
  driver_name: string | null;
  truck_name: string | null;
}

type Step = "form" | "success";

function kgToLbs(kg: number) { return Math.round(kg * 2.20462); }
function kgToBu(kg: number, crop: string) {
  const factors: Record<string, number> = {
    canola: 21.77, wheat: 27.22, "hrs wheat": 27.22, durum: 27.22,
    barley: 21.77, oats: 14.51, flax: 25.40, peas: 27.22, lentils: 27.22,
  };
  const f = factors[crop.toLowerCase()] || 27.22;
  return Math.round(kg / f);
}

export default function MobileTicket() {
  const router = useRouter();

  // Dropdown data
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks]   = useState<Truck[]>([]);
  const [bins, setBins]       = useState<Bin[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [recentLoads, setRecentLoads] = useState<Load[]>([]);

  // Form state
  const [date, setDate]           = useState(() => new Date().toISOString().split("T")[0]);
  const [driverId, setDriverId]   = useState("");
  const [truckId, setTruckId]     = useState("");
  const [crop, setCrop]           = useState("");
  const [from, setFrom]           = useState("");
  const [grossKg, setGrossKg]     = useState("");
  const [tareKg, setTareKg]       = useState("");
  const [dockage, setDockage]     = useState("0");
  const [destination, setDestination] = useState("");
  const [ticketNo, setTicketNo]   = useState("");
  const [contractRef, setContractRef] = useState("");
  const [notes, setNotes]         = useState("");

  // UI state
  const [step, setStep]           = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [lastLoad, setLastLoad]   = useState<any>(null);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("lbs");

  // AI scan state
  const [scanning, setScanning]   = useState(false);
  const [scanError, setScanError] = useState("");
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed weights
  const grossNum = parseFloat(grossKg) || 0;
  const tareNum  = parseFloat(tareKg)  || 0;
  const netKg    = grossNum > tareNum ? grossNum - tareNum : 0;
  const dockageNum = parseFloat(dockage) || 0;
  const dockageKg  = netKg * dockageNum / 100;
  const finalNetKg = netKg - dockageKg;

  function displayWeight(kg: number) {
    if (weightUnit === "lbs") return `${kgToLbs(kg).toLocaleString()} lbs`;
    return `${Math.round(kg).toLocaleString()} kg`;
  }

  async function parseTicket(file: File) {
    setScanning(true);
    setScanError("");
    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Preview
      setScannedImage(URL.createObjectURL(file));

      const res = await fetch("/api/mobile/parse-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: file.type,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse ticket");

      const parsed = data.data;

      // Pre-fill form fields
      if (parsed.ticket_number) setTicketNo(parsed.ticket_number);
      if (parsed.crop)          setCrop(parsed.crop);
      if (parsed.gross_weight_kg) setGrossKg(String(Math.round(parsed.gross_weight_kg)));
      if (parsed.tare_weight_kg)  setTareKg(String(Math.round(parsed.tare_weight_kg)));
      if (parsed.dockage_percent) setDockage(String(parsed.dockage_percent));
      if (parsed.destination)     setDestination(parsed.destination);
      if (parsed.date)            setDate(parsed.date);
      // Combine grade + notes
      const noteParts = [parsed.grade, parsed.notes].filter(Boolean).join(" · ");
      if (noteParts) setNotes(noteParts);

    } catch (e: any) {
      setScanError(e.message || "Could not read ticket. Please fill in manually.");
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/drivers").then(r => r.json()),
      fetch("/api/trucks").then(r => r.json()),
      fetch("/api/inventory/bins").then(r => r.json()),
      fetch("/api/grain-loads").then(r => r.json()),
      fetch("/api/marketing/contracts").then(r => r.json()),
    ]).then(([d, t, b, l, c]) => {
      setDrivers(Array.isArray(d) ? d : d.drivers || []);
      setTrucks(Array.isArray(t) ? t : t.trucks || []);
      const binList: Bin[] = b.bins || [];
      setBins(binList);
      const loads: Load[] = Array.isArray(l) ? l : l.loads || l.data || [];
      setRecentLoads(loads.slice(0, 5));
      setContracts(c.contracts || []);
    }).catch(console.error);
  }, []);

  async function handleSubmit() {
    if (!crop || !grossKg) {
      setError("Crop and gross weight are required.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/grain-loads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          driver_id: driverId || null,
          truck_id:  truckId  || null,
          crop,
          from: from || null,
          gross_weight_kg: grossNum || null,
          dockage_percent: dockageNum || null,
          ticket_number: ticketNo || null,
          contract_reference: contractRef || null,
          notes: notes || null,
          // destination stored in notes if no customer_id
          ...(destination ? { notes: `Destination: ${destination}${notes ? ". " + notes : ""}` } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save load");
      setLastLoad(data);
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setCrop(""); setFrom(""); setGrossKg(""); setTareKg("");
    setDockage("0"); setDestination(""); setTicketNo(""); setNotes("");
    setDriverId(""); setTruckId("");
    setStep("form");
    setLastLoad(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); opacity: 0; }
          70%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .ticket-anim { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
        .check-anim  { animation: checkPop 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both; }

        .field-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #4A6A8A;
          margin-bottom: 6px;
        }
        .field-input {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 12px;
          color: #F0F4F8;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          padding: 13px 14px;
          width: 100%;
          outline: none;
          box-sizing: border-box;
          -webkit-appearance: none;
          transition: border-color 0.2s;
        }
        .field-input:focus { border-color: #C8A84B; }
        .field-input::placeholder { color: #2A3F5A; }
        select.field-input { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A6A8A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 14px center; padding-right: 36px; }
        .submit-btn {
          background: linear-gradient(135deg, #C8A84B, #E8C97A);
          border: none;
          border-radius: 14px;
          color: #070D18;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 700;
          padding: 16px;
          width: 100%;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.2s;
        }
        .submit-btn:active { opacity: 0.85; }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .unit-toggle {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 10px;
          display: flex;
          overflow: hidden;
          flex-shrink: 0;
        }
        .unit-btn {
          background: none;
          border: none;
          color: #4A6A8A;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 7px 12px;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .unit-btn-active {
          background: #1A2940;
          color: #C8A84B;
        }
        .recent-row {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#070D18", overflow: "hidden" }}>

        {/* Header */}
        <div style={{
          padding: "20px 16px 14px",
          borderBottom: "1px solid #0D1726",
          display: "flex", alignItems: "center", gap: "10px",
          flexShrink: 0,
        }}>
          <button onClick={() => router.back()} style={{
            background: "none", border: "none", color: "#4A6A8A",
            cursor: "pointer", padding: "4px", display: "flex",
            WebkitTapHighlightColor: "transparent",
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "20px", color: "#F0F4F8", lineHeight: 1 }}>
              Grain Load
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A", marginTop: "2px" }}>
              Record a new load ticket
            </div>
          </div>
          {/* Weight unit toggle */}
          <div className="unit-toggle">
            <button className={`unit-btn${weightUnit === "lbs" ? " unit-btn-active" : ""}`} onClick={() => setWeightUnit("lbs")}>lbs</button>
            <button className={`unit-btn${weightUnit === "kg"  ? " unit-btn-active" : ""}`} onClick={() => setWeightUnit("kg")}>kg</button>
          </div>
        </div>

        {/* ── Success screen ── */}
        {step === "success" && (
          <div className="ticket-anim" style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "32px 24px", gap: "20px",
          }}>
            <div className="check-anim" style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "rgba(200,168,75,0.15)",
              border: "2px solid #C8A84B",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "22px", color: "#F0F4F8", marginBottom: "6px" }}>
                Load Recorded
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#4A6A8A" }}>
                {crop} · {finalNetKg > 0 ? displayWeight(finalNetKg) + " net" : displayWeight(grossNum)}
              </div>
              {ticketNo && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#2A3F5A", marginTop: "4px" }}>
                  Ticket #{ticketNo}
                </div>
              )}
            </div>

            {/* Summary card */}
            <div style={{
              background: "#0D1726", border: "1px solid #1A2940",
              borderRadius: "16px", padding: "16px", width: "100%",
              display: "flex", flexDirection: "column", gap: "10px",
            }}>
              {[
                { label: "Date", value: date },
                { label: "From", value: from || "—" },
                { label: "Destination", value: destination || "—" },
                { label: "Driver", value: drivers.find(d => d.id === driverId)?.driver_name || "—" },
                { label: "Truck", value: trucks.find(t => t.id === truckId)?.truck_name || "—" },
                { label: "Gross", value: grossNum > 0 ? displayWeight(grossNum) : "—" },
                { label: "Net", value: finalNetKg > 0 ? displayWeight(finalNetKg) : "—" },
                ...(dockageNum > 0 ? [{ label: "Dockage", value: `${dockage}%` }] : []),
                ...(crop ? [{ label: "Bushels (est.)", value: finalNetKg > 0 ? `${kgToBu(finalNetKg, crop).toLocaleString()} bu` : "—" }] : []),
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#4A6A8A" }}>{row.label}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F0F4F8", fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                onClick={resetForm}
                style={{
                  flex: 1, background: "#0D1726", border: "1px solid #1A2940",
                  borderRadius: "12px", color: "#F0F4F8",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 600,
                  padding: "14px", cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                New Load
              </button>
              <button
                onClick={() => router.push("/mobile/grain360")}
                className="submit-btn"
                style={{ flex: 1 }}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ── Form ── */}
        {step === "form" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" as any }}>
            <div className="ticket-anim" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "24px" }}>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) parseTicket(file);
                  e.target.value = "";
                }}
              />

              {/* AI Scan button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={scanning}
                style={{
                  background: scanning ? "rgba(200,168,75,0.08)" : "rgba(200,168,75,0.12)",
                  border: `1px solid ${scanning ? "rgba(200,168,75,0.2)" : "rgba(200,168,75,0.35)"}`,
                  borderRadius: "14px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                  cursor: scanning ? "wait" : "pointer",
                  WebkitTapHighlightColor: "transparent",
                  width: "100%",
                  transition: "all 0.2s",
                }}
              >
                {scanning ? (
                  <>
                    <div style={{
                      width: "18px", height: "18px", borderRadius: "50%",
                      border: "2px solid rgba(200,168,75,0.3)",
                      borderTopColor: "#C8A84B",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "15px", color: "#C8A84B" }}>
                      Reading ticket…
                    </span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C8A84B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "15px", color: "#C8A84B", lineHeight: 1 }}>
                        Scan Ticket with AI
                      </div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#4A6A8A", marginTop: "2px" }}>
                        Photo your grain ticket — fields fill automatically
                      </div>
                    </div>
                  </>
                )}
              </button>

              {/* Scanned image preview */}
              {scannedImage && !scanning && (
                <div style={{
                  background: "#0D1726", border: "1px solid rgba(200,168,75,0.25)",
                  borderRadius: "12px", padding: "10px",
                  display: "flex", alignItems: "center", gap: "10px",
                }}>
                  <img src={scannedImage} alt="Ticket" style={{ width: "48px", height: "48px", borderRadius: "8px", objectFit: "cover" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#C8A84B", fontWeight: 600 }}>
                      ✓ Ticket scanned — review fields below
                    </div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#4A6A8A", marginTop: "2px" }}>
                      Correct anything that looks wrong
                    </div>
                  </div>
                  <button
                    onClick={() => { setScannedImage(null); setScanError(""); }}
                    style={{ background: "none", border: "none", color: "#4A6A8A", cursor: "pointer", padding: "4px" }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              {/* Scan error */}
              {scanError && (
                <div style={{
                  background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.2)",
                  borderRadius: "10px", padding: "10px 14px",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F08080",
                }}>
                  {scanError}
                </div>
              )}

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: 1, height: "1px", background: "#0D1726" }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A", letterSpacing: "0.08em" }}>OR ENTER MANUALLY</span>
                <div style={{ flex: 1, height: "1px", background: "#0D1726" }} />
              </div>

              {/* Date + Ticket # */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div className="field-label">Date</div>
                  <input className="field-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div>
                  <div className="field-label">Ticket #</div>
                  <input className="field-input" type="text" placeholder="Optional" value={ticketNo} onChange={e => setTicketNo(e.target.value)} />
                </div>
              </div>

              {/* Crop */}
              <div>
                <div className="field-label">Crop *</div>
                <select className="field-input" value={crop} onChange={e => setCrop(e.target.value)}>
                  <option value="">Select crop…</option>
                  {CANONICAL_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* From (bin/field) */}
              <div>
                <div className="field-label">From (Bin / Field)</div>
                {bins.length > 0 ? (
                  <select className="field-input" value={from} onChange={e => setFrom(e.target.value)}>
                    <option value="">Select bin or field…</option>
                    {bins.map(b => (
                      <option key={b.id} value={b.bin_name}>
                        {b.bin_name}{b.yard_name ? ` — ${b.yard_name}` : ""}{b.crop ? ` (${b.crop})` : ""}
                      </option>
                    ))}
                    <option value="__manual__">Enter manually…</option>
                  </select>
                ) : (
                  <input className="field-input" type="text" placeholder="Bin or field name" value={from} onChange={e => setFrom(e.target.value)} />
                )}
                {from === "__manual__" && (
                  <input className="field-input" type="text" placeholder="Enter bin or field name" style={{ marginTop: "8px" }} onChange={e => setFrom(e.target.value)} />
                )}
              </div>

              {/* Destination */}
              <div>
                <div className="field-label">Destination (Elevator / Buyer)</div>
                <input className="field-input" type="text" placeholder="e.g. Viterra Shaunavon" value={destination} onChange={e => setDestination(e.target.value)} />
              </div>

              {/* Contract */}
              <div>
                <div className="field-label">Contract</div>
                {contracts.filter(c => !crop || !c.crop || c.crop.toLowerCase() === crop.toLowerCase()).length > 0 ? (
                  <select
                    className="field-input"
                    value={contractRef}
                    onChange={e => setContractRef(e.target.value)}
                  >
                    <option value="">No contract (spot)</option>
                    {contracts
                      .filter(c => !crop || !c.crop || c.crop.toLowerCase() === crop.toLowerCase())
                      .map(c => (
                        <option key={c.id} value={c.contract_number || c.id}>
                          {c.contract_number ? `#${c.contract_number} · ` : ""}{c.crop}{c.elevator ? ` — ${c.elevator}` : ""}{c.contract_type ? ` (${c.contract_type})` : ""}
                        </option>
                      ))}
                  </select>
                ) : (
                  <input
                    className="field-input"
                    type="text"
                    placeholder="Contract # (optional)"
                    value={contractRef}
                    onChange={e => setContractRef(e.target.value)}
                  />
                )}
              </div>

              {/* Driver + Truck */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <div className="field-label">Driver</div>
                  <select className="field-input" value={driverId} onChange={e => setDriverId(e.target.value)}>
                    <option value="">Select…</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.driver_name}</option>)}
                  </select>
                </div>
                <div>
                  <div className="field-label">Truck</div>
                  <select className="field-input" value={truckId} onChange={e => setTruckId(e.target.value)}>
                    <option value="">Select…</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_name}</option>)}
                  </select>
                </div>
              </div>

              {/* Weights */}
              <div style={{
                background: "#0D1726", border: "1px solid #1A2940",
                borderRadius: "14px", padding: "14px",
                display: "flex", flexDirection: "column", gap: "12px",
              }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "13px", color: "#C8A84B" }}>
                  Weight ({weightUnit})
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <div className="field-label">Gross *</div>
                    <input className="field-input" type="number" inputMode="decimal" placeholder="0" value={grossKg} onChange={e => setGrossKg(e.target.value)} />
                  </div>
                  <div>
                    <div className="field-label">Tare</div>
                    <input className="field-input" type="number" inputMode="decimal" placeholder="0" value={tareKg} onChange={e => setTareKg(e.target.value)} />
                  </div>
                </div>
                <div>
                  <div className="field-label">Dockage %</div>
                  <input className="field-input" type="number" inputMode="decimal" placeholder="0" value={dockage} onChange={e => setDockage(e.target.value)} />
                </div>

                {/* Live weight summary */}
                {grossNum > 0 && (
                  <div style={{
                    background: "#070D18", borderRadius: "10px", padding: "12px",
                    display: "flex", flexDirection: "column", gap: "6px",
                  }}>
                    {[
                      { label: "Gross", kg: grossNum },
                      ...(tareNum > 0 ? [{ label: "Tare", kg: tareNum }] : []),
                      ...(tareNum > 0 ? [{ label: "Net", kg: netKg }] : []),
                      ...(dockageNum > 0 ? [{ label: `Dockage (${dockage}%)`, kg: dockageKg }] : []),
                      ...(dockageNum > 0 || tareNum > 0 ? [{ label: "Final Net", kg: finalNetKg }] : []),
                    ].map((row, i) => (
                      <div key={row.label} style={{
                        display: "flex", justifyContent: "space-between",
                        borderTop: i > 0 ? "1px solid #0D1726" : "none",
                        paddingTop: i > 0 ? "6px" : "0",
                      }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#4A6A8A" }}>{row.label}</span>
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif", fontSize: "13px",
                          color: row.label === "Final Net" || (row.label === "Net" && dockageNum === 0) ? "#C8A84B" : "#F0F4F8",
                          fontWeight: 600,
                        }}>
                          {displayWeight(row.kg)}
                        </span>
                      </div>
                    ))}
                    {crop && (finalNetKg > 0 || grossNum > 0) && (
                      <div style={{
                        borderTop: "1px solid #1A2940", paddingTop: "8px", marginTop: "2px",
                        display: "flex", justifyContent: "space-between",
                      }}>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#4A6A8A" }}>Est. Bushels</span>
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", color: "#C8A84B", fontWeight: 700 }}>
                          {kgToBu(finalNetKg || grossNum, crop).toLocaleString()} bu
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <div className="field-label">Notes</div>
                <textarea
                  className="field-input"
                  placeholder="Optional notes…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{ resize: "none", lineHeight: "1.5" }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.25)",
                  borderRadius: "10px", padding: "12px 14px",
                  fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F08080",
                }}>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "Record Load"}
              </button>

              {/* Recent loads */}
              {recentLoads.length > 0 && (
                <div>
                  <div style={{
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                    fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase",
                    color: "#2A3F5A", marginBottom: "10px",
                  }}>
                    Recent Loads
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {recentLoads.map((load) => (
                      <div key={load.id} className="recent-row">
                        <div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F0F4F8", fontWeight: 600 }}>
                            {load.crop || "Unknown"} {load.ticket_number ? `· #${load.ticket_number}` : ""}
                          </div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#4A6A8A", marginTop: "2px" }}>
                            {load.date?.split("T")[0]} · {load.driver_name || "No driver"} · {load.truck_name || "No truck"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#C8A84B", fontWeight: 700 }}>
                            {load.net_weight_kg ? displayWeight(load.net_weight_kg) : "—"}
                          </div>
                          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A" }}>
                            {load.from || "—"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </>
  );
}