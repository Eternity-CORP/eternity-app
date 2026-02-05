'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { getTransactions, Transaction } from '@/lib/supabase'
import Navigation from '@/components/Navigation'

export default function HistoryPage() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    const wallet = deriveWalletFromMnemonic(mnemonic, 0)
    setAddress(wallet.address)
    fetchTransactions(wallet.address)
  }, [router])

  const fetchTransactions = async (addr: string) => {
    setLoading(true)
    const txs = await getTransactions(addr)
    setTransactions(txs)
    setLoading(false)
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[800px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <button
            onClick={() => fetchTransactions(address)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-white/50 mb-1">No transactions yet</p>
              <p className="text-white/30 text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map((tx) => {
                const isSent = tx.from_address.toLowerCase() === address.toLowerCase()
                const otherAddress = isSent ? tx.to_address : tx.from_address

                return (
                  <a
                    key={tx.id}
                    href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-white/5' : 'bg-green-500/10'
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSent ? 'text-white/60' : 'text-green-500'}>
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
                        <p className="font-medium">{isSent ? 'Sent' : 'Received'}</p>
                        <p className="text-sm text-white/50">
                          {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${isSent ? 'text-white/70' : 'text-green-500'}`}>
                        {isSent ? '-' : '+'}{tx.amount} {tx.token_symbol}
                      </p>
                      <p className="text-sm text-white/40">
                        {formatDate(tx.created_at)}
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
