'use client'
import { useState, useEffect } from 'react'

/**
 * Safely read Connect360 session values from localStorage.
 * Returns null for all values during SSR and first render (preventing hydration mismatch),
 * then populates after mount.
 */
export function useC360Session() {
  const [session, setSession] = useState<{
    email: string | null
    uid: string | null
    firstName: string | null
    ready: boolean
  }>({ email: null, uid: null, firstName: null, ready: false })

  useEffect(() => {
    setSession({
      email: localStorage.getItem('c360_email'),
      uid: localStorage.getItem('c360_uid'),
      firstName: localStorage.getItem('c360_first_name'),
      ready: true,
    })
  }, [])

  return session
}