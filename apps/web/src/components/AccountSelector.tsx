'use client'

import { useState, useRef, useEffect } from 'react'
import { useAccount } from '@/contexts/account-context'
import type { AccountType } from '@/lib/account-storage'

function TypeBadge({ type }: { type: AccountType }) {
  return type === 'test' ? (
    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#F59E0B]/15 text-[#F59E0B]">
      Test
    </span>
  ) : (
    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#22C55E]/15 text-[#22C55E]">
      Real
    </span>
  )
}

function shortenAddress(addr: string) {
  if (!addr) return ''
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export default function AccountSelector() {
  const { accounts, currentAccount, address, switchAccount, addAccount } = useAccount()
  const [open, setOpen] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [copied, setCopied] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowAddMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!currentAccount) return null

  const handleAdd = (type: AccountType) => {
    addAccount(type)
    setShowAddMenu(false)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen(!open); setShowAddMenu(false) }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card hover:border-white/15 transition-all"
      >
        <TypeBadge type={currentAccount.type} />
        <span className="text-sm font-mono text-white/70">{shortenAddress(address)}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-white/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 glass-card rounded-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-50">
          {/* Account list */}
          <div className="p-2 max-h-64 overflow-y-auto">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => { switchAccount(acc.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  acc.id === currentAccount.id
                    ? 'bg-white/8'
                    : 'hover:bg-white/5'
                }`}
              >
                <TypeBadge type={acc.type} />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {acc.label || `Wallet ${acc.accountIndex}`}
                  </p>
                  <p className="text-xs font-mono text-white/40 truncate">{shortenAddress(acc.address)}</p>
                </div>
                {acc.id === currentAccount.id && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/60 flex-shrink-0">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Copy address */}
          <div className="border-t border-white/8" />
          <button
            onClick={handleCopyAddress}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          >
            {copied ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#22c55e]">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span className="text-[#22c55e]">Copied!</span>
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy Address
              </>
            )}
          </button>

          {/* Separator */}
          <div className="border-t border-white/8" />

          {/* Add account */}
          {!showAddMenu ? (
            <button
              onClick={() => setShowAddMenu(true)}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Account
            </button>
          ) : (
            <div className="p-2">
              <button
                onClick={() => handleAdd('test')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-sm text-white">New Test Wallet</span>
                <span className="text-xs text-white/30 ml-auto">Sepolia</span>
              </button>
              <button
                onClick={() => handleAdd('real')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                <span className="text-sm text-white">New Real Wallet</span>
                <span className="text-xs text-white/30 ml-auto">Ethereum</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
