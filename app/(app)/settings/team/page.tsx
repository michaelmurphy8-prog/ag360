"use client";
// app/(app)/settings/team/page.tsx
// Owner-only: invite users, assign roles, remove members

import { useState, useEffect } from "react";

interface Member {
  id: string;
  clerk_user_id: string;
  email: string;
  name: string | null;
  role: "owner" | "employee";
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: "owner" | "employee";
  status: string;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner:    "Owner",
  employee: "Employee",
};

const ROLE_COLORS: Record<string, string> = {
  owner:    "rgba(200,168,75,0.15)",
  employee: "rgba(74,158,107,0.12)",
};

const ROLE_TEXT: Record<string, string> = {
  owner:    "#C8A84B",
  employee: "#4A9E6B",
};

export default function TeamPage() {
  const [members, setMembers]       = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole]   = useState<"owner" | "employee">("employee");
  const [inviting, setInviting]       = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError]   = useState("");

  // Role change
  const [changingRole, setChangingRole] = useState<string | null>(null);

  // Confirm remove
  const [confirmRemove, setConfirmRemove] = useState<{ id: string; name: string; type: "member" | "invite" } | null>(null);
  const [removing, setRemoving] = useState(false);

  async function fetchTeam() {
    setLoading(true);
    try {
      const res  = await fetch("/api/settings/team");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to load team"); return; }
      setMembers(data.members || []);
      setInvitations(data.invitations || []);
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchTeam(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim()) { setInviteError("Email is required"); return; }
    setInviting(true); setInviteError(""); setInviteSuccess("");
    try {
      const res  = await fetch("/api/settings/team", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const data = await res.json();
      if (!res.ok) { setInviteError(data.error || "Failed to send invitation"); return; }
      setInviteSuccess(`Invitation sent to ${inviteEmail.trim()}`);
      setInviteEmail("");
      await fetchTeam();
    } catch { setInviteError("Network error"); }
    finally { setInviting(false); }
  }

  async function handleRoleChange(memberId: string, newRole: "owner" | "employee") {
    setChangingRole(memberId);
    try {
      const res = await fetch("/api/settings/team", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, role: newRole }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error || "Failed to update role"); return; }
      await fetchTeam();
    } finally { setChangingRole(null); }
  }

  async function handleRemove() {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      const body = confirmRemove.type === "member"
        ? { member_id: confirmRemove.id }
        : { invitation_id: confirmRemove.id };
      await fetch("/api/settings/team", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setConfirmRemove(null);
      await fetchTeam();
    } finally { setRemoving(false); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px" }}>
      <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "2px solid rgba(200,168,75,0.3)", borderTopColor: "#C8A84B", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={{ padding: "24px", color: "#F08080" }}>{error}</div>
  );

  return (
    <div style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "var(--ag-text-primary)", marginBottom: "6px" }}>Team</h1>
        <p style={{ fontSize: "14px", color: "var(--ag-text-secondary)" }}>
          Invite farmers and employees to your AG360 account. Owners have full access; employees access the mobile app only.
        </p>
      </div>

      {/* ── Invite form ── */}
      <div style={{ background: "var(--ag-surface-2)", border: "1px solid var(--ag-border)", borderRadius: "14px", padding: "20px", marginBottom: "28px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ag-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>
          Invite a User
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input
            type="email"
            placeholder="Email address"
            value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteError(""); setInviteSuccess(""); }}
            onKeyDown={e => e.key === "Enter" && handleInvite()}
            style={{
              flex: "1 1 220px", background: "var(--ag-surface)", border: "1px solid var(--ag-border)",
              borderRadius: "9px", color: "var(--ag-text-primary)", fontSize: "14px",
              padding: "10px 12px", outline: "none",
            }}
          />
          <select
            value={inviteRole}
            onChange={e => setInviteRole(e.target.value as "owner" | "employee")}
            style={{
              background: "var(--ag-surface)", border: "1px solid var(--ag-border)",
              borderRadius: "9px", color: "var(--ag-text-primary)", fontSize: "14px",
              padding: "10px 12px", outline: "none", cursor: "pointer",
            }}
          >
            <option value="employee">Employee</option>
            <option value="owner">Owner</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviting}
            style={{
              background: "linear-gradient(135deg, #C8A84B, #E8C97A)",
              border: "none", borderRadius: "9px", color: "#070D18",
              fontSize: "14px", fontWeight: 700, padding: "10px 18px",
              cursor: "pointer", opacity: inviting ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {inviting ? "Sending…" : "Send Invite"}
          </button>
        </div>

        {inviteError && <div style={{ marginTop: "8px", fontSize: "13px", color: "#F08080" }}>{inviteError}</div>}
        {inviteSuccess && <div style={{ marginTop: "8px", fontSize: "13px", color: "#4A9E6B" }}>✓ {inviteSuccess}</div>}
      </div>

      {/* ── Current members ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ag-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
          Members ({members.length})
        </div>
        <div style={{ background: "var(--ag-surface-2)", border: "1px solid var(--ag-border)", borderRadius: "14px", overflow: "hidden" }}>
          {members.length === 0 ? (
            <div style={{ padding: "20px", fontSize: "14px", color: "var(--ag-text-muted)" }}>No team members yet.</div>
          ) : members.map((m, i) => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
              borderBottom: i < members.length - 1 ? "1px solid var(--ag-border)" : "none",
            }}>
              {/* Avatar */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0,
                background: "var(--ag-surface)", border: "1px solid var(--ag-border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 700, color: "var(--ag-text-secondary)",
              }}>
                {(m.name || m.email).charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ag-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.name || m.email}
                </div>
                {m.name && (
                  <div style={{ fontSize: "12px", color: "var(--ag-text-muted)" }}>{m.email}</div>
                )}
              </div>

              {/* Role selector */}
              <select
                value={m.role}
                onChange={e => handleRoleChange(m.id, e.target.value as "owner" | "employee")}
                disabled={changingRole === m.id}
                style={{
                  background: ROLE_COLORS[m.role], border: `1px solid ${ROLE_TEXT[m.role]}40`,
                  borderRadius: "7px", color: ROLE_TEXT[m.role],
                  fontSize: "12px", fontWeight: 600, padding: "5px 10px",
                  cursor: "pointer", outline: "none",
                }}
              >
                <option value="employee">Employee</option>
                <option value="owner">Owner</option>
              </select>

              {/* Remove */}
              <button
                onClick={() => setConfirmRemove({ id: m.id, name: m.name || m.email, type: "member" })}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ag-text-muted)", padding: "4px", display: "flex", alignItems: "center" }}
                title="Remove member"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Pending invitations ── */}
      {invitations.length > 0 && (
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--ag-text-secondary)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "12px" }}>
            Pending Invitations ({invitations.length})
          </div>
          <div style={{ background: "var(--ag-surface-2)", border: "1px solid var(--ag-border)", borderRadius: "14px", overflow: "hidden" }}>
            {invitations.map((inv, i) => (
              <div key={inv.id} style={{
                display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px",
                borderBottom: i < invitations.length - 1 ? "1px solid var(--ag-border)" : "none",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", color: "var(--ag-text-primary)" }}>{inv.email}</div>
                  <div style={{ fontSize: "12px", color: "var(--ag-text-muted)", marginTop: "2px" }}>
                    Invited {new Date(inv.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <div style={{
                  background: ROLE_COLORS[inv.role], borderRadius: "7px", padding: "4px 10px",
                  fontSize: "12px", fontWeight: 600, color: ROLE_TEXT[inv.role],
                }}>
                  {ROLE_LABELS[inv.role]}
                </div>
                <div style={{ background: "rgba(232,168,56,0.1)", borderRadius: "7px", padding: "4px 10px", fontSize: "12px", fontWeight: 600, color: "#E8A838" }}>
                  Pending
                </div>
                <button
                  onClick={() => setConfirmRemove({ id: inv.id, name: inv.email, type: "invite" })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ag-text-muted)", padding: "4px", display: "flex" }}
                  title="Revoke invitation"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Remove confirm modal ── */}
      {confirmRemove && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "16px" }}>
          <div style={{ background: "var(--ag-surface-2)", border: "1px solid var(--ag-border)", borderRadius: "16px", padding: "24px", maxWidth: "380px", width: "100%" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ag-text-primary)", marginBottom: "10px" }}>
              {confirmRemove.type === "member" ? "Remove Member" : "Revoke Invitation"}
            </div>
            <p style={{ fontSize: "14px", color: "var(--ag-text-secondary)", marginBottom: "20px", lineHeight: 1.5 }}>
              {confirmRemove.type === "member"
                ? `Remove ${confirmRemove.name} from your team? They will lose access to AG360 immediately.`
                : `Revoke the invitation sent to ${confirmRemove.name}?`}
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button onClick={() => setConfirmRemove(null)} style={{ background: "var(--ag-surface)", border: "1px solid var(--ag-border)", borderRadius: "9px", color: "var(--ag-text-secondary)", fontSize: "14px", padding: "9px 16px", cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleRemove} disabled={removing} style={{ background: "rgba(232,84,84,0.12)", border: "1px solid rgba(232,84,84,0.3)", borderRadius: "9px", color: "#E85454", fontSize: "14px", fontWeight: 600, padding: "9px 16px", cursor: "pointer", opacity: removing ? 0.6 : 1 }}>
                {removing ? "Removing…" : confirmRemove.type === "member" ? "Remove" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}