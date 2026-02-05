'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { createBlikCode, lookupBlikCode, updateBlikStatus, subscribeToBlikCode, BlikCode } from '@/lib/blik'
import Navigation from '@/components/Navigation'

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

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const resetMode = () => {
    setMode('select')
    setCreatedCode(null)
    setFoundCode(null)
    setError('')
    setInputCode('')
    setAmount('')
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[500px] mx-auto px-6 py-12">
        {/* Card */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl mb-6">
            <button
              onClick={() => router.push('/wallet/send')}
              className="flex-1 py-2.5 px-4 rounded-xl text-white/50 font-medium text-sm hover:text-white transition-colors"
            >
              Send
            </button>
            <button
              onClick={() => router.push('/wallet/receive')}
              className="flex-1 py-2.5 px-4 rounded-xl text-white/50 font-medium text-sm hover:text-white transition-colors"
            >
              Receive
            </button>
            <button className="flex-1 py-2.5 px-4 rounded-xl bg-white/10 text-white font-medium text-sm">
              BLIK
            </button>
          </div>

          {/* Mode Selection */}
          {mode === 'select' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold mb-0.5">Request Payment</p>
                    <p className="text-sm text-white/50">Generate a code to receive ETH</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode('lookup')}
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.06] hover:border-white/20 transition-all text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold mb-0.5">Send Payment</p>
                    <p className="text-sm text-white/50">Enter a code to send ETH</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Create Code - Enter Amount */}
          {mode === 'create' && !createdCode && (
            <>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4">
                <label className="text-sm text-white/50 mb-2 block">Amount to receive</label>
                <div className="flex items-center justify-between">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    step="0.0001"
                    className="flex-1 bg-transparent text-4xl font-medium placeholder:text-white/20 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                        <path d="M12 1.5l-8 14h16l-8-14z"/>
                      </svg>
                    </div>
                    <span className="font-medium">ETH</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={resetMode}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCode}
                  disabled={!amount || parseFloat(amount) <= 0}
                  className="py-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  Generate
                </button>
              </div>
            </>
          )}

          {/* Create Code - Show Generated Code */}
          {mode === 'create' && createdCode && (
            <div className="text-center py-6">
              <p className="text-sm text-white/50 mb-4">Share this code with the sender</p>
              <p className="text-6xl font-mono font-bold tracking-[0.3em] mb-4">
                {createdCode.code}
              </p>
              <p className="text-2xl font-semibold mb-6">{createdCode.amount} ETH</p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-white/60">
                  Expires in {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>

              <button
                onClick={resetMode}
                className="w-full mt-6 py-4 rounded-2xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Lookup Code - Enter Code */}
          {mode === 'lookup' && !foundCode && (
            <>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-4">
                <label className="text-sm text-white/50 mb-2 block">Enter 6-digit code</label>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="w-full bg-transparent text-4xl font-mono font-medium text-center tracking-[0.4em] placeholder:text-white/20 focus:outline-none"
                  autoFocus
                />
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={resetMode}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLookupCode}
                  disabled={inputCode.length !== 6}
                  className="py-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  Find
                </button>
              </div>
            </>
          )}

          {/* Lookup Code - Confirm Send */}
          {mode === 'lookup' && foundCode && (
            <>
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-4 text-center">
                <p className="text-sm text-white/50 mb-2">Amount</p>
                <p className="text-4xl font-bold mb-4">{foundCode.amount} ETH</p>
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-white/50 mb-1">Sending to</p>
                  <p className="font-mono text-xs text-white/70 break-all">{foundCode.receiver_address}</p>
                </div>
              </div>

              {error && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={resetMode}
                  className="py-4 rounded-2xl bg-white/5 border border-white/10 font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="py-4 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition-colors disabled:opacity-40"
                >
                  {sending ? 'Sending...' : 'Confirm'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
