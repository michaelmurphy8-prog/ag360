import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { email, userId } = await req.json()
    if (!email && !userId) return NextResponse.json({ error: 'No identity' }, { status: 400 })
    const res = NextResponse.json({ ok: true, userId, email })
    const opts = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, maxAge: 60 * 60 * 24 * 30, path: '/' }
    if (userId) res.cookies.set('c360_uid', userId, opts)
    if (email) res.cookies.set('c360_email', email, opts)
    return res
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const uid = req.cookies.get('c360_uid')?.value ?? null
  const email = req.cookies.get('c360_email')?.value ?? null
  return NextResponse.json({ userId: uid, email })
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('c360_uid')
  res.cookies.delete('c360_email')
  return res
}
