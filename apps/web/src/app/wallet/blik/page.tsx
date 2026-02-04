'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { createBlikCode, lookupBlikCode, updateBlikStatus, subscribeToBlikCode, BlikCode } from '@/lib/blik'

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
      // Update status to pending
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

      // Update status to completed
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

  return (
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm glass-card p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => mode === 'select' ? router.push('/wallet') : setMode('select')}
            className="text-white/50 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-xl font-bold">BLIK</h1>
          <div className="w-12" />
        </div>

        {/* Mode Selection */}
        {mode === 'select' && (
          <div>
            <p className="text-white/50 text-center mb-6">
              Send or receive ETH with a 6-digit code
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors text-left"
              >
                <h3 className="font-bold mb-1">Request Payment</h3>
                <p className="text-sm text-white/50">
                  Generate a code for someone to send you ETH
                </p>
              </button>

              <button
                onClick={() => setMode('lookup')}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors text-left"
              >
                <h3 className="font-bold mb-1">Send Payment</h3>
                <p className="text-sm text-white/50">
                  Enter a code to send ETH to someone
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Create Code - Enter Amount */}
        {mode === 'create' && !createdCode && (
          <div>
            <p className="text-white/50 text-center mb-6">
              Enter amount you want to receive
            </p>

            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              className="w-full py-4 px-6 bg-white/5 text-white text-center border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200 mb-6"
            />

            <button
              onClick={handleCreateCode}
              disabled={!amount || parseFloat(amount) <= 0}
              className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Code
            </button>
          </div>
        )}

        {/* Create Code - Show Generated Code */}
        {mode === 'create' && createdCode && (
          <div className="text-center">
            <p className="text-white/50 mb-6">
              Share this code with the sender
            </p>

            <div className="mb-6">
              <p className="text-5xl font-mono font-bold tracking-widest mb-4">
                {createdCode.code}
              </p>
              <p className="text-2xl font-bold">{createdCode.amount} ETH</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-white/50 text-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span>Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        )}

        {/* Lookup Code - Enter Code */}
        {mode === 'lookup' && !foundCode && (
          <div>
            <p className="text-white/50 text-center mb-6">
              Enter the 6-digit code
            </p>

            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="w-full py-4 px-6 bg-white/5 text-white text-center text-4xl font-mono tracking-widest border border-white/10 rounded-full placeholder:text-white/30 focus:border-white/30 focus:outline-none transition-all duration-200 mb-4"
            />

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <button
              onClick={handleLookupCode}
              disabled={inputCode.length !== 6}
              className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find Code
            </button>
          </div>
        )}

        {/* Lookup Code - Confirm Send */}
        {mode === 'lookup' && foundCode && (
          <div>
            <p className="text-white/50 text-center mb-6">
              Confirm payment
            </p>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
              <div className="text-center mb-4">
                <p className="text-4xl font-bold">{foundCode.amount} ETH</p>
              </div>
              <div className="text-sm text-white/50">
                <p className="mb-1">To:</p>
                <p className="font-mono break-all text-white/70">{foundCode.receiver_address}</p>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

            <button
              onClick={handleSend}
              disabled={sending}
              className="w-full py-4 px-6 bg-white text-black font-medium rounded-full hover:bg-white/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Confirm & Send'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
