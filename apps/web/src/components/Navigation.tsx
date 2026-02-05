'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

interface NavigationProps {
  isLoggedIn?: boolean
  address?: string
  onLogout?: () => void
}

export default function Navigation({ isLoggedIn, address, onLogout }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
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
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <nav className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href={isLoggedIn ? '/wallet' : '/'} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-black font-bold text-sm">E</span>
            </div>
            <span className="text-lg font-semibold group-hover:text-white/80 transition-colors">
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
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
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
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/60">Sepolia</span>
          </div>

          {isLoggedIn && address ? (
            <>
              {/* Address Button */}
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <span className="font-mono text-sm">{shortAddress}</span>
                {copied ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/40">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                )}
              </button>

              {/* Lock Button */}
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="hidden sm:inline text-sm font-medium">Lock</span>
              </button>
            </>
          ) : (
            <Link
              href="/unlock"
              className="px-5 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Connect
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
