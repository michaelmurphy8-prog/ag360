// app/api/webhooks/clerk/route.ts
// Clerk webhook — fires when a user is created (accepted an invitation)
// Auto-populates tenant_members from the invitation's publicMetadata

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { Webhook } from "svix";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  // Verify the webhook signature
  const svix_id        = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  const wh   = new Webhook(webhookSecret);

  let event: any;
  try {
    event = wh.verify(body, {
      "svix-id":        svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    });
  } catch (e) {
    console.error("Webhook verification failed:", e);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle user.created — new user signed up via invitation
  if (event.type === "user.created") {
    const { id: clerkUserId, email_addresses, first_name, last_name, public_metadata } = event.data;
    const email    = email_addresses?.[0]?.email_address;
    const name     = [first_name, last_name].filter(Boolean).join(" ") || email;
    const tenantId = public_metadata?.tenantId;
    const role     = public_metadata?.role || "employee";

    if (tenantId) {
      try {
        // Add to tenant_members
        await sql`
          INSERT INTO tenant_members (tenant_id, clerk_user_id, email, name, role)
          VALUES (${tenantId}, ${clerkUserId}, ${email}, ${name}, ${role})
          ON CONFLICT (tenant_id, clerk_user_id) DO UPDATE SET
            email = ${email}, name = ${name}, role = ${role}
        `;

        // Mark invitation as accepted
        await sql`
          UPDATE tenant_invitations SET status = 'accepted'
          WHERE tenant_id = ${tenantId} AND email = ${email}
        `;

        console.log(`User ${email} added to tenant ${tenantId} as ${role}`);
      } catch (e) {
        console.error("Failed to add user to tenant:", e);
      }
    }
  }

  // Handle user.updated — metadata changed (e.g. role update)
  if (event.type === "user.updated") {
    const { id: clerkUserId, public_metadata } = event.data;
    const tenantId = public_metadata?.tenantId;
    const role     = public_metadata?.role;

    if (tenantId && role) {
      await sql`
        UPDATE tenant_members SET role = ${role}
        WHERE clerk_user_id = ${clerkUserId} AND tenant_id = ${tenantId}
      `.catch(e => console.warn("Role sync failed:", e));
    }
  }

  return NextResponse.json({ received: true });
}