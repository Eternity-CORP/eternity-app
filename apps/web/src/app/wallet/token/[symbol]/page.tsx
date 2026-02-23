'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import {
  fetchTransactionHistory,
  fetchMultiChainTransactionHistory,
  type TransactionHistoryItem,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  buildMultiNetworkRpcUrls,
  type NetworkId,
  formatUsd,
} from '@e-y/shared'
import PriceChart from '@/components/PriceChart'
import { useAuthGuard } from '@/hooks/useAuthGuard'

const TOKEN_META: Record<string, { name: string; color: string; icon: string }> = {
  ETH: { name: 'Ethereum', color: '#627EEA', icon: 'E' },
  USDC: { name: 'USD Coin', color: '#2775CA', icon: 'U' },
  USDT: { name: 'Tether', color: '#26A17B', icon: 'T' },
  DAI: { name: 'Dai', color: '#F5AC37', icon: 'D' },
  WETH: { name: 'Wrapped Ether', color: '#EC1C79', icon: 'W' },
  LINK: { name: 'Chainlink', color: '#2A5ADA', icon: 'L' },
  UNI: { name: 'Uniswap', color: '#FF007A', icon: 'U' },
  MATIC: { name: 'Polygon', color: '#8247E5', icon: 'M' },
  WBTC: { name: 'Wrapped Bitcoin', color: '#F7931A', icon: 'B' },
  AAVE: { name: 'Aave', color: '#B6509E', icon: 'A' },
}

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function TokenDetailPage() {
  const params = useParams()
  const symbol = (params.symbol as string || '').toUpperCase()

  useAuthGuard()
  const { address, currentAccount } = useAccount()
  const { aggregatedBalances, loading: balanceLoading } = useBalance()

  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [txStatus, setTxStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')

  const meta = TOKEN_META[symbol] || { name: symbol, color: '#888888', icon: symbol.charAt(0) }

  // Fetch transaction history
  useEffect(() => {
    if (!address || !ALCHEMY_KEY) {
      setTxStatus('idle')
      return
    }

    const isReal = currentAccount?.type === 'real'

    if (isReal) {
      // Multi-chain: fetch from all 5 networks
      const rpcUrls = buildMultiNetworkRpcUrls(ALCHEMY_KEY)
      const networks = TIER1_NETWORK_IDS.map(id => ({
        networkId: id,
        alchemyUrl: rpcUrls[id].alchemyUrl,
      }))
      fetchMultiChainTransactionHistory(networks, address, 10)
        .then((txs) => { setTransactions(txs); setTxStatus('succeeded') })
        .catch(() => { setTransactions([]); setTxStatus('failed') })
    } else {
      // Single-chain: test/business
      const alchemyNetwork = 'eth-sepolia'
      const alchemyUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      fetchTransactionHistory(alchemyUrl, address, 10)
        .then((txs) => { setTransactions(txs); setTxStatus('succeeded') })
        .catch(() => { setTransactions([]); setTxStatus('failed') })
    }
  }, [address, currentAccount?.type])

  // Get token data from balance context
  const tokenData = aggregatedBalances.find(
    (t) => t.symbol.toUpperCase() === symbol,
  )
  const balance = tokenData?.totalBalance || '0'
  const balanceUsd = tokenData?.totalUsdValue || 0
  const networks = tokenData?.networks || []
  const loading = balanceLoading

  const formattedBalance = parseFloat(balance).toFixed(4)

  // Filter transactions for this token
  const tokenTxs = symbol === 'ETH'
    ? transactions
    : transactions.filter((tx) => tx.token.toUpperCase() === symbol)

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">

          <BackButton />

          {/* Token Header Card */}
          <div className="glass-card gradient-border rounded-2xl p-6 mb-4">
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3"
                style={{ backgroundColor: `${meta.color}20`, border: `2px solid ${meta.color}40` }}
              >
                {meta.icon}
              </div>
              <h1 className="text-xl font-semibold text-white">{meta.name}</h1>
              <p className="text-sm text-white/40">{symbol}</p>
            </div>

            {/* Balance */}
            <div className="text-center mb-6">
              {loading ? (
                <div className="h-12 w-40 bg-white/5 rounded-xl animate-pulse mx-auto" />
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="text-4xl font-bold text-gradient">{formattedBalance}</span>
                    <span className="text-lg font-medium text-white/40">{symbol}</span>
                  </div>
                  <p className="text-white/40">{formatUsd(balanceUsd)}</p>
                </>
              )}
            </div>

            {/* Send / Receive Buttons */}
            <div className="flex gap-3">
              <Link
                href={`/wallet/send?token=${symbol}`}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl bg-white text-black font-semibold hover:bg-white/90 transition-all shimmer hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
                Send
              </Link>
              <Link
                href="/wallet/receive"
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-xl glass-card text-white font-semibold hover:border-white/15 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <polyline points="19 12 12 19 5 12"/>
                </svg>
                Receive
              </Link>
            </div>
          </div>

          {/* Per-Network Breakdown — show only networks with positive balance */}
          {(() => {
            const activeNetworks = networks.filter(n => parseFloat(n.balance) > 0)
            return activeNetworks.length > 1 ? (
              <div className="glass-card rounded-2xl p-5 mb-4">
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">Network Breakdown</h2>
                <div className="space-y-2">
                  {activeNetworks.map((n) => {
                    const netConfig = SUPPORTED_NETWORKS[n.networkId as NetworkId]
                    return (
                      <div key={n.networkId} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: netConfig?.color || '#888' }}
                          />
                          <span className="text-sm font-medium text-white/70">{netConfig?.name || n.networkId}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-white">{parseFloat(n.balance).toFixed(4)}</span>
                          <span className="text-xs text-white/40 ml-2">{formatUsd(n.usdValue)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null
          })()}

          {/* Price Chart */}
          <div className="mb-4">
            <PriceChart symbol={symbol} />
          </div>

          {/* Recent Transactions */}
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Recent Transactions</h2>
              <Link
                href="/wallet/history"
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                View All
              </Link>
            </div>

            {txStatus === 'loading' ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : tokenTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <p className="text-white/40 text-sm">No transactions yet</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {tokenTxs.map((tx) => {
                  const isSent = tx.direction === 'sent'
                  const addr = isSent ? tx.to : tx.from
                  const shortAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`
                  const txNetConfig = tx.networkId ? SUPPORTED_NETWORKS[tx.networkId as NetworkId] : null

                  return (
                    <div
                      key={`${tx.hash}-${tx.networkId || 'default'}`}
                      className="flex items-center justify-between p-4 hover:bg-white/3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isSent ? 'bg-white/5' : 'bg-[#22c55e]/8'
                        }`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSent ? 'text-white/50' : 'text-[#22c55e]'}>
                            {isSent ? (
                              <>
                                <line x1="12" y1="19" x2="12" y2="5"/>
                                <polyline points="5 12 12 5 19 12"/>
                              </>
                            ) : (
                              <>
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <polyline points="19 12 12 19 5 12"/>
                              </>
                            )}
                          </svg>
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-white">{isSent ? 'Sent' : 'Received'}</p>
                            {txNetConfig && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/5 text-[10px] text-white/50">
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ backgroundColor: txNetConfig.color }}
                                />
                                {txNetConfig.shortName}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-white/40">
                            {isSent ? `To ${shortAddr}` : `From ${shortAddr}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isSent ? 'text-white/50' : 'text-[#22c55e]'}`}>
                          {isSent ? '-' : '+'}{parseFloat(tx.amount).toFixed(4)} {tx.token}
                        </p>
                        <p className="text-xs text-white/40">{formatDate(tx.timestamp)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
