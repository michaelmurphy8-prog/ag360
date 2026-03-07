import { auth } from "@clerk/nextjs/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export type TenantAuthResult =
  | { tenantId: string; userId: string; role: string; error?: never }
  | { error: string; status: number; tenantId?: never; userId?: never; role?: never };

export async function getTenantAuth(): Promise<TenantAuthResult> {
  const { userId, sessionClaims } = await auth();
  if (!userId) return { error: "Unauthorized", status: 401 };

  const metaTenantId = (sessionClaims?.publicMetadata as any)?.tenantId;
  const metaRole = (sessionClaims?.publicMetadata as any)?.role ?? "owner";

  if (metaTenantId) {
    return { tenantId: metaTenantId, userId, role: metaRole };
  }

  // Owner fallback — look up by Clerk userId
  const rows = await sql`
    SELECT id FROM tenants WHERE owner_clerk_id = ${userId} LIMIT 1
  `;

  if (rows.length === 0) return { error: "Tenant not found", status: 403 };

  return { tenantId: rows[0].id, userId, role: "owner" };
}