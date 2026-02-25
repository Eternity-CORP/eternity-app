'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/contexts/account-context'
import { ethers } from 'ethers'
import { io, type Socket } from 'socket.io-client'
import {
  createBlikSocketService,
  type BlikSocketService,
  type CodeCreatedPayload,
  type CodeInfoPayload,
  type CodeNotFoundPayload,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  resolveChainId,
  type NetworkId,
  formatErrorMessage,
} from '@e-y/shared'
import { getProvider } from '@/lib/multi-network'
import { API_BASE_URL } from '@/lib/api'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'

type Mode = 'select' | 'request' | 'send'

export default function BlikPage() {
  const router = useRouter()
  useAuthGuard()
  const { wallet, address, network, currentAccount } = useAccount()

  const [mode, setMode] = useState<Mode>('select')
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('base')
  const isTestAccount = currentAccount?.type === 'test'

  const [amount, setAmount] = useState('')
  const [createdCode, setCreatedCode] = useState<CodeCreatedPayload | null>(null)
  const [timeLeft, setTimeLeft] = useState(120)

  const [inputCode, setInputCode] = useState('')
  const [foundCode, setFoundCode] = useState<CodeInfoPayload | null>(null)
  const [sendStatus, setSendStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState('')
  const [codeCopied, setCodeCopied] = useState(false)

  const socketRef = useRef<Socket | null>(null)
  const blikServiceRef = useRef<BlikSocketService | null>(null)

  // Connect socket on mount, disconnect on unmount
  useEffect(() => {
    if (!address) return

    const socket = io(`${API_BASE_URL}/blik`, {
      transports: ['websocket'],
      autoConnect: true,
    })

    socketRef.current = socket
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const blikService = createBlikSocketService(socket as any)
    blikServiceRef.current = blikService

    socket.on('connect', () => {
      blikService.register(address)
    })

    blikService.setCallbacks({
      onCodeCreated: (payload: CodeCreatedPayload) => {
        setCreatedCode(payload)
        setTimeLeft(120)
      },
      onPaymentConfirmed: () => {
        router.push('/wallet/blik/received')
      },
      onCodeExpired: () => {
        setCreatedCode(null)
        setMode('select')
      },
      onCodeInfo: (payload: CodeInfoPayload) => {
        if (payload.receiverAddress.toLowerCase() === address.toLowerCase()) {
          setError("You can't send to yourself")
          return
        }
        setFoundCode(payload)
      },
      onCodeNotFound: (payload: CodeNotFoundPayload) => {
        const reasons: Record<string, string> = {
          not_found: 'Code not found',
          expired: 'Code has expired',
          completed: 'Code already used',
          cancelled: 'Code was cancelled',
        }
        setError(reasons[payload.reason] || 'Code not found or expired')
      },
      onError: (err) => {
        setError(err.message)
      },
    })

    return () => {
      blikService.clearCallbacks()
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      blikServiceRef.current = null
    }
  }, [address, router])

  // Timer countdown for created code
  useEffect(() => {
    if (!createdCode) return

    const interval = setInterval(() => {
      const expires = new Date(createdCode.expiresAt).getTime()
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

  const handleCreateCode = useCallback(() => {
    if (!amount || parseFloat(amount) <= 0) return

    const chainId = resolveChainId(isTestAccount, selectedNetwork)
    const tokenSymbol = isTestAccount
      ? network.symbol
      : SUPPORTED_NETWORKS[selectedNetwork].nativeCurrency.symbol

    blikServiceRef.current?.createCode({
      amount,
      tokenSymbol,
      chainId,
      receiverAddress: address,
    })
  }, [amount, selectedNetwork, isTestAccount, network.symbol, address])

  const handleLookupCode = useCallback(() => {
    if (inputCode.length !== 6) return

    setError('')
    blikServiceRef.current?.lookupCode({
      code: inputCode,
      senderAddress: address,
    })
  }, [inputCode, address])

  const handleSend = useCallback(async () => {
    if (!wallet || !foundCode) return

    setSendStatus('loading')
    setError('')

    try {
      // Resolve provider from the BLIK code's chainId
      const codeChainId = foundCode.chainId
      const networkEntry = Object.entries(SUPPORTED_NETWORKS).find(
        ([, net]) => net.chainId === codeChainId
      )
      const networkId = networkEntry ? (networkEntry[0] as NetworkId) : undefined

      let provider
      if (networkId) {
        provider = getProvider(networkId)
      } else {
        // Fallback: use current account's network (e.g. Sepolia for test accounts)
        provider = new ethers.JsonRpcProvider(network.rpcUrl)
      }
      const connectedWallet = wallet.connect(provider)

      const tx = await connectedWallet.sendTransaction({
        to: foundCode.receiverAddress,
        value: ethers.parseEther(foundCode.amount),
      })

      await tx.wait()

      const netName = networkEntry
        ? SUPPORTED_NETWORKS[networkEntry[0] as NetworkId].name
        : network.name

      blikServiceRef.current?.confirmPayment({
        code: foundCode.code,
        txHash: tx.hash,
        senderAddress: address,
        network: netName,
        chainId: codeChainId,
      })

      setSendStatus('succeeded')
      router.push(`/wallet/send/success?hash=${tx.hash}&network=${networkId || ''}`)
    } catch (err: unknown) {
      setError(formatErrorMessage(err, 'Transaction failed'))
      setSendStatus('failed')
    }
  }, [wallet, foundCode, network, address, router])

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
          <BackButton />
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
                {!isTestAccount && (
                  <div className="mb-4">
                    <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Network</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TIER1_NETWORK_IDS.map((id) => {
                        const net = SUPPORTED_NETWORKS[id]
                        const isSelected = id === selectedNetwork
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedNetwork(id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{
                              backgroundColor: isSelected ? net.color + '20' : 'transparent',
                              borderColor: isSelected ? net.color + '60' : 'rgba(255,255,255,0.08)',
                              color: isSelected ? net.color : 'rgba(255,255,255,0.4)',
                            }}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: net.color }} />
                            {net.shortName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

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
                    <span className="flex-shrink-0 text-lg font-medium text-white/40">
                      {isTestAccount ? network.symbol : SUPPORTED_NETWORKS[selectedNetwork].nativeCurrency.symbol}
                    </span>
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
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(createdCode.code)
                    setCodeCopied(true)
                    setTimeout(() => setCodeCopied(false), 2000)
                  }}
                  className="group relative inline-block mb-2"
                  title="Copy code"
                >
                  <p className="text-5xl font-mono font-bold tracking-[0.2em] text-white group-hover:text-white/80 transition-colors">
                    {createdCode.code}
                  </p>
                  <span className={`absolute -right-8 top-1/2 -translate-y-1/2 transition-opacity ${codeCopied ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                    {codeCopied ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    )}
                  </span>
                </button>
                {codeCopied && (
                  <p className="text-xs text-[#22c55e] mb-1">Copied!</p>
                )}
                <p className="text-xl text-white mb-2">{createdCode.amount} {createdCode.tokenSymbol}</p>
                {!isTestAccount && (
                  <p className="text-xs text-white/40 mb-6">
                    on {SUPPORTED_NETWORKS[selectedNetwork]?.name || 'Unknown'}
                  </p>
                )}

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
                  <p className="text-4xl font-bold text-white mb-1">{foundCode.amount} {foundCode.tokenSymbol}</p>
                  {foundCode.chainId && foundCode.chainId !== 11155111 && (
                    <p className="text-xs text-white/30 mb-1">
                      on {Object.values(SUPPORTED_NETWORKS).find(n => n.chainId === foundCode.chainId)?.name || `Chain ${foundCode.chainId}`}
                    </p>
                  )}
                  <p className="text-sm text-white/40 font-mono truncate">{foundCode.receiverAddress}</p>
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
                    disabled={sendStatus === 'loading'}
                    className="flex-1 py-4 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                  >
                    {sendStatus === 'loading' ? 'Sending...' : 'Send'}
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
