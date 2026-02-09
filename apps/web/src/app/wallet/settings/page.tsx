'use client'

import Link from 'next/link'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ModeToggle from '@/components/ModeToggle'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'

const SETTINGS_LINKS = [
  {
    href: '/wallet/username',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
    label: 'Username',
    description: 'Set your global @username',
  },
  {
    href: '/wallet/settings/networks',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    label: 'Network Preferences',
    description: 'Default receiving network',
  },
  {
    href: '/wallet/contacts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    label: 'Contacts',
    description: 'Manage saved addresses',
  },
  {
    href: '/wallet/settings/privacy',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    label: 'Privacy',
    description: 'Control who can see your data',
  },
]

export default function SettingsPage() {
  useAuthGuard()
  const { uiMode, setUiMode } = useAccount()

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <h1 className="text-lg font-semibold text-white mb-6">Settings</h1>

          {/* UI Mode */}
          <div className="glass-card rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">UI Mode</p>
                <p className="text-xs text-white/40">Switch between AI and Classic</p>
              </div>
              <ModeToggle value={uiMode} onChange={setUiMode} />
            </div>
          </div>

          {/* Settings Links */}
          <div className="glass-card rounded-2xl overflow-hidden divide-y divide-white/5">
            {SETTINGS_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-4 p-4 hover:bg-white/3 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/50 group-hover:text-white/70 transition-colors">
                  {item.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-white/40">{item.description}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
