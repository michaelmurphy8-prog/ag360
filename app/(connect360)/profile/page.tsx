'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { RefreshCw } from 'lucide-react'

export default function MyProfilePage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()

  useEffect(() => {
    if (!isLoaded) return
    if (!user) { router.replace('/auth'); return }

    // Find this user's connect360 profile and redirect to it
    fetch('/api/connect360/profiles?my_profile=true')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.id) {
          router.replace(`/profile/${data.profile.id}`)
        } else {
          // No profile yet — send to register
          router.replace('/register')
        }
      })
      .catch(() => router.replace('/register'))
  }, [isLoaded, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F7F5F0' }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: '#C9A84C' }} />
    </div>
  )
}