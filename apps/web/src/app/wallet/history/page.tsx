'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { getTransactions, Transaction } from '@/lib/supabase'
import Link from 'next/link'

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

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <Link href="/wallet" className="text-white/50 hover:text-white transition-colors">
            ← Back to Wallet
          </Link>
          <h1 className="text-xl font-bold">Transaction History</h1>
          <div className="w-32" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-8 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-bold mb-3">Transaction History</h2>
          <p className="text-white/50">View all your past transactions</p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <p className="text-white/50 text-lg">No transactions yet</p>
            <p className="text-white/30 mt-2">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => {
              const isSent = tx.from_address.toLowerCase() === address.toLowerCase()
              const otherAddress = isSent ? tx.to_address : tx.from_address

              return (
                <a
                  key={tx.id}
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
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
                        <p className="font-semibold text-lg">{isSent ? 'Sent' : 'Received'}</p>
                        <p className="text-sm text-white/50">
                          {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold text-lg ${isSent ? 'text-white/70' : 'text-white'}`}>
                        {isSent ? '-' : '+'}{tx.amount} {tx.token_symbol}
                      </p>
                      <p className="text-sm text-white/40">
                        {formatDate(tx.created_at)}
                      </p>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
