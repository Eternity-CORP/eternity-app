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
    <main className="min-h-screen bg-black flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eternity</h1>
          <p className="text-white/40">Web3 Wallet</p>
        </div>

        <div>
          <p className="text-5xl font-bold leading-tight mb-6">
            Your keys,<br/>your crypto.<br/>Always.
          </p>
          <p className="text-white/40 max-w-md">
            Self-custody wallet with instant BLIK payments. We never see your private keys.
          </p>
        </div>

        <p className="text-white/20 text-sm">
          © 2024 Eternity. All rights reserved.
        </p>
      </div>

      {/* Right side - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Eternity</h1>
            <p className="text-white/40">Welcome back</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Welcome back</h2>
            <p className="text-white/50">Enter your password to unlock your wallet</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-white/60 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter your password"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-3">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Unlocking...' : 'Unlock Wallet'}
            </button>
          </form>

          <div className="mt-12 pt-8 border-t border-white/10">
            <p className="text-white/40 text-sm mb-4">Don&apos;t have a wallet?</p>
            <div className="flex gap-4">
              <Link
                href="/create"
                className="flex-1 py-3 px-4 text-center border border-white/20 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors"
              >
                Create New Wallet
              </Link>
              <Link
                href="/import"
                className="flex-1 py-3 px-4 text-center text-white/50 text-sm font-medium hover:text-white transition-colors"
              >
                Import Existing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function UnlockWallet() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-2xl font-bold text-white/50">Loading...</div>
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
