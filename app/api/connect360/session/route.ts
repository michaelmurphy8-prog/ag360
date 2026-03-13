import { NextRequest, NextResponse } from 'next/server'
import { connect360Clerk } from '@/lib/connect360-auth'

export async function POST(req: NextRequest) {
  try {
    const { token, email, userId: clientUserId } = await req.json()
    if (!token) return NextResponse.json({ error: 'No token' }, { status: 400 })
    const payload = await connect360Clerk.verifyToken(token)
    const userId = payload.sub ?? clientUserId
    const res = NextResponse.json({ ok: true, userId, email })
    res.cookies.set('c360_uid', userId, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    res.cookies.set('c360_email', email ?? '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 30, path: '/' })
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
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
