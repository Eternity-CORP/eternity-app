'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavigationProps {
  isLoggedIn?: boolean
  address?: string
  onLogout?: () => void
}

export default function Navigation({ isLoggedIn, address, onLogout }: NavigationProps) {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)

  const navItems = [
    { href: '/wallet', label: 'Wallet', requiresAuth: true },
    { href: '/wallet/send', label: 'Send', requiresAuth: true },
    { href: '/wallet/receive', label: 'Receive', requiresAuth: true },
    { href: '/wallet/blik', label: 'BLIK', requiresAuth: true },
    { href: '/wallet/history', label: 'History', requiresAuth: true },
  ]

  const handleCopyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

  return (
    <header className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]/95 backdrop-blur-xl">
      <div className="w-full flex justify-center px-6">
        <nav className="w-full max-w-[1200px] h-[72px] flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-10">
          <Link href={isLoggedIn ? '/wallet' : '/'} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center">
              <span className="text-black font-bold text-base">E</span>
            </div>
            <span className="text-xl font-semibold text-white group-hover:text-[#9b9b9b] transition-colors">
              Eternity
            </span>
          </Link>

          {/* Navigation Links */}
          {isLoggedIn && (
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-[#1f1f1f] text-white'
                        : 'text-[#9b9b9b] hover:text-white hover:bg-[#1f1f1f]/50'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* Network Badge */}
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#131313] border border-[#1f1f1f]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-sm font-medium text-[#9b9b9b]">Sepolia</span>
          </div>

          {isLoggedIn && address ? (
            <>
              {/* Address Button */}
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#131313] border border-[#1f1f1f] hover:bg-[#1f1f1f] hover:border-[#2a2a2a] transition-all"
              >
                <span className="font-mono text-sm font-medium text-white">{shortAddress}</span>
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#22c55e]">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6b6b6b]">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>

              {/* Lock Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[#9b9b9b] hover:text-white hover:bg-[#1f1f1f] transition-all"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="hidden sm:inline text-sm font-semibold">Lock</span>
              </button>
            </>
          ) : (
            <Link
              href="/unlock"
              className="px-6 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-[#e5e5e5] transition-colors"
            >
              Connect
            </Link>
          )}
        </div>
        </nav>
      </div>
    </header>
  )
}
