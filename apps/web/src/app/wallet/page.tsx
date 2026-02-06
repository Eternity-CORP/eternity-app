'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import Link from 'next/link'
import Navigation from '@/components/Navigation'
import ChatContainer from '@/components/chat/ChatContainer'
import { useAccount } from '@/contexts/account-context'

export default function WalletDashboard() {
  const router = useRouter()
  const { isLoggedIn, address, network, currentAccount, uiMode } = useAccount()
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [balanceUsd, setBalanceUsd] = useState('0.00')

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/unlock')
      return
    }
    fetchBalance()
  }, [isLoggedIn, address, network.rpcUrl])

  const fetchBalance = async () => {
    if (!address) return
    try {
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
      const bal = await provider.getBalance(address)
      const ethBalance = ethers.formatEther(bal)
      setBalance(ethBalance)
      setBalanceUsd((parseFloat(ethBalance) * 2500).toFixed(2))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  // AI Mode
  if (uiMode === 'ai') {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <ChatContainer />
      </div>
    )
  }

  // Classic Mode
  const formattedBalance = parseFloat(balance).toFixed(4)
  const networkColor = currentAccount?.type === 'real' ? '#22c55e' : '#F59E0B'

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          {/* Main Card */}
          <div className="glass-card gradient-border rounded-2xl p-6">
            {/* Balance */}
            <div className="text-center mb-8">
              {loading ? (
                <div className="h-12 w-40 bg-white/5 rounded-xl animate-pulse mx-auto" />
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-1">
                    <span className="text-5xl font-bold text-gradient">{formattedBalance}</span>
                    <span className="text-xl font-medium text-white/40">{network.symbol}</span>
                  </div>
                  <p className="text-white/40">${balanceUsd} USD</p>
                </>
              )}
            </div>

            {/* Primary Actions */}
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

          {/* Secondary Actions */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <Link
              href="/wallet/blik"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl glass-card-glow text-white transition-all hover:scale-[1.03] active:scale-[0.97] group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-[#3388FF] transition-colors">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M7 15h0M2 9.5h20"/>
              </svg>
              <span className="text-xs font-medium">BLIK</span>
            </Link>
            <Link
              href="/wallet/scheduled"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl glass-card-glow text-white transition-all hover:scale-[1.03] active:scale-[0.97] group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-[#00E5FF] transition-colors">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span className="text-xs font-medium">Scheduled</span>
            </Link>
            <Link
              href="/wallet/split"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl glass-card-glow text-white transition-all hover:scale-[1.03] active:scale-[0.97] group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-[#22c55e] transition-colors">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span className="text-xs font-medium">Split</span>
            </Link>
            <Link
              href="/wallet/swap"
              className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl glass-card-glow text-white transition-all hover:scale-[1.03] active:scale-[0.97] group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:text-[#3388FF] transition-colors">
                <path d="M16 3l4 4-4 4"/>
                <path d="M20 7H4"/>
                <path d="M8 21l-4-4 4-4"/>
                <path d="M4 17h16"/>
              </svg>
              <span className="text-xs font-medium">Swap</span>
            </Link>
          </div>

          {/* Network indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <span className="w-2 h-2 rounded-full pulse-ring" style={{ backgroundColor: networkColor, color: networkColor }} />
            <span className="text-sm text-white/40">{network.name}{currentAccount?.type === 'test' ? ' Testnet' : ''}</span>
          </div>
        </div>
      </main>
    </div>
  )
}
