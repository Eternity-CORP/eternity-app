'use client'

import Link from 'next/link'
import { useBalance } from '@/contexts/balance-context'
import { SUPPORTED_NETWORKS, type NetworkId, formatUsd } from '@e-y/shared'
import { TOKEN_COLORS } from '@/constants/tokens'

function formatBalance(balance: string): string {
  const num = parseFloat(balance)
  if (num >= 1000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (num >= 1) return num.toFixed(4)
  if (num > 0) return num.toFixed(6)
  return '0'
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/5" />
        <div>
          <div className="h-4 w-16 bg-white/5 rounded mb-1" />
          <div className="h-3 w-24 bg-white/5 rounded" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-4 w-20 bg-white/5 rounded mb-1 ml-auto" />
        <div className="h-3 w-14 bg-white/5 rounded ml-auto" />
      </div>
    </div>
  )
}

export default function TokenList() {
  const { aggregatedBalances, loading } = useBalance()

  if (loading) {
    return (
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Tokens</h2>
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (aggregatedBalances.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <p className="text-white/40 text-sm">No tokens found</p>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Tokens</h2>
      </div>
      <div className="divide-y divide-white/5">
        {aggregatedBalances.map((token) => {
          const color = TOKEN_COLORS[token.symbol.toUpperCase()] || '#888888'
          const initial = token.symbol.charAt(0)

          return (
            <Link
              key={token.symbol}
              href={`/wallet/token/${token.symbol}`}
              className="flex items-center justify-between p-4 hover:bg-white/3 transition-colors group"
            >
              <div className="flex items-center gap-3">
                {/* Token icon */}
                {token.iconUrl ? (
                  <img
                    src={token.iconUrl}
                    alt={token.symbol}
                    className="w-10 h-10 rounded-full"
                    onError={(e) => {
                      // Fallback to initial
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      target.nextElementSibling?.classList.remove('hidden')
                    }}
                  />
                ) : null}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${token.iconUrl ? 'hidden' : ''}`}
                  style={{ backgroundColor: `${color}20`, border: `2px solid ${color}40` }}
                >
                  {initial}
                </div>

                <div>
                  <p className="text-sm font-semibold text-white group-hover:text-white/90">
                    {token.symbol}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-white/40">{token.name}</span>
                    {/* Network dots */}
                    {token.networks.length > 1 && (
                      <div className="flex -space-x-1">
                        {token.networks.slice(0, 3).map((n) => {
                          const netConfig = SUPPORTED_NETWORKS[n.networkId as NetworkId]
                          return netConfig ? (
                            <span
                              key={n.networkId}
                              className="w-2.5 h-2.5 rounded-full border border-black"
                              style={{ backgroundColor: netConfig.color }}
                              title={netConfig.name}
                            />
                          ) : null
                        })}
                        {token.networks.length > 3 && (
                          <span className="text-[10px] text-white/30 ml-1">
                            +{token.networks.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {formatBalance(token.totalBalance)}
                </p>
                <p className="text-xs text-white/40">{formatUsd(token.totalUsdValue)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
