'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { getTransactions, Transaction } from '@/lib/supabase'

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
    <main className="min-h-screen bg-vignette-grid flex items-center justify-center p-6">
      <div className="glass-card w-full max-w-sm p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/wallet')}
            className="text-white/70 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold">History</h1>
          <div className="w-12" />
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-white/50 text-center py-12">
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const isSent = tx.from_address.toLowerCase() === address.toLowerCase()
              const otherAddress = isSent ? tx.to_address : tx.from_address

              return (
                <a
                  key={tx.id}
                  href={`https://sepolia.etherscan.io/tx/${tx.hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                      <span className="text-lg">{isSent ? '↑' : '↓'}</span>
                    </div>
                    <div>
                      <p className="font-medium">{isSent ? 'Sent' : 'Received'}</p>
                      <p className="text-sm text-white/50">
                        {isSent ? 'To' : 'From'} {formatAddress(otherAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${isSent ? 'text-white/50' : 'text-white'}`}>
                      {isSent ? '-' : '+'}{tx.amount} {tx.token_symbol}
                    </p>
                    <p className="text-xs text-white/50">
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
  )
}
