'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { encryptAndSave } from '@e-y/storage'
import Link from 'next/link'

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
    <main className="min-h-screen bg-black flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eternity</h1>
          <p className="text-white/40">Web3 Wallet</p>
        </div>

        <div>
          <p className="text-5xl font-bold leading-tight mb-6">
            Secure your<br/>wallet with<br/>a password.
          </p>
          <p className="text-white/40 max-w-md">
            This password encrypts your wallet on this device. Choose a strong password you will remember.
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
            <p className="text-white/40">Set Password</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Set Password</h2>
            <p className="text-white/50">Create a password to encrypt your wallet</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm text-white/60 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
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
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-lg placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import Wallet'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/import"
              className="text-white/50 hover:text-white transition-colors"
            >
              ← Back
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
