'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@/contexts/account-context'
import { fetchTransactionHistory, truncateAddress, type TransactionHistoryItem } from '@e-y/shared'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function HistoryPage() {
  useAuthGuard()
  const { address, network } = useAccount()
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')

  useEffect(() => {
    if (!address) return
    loadTransactions(address)
  }, [address])

  const loadTransactions = async (addr: string) => {
    setStatus('loading')
    try {
      const alchemyUrl = network.rpcUrl
      const txs = await fetchTransactionHistory(alchemyUrl, addr)
      setTransactions(txs)
      setStatus('succeeded')
    } catch {
      setTransactions([])
      setStatus('failed')
    }
  }

  const formatAddress = truncateAddress
  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-semibold text-white hover:border-white/15 transition-colors"
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
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/25">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-white/50 font-medium mb-1">No transactions yet</p>
              <p className="text-white/40 text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map((tx) => {
                const isSent = tx.from.toLowerCase() === address.toLowerCase()
                const otherAddress = isSent ? tx.to : tx.from

                return (
                  <a
                    key={tx.hash}
                    href={network.explorerTxUrl(tx.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 hover:bg-white/3 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-white/5' : 'bg-[#22c55e]/8'
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSent ? 'text-white/50' : 'text-[#22c55e]'}>
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
                        <p className="font-semibold text-white">{isSent ? 'Sent' : 'Received'}</p>
                        <p className="text-sm text-white/40">
                          {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isSent ? 'text-white/50' : 'text-[#22c55e]'}`}>
                        {isSent ? '-' : '+'}{tx.amount} {tx.token}
                      </p>
                      <p className="text-sm text-white/40">
                        {formatDate(tx.createdAt)}
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
