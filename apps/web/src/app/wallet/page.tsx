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
    <main className="bg-app bg-grid min-h-screen">
      <div className="max-w-lg mx-auto px-6 py-8 relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 animate-fadeIn">
          <div className="logo text-2xl">Eternity</div>
          <button
            onClick={handleLogout}
            className="btn btn-ghost btn-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Lock
          </button>
        </header>

        {/* Balance Card */}
        <div className="card-elevated p-8 mb-6 animate-slideUp">
          {/* Address */}
          <button
            onClick={handleCopyAddress}
            className="flex items-center gap-2 mx-auto mb-6 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all"
          >
            <span className="text-sm text-[var(--foreground-muted)]">{shortAddress}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-subtle)]">
              {copied ? (
                <path d="M20 6L9 17l-5-5"/>
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </>
              )}
            </svg>
          </button>

          {/* Balance */}
          <div className="text-center mb-8">
            {loading ? (
              <div className="h-16 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : (
              <>
                <div className="balance-amount">{formattedBalance}</div>
                <div className="balance-symbol">ETH</div>
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-3">
            <Link
              href="/wallet/send"
              className="card card-interactive p-4 flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/>
                  <polyline points="5 12 12 5 19 12"/>
                </svg>
              </div>
              <span className="text-sm font-medium">Send</span>
            </Link>

            <Link
              href="/wallet/receive"
              className="card card-interactive p-4 flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <polyline points="19 12 12 19 5 12"/>
                </svg>
              </div>
              <span className="text-sm font-medium">Receive</span>
            </Link>

            <Link
              href="/wallet/blik"
              className="card card-interactive p-4 flex flex-col items-center gap-3 text-center"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#F59E0B] to-[#D97706] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/>
                  <path d="M7 15h0M2 9.5h20"/>
                </svg>
              </div>
              <span className="text-sm font-medium">BLIK</span>
            </Link>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-3 stagger">
          <Link
            href="/wallet/history"
            className="card card-interactive p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-muted)]">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <div className="font-medium">Transaction History</div>
                <div className="text-sm text-[var(--foreground-subtle)]">View all transactions</div>
              </div>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--foreground-subtle)]">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        {/* Network Badge */}
        <div className="flex items-center justify-center gap-2 mt-8 text-caption">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]"/>
          <span>Sepolia Testnet</span>
        </div>
      </div>
    </main>
  )
}
