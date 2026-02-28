'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@/contexts/account-context'
import {
  fetchTransactionHistory,
  fetchMultiChainTransactionHistory,
  truncateAddress,
  buildMultiNetworkRpcUrls,
  TIER1_NETWORK_IDS,
  SUPPORTED_NETWORKS,
  formatTransactionDate,
  type TransactionHistoryItem,
  type NetworkId,
} from '@e-y/shared'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import { ALCHEMY_KEY } from '@/lib/config'

export default function HistoryPage() {
  useAuthGuard()
  const { address, network, currentAccount } = useAccount()
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')

  useEffect(() => {
    if (!address) return
    loadTransactions(address)
  }, [address, currentAccount?.type])

  const loadTransactions = async (addr: string) => {
    setStatus('loading')
    try {
      const isReal = currentAccount?.type === 'real'

      if (isReal && ALCHEMY_KEY) {
        // Multi-chain: fetch from all 5 networks in parallel
        const rpcUrls = buildMultiNetworkRpcUrls(ALCHEMY_KEY)
        const networks = TIER1_NETWORK_IDS.map(id => ({
          networkId: id,
          alchemyUrl: rpcUrls[id].alchemyUrl,
        }))
        const txs = await fetchMultiChainTransactionHistory(networks, addr, 20)
        setTransactions(txs)
      } else {
        // Single-chain: test/business accounts
        const alchemyUrl = network.rpcUrl
        const txs = await fetchTransactionHistory(alchemyUrl, addr)
        setTransactions(txs)
      }

      setStatus('succeeded')
    } catch {
      setTransactions([])
      setStatus('failed')
    }
  }

  const formatAddress = truncateAddress

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="max-w-[800px] mx-auto px-8 py-8">
        <BackButton />
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gradient">Transaction History</h1>
          <button
            onClick={() => loadTransactions(address)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-semibold text-[var(--foreground)] hover:border-[var(--border)] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="glass-card gradient-border rounded-2xl overflow-hidden">
          {status === 'loading' ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--foreground-subtle)]">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-[var(--foreground-muted)] font-medium mb-1">No transactions yet</p>
              <p className="text-[var(--foreground-subtle)] text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {transactions.map((tx) => {
                const isSent = tx.from.toLowerCase() === address.toLowerCase()
                const otherAddress = isSent ? tx.to : tx.from
                const netConfig = tx.networkId ? SUPPORTED_NETWORKS[tx.networkId as NetworkId] : null
                const explorerBase = netConfig?.blockExplorer || ''
                const txUrl = explorerBase
                  ? `${explorerBase}/tx/${tx.hash}`
                  : network.explorerTxUrl(tx.hash)

                return (
                  <a
                    key={`${tx.hash}-${tx.networkId || 'default'}`}
                    href={txUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 hover:bg-[var(--surface)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-[var(--surface)]' : 'bg-[#22c55e]/8'
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSent ? 'text-[var(--foreground-muted)]' : 'text-[#22c55e]'}>
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-[var(--foreground)]">{isSent ? 'Sent' : 'Received'}</p>
                          {netConfig && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[var(--surface)] text-[10px] text-[var(--foreground-muted)]">
                              <span
                                className="w-1.5 h-1.5 rounded-full inline-block"
                                style={{ backgroundColor: netConfig.color }}
                              />
                              {netConfig.shortName}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[var(--foreground-subtle)]">
                          {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isSent ? 'text-[var(--foreground-muted)]' : 'text-[#22c55e]'}`}>
                        {isSent ? '-' : '+'}{tx.amount} {tx.token}
                      </p>
                      <p className="text-sm text-[var(--foreground-subtle)]">
                        {formatTransactionDate(tx.createdAt)}
                      </p>
                    </div>
                  </a>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
