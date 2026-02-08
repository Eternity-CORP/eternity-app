'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ethers } from 'ethers'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { fetchEthUsdPrice } from '@e-y/shared'

const TOKEN_META: Record<string, { name: string; color: string; icon: string }> = {
  ETH: { name: 'Ethereum', color: '#627EEA', icon: 'E' },
  USDC: { name: 'USD Coin', color: '#2775CA', icon: 'U' },
  USDT: { name: 'Tether', color: '#26A17B', icon: 'T' },
  DAI: { name: 'Dai', color: '#F5AC37', icon: 'D' },
  WETH: { name: 'Wrapped Ether', color: '#EC1C79', icon: 'W' },
  LINK: { name: 'Chainlink', color: '#2A5ADA', icon: 'L' },
  UNI: { name: 'Uniswap', color: '#FF007A', icon: 'U' },
}

const PLACEHOLDER_TRANSACTIONS = [
  { id: 1, type: 'received', from: '0x1a2b...9c0d', amount: '0.05', date: 'Jan 15, 2025' },
  { id: 2, type: 'sent', to: '0x4e5f...1a2b', amount: '0.02', date: 'Jan 14, 2025' },
  { id: 3, type: 'received', from: '0x7g8h...3c4d', amount: '0.10', date: 'Jan 12, 2025' },
]

export default function TokenDetailPage() {
  const router = useRouter()
  const params = useParams()
  const symbol = (params.symbol as string || '').toUpperCase()

  const { isLoggedIn, address, network } = useAccount()
  const [balance, setBalance] = useState('0')
  const [balanceUsd, setBalanceUsd] = useState('0.00')
  const [loading, setLoading] = useState(true)

  const meta = TOKEN_META[symbol] || { name: symbol, color: '#888888', icon: symbol.charAt(0) }

  useEffect(() => {
    if (!isLoggedIn && address === '') return
    if (!isLoggedIn) {
      router.push('/unlock')
    }
  }, [isLoggedIn, address, router])

  useEffect(() => {
    if (!address) return
    fetchBalance()
  }, [address, network.rpcUrl, symbol])

  const fetchBalance = async () => {
    if (!address) return
    setLoading(true)

    try {
      if (symbol === 'ETH') {
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)
        const [bal, ethPrice] = await Promise.all([
          provider.getBalance(address),
          fetchEthUsdPrice(),
        ])
        const ethBalance = ethers.formatEther(bal)
        setBalance(ethBalance)
        setBalanceUsd((parseFloat(ethBalance) * (ethPrice || 0)).toFixed(2))
      } else {
        setBalance('0.0000')
        setBalanceUsd('0.00')
      }
    } catch (err) {
      console.error('Failed to fetch token balance:', err)
      setBalance('0')
      setBalanceUsd('0.00')
    } finally {
      setLoading(false)
    }
  }

  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">

          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 group"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
              <path d="M19 12H5"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>

          {/* Token Header Card */}
          <div className="glass-card gradient-border rounded-2xl p-6 mb-4">

            {/* Token Icon / Name / Symbol */}
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
                  <p className="text-white/40">${balanceUsd} USD</p>
                </>
              )}
            </div>

            {/* Send / Receive Buttons */}
            <div className="flex gap-3">
              <Link
                href="/wallet/send"
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

          {/* Price Chart Placeholder */}
          <div className="glass-card rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-4">Price Chart</h2>
            <div className="h-40 rounded-xl bg-white/3 border border-white/5 flex items-center justify-center">
              <div className="text-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20 mx-auto mb-2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <p className="text-sm text-white/30">Chart coming soon</p>
              </div>
            </div>
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

            {PLACEHOLDER_TRANSACTIONS.length === 0 ? (
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
                {PLACEHOLDER_TRANSACTIONS.map((tx) => {
                  const isSent = tx.type === 'sent'
                  return (
                    <div
                      key={tx.id}
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
                          <p className="text-sm font-semibold text-white">{isSent ? 'Sent' : 'Received'}</p>
                          <p className="text-xs text-white/40">
                            {isSent ? `To ${tx.to}` : `From ${tx.from}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isSent ? 'text-white/50' : 'text-[#22c55e]'}`}>
                          {isSent ? '-' : '+'}{tx.amount} {symbol}
                        </p>
                        <p className="text-xs text-white/40">{tx.date}</p>
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
