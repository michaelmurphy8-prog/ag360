// app/api/mobile/scout-alert/route.ts
// Sends email notification when a high-severity scout report is submitted
// Uses Resend — requires RESEND_API_KEY env var

import { NextRequest, NextResponse } from "next/server";
import { getTenantAuth } from "@/lib/tenant-auth";

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });

  // Silently skip if Resend not configured yet
  if (!process.env.RESEND_API_KEY) {
    console.log("Scout alert skipped — RESEND_API_KEY not set");
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    const { fieldName, issueType, title, notes, lat, lng } = await req.json();

    const mapsUrl = lat && lng
      ? `https://maps.google.com/?q=${lat},${lng}`
      : null;

    const html = `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #070D18; padding: 24px; border-radius: 12px 12px 0 0;">
          <div style="color: #C8A84B; font-size: 22px; font-weight: 700; letter-spacing: 0.05em;">AG/360</div>
          <div style="color: #4A6A8A; font-size: 12px; margin-top: 2px;">For the Farmer</div>
        </div>
        <div style="background: #0D1726; padding: 24px; border-radius: 0 0 12px 12px; border: 1px solid #1A2940;">
          <div style="background: rgba(232,84,84,0.1); border: 1px solid rgba(232,84,84,0.3); border-radius: 8px; padding: 10px 14px; color: #E85454; font-weight: 700; font-size: 14px; margin-bottom: 20px;">
            ⚠ HIGH SEVERITY SCOUT REPORT
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="color: #4A6A8A; font-size: 12px; padding: 6px 0; width: 100px;">FIELD</td><td style="color: #F0F4F8; font-size: 14px; padding: 6px 0;">${fieldName || "—"}</td></tr>
            <tr><td style="color: #4A6A8A; font-size: 12px; padding: 6px 0;">ISSUE</td><td style="color: #F0F4F8; font-size: 14px; padding: 6px 0;">${issueType || "—"}</td></tr>
            <tr><td style="color: #4A6A8A; font-size: 12px; padding: 6px 0;">TITLE</td><td style="color: #F0F4F8; font-size: 14px; padding: 6px 0; font-weight: 600;">${title || "—"}</td></tr>
            ${notes ? `<tr><td style="color: #4A6A8A; font-size: 12px; padding: 6px 0; vertical-align: top;">NOTES</td><td style="color: #F0F4F8; font-size: 14px; padding: 6px 0;">${notes}</td></tr>` : ""}
            ${mapsUrl ? `<tr><td style="color: #4A6A8A; font-size: 12px; padding: 6px 0;">LOCATION</td><td style="padding: 6px 0;"><a href="${mapsUrl}" style="color: #C8A84B; font-size: 13px;">View on Map →</a></td></tr>` : ""}
          </table>
          <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #1A2940; color: #2A3F5A; font-size: 11px;">
            Submitted via AG360 Mobile · ${new Date().toLocaleString("en-CA", { timeZone: "America/Regina" })} CST
          </div>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AG360 Alerts <alerts@ag360.farm>",
        to: [process.env.ALERT_EMAIL || "hello@ag360.farm"],
        subject: `⚠ High Severity Scout: ${title || issueType} — ${fieldName}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend error:", err);
      return NextResponse.json({ success: false, error: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Scout alert error:", e);
    return NextResponse.json({ error: "Alert failed" }, { status: 500 });
  }
}