'use client'

import type { SwapPreview } from '@e-y/shared'
import ChatCardShell from './ChatCardShell'

interface SwapCardProps {
  swap: SwapPreview
  onConfirm: (swap: SwapPreview) => void
  onCancel: () => void
}

function ExchangeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H4" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  )
}

function parsePriceImpact(impact: string): number {
  return parseFloat(impact.replace('%', '').replace('+', ''))
}

export default function SwapCard({ swap, onConfirm, onCancel }: SwapCardProps) {
  const impactValue = parsePriceImpact(swap.priceImpact)
  const isNegativeImpact = impactValue < -1
  const impactColor = isNegativeImpact ? 'text-[#EF4444]' : 'text-[#22C55E]'

  return (
    <ChatCardShell className="border border-white/10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-[#3388FF]/15 flex items-center justify-center text-[#3388FF]">
            <ExchangeIcon />
          </div>
          <span className="text-sm font-semibold text-white">Swap Preview</span>
        </div>

        {/* Token pair */}
        <div className="space-y-1 mb-4">
          {/* From token */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">You pay</span>
              <p className="text-sm text-white font-medium mt-0.5">
                {swap.fromToken.amount} {swap.fromToken.symbol}
              </p>
            </div>
            <span className="text-xs text-white/40">${swap.fromToken.amountUsd}</span>
          </div>

          {/* Arrow */}
          <div className="flex justify-center -my-1.5 relative z-10">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/60">
              <ArrowDownIcon />
            </div>
          </div>

          {/* To token */}
          <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-white/40">You receive</span>
              <p className="text-sm text-white font-medium mt-0.5">
                {swap.toToken.amount} {swap.toToken.symbol}
              </p>
            </div>
            <span className="text-xs text-white/40">${swap.toToken.amountUsd}</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Rate</span>
            <span className="text-sm text-white">{swap.rate}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Price impact</span>
            <span className={`text-sm ${impactColor}`}>{swap.priceImpact}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Gas fee</span>
            <span className="text-sm text-white">
              {swap.estimatedGas} ETH
              <span className="text-white/30"> (${swap.estimatedGasUsd})</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">Slippage</span>
            <span className="text-sm text-white">{swap.slippage}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-white/60">
            {swap.network}
          </span>

          {swap.requiresApproval && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B]">
              Requires Approval
            </span>
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
          <button
            onClick={() => onConfirm(swap)}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-black shimmer cursor-pointer hover:bg-white/90 transition-colors"
          >
            Confirm Swap
          </button>
        </div>
    </ChatCardShell>
  )
}
