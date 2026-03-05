// app/api/waitlist/route.ts
import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, operationType, province } = await req.json();

    if (!firstName || !email || !operationType || !province) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        email TEXT NOT NULL UNIQUE,
        op_type TEXT NOT NULL,
        province TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO waitlist (first_name, last_name, email, op_type, province)
      VALUES (${firstName}, ${lastName}, ${email}, ${operationType}, ${province})
      ON CONFLICT (email) DO NOTHING
    `;

    // Optional — email ping on every signup
if (process.env.RESEND_API_KEY) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AG360 <noreply@ag360.farm>",
      to: "hello@ag360.farm",
      subject: `New waitlist signup — ${firstName} ${lastName} (${province})`,
      text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nOperation: ${operationType}\nProvince: ${province}`,
    }),
  });
}

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}