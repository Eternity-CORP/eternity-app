'use client'

import { useState } from 'react'
import { useBalance } from '@/contexts/balance-context'
import type { AggregatedTokenBalance } from '@e-y/shared'
import { TOKEN_COLORS } from '@/constants/tokens'

interface TokenSelectorProps {
  selectedSymbol: string
  onSelect: (token: AggregatedTokenBalance) => void
}

export default function TokenSelector({ selectedSymbol, onSelect }: TokenSelectorProps) {
  const { aggregatedBalances } = useBalance()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === selectedSymbol.toUpperCase(),
  )

  const filtered = aggregatedBalances.filter((t) =>
    t.symbol.toLowerCase().includes(search.toLowerCase()) ||
    t.name.toLowerCase().includes(search.toLowerCase()),
  )

  const color = TOKEN_COLORS[selectedSymbol.toUpperCase()] || '#888'

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg glass-card hover:bg-white/8 transition-colors"
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
          style={{ backgroundColor: `${color}30`, border: `1.5px solid ${color}50` }}
        >
          {selectedSymbol.charAt(0)}
        </span>
        <span className="text-lg font-medium text-white">{selectedSymbol}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/40">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative w-full max-w-[420px] max-h-[80vh] glass-card rounded-t-2xl sm:rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-lg font-semibold text-white">Select Token</h3>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="p-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tokens..."
                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/15"
                autoFocus
              />
            </div>

            {/* Token List */}
            <div className="overflow-y-auto max-h-[50vh] px-2 pb-4">
              {filtered.length === 0 ? (
                <p className="text-center text-white/40 text-sm py-8">No tokens found</p>
              ) : (
                filtered.map((token) => {
                  const isSelected = token.symbol.toUpperCase() === selectedSymbol.toUpperCase()
                  const tokenColor = TOKEN_COLORS[token.symbol.toUpperCase()] || '#888'

                  return (
                    <button
                      key={token.symbol}
                      onClick={() => {
                        onSelect(token)
                        setOpen(false)
                        setSearch('')
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                        isSelected ? 'bg-white/8' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: `${tokenColor}20`, border: `1.5px solid ${tokenColor}40` }}
                        >
                          {token.symbol.charAt(0)}
                        </span>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-white">{token.symbol}</p>
                          <p className="text-xs text-white/40">{token.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-white">{parseFloat(token.totalBalance).toFixed(4)}</p>
                        {token.totalUsdValue > 0 && (
                          <p className="text-xs text-white/40">${token.totalUsdValue.toFixed(2)}</p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
