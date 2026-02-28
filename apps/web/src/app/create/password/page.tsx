'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { decryptTempFromSession, clearTempSession } from '@/lib/session-crypto'
import { useInviteGuard } from '@/hooks/useInviteGuard'
import { validatePasswordStrength, getPasswordStrengthLabel, getPasswordStrengthColor } from '@e-y/shared'
import ThemeLogo from '@/components/ThemeLogo'

const STRENGTH_COLORS: Record<ReturnType<typeof getPasswordStrengthColor>, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
}

export default function SetPassword() {
  useInviteGuard()
  const router = useRouter()
  const { login } = useAccount()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [mnemonic, setMnemonic] = useState('')

  const strength = useMemo(() => validatePasswordStrength(password), [password])
  const strengthColor = STRENGTH_COLORS[getPasswordStrengthColor(strength.score)]
  const strengthLabel = getPasswordStrengthLabel(strength.score)

  useEffect(() => {
    (async () => {
      const stored = await decryptTempFromSession()
      if (!stored) {
        router.push('/create')
        return
      }
      setMnemonic(stored)
    })()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!strength.isValid) {
      setError('Password is not strong enough')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setStatus('loading')

    try {
      await encryptAndSave(mnemonic, password)
      clearTempSession()
      await login(mnemonic)
      setMnemonic('') // Clear mnemonic from React state after use
      setStatus('succeeded')
      router.push('/wallet')
    } catch (err) {
      setError('Failed to create wallet')
      console.error(err)
      setStatus('failed')
    }
  }

  const canSubmit = strength.isValid && password === confirmPassword && password.length > 0 && confirmPassword.length > 0

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[440px] mx-auto px-6 py-12">
        <div className="glass-card gradient-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <ThemeLogo className="w-12 h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gradient mb-2">Set Password</h1>
            <p className="text-[var(--foreground-muted)]">This password encrypts your wallet on this device</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--foreground-muted)] font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border)] transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-[var(--foreground-muted)] font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-5 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border)] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#f87171] text-sm px-1 font-medium">{error}</p>
            )}

            {/* Password strength meter */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[var(--foreground-subtle)]">Strength</span>
                    <span className="text-xs font-medium" style={{ color: strengthColor }}>
                      {strengthLabel}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 flex-1 rounded-full transition-colors duration-300"
                        style={{
                          backgroundColor: i < strength.score ? strengthColor : 'var(--surface-hover)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements checklist */}
              <div className="space-y-1.5">
                <RequirementItem
                  met={password.length >= 8}
                  label="At least 8 characters"
                  active={password.length > 0}
                />
                <RequirementItem
                  met={/[A-Z]/.test(password) && /[a-z]/.test(password)}
                  label="Upper and lowercase letters"
                  active={password.length > 0}
                />
                <RequirementItem
                  met={/\d/.test(password)}
                  label="At least one number"
                  active={password.length > 0}
                />
                <RequirementItem
                  met={/[^A-Za-z0-9]/.test(password)}
                  label="At least one special character"
                  active={password.length > 0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/create"
                className="py-4 text-center rounded-xl glass-card font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-colors"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={status === 'loading' || !canSubmit}
                className="py-4 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}

function RequirementItem({ met, label, active }: { met: boolean; label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm ${met ? 'text-[#22c55e]' : active ? 'text-[#ef4444]' : 'text-[var(--foreground-subtle)]'}`}>
        {met ? '\u2713' : '\u25CB'}
      </span>
      <span className={`text-sm ${met ? 'text-[var(--foreground-muted)]' : 'text-[var(--foreground-subtle)]'}`}>{label}</span>
    </div>
  )
}
