// app/api/settings/team/route.ts
// Team management — owner only

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { clerkClient } from "@clerk/nextjs/server";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

// ── GET — list members + pending invites ─────────────────────
export async function GET() {
  const auth = await getTenantAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  const tenantId = auth.tenantId!;

  const members = await sql`
    SELECT id, clerk_user_id, email, name, role, joined_at
    FROM tenant_members
    WHERE tenant_id = ${tenantId}
    ORDER BY joined_at ASC
  `;

  const invitations = await sql`
    SELECT id, email, role, status, created_at
    FROM tenant_invitations
    WHERE tenant_id = ${tenantId} AND status = 'pending'
    ORDER BY created_at DESC
  `;

  return NextResponse.json({ members, invitations });
}

// ── POST — invite a user ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await getTenantAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  const tenantId = auth.tenantId!;
  const userId   = auth.userId!;

  const { email, role = "employee" } = await req.json();
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!["owner", "employee"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ag360-navy.vercel.app";

  try {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${appUrl}/onboarding`,
      publicMetadata: { tenantId, role },
    });

    await sql`
      INSERT INTO tenant_invitations (tenant_id, email, role, invited_by, clerk_invitation_id, status)
      VALUES (${tenantId}, ${email}, ${role}, ${userId}, ${invitation.id}, 'pending')
      ON CONFLICT (tenant_id, email) DO UPDATE SET
        role = ${role},
        clerk_invitation_id = ${invitation.id},
        status = 'pending',
        created_at = now()
    `;

    return NextResponse.json({ success: true, invitationId: invitation.id });
  } catch (e: any) {
    console.error("Invite error:", e);
    if (e?.errors?.[0]?.code === "duplicate_record") {
      return NextResponse.json({ error: "This email already has a pending invitation or an account." }, { status: 409 });
    }
    return NextResponse.json({ error: e.message || "Failed to send invitation" }, { status: 500 });
  }
}

// ── PATCH — change role ──────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const auth = await getTenantAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  const tenantId      = auth.tenantId!;
  const currentUserId = auth.userId!;

  const { member_id, role } = await req.json();
  if (!member_id || !role) return NextResponse.json({ error: "member_id and role required" }, { status: 400 });
  if (!["owner", "employee"].includes(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });

  const rows = await sql`
    SELECT clerk_user_id FROM tenant_members
    WHERE id = ${member_id} AND tenant_id = ${tenantId}
  `;
  if (rows.length === 0) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const targetClerkId = rows[0].clerk_user_id;

  if (targetClerkId === currentUserId && role !== "owner") {
    return NextResponse.json({ error: "Cannot change your own owner role" }, { status: 400 });
  }

  const clerk = await clerkClient();
  await clerk.users.updateUserMetadata(targetClerkId, {
    publicMetadata: { tenantId, role },
  });

  await sql`
    UPDATE tenant_members SET role = ${role}
    WHERE id = ${member_id} AND tenant_id = ${tenantId}
  `;

  return NextResponse.json({ success: true });
}

// ── DELETE — remove member or revoke invitation ──────────────
export async function DELETE(req: NextRequest) {
  const auth = await getTenantAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.role !== "owner") return NextResponse.json({ error: "Owner access required" }, { status: 403 });
  const tenantId      = auth.tenantId!;
  const currentUserId = auth.userId!;

  const { member_id, invitation_id } = await req.json();

  if (invitation_id) {
    const rows = await sql`
      SELECT clerk_invitation_id FROM tenant_invitations
      WHERE id = ${invitation_id} AND tenant_id = ${tenantId}
    `;
    if (rows.length > 0 && rows[0].clerk_invitation_id) {
      try {
        const clerk = await clerkClient();
        await clerk.invitations.revokeInvitation(rows[0].clerk_invitation_id);
      } catch (e) {
        console.warn("Clerk revoke failed (non-fatal):", e);
      }
    }
    await sql`DELETE FROM tenant_invitations WHERE id = ${invitation_id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ success: true });
  }

  if (member_id) {
    const rows = await sql`
      SELECT clerk_user_id FROM tenant_members
      WHERE id = ${member_id} AND tenant_id = ${tenantId}
    `;
    if (rows.length === 0) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    if (rows[0].clerk_user_id === currentUserId) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
    }

    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(rows[0].clerk_user_id, {
        publicMetadata: { tenantId: null, role: null },
      });
    } catch (e) {
      console.warn("Clerk metadata clear failed (non-fatal):", e);
    }

    await sql`DELETE FROM tenant_members WHERE id = ${member_id} AND tenant_id = ${tenantId}`;
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "member_id or invitation_id required" }, { status: 400 });
}