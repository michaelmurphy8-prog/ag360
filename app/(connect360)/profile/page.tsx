'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
export default function MyProfilePage() {
  const router = useRouter()
  useEffect(() => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('c360_email') : null
    const url = email
      ? `/api/connect360/profiles?my_profile=true&c360_email=${encodeURIComponent(email)}`
      : '/api/connect360/profiles?my_profile=true'
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.profile?.id) {
          router.replace(`/profile/${data.profile.id}`)
        } else {
          router.replace('/register')
        }
      })
      .catch(() => router.replace('/register'))
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#F7F5F0' }}>
      <RefreshCw size={24} className="animate-spin" style={{ color: '#C9A84C' }} />
    </div>
  )
}
