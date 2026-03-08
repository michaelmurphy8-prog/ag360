import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const { name, email, farmSize, province } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await sql`
      INSERT INTO waitlist (name, email, farm_size, province, created_at)
      VALUES (${name ?? null}, ${email}, ${farmSize ?? null}, ${province ?? null}, NOW())
      ON CONFLICT (email) DO NOTHING
    `;

    if (process.env.RESEND_API_KEY) {
        const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "AG360 Waitlist <hello@ag360.farm>",
        to: process.env.ALERT_EMAIL || "mike@ag360.farm",
        subject: `New Waitlist Signup — ${name ?? email}`,
        html: `<h2>New Signup</h2><p><b>Name:</b> ${name ?? "—"}<br/><b>Email:</b> ${email}<br/><b>Farm Size:</b> ${farmSize ?? "—"}<br/><b>Province:</b> ${province ?? "—"}</p>`,
      });

      await resend.emails.send({
        from: "AG360 <hello@ag360.farm>",
        to: email,
        subject: "You're on the list — AG360",
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;"><h2 style="color:#0F172A;">You're on the AG360 waitlist.</h2><p>Hey ${name ? name.split(" ")[0] : "there"},</p><p>We've got your spot saved. When we open beta access to prairie farmers, you'll be first to know.</p><p>— Mike<br/><span style="color:#64748B;">Founder, AG360 · Murphy Farms, SK</span></p></div>`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}