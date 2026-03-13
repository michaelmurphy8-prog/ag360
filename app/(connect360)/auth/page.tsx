'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn, useSignUp } from '@clerk/nextjs'
import { Eye, EyeOff, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react'

export default function Connect360AuthPage() {
  const router = useRouter()
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn()
  const [passkeySupported, setPasskeySupported] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.PublicKeyCredential) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(setPasskeySupported)
    }
  }, [])

  async function handlePasskey() {
    if (!signInLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn.authenticateWithPasskey()
      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        window.location.href = '/home'
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Face ID sign in failed. Try email instead.')
    } finally {
      setLoading(false)
    }
  }
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

  const inputBase: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: '1.5px solid #EEE9E0',
    backgroundColor: '#FFFFFF',
    color: '#0D1520',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color 0.2s',
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
          window.location.href = '/home'
        } else if (result.status === 'needs_second_factor') {
          await signIn.prepareSecondFactor({ strategy: 'email_code' })
          setVerifying(true)
        }
      } else {
        const result = await signUp.create({ emailAddress: email, password, firstName, lastName })
        if (result.status === 'missing_requirements') {
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setVerifying(true)
        } else if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          window.location.href = '/home'
        }
      }
    } catch (err: any) {
      setError(err?.errors?.[0]?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!signUpLoaded || !signInLoaded) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'signup') {
        const result = await signUp.attemptEmailAddressVerification({ code })
        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          window.location.href = '/home'
        }
      } else {
        const result = await signIn.attemptSecondFactor({ strategy: 'email_code', code })
        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          window.location.href = '/home'
        }
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
        style={{ backgroundColor: '#F7F5F0' }}>
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: '#C9A84C' }}>
              <CheckCircle2 size={28} color="#fff" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#0D1520' }}>Check your email</h2>
            <p className="text-sm" style={{ color: '#8A9BB0' }}>
              We sent a 6-digit code to<br />
              <span style={{ color: '#0D1520', fontWeight: 600 }}>{email}</span>
            </p>
          </div>
          <input
            style={{ ...inputBase, textAlign: 'center', fontSize: 28, letterSpacing: '0.4em', fontWeight: 700 }}
            placeholder="······"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={6}
          />
          {error && <p className="text-sm mt-3 text-center" style={{ color: '#EF4444' }}>{error}</p>}
          <button
            onClick={handleVerify}
            disabled={loading || code.length < 6}
            className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all"
            style={{
              backgroundColor: '#C9A84C',
              color: '#FFFFFF',
              opacity: loading || code.length < 6 ? 0.5 : 1,
              boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
            }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : 'Verify & Continue'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Top hero — dark contrast entry matching splash */}
      <div className="px-6 pt-14 pb-10 text-center"
        style={{
          background: 'linear-gradient(160deg, #0D1520 0%, #1A2535 100%)',
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}>
        <div className="text-3xl font-bold tracking-tight mb-1">
          <span style={{ color: '#FFFFFF' }}>Connect</span>
          <span style={{ color: '#C9A84C' }}>360</span>
        </div>
        <p className="text-xs tracking-[0.25em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          The Ultimate AG Network
        </p>
      </div>

      {/* Auth card */}
      <div className="flex-1 px-5 -mt-5">
        <div className="rounded-3xl p-6"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0 8px 40px rgba(0,0,0,0.10)',
          }}>

          {/* Mode toggle */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ backgroundColor: '#F7F5F0' }}>
            {(['signin', 'signup'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError('') }}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: mode === m ? '#C9A84C' : 'transparent',
                  color: mode === m ? '#FFFFFF' : '#8A9BB0',
                  boxShadow: mode === m ? '0 2px 8px rgba(201,168,76,0.3)' : 'none',
                }}>
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* Welcome */}
          <div className="mb-5">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#0D1520' }}>
              {mode === 'signin' ? 'Welcome back' : 'Join the network'}
            </h2>
            <p className="text-sm" style={{ color: '#8A9BB0' }}>
              {mode === 'signin'
                ? 'Sign in to your Connect360 account'
                : 'Connect with ag professionals worldwide'}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            {mode === 'signup' && (
              <div className="grid grid-cols-2 gap-3">
                <input style={inputBase} placeholder="First name"
                  value={firstName} onChange={e => setFirstName(e.target.value)} />
                <input style={inputBase} placeholder="Last name"
                  value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            )}
            <input style={inputBase} type="email" placeholder="Email address"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            <div className="relative">
              <input
                style={{ ...inputBase, paddingRight: 48 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              />
              <button onClick={() => setShowPassword(s => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#B0A898' }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p className="text-sm mt-3" style={{ color: '#EF4444' }}>{error}</p>}

          {mode === 'signin' && passkeySupported && (
            <>
              <button
                onClick={handlePasskey}
                disabled={loading}
                className="w-full mt-5 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: '#F0EDE8',
                  color: '#6B7280',
                  border: '1px solid #E5E1DB',
                  opacity: loading ? 0.5 : 1,
                }}>
                Sign in with Face ID / Touch ID
              </button>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: '#EEE9E0' }} />
                <span className="text-xs" style={{ color: '#B0A898' }}>or use email</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#EEE9E0' }} />
              </div>
            </>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            className="w-full mt-5 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all"
            style={{
              backgroundColor: '#C9A84C',
              color: '#FFFFFF',
              opacity: loading || !email || !password ? 0.5 : 1,
              boxShadow: '0 4px 20px rgba(201,168,76,0.35)',
            }}>
            {loading
              ? <RefreshCw size={16} className="animate-spin" />
              : <>{mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={15} /></>}
          </button>

          {mode === 'signup' && (
            <div className="mt-4 p-3 rounded-xl flex items-center gap-2"
              style={{ backgroundColor: '#F0FAF6' }}>
              <CheckCircle2 size={14} style={{ color: '#22C55E', flexShrink: 0 }} />
              <p className="text-xs" style={{ color: '#16A34A' }}>
                30-day free trial · No credit card required
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center">
        <p className="text-[10px] tracking-widest uppercase" style={{ color: '#C8C0B4' }}>
          AG360 Technologies Inc.
        </p>
      </div>
    </div>
  )
}