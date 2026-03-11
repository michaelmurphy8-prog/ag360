'use client'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

export default function RegisterPlaceholderPage() {
  const router = useRouter()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ backgroundColor: '#F7F5F0' }}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ backgroundColor: '#FDF8EE' }}>
        <ArrowRight size={28} style={{ color: '#C9A84C' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#0D1520' }}>
        Register as a provider
      </h2>
      <p className="text-sm mb-6" style={{ color: '#8A9BB0' }}>
        Coming soon — full registration form
      </p>
      <button onClick={() => router.back()}
        className="px-6 py-3 rounded-2xl text-sm font-bold"
        style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
        Go back
      </button>
    </div>
  )
}
