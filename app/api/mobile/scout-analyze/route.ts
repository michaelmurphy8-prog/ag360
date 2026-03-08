// app/api/mobile/scout-analyze/route.ts
// Lily analyzes a scout photo directly from mobile — no scout_photos table required
// Takes base64 image + field context, returns structured analysis

import { NextRequest, NextResponse } from "next/server";
import { getTenantAuth } from "@/lib/tenant-auth";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MOBILE_SCOUT_PROMPT = `You are Lily, AG360's expert agronomic advisor for Canadian prairie farming. 
You are analyzing a field photo submitted via mobile scout report.

Your job is to identify any crop issues visible in the photo and provide practical, actionable advice.

Respond ONLY with valid JSON in this exact format, no markdown, no backticks:
{
  "identified_issue": "Brief name of what you see (e.g. 'Sclerotinia stem rot', 'Wild oat pressure', 'Nitrogen deficiency')",
  "confidence": "High | Medium | Low",
  "summary": "2-3 sentence plain-English description of what you see and why it matters",
  "severity_assessment": "What severity level you'd assign: low, medium, or high — and why in one sentence",
  "immediate_actions": ["Action 1", "Action 2", "Action 3"],
  "what_to_monitor": ["Thing to watch 1", "Thing to watch 2"],
  "spray_window": "Guidance on timing if chemical intervention may be needed, or null if not applicable",
  "estimated_yield_impact": "Brief estimate of potential yield impact if left untreated, or null if unclear",
  "disclaimer": "Always include: 'Field scouting and agronomist confirmation recommended before making spray decisions.'"
}

Focus on what is clearly visible. If the photo is unclear or you cannot identify a specific issue, say so honestly in the summary and keep confidence as Low. Never fabricate a diagnosis.`;

export async function POST(req: NextRequest) {
  const tenantAuth = await getTenantAuth();
  if (tenantAuth.error) return NextResponse.json({ error: tenantAuth.error }, { status: tenantAuth.status });

  try {
    const body = await req.json();
    const { imageBase64, mediaType, fieldName, crop, issueType, severity, notes } = body;

    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "imageBase64 and mediaType required" }, { status: 400 });
    }

    // Build context from form fields
    const contextParts = [
      fieldName && `Field: ${fieldName}`,
      crop      && `Crop: ${crop}`,
      issueType && `Suspected issue type: ${issueType}`,
      severity  && `Reported severity: ${severity}`,
      notes     && `Scout notes: ${notes}`,
    ].filter(Boolean).join("\n");

    const userMessage = contextParts
      ? `Scout context:\n${contextParts}\n\nAnalyze this field photo and provide your assessment.`
      : "Analyze this field photo and identify any crop issues visible.";

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: MOBILE_SCOUT_PROMPT,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: imageBase64,
            },
          },
          { type: "text", text: userMessage },
        ],
      }],
    });

    const raw = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("");

    let analysis;
    try {
      analysis = JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      analysis = {
        identified_issue: "Analysis incomplete",
        confidence: "Low",
        summary: raw,
        severity_assessment: null,
        immediate_actions: ["Please retake the photo with better lighting and resubmit."],
        what_to_monitor: [],
        spray_window: null,
        estimated_yield_impact: null,
        disclaimer: "Field scouting and agronomist confirmation recommended before making spray decisions.",
      };
    }

    return NextResponse.json({ success: true, analysis });
  } catch (e: any) {
    console.error("Mobile scout analyze error:", e);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}