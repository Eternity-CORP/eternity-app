'use client'

import type { RoutingResult } from '@/lib/routing-service'
import { SUPPORTED_NETWORKS } from '@e-y/shared'

interface BridgeBannerProps {
  route: RoutingResult
  onProceed: () => void
  onCancel: () => void
  loading?: boolean
}

export default function BridgeBanner({ route, onProceed, onCancel, loading }: BridgeBannerProps) {
  if (route.type === 'direct' || route.type === 'insufficient') return null

  const fromNet = SUPPORTED_NETWORKS[route.fromNetwork]
  const toNet = SUPPORTED_NETWORKS[route.toNetwork]

  const isExpensive = route.costLevel === 'expensive'
  const isWarning = route.costLevel === 'warning'

  return (
    <div className={`rounded-xl p-4 mb-4 border ${
      isExpensive
        ? 'bg-[#EF4444]/5 border-[#EF4444]/20'
        : isWarning
          ? 'bg-[#F59E0B]/5 border-[#F59E0B]/20'
          : 'bg-[#3388FF]/5 border-[#3388FF]/20'
    }`}>
      {/* Route Info */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fromNet.color }} />
          <span className="text-xs font-medium text-[var(--foreground-muted)]">{fromNet.name}</span>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground-subtle)]">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: toNet.color }} />
          <span className="text-xs font-medium text-[var(--foreground-muted)]">{toNet.name}</span>
        </div>
      </div>

      {/* Fee & Time */}
      {route.bridgeFeeUsd != null && (
        <div className="flex items-center justify-between text-xs mb-3">
          <div>
            <span className="text-[var(--foreground-subtle)]">Fee: </span>
            <span className={`font-medium ${isExpensive ? 'text-[#EF4444]' : isWarning ? 'text-[#F59E0B]' : 'text-[var(--foreground-muted)]'}`}>
              ${route.bridgeFeeUsd.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[var(--foreground-subtle)]">Time: </span>
            <span className="text-[var(--foreground-muted)] font-medium">{route.estimatedTime}</span>
          </div>
        </div>
      )}

      {/* Warning */}
      {isExpensive && (
        <p className="text-xs text-[#EF4444]/80 mb-3">
          Bridge fees are very high for this amount. Consider sending on {fromNet.name} instead.
        </p>
      )}
      {isWarning && (
        <p className="text-xs text-[#F59E0B]/80 mb-3">
          Bridge fees are moderate. You may want to consider alternative options.
        </p>
      )}

      <p className="text-xs text-[var(--foreground-subtle)] mb-3">{route.message}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg glass-card text-[var(--foreground-muted)] text-xs font-medium"
        >
          Cancel
        </button>
        <button
          onClick={onProceed}
          disabled={loading}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
            isExpensive
              ? 'bg-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/30'
              : 'bg-[var(--foreground)] text-[var(--background)] shimmer hover:opacity-90'
          }`}
        >
          {loading ? 'Processing...' : isExpensive ? 'Bridge Anyway' : 'Bridge'}
        </button>
      </div>
    </div>
  )
}
