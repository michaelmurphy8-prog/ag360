import { createClerkClient } from '@clerk/nextjs/server'

export const connect360Clerk = createClerkClient({
  secretKey: process.env.CLERK_CONNECT360_SECRET_KEY!,
})

export async function getConnect360Auth(req: Request) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return { userId: null }
    const payload = await connect360Clerk.verifyToken(token)
    return { userId: payload.sub ?? null }
  } catch {
    return { userId: null }
  }
}
