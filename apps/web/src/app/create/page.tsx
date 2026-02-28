'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { generateMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { encryptTempToSession } from '@/lib/session-crypto'
import { useInviteGuard } from '@/hooks/useInviteGuard'

function pickRandomIndices(count: number, max: number): number[] {
  const indices: number[] = []
  while (indices.length < count) {
    const idx = Math.floor(Math.random() * max)
    if (!indices.includes(idx)) indices.push(idx)
  }
  return indices.sort((a, b) => a - b)
}

export default function CreateWallet() {
  useInviteGuard()
  const router = useRouter()
  const [mnemonic, setMnemonic] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [verifyIndices, setVerifyIndices] = useState<number[]>([])
  const [verifyInputs, setVerifyInputs] = useState<string[]>(['', '', ''])
  const [verifyError, setVerifyError] = useState(false)

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
    const indices = pickRandomIndices(3, mnemonic.length)
    setVerifyIndices(indices)
    setVerifyInputs(['', '', ''])
    setVerifyError(false)
    setStep(2)
  }

  const handleVerify = async () => {
    const correct = verifyIndices.every(
      (wordIdx, i) => verifyInputs[i].trim().toLowerCase() === mnemonic[wordIdx].toLowerCase()
    )
    if (correct) {
      await encryptTempToSession(mnemonic.join(' '))
      router.push('/create/password')
    } else {
      setVerifyError(true)
    }
  }

  const handleBack = () => {
    setStep(1)
    setVerifyError(false)
  }

  const allFilled = verifyInputs.every((v) => v.trim().length > 0)

  // Step 2: Verification
  if (step === 2) {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />

        <main className="max-w-[600px] mx-auto px-6 py-12">
          <div className="glass-card gradient-border rounded-2xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gradient mb-2">Verify Recovery Phrase</h1>
              <p className="text-[var(--foreground-muted)]">Enter the requested words to confirm you saved your phrase</p>
            </div>

            <div className="space-y-4 mb-6">
              {verifyIndices.map((wordIdx, i) => (
                <div key={wordIdx}>
                  <label className="block text-sm text-[var(--foreground-subtle)] mb-1.5">
                    Word #{wordIdx + 1}
                  </label>
                  <input
                    type="text"
                    autoComplete="off"
                    value={verifyInputs[i]}
                    onChange={(e) => {
                      const next = [...verifyInputs]
                      next[i] = e.target.value
                      setVerifyInputs(next)
                      setVerifyError(false)
                    }}
                    className="w-full py-3 px-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--foreground-subtle)] focus:outline-none focus:border-[var(--border)] transition-colors"
                    placeholder={`Enter word #${wordIdx + 1}`}
                  />
                </div>
              ))}
            </div>

            {verifyError && (
              <div className="bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl p-4 mb-6">
                <p className="text-[#f87171] text-sm font-medium">
                  Incorrect words. Please check and try again.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBack}
                className="py-4 text-center rounded-xl glass-card font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Back
              </button>
              <button
                onClick={handleVerify}
                disabled={!allFilled}
                className="py-4 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold hover:opacity-90 transition-all shimmer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Verify
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Step 1: Show seed phrase
  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[600px] mx-auto px-6 py-12">
        <div className="glass-card gradient-border rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gradient mb-2">Recovery Phrase</h1>
            <p className="text-[var(--foreground-muted)]">Write these 12 words down and keep them safe</p>
          </div>

          {/* Seed phrase grid */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {mnemonic.map((word, i) => (
              <div
                key={i}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-xl px-2 py-3 hover:border-[var(--border)] transition-colors flex items-center min-w-0"
              >
                <span className="text-[var(--foreground-subtle)] text-[10px] shrink-0">{i + 1}.</span>
                <span className="ml-1 font-medium text-[var(--foreground)] text-sm truncate">{word}</span>
              </div>
            ))}
          </div>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className="w-full py-3 px-6 glass-card rounded-xl font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-all mb-6 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
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
          <label className="flex items-start gap-3 mb-6 cursor-pointer p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border)] transition-colors">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-5 h-5 rounded border-[var(--border)] bg-transparent accent-[var(--foreground)]"
            />
            <span className="text-[var(--foreground-muted)] text-sm">
              I have written down my recovery phrase and stored it in a safe place
            </span>
          </label>

          {/* Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="py-4 text-center rounded-xl glass-card font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Back
            </Link>
            <button
              onClick={handleContinue}
              disabled={!confirmed}
              className="py-4 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold hover:opacity-90 transition-all shimmer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
