'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'
import Link from 'next/link'

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
    <main className="min-h-screen bg-black bg-grid flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Eternity</h1>
        <p className="text-white/50">Welcome back</p>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto mb-8 rounded-full border border-white/20 flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/60">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2">Unlock Wallet</h2>
          <p className="text-white/50">Enter your password to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              placeholder="Password"
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-center text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm text-center mt-4">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 px-6 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm mb-6">Don&apos;t have a wallet?</p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/create"
              className="px-6 py-3 border border-white/20 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Create New
            </Link>
            <Link
              href="/import"
              className="px-6 py-3 text-white/50 text-sm font-medium hover:text-white transition-colors"
            >
              Import Existing
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-16 text-white/30 text-sm">
        Your keys, your crypto. Always.
      </p>
    </main>
  )
}

export default function UnlockWallet() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-2xl font-bold text-white/50">Eternity</div>
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
