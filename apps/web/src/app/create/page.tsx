'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMnemonic } from '@e-y/crypto'

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
    // Store temporarily for password setup
    sessionStorage.setItem('temp_mnemonic', mnemonic.join(' '))
    router.push('/create/password')
  }

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Your Recovery Phrase</h1>
        <p className="text-white/50 text-center mb-8">
          Write these 12 words down and keep them safe. This is the only way to recover your wallet.
        </p>

        {/* Seed phrase grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {mnemonic.map((word, i) => (
            <div
              key={i}
              className="bg-white/5 rounded-xl p-3"
            >
              <div className="text-white/30 text-xs mb-1">{i + 1}</div>
              <div className="text-white text-sm font-medium">{word}</div>
            </div>
          ))}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="w-full py-4 px-6 bg-transparent text-white font-medium border border-white/20 rounded-full hover:bg-white/5 transition-all duration-200 mb-6"
        >
          {copied ? '✓ Copied!' : 'Copy to clipboard'}
        </button>

        {/* Warning */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <p className="text-white/70 text-sm">
            Never share your recovery phrase. Anyone with these words can access your wallet.
          </p>
        </div>

        {/* Confirmation checkbox */}
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-white/20 bg-white/5 accent-white"
          />
          <span className="text-white/70 text-sm">
            I have written down my recovery phrase and stored it in a safe place
          </span>
        </label>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!confirmed}
          className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>

        {/* Back link */}
        <a
          href="/"
          className="text-white/50 hover:text-white transition-colors text-center block mt-6"
        >
          ← Back
        </a>
      </div>
    </main>
  )
}
