'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'

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
      router.push('/wallet')
    } catch (err) {
      setError('Failed to import wallet')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Set Password</h1>
          <p className="text-white/50">
            Create a password to encrypt your wallet
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full py-4 px-6 bg-white/5 text-white border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200"
            autoFocus
          />

          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
            className="w-full py-4 px-6 bg-white/5 text-white border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Importing...' : 'Import Wallet'}
          </button>
        </form>

        <a
          href="/import"
          className="text-white/50 hover:text-white transition-colors text-center block mt-6"
        >
          ← Back
        </a>
      </div>
    </main>
  )
}
