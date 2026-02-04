'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { createBlikCode, lookupBlikCode, updateBlikStatus, subscribeToBlikCode, BlikCode } from '@/lib/blik'
import Link from 'next/link'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

type Mode = 'select' | 'create' | 'lookup'

export default function BlikPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('select')
  const [address, setAddress] = useState('')
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null)

  // Create mode state
  const [amount, setAmount] = useState('')
  const [createdCode, setCreatedCode] = useState<BlikCode | null>(null)
  const [timeLeft, setTimeLeft] = useState(120)

  // Lookup mode state
  const [inputCode, setInputCode] = useState('')
  const [foundCode, setFoundCode] = useState<BlikCode | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    const w = deriveWalletFromMnemonic(mnemonic, 0)
    setWallet(w)
    setAddress(w.address)
  }, [router])

  // Timer for created code
  useEffect(() => {
    if (!createdCode) return

    const interval = setInterval(() => {
      const expires = new Date(createdCode.expires_at).getTime()
      const now = Date.now()
      const left = Math.max(0, Math.floor((expires - now) / 1000))
      setTimeLeft(left)

      if (left === 0) {
        setCreatedCode(null)
        setMode('select')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [createdCode])

  // Subscribe to code updates
  useEffect(() => {
    if (!createdCode) return

    let channel: Awaited<ReturnType<typeof subscribeToBlikCode>> | null = null

    subscribeToBlikCode(createdCode.id, (updated) => {
      if (updated.status === 'completed') {
        router.push('/wallet/blik/received')
      }
    }).then((c) => {
      channel = c
    })

    return () => {
      channel?.unsubscribe()
    }
  }, [createdCode, router])

  const handleCreateCode = async () => {
    if (!amount || parseFloat(amount) <= 0) return

    const code = await createBlikCode(address, amount)
    if (code) {
      setCreatedCode(code)
      setTimeLeft(120)
    }
  }

  const handleLookupCode = async () => {
    if (inputCode.length !== 6) return

    setError('')
    const code = await lookupBlikCode(inputCode)

    if (!code) {
      setError('Code not found or expired')
      return
    }

    if (code.receiver_address.toLowerCase() === address.toLowerCase()) {
      setError("You can't send to yourself")
      return
    }

    setFoundCode(code)
  }

  const handleSend = async () => {
    if (!wallet || !foundCode) return

    setSending(true)
    setError('')

    try {
      await updateBlikStatus(foundCode.id, 'pending')

      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const connectedWallet = wallet.connect(provider)

      const tx = await connectedWallet.sendTransaction({
        to: foundCode.receiver_address,
        value: ethers.parseEther(foundCode.amount),
      })

      await tx.wait()

      await updateBlikStatus(foundCode.id, 'completed')

      router.push(`/wallet/send/success?hash=${tx.hash}`)
    } catch (err: unknown) {
      await updateBlikStatus(foundCode.id, 'active')
      const errorMessage = err instanceof Error ? err.message : 'Transaction failed'
      setError(errorMessage.includes('insufficient') ? 'Insufficient balance' : errorMessage)
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    if (mode === 'select') {
      router.push('/wallet')
    } else {
      setMode('select')
      setCreatedCode(null)
      setFoundCode(null)
      setError('')
      setInputCode('')
      setAmount('')
    }
  }

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-white/50 hover:text-white transition-colors"
          >
            ← {mode === 'select' ? 'Back to Wallet' : 'Back'}
          </button>
          <h1 className="text-xl font-bold">BLIK Payments</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-xl mx-auto px-8 py-16">
        {/* Mode Selection */}
        {mode === 'select' && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">BLIK Payments</h2>
              <p className="text-white/50">Send or receive ETH with a 6-digit code</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Request Payment</h3>
                    <p className="text-sm text-white/50">Generate a code for someone to send you ETH</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('lookup')}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Send Payment</h3>
                    <p className="text-sm text-white/50">Enter a code to send ETH to someone</p>
                  </div>
                </div>
              </button>
            </div>
          </>
        )}

        {/* Create Code - Enter Amount */}
        {mode === 'create' && !createdCode && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Request Payment</h2>
              <p className="text-white/50">Enter the amount you want to receive</p>
            </div>

            <div className="mb-8">
              <label className="block text-sm text-white/60 mb-3">Amount (ETH)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.0001"
                className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-xl text-white text-2xl text-center placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
            </div>

            <button
              onClick={handleCreateCode}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Generate Code
            </button>
          </>
        )}

        {/* Create Code - Show Generated Code */}
        {mode === 'create' && createdCode && (
          <div className="text-center">
            <div className="mb-12">
              <h2 className="text-3xl font-bold mb-3">Your BLIK Code</h2>
              <p className="text-white/50">Share this code with the sender</p>
            </div>

            <div className="mb-10">
              <p className="text-7xl font-mono font-bold tracking-[0.3em] mb-6">
                {createdCode.code}
              </p>
              <p className="text-3xl font-bold">{createdCode.amount} ETH</p>
            </div>

            <div className="flex items-center justify-center gap-3 text-white/50">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-lg">
                Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}

        {/* Lookup Code - Enter Code */}
        {mode === 'lookup' && !foundCode && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Send Payment</h2>
              <p className="text-white/50">Enter the 6-digit BLIK code</p>
            </div>

            <div className="mb-8">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-5 py-6 bg-white/5 border border-white/10 rounded-xl text-white text-5xl font-mono text-center tracking-[0.4em] placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-6 text-center">{error}</p>}

            <button
              onClick={handleLookupCode}
              disabled={inputCode.length !== 6}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Find Code
            </button>
          </>
        )}

        {/* Lookup Code - Confirm Send */}
        {mode === 'lookup' && foundCode && (
          <>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">Confirm Payment</h2>
              <p className="text-white/50">Review and confirm the transaction</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
              <div className="text-center mb-6">
                <p className="text-5xl font-bold">{foundCode.amount} ETH</p>
              </div>
              <div className="pt-6 border-t border-white/10">
                <p className="text-sm text-white/50 mb-2">Sending to</p>
                <p className="font-mono text-sm break-all text-white/80">{foundCode.receiver_address}</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-6 text-center">{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 px-6 bg-white text-black font-semibold text-lg rounded-xl hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Confirm & Send'}
            </button>
          </>
        )}

        {/* Network */}
        <div className="flex items-center justify-center gap-2 mt-12 text-sm text-white/40">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
