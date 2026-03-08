// app/api/mobile/upload-photo/route.ts
// Uploads a base64 image to Vercel Blob, returns the public URL

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getTenantAuth } from "@/lib/tenant-auth";

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });
  const { tenantId } = tenantAuth;

  try {
    const body = await req.json();
    const { imageBase64, mediaType, filename } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "imageBase64 and mediaType required" }, { status: 400 });
    }

    const buffer = Buffer.from(imageBase64, "base64");
    const ext = mediaType.split("/")[1] || "jpg";
    const blobName = `scout/${tenantId}/${Date.now()}-${filename || "photo"}.${ext}`;

    const blob = await put(blobName, buffer, {
      access: "public",
      contentType: mediaType,
    });

    return NextResponse.json({ success: true, url: blob.url });
  } catch (e: any) {
    console.error("Photo upload error:", e);
    return NextResponse.json({ error: "Photo upload failed" }, { status: 500 });
  }
}