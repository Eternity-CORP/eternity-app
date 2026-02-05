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
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[800px] mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <button
            onClick={() => fetchTransactions(address)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-sm font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9"/>
            </svg>
            Refresh
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#3a3a3a] border-t-white rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-[#1f1f1f] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#4a4a4a]">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-[#9b9b9b] font-medium mb-1">No transactions yet</p>
              <p className="text-[#6b6b6b] text-sm">Your transaction history will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1f1f1f]">
              {transactions.map((tx) => {
                const isSent = tx.from_address.toLowerCase() === address.toLowerCase()
                const otherAddress = isSent ? tx.to_address : tx.from_address

                return (
                  <a
                    key={tx.id}
                    href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        isSent ? 'bg-[#1f1f1f]' : 'bg-[#0d2818]'
                      }`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isSent ? 'text-[#9b9b9b]' : 'text-[#22c55e]'}>
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
                        <p className="text-sm text-[#6b6b6b]">
                          {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${isSent ? 'text-[#9b9b9b]' : 'text-[#22c55e]'}`}>
                        {isSent ? '-' : '+'}{tx.amount} {tx.token_symbol}
                      </p>
                      <p className="text-sm text-[#6b6b6b]">
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
