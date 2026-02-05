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
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="w-full flex justify-center px-6 py-12">
        <div className="w-full max-w-[1200px]">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Balance Card */}
          <div className="lg:col-span-2">
            <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-8">
              <div className="flex items-start justify-between mb-10">
                <div>
                  <p className="text-[#9b9b9b] text-sm font-medium mb-2">Total Balance</p>
                  {loading ? (
                    <div className="h-16 w-56 bg-[#1f1f1f] rounded-xl animate-pulse" />
                  ) : (
                    <div className="flex items-baseline gap-4">
                      <span className="text-6xl font-bold tracking-tight text-white">{formattedBalance}</span>
                      <span className="text-2xl font-medium text-[#6b6b6b]">ETH</span>
                    </div>
                  )}
                  {!loading && (
                    <p className="text-[#6b6b6b] text-lg mt-3">${balanceUsd} USD</p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0d2818] border border-[#134e29]">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="text-[#22c55e] text-sm font-semibold">Active</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-4">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base transition-all ${
                      action.primary
                        ? 'bg-white text-black hover:bg-[#e5e5e5]'
                        : 'bg-[#1f1f1f] text-white border border-[#2a2a2a] hover:bg-[#2a2a2a] hover:border-[#3a3a3a]'
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
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Network</h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[#9b9b9b]">Chain</span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1f1f1f] flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#9b9b9b]">
                      <path d="M12 1.5l-8 14h16l-8-14zm0 5l4.5 8h-9l4.5-8z"/>
                    </svg>
                  </div>
                  <span className="font-semibold text-white">Sepolia</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9b9b9b]">Status</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                  <span className="text-[#22c55e] font-semibold">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#9b9b9b]">Type</span>
                <span className="font-semibold text-white">Testnet</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-[#1f1f1f]">
              <a
                href="https://sepoliafaucet.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-[#1f1f1f] border border-[#2a2a2a] text-sm font-semibold text-white hover:bg-[#2a2a2a] transition-colors"
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
            <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <Link
                  href="/wallet/history"
                  className="text-sm text-[#9b9b9b] hover:text-white transition-colors font-medium"
                >
                  View all
                </Link>
              </div>

              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#1f1f1f] flex items-center justify-center mb-5">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#4a4a4a]">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <p className="text-[#9b9b9b] font-medium mb-1">No recent activity</p>
                <p className="text-[#6b6b6b] text-sm">Your transactions will appear here</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-5">Coming Soon</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#252525]">
                <div className="w-11 h-11 rounded-xl bg-[#1f1f1f] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6b6b6b]">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">Tokens</p>
                  <p className="text-sm text-[#6b6b6b]">ERC-20 support</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#252525]">
                <div className="w-11 h-11 rounded-xl bg-[#1f1f1f] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6b6b6b]">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <path d="M3 9h18"/>
                    <path d="M9 21V9"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">NFTs</p>
                  <p className="text-sm text-[#6b6b6b]">Collectibles gallery</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#1a1a1a] border border-[#252525]">
                <div className="w-11 h-11 rounded-xl bg-[#1f1f1f] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6b6b6b]">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white">Swap</p>
                  <p className="text-sm text-[#6b6b6b]">Token exchange</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
