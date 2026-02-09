'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAccount } from '@/contexts/account-context'
import AccountSelector from '@/components/AccountSelector'
import ModeToggle from '@/components/ModeToggle'

export default function Navigation() {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, logout, uiMode, setUiMode } = useAccount()

  const handleModeChange = (mode: 'ai' | 'classic') => {
    setUiMode(mode)
    if (mode === 'ai' && pathname !== '/wallet') {
      router.push('/wallet')
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-black/80 backdrop-blur-xl">
      <div className="w-full flex justify-center px-3 sm:px-6">
        <nav className="w-full max-w-[1200px] h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-1">
            <Link href={isLoggedIn ? '/wallet' : '/'} className="flex items-center gap-2.5 group">
              <img src="/logo.svg" alt="Eternity" className="w-7 h-7" />
              <span className="hidden sm:inline text-lg font-semibold text-white group-hover:text-white/60 transition-colors">
                Eternity
              </span>
            </Link>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isLoggedIn ? (
              <>
                <ModeToggle value={uiMode} onChange={handleModeChange} />

                <AccountSelector />

                {/* Contacts — desktop only */}
                <Link
                  href="/wallet/contacts"
                  className="hidden sm:flex p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  title="Contacts"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </Link>

                {/* Settings — desktop only */}
                <Link
                  href="/wallet/settings"
                  className="hidden sm:flex p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
                  title="Settings"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </Link>

                {/* Lock — desktop only */}
                <button
                  onClick={logout}
                  className="hidden sm:flex p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
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
