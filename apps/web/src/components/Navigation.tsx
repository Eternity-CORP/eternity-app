'use client'

import { useState } from 'react'
import Link from 'next/link'

interface NavigationProps {
  isLoggedIn?: boolean
  address?: string
  onLogout?: () => void
}

export default function Navigation({ isLoggedIn, address, onLogout }: NavigationProps) {
  const [copied, setCopied] = useState(false)

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
        <nav className="w-full max-w-[1200px] h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href={isLoggedIn ? '/wallet' : '/'} className="flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="Eternity" className="w-7 h-7" />
            <span className="text-lg font-semibold text-white group-hover:text-[#9b9b9b] transition-colors">
              Eternity
            </span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isLoggedIn && address ? (
              <>
                {/* Address */}
                <button
                  onClick={handleCopyAddress}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#252525] hover:bg-[#1f1f1f] transition-all"
                >
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                  <span className="font-mono text-sm text-white">{shortAddress}</span>
                  {copied && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-[#22c55e]">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </button>

                {/* Lock */}
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-[#6b6b6b] hover:text-white hover:bg-[#1f1f1f] transition-all"
                  title="Lock wallet"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </button>
              </>
            ) : (
              <Link
                href="/unlock"
                className="px-5 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-[#e5e5e5] transition-colors"
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
