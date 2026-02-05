'use client'

import Link from 'next/link'
import { useAccount } from '@/contexts/account-context'
import AccountSelector from '@/components/AccountSelector'

interface NavigationProps {
  isLoggedIn?: boolean
}

export default function Navigation({ isLoggedIn }: NavigationProps) {
  const { logout } = useAccount()

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="w-full flex justify-center px-6">
        <nav className="w-full max-w-[1200px] h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href={isLoggedIn ? '/wallet' : '/'} className="flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="Eternity" className="w-7 h-7" />
            <span className="text-lg font-semibold text-white group-hover:text-white/60 transition-colors">
              Eternity
            </span>
          </Link>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <AccountSelector />

                {/* Lock */}
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
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
                className="px-5 py-2 rounded-lg bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
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
