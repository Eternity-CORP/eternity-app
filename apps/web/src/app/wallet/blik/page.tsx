'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/contexts/account-context'
import { ethers } from 'ethers'
import { createBlikCode, lookupBlikCode, updateBlikStatus, subscribeToBlikCode, BlikCode } from '@/lib/blik'
import Navigation from '@/components/Navigation'

type Mode = 'select' | 'request' | 'send'

export default function BlikPage() {
  const router = useRouter()
  const { wallet, address, network, isLoggedIn } = useAccount()

  const [mode, setMode] = useState<Mode>('select')

  const [amount, setAmount] = useState('')
  const [createdCode, setCreatedCode] = useState<BlikCode | null>(null)
  const [timeLeft, setTimeLeft] = useState(120)

  const [inputCode, setInputCode] = useState('')
  const [foundCode, setFoundCode] = useState<BlikCode | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isLoggedIn && address === '') return
    if (!isLoggedIn) router.push('/unlock')
  }, [isLoggedIn, address])

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

      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
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

  const reset = () => {
    setMode('select')
    setCreatedCode(null)
    setFoundCode(null)
    setError('')
    setInputCode('')
    setAmount('')
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">BLIK</h1>

            {/* Mode Selection */}
            {mode === 'select' && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('request')}
                  className="w-full p-4 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Request</p>
                    <p className="text-sm text-white/40">Generate code to receive</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('send')}
                  className="w-full p-4 bg-white/3 border border-white/8 rounded-xl hover:bg-white/5 transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/8 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Send</p>
                    <p className="text-sm text-white/40">Enter code to pay</p>
                  </div>
                </button>
              </div>
            )}

            {/* Request - Enter Amount */}
            {mode === 'request' && !createdCode && (
              <>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Amount</label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                      autoFocus
                    />
                    <span className="flex-shrink-0 text-lg font-medium text-white/40">{network.symbol}</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCode}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}

            {/* Request - Show Code */}
            {mode === 'request' && createdCode && (
              <div className="text-center">
                <p className="text-sm text-white/40 mb-4">Share this code</p>
                <p className="text-5xl font-mono font-bold tracking-[0.2em] text-white mb-2">
                  {createdCode.code}
                </p>
                <p className="text-xl text-white mb-6">{createdCode.amount} {network.symbol}</p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[#22c55e] text-sm">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <button
                  onClick={reset}
                  className="w-full py-4 rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Send - Enter Code */}
            {mode === 'send' && !foundCode && (
              <>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">6-digit code</label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-transparent text-3xl font-mono font-bold text-white text-center tracking-[0.3em] placeholder:text-white/25 focus:outline-none"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLookupCode}
                    disabled={inputCode.length !== 6}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                  >
                    Find
                  </button>
                </div>
              </>
            )}

            {/* Send - Confirm */}
            {mode === 'send' && foundCode && (
              <>
                <div className="text-center mb-6">
                  <p className="text-4xl font-bold text-white mb-1">{foundCode.amount} {network.symbol}</p>
                  <p className="text-sm text-white/40 font-mono truncate">{foundCode.receiver_address}</p>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl glass-card font-semibold text-white hover:border-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
