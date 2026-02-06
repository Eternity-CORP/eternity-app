'use client'

import { useState, useEffect, useCallback } from 'react'

type BlikPreview =
  | {
      type: 'generate'
      id: string
      code: string
      amount: string
      token: string
      amountUsd: string
      expiresAt: number
      status: string
    }
  | {
      type: 'pay'
      id: string
      code: string
      amount: string
      token: string
      amountUsd: string
      receiverAddress: string
      receiverUsername?: string
      estimatedGas?: string
      estimatedGasUsd?: string
      network?: string
      status: string
    }

interface BlikCardProps {
  blik: BlikPreview
  onConfirmPay?: (blik: BlikPreview) => void
  onCancel: () => void
}

function formatCode(code: string): string {
  const digits = code.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)}`
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function BlikGenerateView({ blik, onCancel }: { blik: Extract<BlikPreview, { type: 'generate' }>; onCancel: () => void }) {
  const [remaining, setRemaining] = useState(blik.expiresAt - Date.now())
  const [copied, setCopied] = useState(false)
  const expired = remaining <= 0
  const paid = blik.status === 'paid'

  useEffect(() => {
    if (paid || expired) return
    const interval = setInterval(() => {
      const left = blik.expiresAt - Date.now()
      setRemaining(left)
      if (left <= 0) clearInterval(interval)
    }, 1000)
    return () => clearInterval(interval)
  }, [blik.expiresAt, paid, expired])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(blik.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }, [blik.code])

  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-2xl p-4 max-w-[320px] w-full" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">BLIK Code</span>
        </div>

        {/* Code display */}
        <div className="text-center mb-4">
          {paid ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/20">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span className="text-xs font-semibold text-[#22C55E]">Payment received!</span>
            </div>
          ) : expired ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/20">
              <span className="text-xs font-semibold text-[#EF4444]">Code expired</span>
            </div>
          ) : null}

          <button
            onClick={handleCopy}
            disabled={expired && !paid}
            className={`
              mt-3 block w-full text-center text-3xl font-mono font-bold tracking-[0.2em] py-3 rounded-xl transition-colors cursor-pointer
              ${expired && !paid
                ? 'text-white/20 bg-white/3'
                : 'text-[#8B5CF6] bg-[#8B5CF6]/10 hover:bg-[#8B5CF6]/15'
              }
            `}
          >
            {formatCode(blik.code)}
          </button>

          {copied && (
            <p className="text-[10px] text-[#22C55E] mt-1">Copied!</p>
          )}

          {/* Timer */}
          {!paid && !expired && (
            <p className={`text-xs mt-2 font-mono ${remaining < 30000 ? 'text-[#EF4444]' : 'text-white/40'}`}>
              {formatCountdown(remaining)}
            </p>
          )}
        </div>

        {/* Amount */}
        <div className="text-center mb-4">
          <p className="text-sm text-white font-medium">{blik.amount} {blik.token}</p>
          <p className="text-[10px] text-white/30">${blik.amountUsd}</p>
        </div>

        {/* Cancel */}
        {!paid && (
          <button
            onClick={onCancel}
            className="w-full px-3 py-2 rounded-xl text-xs font-medium text-white/60 glass-card hover:text-white/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function BlikPayView({ blik, onConfirmPay, onCancel }: { blik: Extract<BlikPreview, { type: 'pay' }>; onConfirmPay?: (blik: BlikPreview) => void; onCancel: () => void }) {
  return (
    <div className="flex justify-start">
      <div className="glass-card rounded-2xl p-4 max-w-[320px] w-full" style={{ borderColor: 'rgba(139, 92, 246, 0.2)' }}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#8B5CF6]/15 flex items-center justify-center text-[#8B5CF6]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">BLIK Payment</span>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Amount</span>
            <p className="text-sm text-white font-medium mt-0.5">{blik.amount} {blik.token}</p>
            <p className="text-[10px] text-white/30">${blik.amountUsd}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">BLIK Code</span>
            <p className="text-sm text-white font-mono mt-0.5">{formatCode(blik.code)}</p>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-white/40">Receiver</span>
            <p className="text-xs text-white mt-0.5">
              {blik.receiverUsername || truncateAddress(blik.receiverAddress)}
            </p>
          </div>

          {blik.network && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Network</span>
              <p className="text-xs text-white/60 mt-0.5">{blik.network}</p>
            </div>
          )}

          {blik.estimatedGas && (
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Gas fee</span>
              <p className="text-xs text-white/60 mt-0.5">
                {blik.estimatedGas} ETH
                {blik.estimatedGasUsd && <span className="text-white/30"> (${blik.estimatedGasUsd})</span>}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-white/60 glass-card hover:text-white/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          {onConfirmPay && (
            <button
              onClick={() => onConfirmPay(blik)}
              className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-[#8B5CF6] text-white cursor-pointer hover:bg-[#8B5CF6]/80 transition-colors"
            >
              Pay
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BlikCard({ blik, onConfirmPay, onCancel }: BlikCardProps) {
  if (blik.type === 'generate') {
    return <BlikGenerateView blik={blik} onCancel={onCancel} />
  }

  return <BlikPayView blik={blik} onConfirmPay={onConfirmPay} onCancel={onCancel} />
}
