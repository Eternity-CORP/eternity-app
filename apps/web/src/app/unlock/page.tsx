'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { useInviteGuard } from '@/hooks/useInviteGuard'

function UnlockContent() {
  const { isInviteValid } = useInviteGuard()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')
  const { login } = useAccount()

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStatus('loading')

    try {
      const mnemonic = await loadAndDecrypt(password)
      await login(mnemonic)
      setStatus('succeeded')
      router.push(redirect || '/wallet')
    } catch (err) {
      setError('Invalid password')
      console.error(err)
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[440px] mx-auto px-6 py-16">
        <div className="glass-card gradient-border rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src="/logo.svg" alt="Eternity" className="w-16 h-16" />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Welcome back</h1>
            <p className="text-[var(--foreground-muted)]">Enter your password to unlock</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter your password"
                className="w-full px-5 py-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] text-lg placeholder:text-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--accent-blue)]/30 transition-all"
                autoFocus
              />
              {error && (
                <p className="text-[#f87171] text-sm mt-3 px-1 font-medium">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={status === 'loading' || !password}
              className="w-full py-4 px-6 bg-[var(--foreground)] text-[var(--background)] font-semibold text-lg rounded-xl hover:opacity-90 transition-all shimmer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-[var(--background)]/20 border-t-[var(--background)] rounded-full animate-spin" />
                  Unlocking...
                </span>
              ) : (
                'Unlock'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border-light)]">
            <p className="text-[var(--foreground-subtle)] text-sm text-center" style={{ marginBottom: '1.25rem' }}>Don&apos;t have a wallet?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/create"
                className="py-3 px-4 text-center glass-card rounded-xl text-sm font-semibold text-[var(--foreground)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create New
              </Link>
              <Link
                href="/import"
                className="py-3 px-4 text-center text-[var(--foreground-muted)] text-sm font-semibold hover:text-[var(--foreground)] transition-colors"
              >
                Import
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function UnlockWallet() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
