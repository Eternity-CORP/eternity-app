'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'
import { getAddressFromMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { ensureDefaultAccount } from '@/lib/account-storage'

export default function SetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mnemonic, setMnemonic] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('temp_mnemonic')
    if (!stored) {
      router.push('/create')
      return
    }
    setMnemonic(stored)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      await encryptAndSave(mnemonic, password)
      ensureDefaultAccount(mnemonic, 'test', getAddressFromMnemonic)
      sessionStorage.removeItem('temp_mnemonic')
      sessionStorage.setItem('session_mnemonic', mnemonic)
      router.push('/wallet')
    } catch (err) {
      setError('Failed to create wallet')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[440px] mx-auto px-6 py-12">
        <div className="glass-card gradient-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Set Password</h1>
            <p className="text-white/50">This password encrypts your wallet on this device</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 bg-white/3 border border-white/8 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-white/50 font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-5 py-4 bg-white/3 border border-white/8 rounded-xl text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#f87171] text-sm px-1 font-medium">{error}</p>
            )}

            <div className="bg-white/3 border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${password.length >= 8 ? 'text-[#22c55e]' : 'text-white/25'}`}>
                  {password.length >= 8 ? '✓' : '○'}
                </span>
                <span className="text-sm text-white/50">At least 8 characters</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/create"
                className="py-4 text-center rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Wallet'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
