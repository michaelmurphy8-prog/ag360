import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { neon } from '@neondatabase/serverless'
import Anthropic from '@anthropic-ai/sdk'
import { SCOUT_ANALYSIS_PROMPT } from '@/lib/scout-analysis-prompt'

const sql = neon(process.env.DATABASE_URL!)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { photoId } = await req.json()
  if (!photoId) return NextResponse.json({ error: 'photoId is required' }, { status: 400 })

  // Get photo + parent scout entry
  const photos = await sql`
    SELECT sp.*, se.field_name, se.crop, se.growth_stage, se.issue_type, se.severity, se.symptoms
    FROM scout_photos sp
    JOIN scout_entries se ON sp.scout_entry_id = se.id
    WHERE sp.id = ${photoId} AND sp.clerk_user_id = ${userId}
  `
  if (photos.length === 0) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

  const photo = photos[0]

  // Fetch image from Vercel Blob and convert to base64
  const imageResponse = await fetch(photo.image_url)
  if (!imageResponse.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })

  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')

  // Build context from scout entry
  const entryContext = [
    photo.field_name && `Field: ${photo.field_name}`,
    photo.crop && `Crop: ${photo.crop}`,
    photo.growth_stage && `Growth Stage: ${photo.growth_stage}`,
    photo.issue_type && `Issue Type: ${photo.issue_type}`,
    photo.severity && `Severity: ${photo.severity}`,
    photo.symptoms?.length && `Symptoms Observed: ${photo.symptoms.join(', ')}`,
  ].filter(Boolean).join('\n')

  const userMessage = entryContext
    ? `Scout entry context:\n${entryContext}\n\nAnalyze this field photo.`
    : 'Analyze this field photo.'

  // Send to Claude vision
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: SCOUT_ANALYSIS_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: photo.mime_type || 'image/jpeg',
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      },
    ],
  })

  // Parse the JSON response
  const rawText = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  let analysis
  try {
    // Strip any accidental markdown wrapping
    const cleaned = rawText.replace(/```json\s?/g, '').replace(/```/g, '').trim()
    analysis = JSON.parse(cleaned)
  } catch {
    console.error('Failed to parse analysis JSON:', rawText)
    analysis = {
      summary: rawText,
      detections: [],
      recommended_actions: ['Analysis returned in unexpected format. Please try again.'],
      what_to_check_next: [],
      references: [],
    }
  }

  // Save analysis to database
  await sql`
    UPDATE scout_photos
    SET analysis = ${JSON.stringify(analysis)}::jsonb, analyzed_at = NOW()
    WHERE id = ${photoId} AND clerk_user_id = ${userId}
  `

  return NextResponse.json({ analysis })
}