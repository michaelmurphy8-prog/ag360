"use client";
import { MessageSquare } from "lucide-react";
import { useState } from "react";

export default function FeedbackPage() {
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await fetch("mailto:hello@ag360.farm");
      // In future: POST to /api/feedback
    } finally {
      setSubmitted(true);
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
          <MessageSquare size={20} style={{ color: "var(--ag-accent)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--ag-text-primary)" }}>Feedback</h1>
          <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Help us build a better platform for farmers</p>
        </div>
      </div>

      {submitted ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
          <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "var(--ag-accent-bg)" }}>
            <MessageSquare size={24} style={{ color: "var(--ag-accent)" }} />
          </div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--ag-text-primary)" }}>Thanks for the feedback</h2>
          <p className="text-sm" style={{ color: "var(--ag-text-muted)" }}>Mike reads every submission personally.</p>
          <button onClick={() => { setSubmitted(false); setMessage(""); }}
            className="mt-6 text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ backgroundColor: "var(--ag-accent-bg)", color: "var(--ag-accent)" }}>
            Send another
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-6" style={{ backgroundColor: "var(--ag-bg-card)", border: "1px solid var(--ag-border)" }}>
          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--ag-text-muted)" }}>Category</label>
            <div className="flex gap-2 flex-wrap">
              {["general", "bug", "feature", "data"].map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors capitalize"
                  style={{
                    backgroundColor: category === c ? "var(--ag-accent)" : "transparent",
                    color: category === c ? "var(--ag-bg-base)" : "var(--ag-text-muted)",
                    borderColor: category === c ? "var(--ag-accent)" : "var(--ag-border)",
                  }}>
                  {c === "bug" ? "Bug Report" : c === "feature" ? "Feature Request" : c === "data" ? "Data Issue" : "General"}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--ag-text-muted)" }}>Message</label>
            <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind..."
              className="w-full rounded-lg px-4 py-3 text-sm resize-none outline-none transition-colors"
              style={{
                backgroundColor: "var(--ag-bg-hover)",
                border: "1px solid var(--ag-border)",
                color: "var(--ag-text-primary)",
              }} />
          </div>

          <button onClick={handleSubmit} disabled={!message.trim() || loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-opacity"
            style={{
              backgroundColor: "var(--ag-accent)",
              color: "var(--ag-bg-base)",
              opacity: !message.trim() || loading ? 0.5 : 1,
            }}>
            {loading ? "Sending..." : "Send Feedback"}
          </button>

          <p className="text-xs text-center mt-3" style={{ color: "var(--ag-text-muted)" }}>
            Or email directly: <a href="mailto:hello@ag360.farm" style={{ color: "var(--ag-accent)" }}>hello@ag360.farm</a>
          </p>
        </div>
      )}
    </div>
  );
}