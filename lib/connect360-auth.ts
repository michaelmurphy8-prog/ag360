import { createClerkClient } from '@clerk/nextjs/server'
import { cookies } from 'next/headers'

export const connect360Clerk = createClerkClient({
  secretKey: process.env.CLERK_CONNECT360_SECRET_KEY!,
})

export async function getC360UserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('c360_uid')?.value ?? null
  } catch { return null }
}

export async function getC360Email(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    return cookieStore.get('c360_email')?.value ?? null
  } catch { return null }
}

export async function getC360Auth(): Promise<{ userId: string | null; email: string | null }> {
  try {
    const cookieStore = await cookies()
    return {
      userId: cookieStore.get('c360_uid')?.value ?? null,
      email: cookieStore.get('c360_email')?.value ?? null,
    }
  } catch { return { userId: null, email: null } }
}
