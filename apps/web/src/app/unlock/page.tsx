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
    <main className="bg-app bg-grid min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-12 animate-fadeIn">
          <div className="logo text-4xl mb-3">Eternity</div>
          <p className="text-body">Welcome back</p>
        </div>

        {/* Card */}
        <div className="card-elevated p-8 animate-slideUp">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h1 className="text-heading mb-2">Unlock Wallet</h1>
            <p className="text-body">Enter your password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                placeholder="Enter password"
                className="input input-lg input-center"
                autoFocus
              />
              {error && (
                <p className="text-[var(--error)] text-sm text-center mt-3 animate-fadeIn">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Unlocking...
                </>
              ) : (
                'Unlock'
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
            <p className="text-caption mb-4">Don&apos;t have a wallet?</p>
            <div className="flex gap-3 justify-center">
              <Link href="/create" className="btn btn-secondary btn-sm">
                Create New
              </Link>
              <Link href="/import" className="btn btn-ghost btn-sm">
                Import Existing
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-caption mt-8 animate-fadeIn">
          Your keys, your crypto. Always.
        </p>
      </div>
    </main>
  )
}

export default function UnlockWallet() {
  return (
    <Suspense fallback={
      <div className="bg-app min-h-screen flex items-center justify-center">
        <div className="logo text-3xl animate-pulse">Eternity</div>
      </div>
    }>
      <UnlockContent />
    </Suspense>
  )
}
