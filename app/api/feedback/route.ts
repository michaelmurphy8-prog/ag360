import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const { category, message, userEmail, userName } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    await resend.emails.send({
      from: "AG360 Feedback <hello@ag360.farm>",
      to: "michaelmurphy8@yahoo.com",
      replyTo: "hello@ag360.farm",
      subject: `[AG360 Feedback] ${category} — ${new Date().toLocaleDateString("en-CA")}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4ade80;">AG360 Feedback Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #888; width: 120px;">Category</td>
                <td style="padding: 8px 0; font-weight: bold; text-transform: capitalize;">${category}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">From</td>
                <td style="padding: 8px 0;">${userName ?? "Unknown"} — ${userEmail ?? "No email"}</td></tr>
            <tr><td style="padding: 8px 0; color: #888;">Date</td>
                <td style="padding: 8px 0;">${new Date().toLocaleString("en-CA")}</td></tr>
          </table>
          <hr style="margin: 16px 0; border-color: #eee;" />
          <h3 style="color: #333;">Message</h3>
          <p style="background: #f9f9f9; padding: 16px; border-radius: 8px; line-height: 1.6;">${message.replace(/\n/g, "<br/>")}</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Feedback error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}