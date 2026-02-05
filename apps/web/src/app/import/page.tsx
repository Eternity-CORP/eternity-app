'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

export default function ImportWallet() {
  const router = useRouter()
  const [words, setWords] = useState<string[]>(Array(12).fill(''))
  const [wordCount, setWordCount] = useState<12 | 24>(12)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

    setLoading(true)
    setError('')

    try {
      deriveWalletFromMnemonic(mnemonic, 0)
      sessionStorage.setItem('temp_mnemonic', mnemonic)
      router.push('/import/password')
    } catch (err) {
      setError('Invalid recovery phrase. Please check your words.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={false} />

      <main className="max-w-[600px] mx-auto px-6 py-12">
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Import Wallet</h1>
            <p className="text-[#9b9b9b]">Enter your recovery phrase to restore your wallet</p>
          </div>

          {/* Word count toggle */}
          <div className="flex gap-2 p-1.5 bg-[#1a1a1a] rounded-xl mb-6">
            <button
              onClick={() => handleWordCountChange(12)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                wordCount === 12
                  ? 'bg-[#252525] text-white'
                  : 'text-[#9b9b9b] hover:text-white'
              }`}
            >
              12 words
            </button>
            <button
              onClick={() => handleWordCountChange(24)}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                wordCount === 24
                  ? 'bg-[#252525] text-white'
                  : 'text-[#9b9b9b] hover:text-white'
              }`}
            >
              24 words
            </button>
          </div>

          {/* Word inputs */}
          <div
            className="grid grid-cols-3 gap-2 mb-4"
            onPaste={handlePaste}
          >
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-[#6b6b6b] text-xs w-5">{i + 1}.</span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#252525] rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#3a3a3a] focus:outline-none transition-colors"
                  autoComplete="off"
                  autoCapitalize="off"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-[#6b6b6b] mb-6 text-center">
            Tip: You can paste your entire phrase at once
          </p>

          {error && (
            <div className="px-4 py-3 bg-[#2d1515] border border-[#4d2525] rounded-xl mb-6">
              <p className="text-[#f87171] text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="py-4 text-center rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
            >
              Back
            </Link>
            <button
              onClick={handleContinue}
              disabled={loading}
              className="py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Validating...' : 'Continue'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
