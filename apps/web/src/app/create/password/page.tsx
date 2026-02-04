'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'

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
      sessionStorage.removeItem('temp_mnemonic')
      router.push('/wallet')
    } catch (err) {
      setError('Failed to create wallet')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Set Password</h1>
        <p className="text-white/50 text-center mb-8">
          This password encrypts your wallet on this device
        </p>

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
            <p className="text-white/70 text-sm text-center">{error}</p>
          )}

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/70 text-sm mb-2">Password requirements:</p>
            <div className="flex items-center gap-2">
              <span className={`text-sm ${password.length >= 8 ? 'text-white' : 'text-white/50'}`}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                Creating wallet...
              </span>
            ) : (
              'Create Wallet'
            )}
          </button>
        </form>

        <a
          href="/create"
          className="text-white/50 hover:text-white transition-colors text-center block mt-6"
        >
          ← Back
        </a>
      </div>
    </main>
  )
}
