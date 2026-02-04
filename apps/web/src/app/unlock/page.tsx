'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'

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
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-2">Eternity</h1>
          <p className="text-white/50">
            Enter your password to unlock
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            placeholder="Password"
            className="w-full py-4 px-6 bg-white/5 text-white text-center border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function UnlockWallet() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
        <div className="text-white/50">Loading...</div>
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
