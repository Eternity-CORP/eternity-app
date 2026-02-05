'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import { createBlikCode, lookupBlikCode, updateBlikStatus, subscribeToBlikCode, BlikCode } from '@/lib/blik'
import Navigation from '@/components/Navigation'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

type Mode = 'select' | 'request' | 'send'

export default function BlikPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('select')
  const [address, setAddress] = useState('')
  const [wallet, setWallet] = useState<ethers.HDNodeWallet | null>(null)

  const [amount, setAmount] = useState('')
  const [createdCode, setCreatedCode] = useState<BlikCode | null>(null)
  const [timeLeft, setTimeLeft] = useState(120)

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

  const reset = () => {
    setMode('select')
    setCreatedCode(null)
    setFoundCode(null)
    setError('')
    setInputCode('')
    setAmount('')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <h1 className="text-xl font-bold text-white text-center mb-6">BLIK</h1>

            {/* Mode Selection */}
            {mode === 'select' && (
              <div className="space-y-3">
                <button
                  onClick={() => setMode('request')}
                  className="w-full p-4 bg-[#1a1a1a] border border-[#252525] rounded-xl hover:bg-[#1f1f1f] transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <polyline points="19 12 12 19 5 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Request</p>
                    <p className="text-sm text-[#6b6b6b]">Generate code to receive</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('send')}
                  className="w-full p-4 bg-[#1a1a1a] border border-[#252525] rounded-xl hover:bg-[#1f1f1f] transition-all text-left flex items-center gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#252525] flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                      <line x1="12" y1="19" x2="12" y2="5"/>
                      <polyline points="5 12 12 5 19 12"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Send</p>
                    <p className="text-sm text-[#6b6b6b]">Enter code to pay</p>
                  </div>
                </button>
              </div>
            )}

            {/* Request - Enter Amount */}
            {mode === 'request' && !createdCode && (
              <>
                <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
                  <label className="text-xs text-[#6b6b6b] mb-1 block">Amount</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 bg-transparent text-3xl font-bold text-white placeholder:text-[#4a4a4a] focus:outline-none"
                      autoFocus
                    />
                    <span className="text-lg text-[#6b6b6b]">ETH</span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCode}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40"
                  >
                    Generate
                  </button>
                </div>
              </>
            )}

            {/* Request - Show Code */}
            {mode === 'request' && createdCode && (
              <div className="text-center">
                <p className="text-sm text-[#6b6b6b] mb-4">Share this code</p>
                <p className="text-5xl font-mono font-bold tracking-[0.2em] text-white mb-2">
                  {createdCode.code}
                </p>
                <p className="text-xl text-white mb-6">{createdCode.amount} ETH</p>

                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0d2818] border border-[#134e29] rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[#22c55e] text-sm">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                </div>

                <button
                  onClick={reset}
                  className="w-full py-4 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Send - Enter Code */}
            {mode === 'send' && !foundCode && (
              <>
                <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 mb-4">
                  <label className="text-xs text-[#6b6b6b] mb-1 block">6-digit code</label>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full bg-transparent text-3xl font-mono font-bold text-white text-center tracking-[0.3em] placeholder:text-[#4a4a4a] focus:outline-none"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#2d1515] border border-[#4d2525] rounded-xl mb-4">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleLookupCode}
                    disabled={inputCode.length !== 6}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40"
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
                  <p className="text-4xl font-bold text-white mb-1">{foundCode.amount} ETH</p>
                  <p className="text-sm text-[#6b6b6b] font-mono truncate">{foundCode.receiver_address}</p>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#2d1515] border border-[#4d2525] rounded-xl mb-4">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={reset}
                    className="flex-1 py-4 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={sending}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40"
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
