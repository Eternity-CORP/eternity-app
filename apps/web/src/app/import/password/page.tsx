'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function ImportPassword() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mnemonic, setMnemonic] = useState('')

  useEffect(() => {
    const stored = sessionStorage.getItem('temp_mnemonic')
    if (!stored) {
      router.push('/import')
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
      sessionStorage.removeItem('temp_mnemonic')
      sessionStorage.setItem('session_mnemonic', mnemonic)
      router.push('/wallet')
    } catch (err) {
      setError('Failed to import wallet')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[440px] mx-auto px-6 py-12">
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Set Password</h1>
            <p className="text-white/50">Create a password to encrypt your wallet</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/60 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-white/60 mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-5 py-4 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm px-1">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/import"
                className="py-4 text-center rounded-xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
