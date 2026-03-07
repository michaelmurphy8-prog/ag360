import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import { getTenantAuth } from "@/lib/tenant-auth";

const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const certs = await sql`
    SELECT c.*, w.name AS worker_name, w.role AS worker_role
    FROM certifications c
    JOIN workers w ON w.id = c.worker_id
    WHERE c.tenant_id = ${tenantId}
    ORDER BY c.expiry_date ASC NULLS LAST
  `;
  return NextResponse.json({ certifications: certs });
}

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const body = await req.json();
  const { worker_id, cert_type, cert_number, issued_date, expiry_date, notes } = body;

  if (!worker_id || !cert_type) {
    return NextResponse.json({ error: "Worker and certification type are required" }, { status: 400 });
  }

  const [cert] = await sql`
    INSERT INTO certifications (
      tenant_id, worker_id, cert_type, cert_number,
      issued_date, expiry_date, notes
    ) VALUES (
      ${tenantId}, ${worker_id}, ${cert_type}, ${cert_number || null},
      ${issued_date || null}, ${expiry_date || null}, ${notes || null}
    )
    RETURNING *
  `;
  return NextResponse.json({ certification: cert }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const body = await req.json();
  const { id, worker_id, cert_type, cert_number, issued_date, expiry_date, notes } = body;
  if (!id) return NextResponse.json({ error: "Certification ID required" }, { status: 400 });

  const [cert] = await sql`
    UPDATE certifications SET
      worker_id = ${worker_id}, cert_type = ${cert_type},
      cert_number = ${cert_number || null},
      issued_date = ${issued_date || null},
      expiry_date = ${expiry_date || null},
      notes = ${notes || null}
    WHERE id = ${id} AND tenant_id = ${tenantId}
    RETURNING *
  `;
  if (!cert) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ certification: cert });
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Certification ID required" }, { status: 400 });

  await sql`DELETE FROM certifications WHERE id = ${id} AND tenant_id = ${tenantId}`;
  return NextResponse.json({ success: true });
}