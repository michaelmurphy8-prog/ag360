'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react'

export default function Connect360AuthPage() {
  const router = useRouter()
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [code, setCode] = useState('')

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #1A2535',
    backgroundColor: '#0F1923',
    color: '#F0F4F8',
    fontSize: 15,
    outline: 'none',
  }

  async function handleSubmit() {
    if (!signInLoaded || !signUpLoaded) return
    setLoading(true)
    setError('')

    try {
      if (mode === 'signin') {
        const result = await signIn.create({ identifier: email, password })
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          router.replace('/home')
        }
      } else {
        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
        })
        if (result.status === 'missing_requirements') {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setVerifying(true)
        } else if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          router.replace('/home')
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!signUpLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        router.replace('/home')
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ backgroundColor: '#080D14' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-2xl font-bold mb-2">
              <span style={{ color: '#F0F4F8' }}>Check your </span>
              <span style={{ color: '#C9A84C' }}>email</span>
            </div>
            <p className="text-sm" style={{ color: '#4A5568' }}>
              We sent a verification code to {email}
            </p>
          </div>
          <input
            style={{ ...inputStyle, textAlign: 'center', fontSize: 24, letterSpacing: '0.3em' }}
            placeholder="000000"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={6}
          />
          {error && (
            <p className="text-sm mt-3 text-center" style={{ color: '#F87171' }}>{error}</p>
          )}
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: '#C9A84C',
              color: '#080D14',
              opacity: loading || code.length < 6 ? 0.6 : 1,
            }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Verify Email'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundColor: '#080D14' }}>

      {/* Header */}
      <div className="pt-16 pb-10 px-6 text-center">
        <div className="text-3xl font-bold mb-1 tracking-tight">
          <span style={{ color: '#F0F4F8' }}>Connect</span>
          <span style={{ color: '#C9A84C' }}>360</span>
        </div>
        <p className="text-xs tracking-[0.25em] uppercase mt-1" style={{ color: '#4A5568' }}>
          The Ultimate AG Network
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 px-6">
        <div className="rounded-3xl p-6"
          style={{ backgroundColor: '#0F1923', border: '1px solid #1A2535' }}>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ backgroundColor: '#080D14' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === m ? '#C9A84C' : 'transparent',
                  color: mode === m ? '#080D14' : '#4A5568',
                }}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Welcome text */}
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#F0F4F8' }}>
              {mode === 'signin' ? 'Welcome back' : 'Join the network'}
            </h2>
            <p className="text-sm" style={{ color: '#4A5568' }}>
              {mode === 'signin'
                ? 'Sign in to your Connect360 account'
                : 'Connect with ag professionals across the globe'}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <input style={inputStyle} placeholder="First name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input style={inputStyle} placeholder="Last name"
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            )}
            <input style={inputStyle} type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <div className="relative">
              <input
                style={{ ...inputStyle, paddingRight: 48 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button
                onClick={() => setShowPassword(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#4A5568' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm mt-3" style={{ color: '#F87171' }}>{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="w-full mt-5 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all"
            style={{
              backgroundColor: '#C9A84C',
              color: '#080D14',
              opacity: loading || !email || !password ? 0.6 : 1,
            }}>
            {loading
              ? <RefreshCw size={16} className="animate-spin" />
              : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>}
          </button>

          {/* Trial note for signup */}
          {mode === 'signup' && (
            <p className="text-center text-xs mt-4" style={{ color: '#2DD4A0' }}>
              ✓ 30-day free trial · No credit card required
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-[10px] tracking-widest uppercase" style={{ color: '#1A2535' }}>
          AG360 Technologies Inc.
        </p>
      </div>
    </div>
  )
}