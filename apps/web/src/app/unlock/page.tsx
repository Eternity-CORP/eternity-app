'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[440px] mx-auto px-6 py-16">
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center">
              <span className="text-black font-bold text-2xl">E</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
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
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
              {error && (
                <p className="text-red-400 text-sm mt-3 px-1">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-2xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-white/40 text-sm text-center mb-4">Don&apos;t have a wallet?</p>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href="/create"
                className="py-3 px-4 text-center border border-white/20 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Create New
              </Link>
              <Link
                href="/import"
                className="py-3 px-4 text-center text-white/50 text-sm font-medium hover:text-white transition-colors"
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
