'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMnemonic } from '@e-y/crypto'
import Link from 'next/link'

export default function CreateWallet() {
  const router = useRouter()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    const words = generateMnemonic(12)
    setMnemonic(words.split(' '))
  }, [])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mnemonic.join(' '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleContinue = () => {
    if (!confirmed) return
    sessionStorage.setItem('temp_mnemonic', mnemonic.join(' '))
    router.push('/create/password')
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
            Write down your recovery phrase carefully. This is the only way to restore your wallet.
          </p>
        </div>

        <p className="text-white/20 text-sm">
          © 2024 Eternity. All rights reserved.
        </p>
      </div>

      {/* Right side - content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-lg">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-12">
            <h1 className="text-3xl font-bold mb-2">Eternity</h1>
            <p className="text-white/40">Create New Wallet</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Recovery Phrase</h2>
            <p className="text-white/50">Write these 12 words down and keep them safe</p>
          </div>

          {/* Seed phrase grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {mnemonic.map((word, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div className="text-white/30 text-xs mb-1">{i + 1}</div>
                <div className="text-white font-medium">{word}</div>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full py-4 px-6 border border-white/20 rounded-xl font-medium hover:bg-white/5 transition-colors mb-8"
          >
            {copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          </button>

          {/* Warning */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-8">
            <p className="text-white/70 text-sm leading-relaxed">
              Never share your recovery phrase. Anyone with these words can access your wallet and steal your funds.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-4 mb-8 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 accent-white"
            />
            <span className="text-white/70">
              I have written down my recovery phrase and stored it in a safe place
            </span>
          </label>

          {/* Continue button */}
          <button
            onClick={handleContinue}
            disabled={!confirmed}
            className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue
          </button>

          {/* Back link */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="text-white/50 hover:text-white transition-colors"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
