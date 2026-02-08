'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { ApiError } from '@e-y/shared'
import { isInviteValidated, setInviteValidated } from '@/lib/invite'
import { getDeviceFingerprint } from '@/lib/fingerprint'

type GateState = 'checking' | 'idle' | 'loading' | 'success' | 'error' | 'rate-limited'

const LANDING_URL = 'https://eternity-wallet.vercel.app'

export default function GatePage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [state, setState] = useState<GateState>('checking')
  const [errorMsg, setErrorMsg] = useState('')
  const [showFlash, setShowFlash] = useState(false)

  // On mount: check localStorage first, then check device fingerprint
  useEffect(() => {
    if (isInviteValidated()) {
      router.replace('/')
      return
    }

    // Check if this device already has a claimed code (cache was cleared)
    const checkDevice = async () => {
      try {
        const fp = await getDeviceFingerprint()
        const result = await apiClient.post<{ valid: boolean }>('/invite/check-device', { fingerprint: fp })
        if (result.valid) {
          setInviteValidated()
          router.replace('/')
          return
        }
      } catch {
        // Device not recognized — show code input
      }
      setState('idle')
    }

    checkDevice()
  }, [router])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code.trim()) return

    setState('loading')
    setErrorMsg('')

    try {
      const fp = await getDeviceFingerprint()
      await apiClient.post<{ valid: boolean }>('/invite/validate', {
        code: code.trim(),
        fingerprint: fp,
      })
      setState('success')
      setInviteValidated()

      setShowFlash(true)
      setTimeout(() => {
        router.replace('/')
      }, 800)
    } catch (error) {
      if (ApiError.isApiError(error) && error.statusCode === 429) {
        setState('rate-limited')
        setErrorMsg('Too many attempts. Please try again later.')
      } else if (ApiError.isApiError(error) && error.statusCode === 403) {
        setState('error')
        if (error.code === 'CODE_ALREADY_USED') {
          setErrorMsg('This code has already been used on another device')
        } else {
          setErrorMsg('Invalid access code')
        }
      } else {
        setState('error')
        setErrorMsg('Connection error. Please try again.')
      }
    }
  }, [code, router])

  // Loading state while checking device
  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen relative z-[2] flex items-center justify-center px-6">
      {showFlash && (
        <div className="fixed inset-0 z-50 bg-white animate-pulse pointer-events-none" />
      )}

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo.svg" alt="Eternity" className="w-16 h-16 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-white mb-2">Eternity</h1>
          <p className="text-white/40 text-sm">Your journey begins soon.</p>
        </div>

        {/* Code input */}
        {state !== 'success' && (
          <form onSubmit={handleSubmit}>
            <div className="glass-card rounded-2xl p-6 border border-white/8">
              <label className="block text-xs text-white/40 uppercase tracking-wider mb-3 font-medium">
                Access Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  if (state === 'error') setState('idle')
                }}
                placeholder="EY-XXXX-XXX"
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-center font-mono text-lg tracking-widest placeholder:text-white/20 outline-none focus:border-white/30 transition-colors"
                disabled={state === 'loading' || state === 'rate-limited'}
              />

              {(state === 'error' || state === 'rate-limited') && (
                <p className="text-red-400 text-xs text-center mt-3">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={!code.trim() || state === 'loading' || state === 'rate-limited'}
                className="w-full mt-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 shimmer hover:scale-[1.01] active:scale-[0.99]"
              >
                {state === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Enter Eternity'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Success state */}
        {state === 'success' && (
          <div className="glass-card rounded-2xl p-8 border border-white/8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#22C55E]/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-white font-semibold">Access Granted</p>
            <p className="text-white/40 text-sm mt-1">Welcome to Eternity</p>
          </div>
        )}

        {/* Waitlist link */}
        <div className="text-center mt-8">
          <p className="text-white/30 text-xs mb-2">Don't have a code?</p>
          <a
            href={`${LANDING_URL}#cta`}
            className="text-[#3388FF] text-sm hover:underline font-medium"
          >
            Join the waitlist
          </a>
        </div>
      </div>
    </div>
  )
}
