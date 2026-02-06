'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'
import { getAddressFromMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { ensureDefaultAccount } from '@/lib/account-storage'

function UnlockContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect')

  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const mnemonic = await loadAndDecrypt(password)
      ensureDefaultAccount(mnemonic, 'test', getAddressFromMnemonic)
      sessionStorage.setItem('session_mnemonic', mnemonic)
      router.push(redirect || '/wallet')
    } catch (err) {
      setError('Invalid password')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[440px] mx-auto px-6 py-16">
        <div className="glass-card gradient-border rounded-2xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              <span className="text-black font-bold text-2xl">E</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Welcome back</h1>
            <p className="text-white/50">Enter your password to unlock</p>
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
                className="w-full px-5 py-4 bg-white/3 border border-white/8 rounded-xl text-white text-lg placeholder:text-white/25 focus:outline-none focus:border-white/20 focus:shadow-[0_0_20px_rgba(51,136,255,0.05)] transition-all"
                autoFocus
              />
              {error && (
                <p className="text-[#f87171] text-sm mt-3 px-1 font-medium">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-all shimmer hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Unlocking...
                </span>
              ) : (
                'Unlock'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-white/30 text-sm text-center" style={{ marginBottom: '1.25rem' }}>Don&apos;t have a wallet?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/create"
                className="py-3 px-4 text-center glass-card rounded-xl text-sm font-semibold text-white hover:border-white/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Create New
              </Link>
              <Link
                href="/import"
                className="py-3 px-4 text-center text-white/50 text-sm font-semibold hover:text-white transition-colors"
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
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
