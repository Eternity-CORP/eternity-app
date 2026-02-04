'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import Link from 'next/link'

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
    <main className="min-h-screen bg-black flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-white/10">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eternity</h1>
          <p className="text-white/40">Web3 Wallet</p>
        </div>

        <div>
          <p className="text-5xl font-bold leading-tight mb-6">
            Restore your<br/>wallet from<br/>backup.
          </p>
          <p className="text-white/40 max-w-md">
            Enter your recovery phrase to restore access to your wallet and funds.
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
            <p className="text-white/40">Import Wallet</p>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold mb-3">Import Wallet</h2>
            <p className="text-white/50">Enter your recovery phrase to restore your wallet</p>
          </div>

          {/* Word count toggle */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => handleWordCountChange(12)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                wordCount === 12
                  ? 'bg-white text-black'
                  : 'bg-transparent text-white/50 border border-white/10 hover:bg-white/5'
              }`}
            >
              12 words
            </button>
            <button
              onClick={() => handleWordCountChange(24)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
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
            className="grid grid-cols-3 gap-3 mb-4"
            onPaste={handlePaste}
          >
            {words.map((word, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-white/30 text-xs w-5">{i + 1}.</span>
                <input
                  type="text"
                  value={word}
                  onChange={(e) => handleWordChange(i, e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none transition-colors"
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
            <p className="text-red-500 text-sm mb-6 text-center">{error}</p>
          )}

          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Validating...' : 'Continue'}
          </button>

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
