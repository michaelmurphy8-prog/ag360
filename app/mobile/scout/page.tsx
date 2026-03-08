"use client";
// app/mobile/scout/page.tsx
// Scout report — photo + field + crop + issue + severity + GPS + notes

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CANONICAL_CROPS } from "@/lib/crop-colors";

interface Field { id: string; field_name: string; acres?: number; }

type Step = "form" | "success";

const ISSUE_TYPES = ["Pest", "Disease", "Weed", "Nutrient Deficiency", "Weather Damage", "Soil Issue", "Other"];
const SEVERITY_LEVELS = ["Low", "Medium", "High"] as const;
type Severity = typeof SEVERITY_LEVELS[number];

const SEVERITY_COLORS: Record<Severity, string> = {
  Low: "#4A9E6B",
  Medium: "#E8A838",
  High: "#E85454",
};

export default function MobileScout() {
  const router = useRouter();

  // Data
  const [fields, setFields] = useState<Field[]>([]);
  const [seedingMap, setSeedingMap] = useState<Record<string, string>>({});

  // Form state
  const [fieldId, setFieldId]       = useState("");
  const [fieldName, setFieldName]   = useState("");
  const [crop, setCrop]             = useState("");
  const [issueType, setIssueType]   = useState("");
  const [severity, setSeverity]     = useState<Severity>("Low");
  const [title, setTitle]           = useState("");
  const [notes, setNotes]           = useState("");
  const [photoUrl, setPhotoUrl]     = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lat, setLat]               = useState<number | null>(null);
  const [lng, setLng]               = useState<number | null>(null);

  // Field search
  const [fieldSearch, setFieldSearch] = useState("");
  const [fieldDropdownOpen, setFieldDropdownOpen] = useState(false);

  // UI state
  const [step, setStep]             = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError]           = useState("");
  const [gpsStatus, setGpsStatus]   = useState<"idle" | "fetching" | "ok" | "error">("idle");

  // Lily analysis state
  const [analyzing, setAnalyzing]   = useState(false);
  const [analysis, setAnalysis]     = useState<any>(null);
  const [analyzeError, setAnalyzeError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldSearchRef = useRef<HTMLInputElement>(null);

  // Fetch fields + seeding log
  useEffect(() => {
    Promise.all([
      fetch("/api/fields").then(r => r.json()),
      fetch("/api/agronomy/seeding").then(r => r.json()),
    ]).then(([f, s]) => {
      const fieldList: Field[] = f.fields || [];
      setFields(fieldList);
      // Build field_name → crop map (most recent seeding per field)
      const map: Record<string, string> = {};
      const records = s.records || [];
      for (const rec of records) {
        if (rec.field_name && rec.crop && !map[rec.field_name]) {
          map[rec.field_name] = rec.crop;
        }
      }
      setSeedingMap(map);
    }).catch(console.error);

    // Auto-grab GPS on load
    grabGPS();
  }, []);

  function grabGPS() {
    if (!navigator.geolocation) return;
    setGpsStatus("fetching");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsStatus("ok");
      },
      () => setGpsStatus("error"),
      { timeout: 8000, maximumAge: 60000 }
    );
  }

  function selectField(f: Field) {
    setFieldId(f.id);
    setFieldName(f.field_name);
    setFieldSearch(f.field_name);
    setFieldDropdownOpen(false);
    // Auto-fill crop from seeding log
    if (seedingMap[f.field_name]) setCrop(seedingMap[f.field_name]);
  }

  async function handlePhoto(file: File) {
    setUploadingPhoto(true);
    try {
      setPhotoPreview(URL.createObjectURL(file));
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/mobile/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type, filename: "scout" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.url);
    } catch (e: any) {
      setPhotoPreview(null);
      setError("Photo upload failed — you can still submit without a photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function analyzeWithLily() {
    if (!photoUrl) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setAnalysis(null);
    try {
      // Re-fetch the uploaded image as base64 for analysis
      const imgRes = await fetch(photoUrl);
      const blob = await imgRes.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const res = await fetch("/api/mobile/scout-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          mediaType: blob.type || "image/jpeg",
          fieldName, crop, issueType, severity, notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setAnalysis(data.analysis);
      // Auto-fill issue type and severity from Lily if not already set
      if (!issueType && data.analysis.identified_issue) {
        const issue = data.analysis.identified_issue.toLowerCase();
        if (issue.includes("weed")) setIssueType("Weed");
        else if (issue.includes("pest") || issue.includes("insect") || issue.includes("aphid") || issue.includes("flea")) setIssueType("Pest");
        else if (issue.includes("disease") || issue.includes("rot") || issue.includes("blight") || issue.includes("rust")) setIssueType("Disease");
        else if (issue.includes("nutrient") || issue.includes("deficien")) setIssueType("Nutrient Deficiency");
      }
      if (data.analysis.severity_assessment) {
        const sev = data.analysis.severity_assessment.toLowerCase();
        if (sev.startsWith("high")) setSeverity("High");
        else if (sev.startsWith("medium")) setSeverity("Medium");
      }
      // Auto-fill title if empty
      if (!title && data.analysis.identified_issue) {
        setTitle(data.analysis.identified_issue);
      }
    } catch (e: any) {
      setAnalyzeError("Lily couldn't analyze this photo. Try again or fill in manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit() {
    if (!title) { setError("Please add a title describing the issue."); return; }
    if (!lat || !lng) { setError("GPS location is required. Tap the GPS button to retry."); return; }
    setSubmitting(true);
    setError("");
    try {
      // Auto-build title if empty
      const autoTitle = title || `${issueType || "Issue"} — ${fieldName || "Unknown Field"}`;

      const res = await fetch("/api/maps/scout-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_id: fieldId || null,
          field_name: fieldName || null,
          latitude: lat,
          longitude: lng,
          report_type: issueType?.toLowerCase().replace(" ", "_") || "general",
          severity: severity.toLowerCase(),
          title: autoTitle,
          notes: notes || null,
          photo_url: photoUrl || null,
          crop_year: new Date().getFullYear(),
          scouted_at: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save scout report");

      // High severity email notification
      if (severity === "High") {
        fetch("/api/mobile/scout-alert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fieldName: fieldName || "Unknown Field",
            issueType,
            title: autoTitle,
            notes,
            lat,
            lng,
          }),
        }).catch(() => {}); // fire and forget — don't block submit
      }

      setStep("success");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredFields = fields.filter(f =>
    f.field_name.toLowerCase().includes(fieldSearch.toLowerCase())
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #070D18; }
        .field-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          font-weight: 600;
          color: #4A6A8A;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
        }
        .field-input {
          background: #0D1726;
          border: 1px solid #1A2940;
          border-radius: 10px;
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
        select.field-input {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A6A8A' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }
        .submit-btn {
          background: linear-gradient(135deg, #C8A84B, #E8C97A);
          border: none; border-radius: 14px;
          color: #070D18; font-family: 'DM Sans', sans-serif;
          font-size: 16px; font-weight: 700; padding: 16px;
          width: 100%; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.2s;
        }
        .submit-btn:active { opacity: 0.85; }
        .submit-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.35s ease forwards; }
        .field-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; right: 0;
          background: #0D1726; border: 1px solid #1A2940;
          border-radius: 10px; z-index: 50;
          max-height: 220px; overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        }
        .field-option {
          padding: 11px 14px; cursor: pointer;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #F0F4F8;
          border-bottom: 1px solid #1A2940;
          transition: background 0.15s;
        }
        .field-option:last-child { border-bottom: none; }
        .field-option:hover, .field-option:active { background: rgba(200,168,75,0.08); }
      `}</style>

      <div style={{
        background: "#070D18", minHeight: "100svh",
        display: "flex", flexDirection: "column",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 16px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid #0D1726", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => router.back()} style={{
              background: "none", border: "none", cursor: "pointer", padding: "4px",
              color: "#4A6A8A", display: "flex", alignItems: "center",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "22px", color: "#F0F4F8", letterSpacing: "0.04em", lineHeight: 1 }}>
                Scout Report
              </div>
              <div style={{ fontSize: "12px", color: "#4A6A8A", marginTop: "2px" }}>Log a field observation</div>
            </div>
          </div>

          {/* GPS indicator */}
          <button onClick={grabGPS} style={{
            background: gpsStatus === "ok" ? "rgba(74,158,107,0.12)" : gpsStatus === "error" ? "rgba(232,84,84,0.1)" : "rgba(74,106,138,0.12)",
            border: `1px solid ${gpsStatus === "ok" ? "rgba(74,158,107,0.3)" : gpsStatus === "error" ? "rgba(232,84,84,0.25)" : "rgba(74,106,138,0.25)"}`,
            borderRadius: "8px", padding: "6px 10px",
            display: "flex", alignItems: "center", gap: "5px",
            cursor: "pointer",
          }}>
            {gpsStatus === "fetching" ? (
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", border: "2px solid rgba(200,168,75,0.3)", borderTopColor: "#C8A84B", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke={gpsStatus === "ok" ? "#4A9E6B" : gpsStatus === "error" ? "#E85454" : "#4A6A8A"}
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
              </svg>
            )}
            <span style={{ fontSize: "11px", fontWeight: 600, color: gpsStatus === "ok" ? "#4A9E6B" : gpsStatus === "error" ? "#E85454" : "#4A6A8A" }}>
              {gpsStatus === "ok" ? "GPS ✓" : gpsStatus === "error" ? "No GPS" : gpsStatus === "fetching" ? "..." : "GPS"}
            </span>
          </button>
        </div>

        {/* Success screen */}
        {step === "success" && (
          <div className="fade-up" style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "32px 24px", gap: "20px",
          }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: "rgba(74,158,107,0.15)", border: "2px solid #4A9E6B",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#4A9E6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "22px", color: "#F0F4F8", marginBottom: "6px" }}>
                Scout Logged
              </div>
              <div style={{ fontSize: "14px", color: "#4A6A8A" }}>
                {fieldName || "Field"} · {issueType || "Observation"}
              </div>
              {severity === "High" && (
                <div style={{
                  marginTop: "12px", background: "rgba(232,84,84,0.1)",
                  border: "1px solid rgba(232,84,84,0.25)", borderRadius: "8px",
                  padding: "8px 14px", fontSize: "13px", color: "#E85454",
                }}>
                  ⚠ High severity alert sent
                </div>
              )}
            </div>

            {photoPreview && (
              <img src={photoPreview} alt="Scout" style={{
                width: "100%", maxWidth: "280px", borderRadius: "12px",
                objectFit: "cover", aspectRatio: "4/3",
                border: "1px solid #1A2940",
              }} />
            )}

            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button onClick={() => {
                setStep("form");
                setTitle(""); setNotes(""); setPhotoUrl(""); setPhotoPreview(null);
                setIssueType(""); setSeverity("Low"); setError("");
              }} style={{
                flex: 1, background: "#0D1726", border: "1px solid #1A2940",
                borderRadius: "12px", color: "#F0F4F8",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                fontSize: "15px", padding: "14px", cursor: "pointer",
              }}>
                New Scout
              </button>
              <button onClick={() => router.push("/mobile/grain360")} style={{
                flex: 1, background: "linear-gradient(135deg, #C8A84B, #E8C97A)",
                border: "none", borderRadius: "12px", color: "#070D18",
                fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                fontSize: "15px", padding: "14px", cursor: "pointer",
              }}>
                Done
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {step === "form" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", WebkitOverflowScrolling: "touch" as any }}>
            <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "24px" }}>

              {/* Photo capture */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: "none" }}
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handlePhoto(file);
                  e.target.value = "";
                }}
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={{
                  background: photoPreview ? "transparent" : "rgba(74,106,138,0.08)",
                  border: photoPreview ? "none" : "1px dashed #1A2940",
                  borderRadius: "14px", overflow: "hidden",
                  cursor: uploadingPhoto ? "wait" : "pointer",
                  width: "100%", padding: photoPreview ? "0" : "24px 0",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: "8px",
                  WebkitTapHighlightColor: "transparent",
                  position: "relative", minHeight: "140px",
                }}
              >
                {uploadingPhoto ? (
                  <>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(200,168,75,0.3)", borderTopColor: "#C8A84B", animation: "spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "13px", color: "#4A6A8A" }}>Uploading…</span>
                  </>
                ) : photoPreview ? (
                  <>
                    <img src={photoPreview} alt="Scout" style={{ width: "100%", height: "200px", objectFit: "cover", borderRadius: "14px" }} />
                    <div style={{
                      position: "absolute", bottom: "10px", right: "10px",
                      background: "rgba(7,13,24,0.75)", borderRadius: "8px",
                      padding: "5px 10px", fontSize: "12px", color: "#C8A84B", fontWeight: 600,
                    }}>
                      Tap to retake
                    </div>
                  </>
                ) : (
                  <>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A6A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                    <span style={{ fontSize: "14px", color: "#4A6A8A", fontWeight: 500 }}>Take Photo</span>
                    <span style={{ fontSize: "12px", color: "#2A3F5A" }}>Optional but recommended</span>
                  </>
                )}
              </button>

              {/* Lily Analysis button — shows once photo is uploaded */}
              {photoUrl && !uploadingPhoto && (
                <button
                  onClick={analyzeWithLily}
                  disabled={analyzing}
                  style={{
                    background: analyzing ? "rgba(139,91,165,0.08)" : "rgba(139,91,165,0.12)",
                    border: `1px solid ${analyzing ? "rgba(139,91,165,0.2)" : "rgba(139,91,165,0.4)"}`,
                    borderRadius: "12px", padding: "13px 16px",
                    display: "flex", alignItems: "center", gap: "10px",
                    cursor: analyzing ? "wait" : "pointer",
                    width: "100%", transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {analyzing ? (
                    <>
                      <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid rgba(139,91,165,0.3)", borderTopColor: "#8B5BA5", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "14px", color: "#8B5BA5" }}>
                        Lily is analyzing…
                      </span>
                    </>
                  ) : (
                    <>
                      {/* Lily spark icon */}
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5BA5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                      </svg>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "14px", color: "#8B5BA5", lineHeight: 1 }}>
                          Ask Lily to Analyze
                        </div>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#4A6A8A", marginTop: "2px" }}>
                          AI identifies issue, fills form fields
                        </div>
                      </div>
                    </>
                  )}
                </button>
              )}

              {/* Lily analysis result */}
              {analysis && (
                <div style={{
                  background: "rgba(139,91,165,0.06)", border: "1px solid rgba(139,91,165,0.25)",
                  borderRadius: "14px", padding: "16px",
                  display: "flex", flexDirection: "column", gap: "12px",
                }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: "15px", color: "#C8A84B" }}>
                        {analysis.identified_issue}
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginTop: "5px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", fontWeight: 600, color: "#8B5BA5", background: "rgba(139,91,165,0.15)", padding: "2px 7px", borderRadius: "4px" }}>
                          LILY
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 600,
                          color: analysis.confidence === "High" ? "#4A9E6B" : analysis.confidence === "Medium" ? "#E8A838" : "#E85454",
                          background: analysis.confidence === "High" ? "rgba(74,158,107,0.12)" : analysis.confidence === "Medium" ? "rgba(232,168,56,0.12)" : "rgba(232,84,84,0.12)",
                          padding: "2px 7px", borderRadius: "4px",
                        }}>
                          {analysis.confidence} confidence
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setAnalysis(null)} style={{ background: "none", border: "none", color: "#4A6A8A", cursor: "pointer", padding: "2px", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>

                  {/* Summary */}
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#B0C4D8", lineHeight: 1.55 }}>
                    {analysis.summary}
                  </div>

                  {/* Immediate actions */}
                  {analysis.immediate_actions?.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#4A6A8A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
                        Immediate Actions
                      </div>
                      {analysis.immediate_actions.map((a: string, i: number) => (
                        <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "5px" }}>
                          <span style={{ color: "#C8A84B", fontSize: "13px", flexShrink: 0 }}>→</span>
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F0F4F8" }}>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Spray window */}
                  {analysis.spray_window && (
                    <div style={{ background: "rgba(200,168,75,0.08)", border: "1px solid rgba(200,168,75,0.2)", borderRadius: "8px", padding: "9px 12px" }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 600, color: "#C8A84B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "3px" }}>Spray Window</div>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "#F0F4F8" }}>{analysis.spray_window}</div>
                    </div>
                  )}

                  {/* Disclaimer */}
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", color: "#2A3F5A", fontStyle: "italic" }}>
                    {analysis.disclaimer}
                  </div>
                </div>
              )}

              {analyzeError && (
                <div style={{ background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.2)", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#F08080" }}>
                  {analyzeError}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <div className="field-label">Field</div>
                <div style={{ position: "relative" }}>
                  <input
                    ref={fieldSearchRef}
                    className="field-input"
                    type="text"
                    placeholder="Search fields…"
                    value={fieldSearch}
                    onChange={e => {
                      setFieldSearch(e.target.value);
                      setFieldDropdownOpen(true);
                      if (!e.target.value) { setFieldId(""); setFieldName(""); setCrop(""); }
                    }}
                    onFocus={() => setFieldDropdownOpen(true)}
                    style={{ paddingLeft: "38px" }}
                  />
                  {/* Search icon */}
                  <svg style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A6A8A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>

                {fieldDropdownOpen && filteredFields.length > 0 && (
                  <div className="field-dropdown">
                    {filteredFields.map(f => (
                      <div key={f.id} className="field-option" onPointerDown={() => selectField(f)}>
                        <div style={{ fontWeight: 500 }}>{f.field_name}</div>
                        {seedingMap[f.field_name] && (
                          <div style={{ fontSize: "12px", color: "#4A6A8A", marginTop: "2px" }}>{seedingMap[f.field_name]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Crop */}
              <div>
                <div className="field-label">Crop</div>
                <select className="field-input" value={crop} onChange={e => setCrop(e.target.value)}>
                  <option value="">Select crop…</option>
                  {CANONICAL_CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Issue type */}
              <div>
                <div className="field-label">Issue Type</div>
                <select className="field-input" value={issueType} onChange={e => setIssueType(e.target.value)}>
                  <option value="">Select type…</option>
                  {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Severity */}
              <div>
                <div className="field-label">Severity</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {SEVERITY_LEVELS.map(s => (
                    <button
                      key={s}
                      onClick={() => setSeverity(s)}
                      style={{
                        background: severity === s ? `${SEVERITY_COLORS[s]}20` : "#0D1726",
                        border: `1px solid ${severity === s ? SEVERITY_COLORS[s] : "#1A2940"}`,
                        borderRadius: "10px", padding: "12px 8px",
                        color: severity === s ? SEVERITY_COLORS[s] : "#4A6A8A",
                        fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: "14px",
                        cursor: "pointer", transition: "all 0.15s",
                        WebkitTapHighlightColor: "transparent",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="field-label">Title *</div>
                <input
                  className="field-input"
                  type="text"
                  placeholder={`e.g. ${issueType || "Sclerotinia"} in ${fieldName || "North Field"}`}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div>
                <div className="field-label">Notes</div>
                <textarea
                  className="field-input"
                  placeholder="Describe what you observed — extent, affected area, estimated % coverage…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  style={{ resize: "none", lineHeight: 1.5 }}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: "rgba(220,60,60,0.08)", border: "1px solid rgba(220,60,60,0.2)",
                  borderRadius: "10px", padding: "10px 14px",
                  fontSize: "13px", color: "#F08080",
                }}>
                  {error}
                </div>
              )}

              {/* High severity warning */}
              {severity === "High" && (
                <div style={{
                  background: "rgba(232,84,84,0.08)", border: "1px solid rgba(232,84,84,0.2)",
                  borderRadius: "10px", padding: "10px 14px",
                  fontSize: "13px", color: "#E85454",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span>⚠</span>
                  <span>High severity — an alert will be sent to the farm owner.</span>
                </div>
              )}

              {/* Submit */}
              <button className="submit-btn" onClick={handleSubmit} disabled={submitting || uploadingPhoto}>
                {submitting ? "Saving Scout…" : "Submit Scout Report"}
              </button>

            </div>
          </div>
        )}
      </div>
    </>
  );
}