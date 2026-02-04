'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { ethers } from 'ethers'
import Link from 'next/link'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_KEY || ''
const NETWORK = 'sepolia'

export default function WalletDashboard() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

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
      setBalance(ethers.formatEther(bal))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAddress = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const formattedBalance = parseFloat(balance).toFixed(4)

  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Eternity</h1>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-white/40 text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"/>
              Sepolia
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Balance Section */}
        <div className="text-center mb-20">
          <button
            onClick={handleCopyAddress}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-white/50 hover:text-white/70 transition-colors text-sm border border-white/10 rounded-full hover:border-white/20"
          >
            <span className="font-mono">{shortAddress}</span>
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            )}
          </button>

          {loading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
            </div>
          ) : (
            <div className="flex items-baseline justify-center gap-4">
              <span className="text-8xl font-bold tracking-tighter">{formattedBalance}</span>
              <span className="text-3xl text-white/40">ETH</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mb-20">
          <Link
            href="/wallet/send"
            className="flex items-center gap-3 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="19" x2="12" y2="5"/>
              <polyline points="5 12 12 5 19 12"/>
            </svg>
            Send
          </Link>

          <Link
            href="/wallet/receive"
            className="flex items-center gap-3 px-8 py-4 border border-white/20 rounded-full hover:bg-white/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <polyline points="19 12 12 19 5 12"/>
            </svg>
            Receive
          </Link>

          <Link
            href="/wallet/blik"
            className="flex items-center gap-3 px-8 py-4 border border-white/20 rounded-full hover:bg-white/5 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="2"/>
              <path d="M7 15h0M2 9.5h20"/>
            </svg>
            BLIK
          </Link>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/wallet/history"
            className="p-8 border border-white/10 rounded-2xl hover:bg-white/5 hover:border-white/20 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20 ml-auto group-hover:text-white/40 transition-colors">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Transaction History</h3>
            <p className="text-white/40">View all your past transactions</p>
          </Link>

          <div className="p-8 border border-white/10 rounded-2xl opacity-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Tokens</h3>
            <p className="text-white/40">Coming soon</p>
          </div>

          <div className="p-8 border border-white/10 rounded-2xl opacity-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/60">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">NFTs</h3>
            <p className="text-white/40">Coming soon</p>
          </div>
        </div>
      </div>
    </main>
  )
}
