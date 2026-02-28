'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { encryptTempToSession } from '@/lib/session-crypto'
import { useInviteGuard } from '@/hooks/useInviteGuard'

export default function ImportWallet() {
  useInviteGuard()
  const router = useRouter()
  const [words, setWords] = useState<string[]>(Array(12).fill(''))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words]
    newWords[index] = value.toLowerCase().trim()
    setWords(newWords)
    setError('')
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const pastedWords = text.trim().toLowerCase().split(/\s+/)

    if (pastedWords.length === 12 || pastedWords.length === 24) {
      setWordCount(pastedWords.length as 12 | 24)
      const newWords = Array(pastedWords.length).fill('')
      pastedWords.forEach((word, i) => {
        newWords[i] = word
      })
      setWords(newWords)
    }
  }

  const handleWordCountChange = (count: 12 | 24) => {
    setWordCount(count)
    setWords(Array(count).fill(''))
    setError('')
  }

  const handleContinue = async () => {
    const mnemonic = words.join(' ').trim()
    const filledWords = words.filter(w => w.length > 0)

    if (filledWords.length !== wordCount) {
      setError(`Please enter all ${wordCount} words`)
      return
    }

    setStatus('loading')
    setError('')

    try {
      deriveWalletFromMnemonic(mnemonic, 0)
      await encryptTempToSession(mnemonic)
      setStatus('succeeded')
      router.push('/import/password')
    } catch (err) {
      setError('Invalid recovery phrase. Please check your words.')
      console.error(err)
      setStatus('failed')
    }
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[600px] mx-auto px-6 py-12">
        <div className="glass-card gradient-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Import Wallet</h1>
            <p className="text-[var(--foreground-muted)]">Enter your recovery phrase to restore your wallet</p>
          </div>

          {/* Word count toggle */}
          <div className="flex gap-2 p-1.5 bg-[var(--surface)] rounded-xl mb-6">
            <button
              onClick={() => handleWordCountChange(12)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                wordCount === 12
                  ? 'bg-[var(--surface-hover)] text-[var(--foreground)] shadow-[0_0_10px_var(--glass-shadow)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              12 words
            </button>
            <button
              onClick={() => handleWordCountChange(24)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                wordCount === 24
                  ? 'bg-[var(--surface-hover)] text-[var(--foreground)] shadow-[0_0_10px_var(--glass-shadow)]'
                  : 'text-[var(--foreground-muted)] hover:text-[var(--foreground)]'
              }`}
            >
              24 words
            </button>
          </div>

          {/* Word inputs */}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4"
            onPaste={handlePaste}
          >
            {words.map((word, i) => (
              <div key={i} className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-subtle)] text-xs pointer-events-none">{i + 1}.</span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--border)] focus:outline-none focus:shadow-[0_0_10px_rgba(51,136,255,0.03)] transition-all"
                  autoComplete="off"
                  autoCapitalize="off"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--foreground-subtle)] mb-6 text-center">
            Tip: You can paste your entire phrase at once
          </p>

          {error && (
            <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-6">
              <p className="text-[#f87171] text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="py-4 text-center rounded-xl glass-card font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Back
            </Link>
            <button
              onClick={handleContinue}
              disabled={status === 'loading'}
              className="py-4 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold hover:opacity-90 transition-all shimmer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Validating...' : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
