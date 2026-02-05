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
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[440px] mx-auto px-6 py-12">
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Set Password</h1>
            <p className="text-[#9b9b9b]">Create a password to encrypt your wallet</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#9b9b9b] font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#252525] rounded-xl text-white placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#3a3a3a] transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm text-[#9b9b9b] font-medium mb-2">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full px-5 py-4 bg-[#1a1a1a] border border-[#252525] rounded-xl text-white placeholder:text-[#4a4a4a] focus:outline-none focus:border-[#3a3a3a] transition-colors"
              />
            </div>

            {error && (
              <p className="text-[#f87171] text-sm px-1 font-medium">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/import"
                className="py-4 text-center rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
              >
                Back
              </Link>
              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
