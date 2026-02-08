'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { ApiError, getErrorMessage } from '@e-y/shared'

const EXTERNAL_FAUCETS = [
  {
    name: 'Google Cloud',
    url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    icon: '☁️',
    description: 'Fast, no auth required',
  },
  {
    name: 'Alchemy',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    icon: '⚗️',
    description: 'Free account required',
  },
  {
    name: 'QuickNode',
    url: 'https://faucet.quicknode.com/ethereum/sepolia',
    icon: '⚡',
    description: 'Multi-chain faucet',
  },
]

type FaucetState = 'idle' | 'loading' | 'success' | 'cooldown' | 'empty' | 'error'

interface FaucetCardProps {
  address: string
  onClose: () => void
  onClaimed?: () => void
}

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default function FaucetCard({ address, onClose, onClaimed }: FaucetCardProps) {
  const [copied, setCopied] = useState(false)
  const [state, setState] = useState<FaucetState>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [cooldownMs, setCooldownMs] = useState(0)

  // Check faucet status on mount
  useEffect(() => {
    apiClient.get<{ balance: string; enabled: boolean }>('/faucet/status')
      .then((res) => {
        if (!res.enabled) setState('empty')
      })
      .catch(() => {
        // If status endpoint fails, still show claim button — it'll fail gracefully
      })
  }, [])

  // Cooldown countdown
  useEffect(() => {
    if (state !== 'cooldown' || cooldownMs <= 0) return
    const interval = setInterval(() => {
      setCooldownMs((prev) => {
        if (prev <= 60_000) {
          clearInterval(interval)
          setState('idle')
          return 0
        }
        return prev - 60_000
      })
    }, 60_000)
    return () => clearInterval(interval)
  }, [state, cooldownMs])

  const handleClaim = useCallback(async () => {
    setState('loading')
    setErrorMsg(null)

    try {
      const res = await apiClient.post<{ txHash: string; amount: string }>('/faucet/claim', { address })
      setTxHash(res.txHash)
      setState('success')
      onClaimed?.()
    } catch (error) {
      if (ApiError.isApiError(error) && error.statusCode === 429) {
        const details = error.details as { remainingMs?: number } | undefined
        setCooldownMs(details?.remainingMs ?? 24 * 60 * 60 * 1000)
        setState('cooldown')
      } else if (ApiError.isApiError(error) && error.statusCode === 503) {
        setState('empty')
      } else {
        setErrorMsg(getErrorMessage(error))
        setState('error')
      }
    }
  }, [address, onClaimed])

  const handleCopyAddress = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard may fail */ }
  }, [address])

  const handleCopyAndOpen = useCallback(async (url: string) => {
    await handleCopyAddress()
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [handleCopyAddress])

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
              <path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Get Test ETH</h3>
            <p className="text-[10px] text-white/40">Sepolia Testnet</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Address display */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5 mb-4">
        <span className="text-xs font-mono text-white/50 flex-1">Your address: {truncated}</span>
        <button
          onClick={handleCopyAddress}
          className="text-xs text-[#3388FF] hover:text-[#3388FF]/80 font-medium transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Claim button area */}
      {state !== 'empty' && (
        <div className="mb-4">
          {state === 'idle' && (
            <button
              onClick={handleClaim}
              className="w-full py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              Claim 0.001 ETH
            </button>
          )}

          {state === 'loading' && (
            <button
              disabled
              className="w-full py-3 rounded-xl bg-white/20 text-white/60 font-semibold flex items-center justify-center gap-2"
            >
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </button>
          )}

          {state === 'success' && txHash && (
            <div className="px-3 py-3 rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20">
              <p className="text-sm font-medium text-[#22C55E] mb-1">Claimed 0.001 ETH!</p>
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#3388FF] hover:underline font-mono break-all"
              >
                TX: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </a>
            </div>
          )}

          {state === 'cooldown' && (
            <div className="px-3 py-3 rounded-xl bg-white/5 border border-white/8 text-center">
              <p className="text-sm text-white/60">Next claim in</p>
              <p className="text-lg font-semibold text-white">{formatTimeRemaining(cooldownMs)}</p>
            </div>
          )}

          {state === 'error' && (
            <div className="px-3 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 mb-2">{errorMsg || 'Something went wrong'}</p>
              <button
                onClick={handleClaim}
                className="text-xs text-[#3388FF] hover:underline font-medium"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-white/5" />
        <span className="text-[10px] text-white/30 uppercase tracking-wider">
          {state === 'empty' ? 'Get from external faucets' : 'or external faucets'}
        </span>
        <div className="flex-1 h-px bg-white/5" />
      </div>

      {/* External faucet links */}
      <div className="space-y-2">
        {EXTERNAL_FAUCETS.map((faucet) => (
          <button
            key={faucet.name}
            onClick={() => handleCopyAndOpen(faucet.url)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all group"
          >
            <span className="text-lg">{faucet.icon}</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{faucet.name}</p>
              <p className="text-[11px] text-white/40">{faucet.description}</p>
            </div>
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2"
              className="text-white/20 group-hover:text-white/50 transition-colors"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
