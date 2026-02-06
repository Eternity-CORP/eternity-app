'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

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
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[600px] mx-auto px-6 py-12">
        <div className="glass-card gradient-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Recovery Phrase</h1>
            <p className="text-white/50">Write these 12 words down and keep them safe</p>
          </div>

          {/* Seed phrase grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {mnemonic.map((word, i) => (
              <div
                key={i}
                className="bg-white/3 border border-white/8 rounded-xl p-3 hover:border-white/12 transition-colors"
              >
                <span className="text-white/30 text-xs">{i + 1}.</span>
                <span className="ml-2 font-medium text-white">{word}</span>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full py-3 px-6 glass-card rounded-xl font-semibold text-white hover:border-white/15 transition-all mb-6 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          >
            {copied ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#22c55e]">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span className="text-[#22c55e]">Copied</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy to clipboard
              </>
            )}
          </button>

          {/* Warning */}
          <div className="bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl p-4 mb-6">
            <p className="text-[#f87171] text-sm font-medium">
              Never share your recovery phrase. Anyone with these words can access your wallet.
            </p>
          </div>

          {/* Confirmation checkbox */}
          <label className="flex items-start gap-3 mb-6 cursor-pointer p-4 rounded-xl bg-white/3 border border-white/8 hover:border-white/12 transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-white/20 bg-transparent accent-white"
            />
            <span className="text-white/50 text-sm">
              I have written down my recovery phrase and stored it in a safe place
            </span>
          </label>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="py-4 text-center rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Back
            </Link>
            <button
              onClick={handleContinue}
              disabled={!confirmed}
              className="py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all shimmer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
