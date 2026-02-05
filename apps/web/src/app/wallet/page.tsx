'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import Link from 'next/link'
import Navigation from '@/components/Navigation'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

export default function WalletDashboard() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [balanceUsd, setBalanceUsd] = useState('0.00')

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    try {
      const wallet = deriveWalletFromMnemonic(mnemonic, 0)
      setAddress(wallet.address)
      fetchBalance(wallet.address)
    } catch (err) {
      console.error(err)
      router.push('/unlock')
    }
  }, [router])

  const fetchBalance = async (addr: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(
        `https://eth-${NETWORK}.g.alchemy.com/v2/${ALCHEMY_KEY}`
      )
      const bal = await provider.getBalance(addr)
      const ethBalance = ethers.formatEther(bal)
      setBalance(ethBalance)
      // Mock USD conversion (in production, fetch from API)
      setBalanceUsd((parseFloat(ethBalance) * 2500).toFixed(2))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const formattedBalance = parseFloat(balance).toFixed(4)

  const quickActions = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="19" x2="12" y2="5"/>
          <polyline points="5 12 12 5 19 12"/>
        </svg>
      ),
      label: 'Send',
      href: '/wallet/send',
      primary: true,
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <polyline points="19 12 12 19 5 12"/>
        </svg>
      ),
      label: 'Receive',
      href: '/wallet/receive',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/>
          <path d="M7 15h0M2 9.5h20"/>
        </svg>
      ),
      label: 'BLIK',
      href: '/wallet/blik',
    },
  ]

  return (
    <div className="min-h-screen bg-black">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Balance Card */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-3xl p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-white/50 text-sm mb-1">Total Balance</p>
                  {loading ? (
                    <div className="h-14 w-48 bg-white/10 rounded-xl animate-pulse" />
                  ) : (
                    <div className="flex items-baseline gap-3">
                      <span className="text-5xl font-bold tracking-tight">{formattedBalance}</span>
                      <span className="text-2xl text-white/40">ETH</span>
                    </div>
                  )}
                  {!loading && (
                    <p className="text-white/40 mt-2">${balanceUsd} USD</p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-500 text-sm font-medium">Active</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-medium transition-all ${
                      action.primary
                        ? 'bg-white text-black hover:bg-white/90'
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Network Info Card */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4">Network</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-white/50">Chain</span>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
                      <path d="M12 1.5l-8 14h16l-8-14zm0 5l4.5 8h-9l4.5-8z"/>
                    </svg>
                  </div>
                  <span className="font-medium">Sepolia</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-green-500 font-medium">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/50">Type</span>
                <span className="font-medium">Testnet</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/10">
              <a
                href="https://sepoliafaucet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-sm font-medium hover:bg-white/5 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v6m0 12v2M4.93 4.93l4.24 4.24m5.66 5.66l4.24 4.24M2 12h6m12 0h2M4.93 19.07l4.24-4.24m5.66-5.66l4.24-4.24"/>
                </svg>
                Get Test ETH
              </a>
            </div>
          </div>

          {/* Activity Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Recent Activity</h3>
                <Link
                  href="/wallet/history"
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  View all
                </Link>
              </div>

              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/30">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <p className="text-white/50 mb-1">No recent activity</p>
                <p className="text-white/30 text-sm">Your transactions will appear here</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-4">Coming Soon</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Tokens</p>
                  <p className="text-sm text-white/40">ERC-20 support</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">NFTs</p>
                  <p className="text-sm text-white/40">Collectibles gallery</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div>
                  <p className="font-medium">Swap</p>
                  <p className="text-sm text-white/40">Token exchange</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
