'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'

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
      // Validate mnemonic by trying to derive wallet
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
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Import Wallet</h1>
          <p className="text-white/50">
            Enter your recovery phrase to restore your wallet
          </p>
        </div>

        {/* Word count toggle */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => handleWordCountChange(12)}
            className={`flex-1 py-3 px-4 rounded-full font-medium transition-all duration-200 ${
              wordCount === 12
                ? 'bg-white text-black'
                : 'bg-transparent text-white/50 border border-white/10 hover:bg-white/5'
            }`}
          >
            12 words
          </button>
          <button
            onClick={() => handleWordCountChange(24)}
            className={`flex-1 py-3 px-4 rounded-full font-medium transition-all duration-200 ${
              wordCount === 24
                ? 'bg-white text-black'
                : 'bg-transparent text-white/50 border border-white/10 hover:bg-white/5'
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
            <div key={i} className="flex items-center gap-1">
              <span className="text-white/30 text-xs w-4">{i + 1}.</span>
              <input
                type="text"
                value={word}
                onChange={(e) => handleWordChange(i, e.target.value)}
                className="flex-1 bg-white/5 rounded-xl p-2 text-sm text-white border border-transparent focus:border-white/20 outline-none transition-all duration-200"
                placeholder=""
                autoComplete="off"
                autoCapitalize="off"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-white/40 mb-6 text-center">
          Tip: You can paste your entire phrase at once
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Validating...' : 'Continue'}
        </button>

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
