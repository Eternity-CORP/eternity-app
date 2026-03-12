'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import { truncateAddress } from '@e-y/shared'
import { getNetwork } from '@/lib/network'
import type { AccountType } from '@/lib/account-storage'

function TypeBadge({ type }: { type: AccountType }) {
  if (type === 'test') return (
    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#F59E0B]/15 text-[#F59E0B]">
      Test
    </span>
  )
  return (
    <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#22C55E]/15 text-[#22C55E]">
      Real
    </span>
  )
}

type View = 'list' | 'add' | 'import' | 'rename'

export default function AccountSelector() {
  const {
    accounts, currentAccount, address, network, logout,
    switchAccount, addAccount, renameAccount, removeAccount, importWallet,
  } = useAccount()
  const { aggregatedBalances, totalUsdValue: ctxTotalUsd, status: balanceStatus } = useBalance()

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [copied, setCopied] = useState(false)
  const [balances, setBalances] = useState<Record<string, string>>({})
  const [editMode, setEditMode] = useState(false)

  // Rename state
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // Import state
  const [importPhrase, setImportPhrase] = useState('')
  const [importError, setImportError] = useState('')

  const ref = useRef<HTMLDivElement>(null)

  const handleCopyAddress = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // For the active real account, derive balance from balance-context (multi-chain aggregated)
  useEffect(() => {
    if (!currentAccount || currentAccount.type !== 'real') return
    if (balanceStatus !== 'succeeded') return

    const ethToken = aggregatedBalances.find(
      (t) => t.symbol.toUpperCase() === 'ETH',
    )
    const totalEth = ethToken ? parseFloat(ethToken.totalBalance).toFixed(4) : '0.0000'

    setBalances((prev) => ({ ...prev, [currentAccount.id]: totalEth }))
  }, [currentAccount, aggregatedBalances, balanceStatus])

  // Fetch balances for non-current accounts (single-network RPC) when dropdown opens
  useEffect(() => {
    if (!open || accounts.length === 0) return

    let cancelled = false

    const fetchAll = async () => {
      const results: Record<string, string> = {}
      await Promise.all(
        accounts.map(async (acc) => {
          // Skip current real account — its balance comes from balance-context above
          if (currentAccount && acc.id === currentAccount.id && acc.type === 'real') return

          try {
            const net = getNetwork(acc.type)
            const provider = new ethers.JsonRpcProvider(net.rpcUrl)
            const bal = await provider.getBalance(acc.address)
            if (!cancelled) {
              results[acc.id] = parseFloat(ethers.formatEther(bal)).toFixed(4)
            }
          } catch {
            results[acc.id] = '—'
          }
        })
      )
      if (!cancelled) setBalances((prev) => ({ ...prev, ...results }))
    }

    fetchAll()
    return () => { cancelled = true }
  }, [open, accounts, currentAccount])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeDropdown()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (!currentAccount) return null

  const closeDropdown = () => {
    setOpen(false)
    setView('list')
    setEditMode(false)
    setRenameId(null)
    setImportPhrase('')
    setImportError('')
  }

  const handleAdd = (type: AccountType) => {
    addAccount(type)
    setView('list')
  }

  const handleStartRename = (accId: string, currentLabel: string) => {
    setRenameId(accId)
    setRenameValue(currentLabel)
  }

  const handleSaveRename = () => {
    if (renameId) {
      renameAccount(renameId, renameValue)
      setRenameId(null)
      setRenameValue('')
    }
  }

  const handleDelete = (accId: string) => {
    if (accounts.length <= 1) return
    removeAccount(accId)
  }

  const handleImport = async () => {
    setImportError('')
    const ok = await importWallet(importPhrase)
    if (ok) {
      closeDropdown()
    } else {
      setImportError('Invalid recovery phrase')
    }
  }

  const wordCount = importPhrase.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => { open ? closeDropdown() : setOpen(true) }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card hover:border-[var(--border)] transition-all"
      >
        <TypeBadge type={currentAccount.type} />
        <span className="text-sm font-mono text-[var(--foreground-muted)]">{truncateAddress(address)}</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-[var(--foreground-subtle)] transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop overlay on mobile */}
          <div className="fixed inset-0 bg-[var(--backdrop-bg)] z-[998] sm:hidden" onClick={closeDropdown} />
          <div className="fixed sm:absolute right-3 sm:right-0 left-3 sm:left-auto top-[4.5rem] sm:top-full sm:mt-2 sm:w-80 rounded-xl border border-[var(--border)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-[999] bg-[var(--background)]/95 backdrop-blur-xl">

          {/* ===== LIST VIEW ===== */}
          {view === 'list' && (
            <>
              {/* Header: Network + Edit toggle */}
              <div className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: currentAccount.type === 'real' ? '#22C55E' : '#F59E0B' }}
                  />
                  <span className="text-xs text-[var(--foreground-muted)]">
                    {network.name}{currentAccount.type === 'test' ? ' Testnet' : ''}
                  </span>
                </div>
                <button
                  onClick={() => { setEditMode(!editMode); setRenameId(null) }}
                  className={`text-xs px-2 py-1 rounded-md transition-colors ${
                    editMode ? 'text-[var(--foreground)] bg-[var(--surface-hover)]' : 'text-[var(--foreground-subtle)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {editMode ? 'Done' : 'Edit'}
                </button>
              </div>
              <div className="border-t border-[var(--border)]" />

              {/* Account list */}
              <div className="p-2 max-h-64 overflow-y-auto">
                {accounts.map((acc) => {
                  const accNetwork = getNetwork(acc.type)
                  const isRenaming = renameId === acc.id
                  const label = acc.label || `Wallet ${acc.accountIndex}`

                  return (
                    <div
                      key={acc.id}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        acc.id === currentAccount.id ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface)]'
                      }`}
                    >
                      {/* Click to switch (not in edit mode) */}
                      <button
                        onClick={() => { if (!editMode) { switchAccount(acc.id); closeDropdown() } }}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                        disabled={editMode}
                      >
                        <TypeBadge type={acc.type} />
                        <div className="flex-1 min-w-0">
                          {isRenaming ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveRename() }}
                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md px-2 py-1 text-sm text-[var(--foreground)] outline-none focus:border-[var(--border)]"
                                autoFocus
                              />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSaveRename() }}
                                className="text-xs text-[#22C55E] hover:text-[#22C55E]/80 shrink-0"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="text-sm font-medium text-[var(--foreground)] truncate">{label}</p>
                              <p className="text-xs font-mono text-[var(--foreground-subtle)] truncate">{truncateAddress(acc.address)}</p>
                            </>
                          )}
                        </div>
                      </button>

                      {/* Right side: balance or edit actions */}
                      {editMode && !isRenaming ? (
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Rename */}
                          <button
                            onClick={() => handleStartRename(acc.id, label)}
                            className="p-1.5 rounded-md text-[var(--foreground-subtle)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                            title="Rename"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          {/* Delete (only if more than 1 account) */}
                          {accounts.length > 1 && (
                            <button
                              onClick={() => handleDelete(acc.id)}
                              className="p-1.5 rounded-md text-[var(--foreground-subtle)] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                              title="Delete"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      ) : !isRenaming ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            {balances[acc.id] !== undefined ? (
                              <p className="text-sm font-medium text-[var(--foreground)]">
                                {balances[acc.id]} <span className="text-xs text-[var(--foreground-subtle)]">{accNetwork.symbol}</span>
                              </p>
                            ) : (
                              <div className="h-4 w-16 bg-[var(--surface)] rounded animate-pulse" />
                            )}
                          </div>
                          {acc.id === currentAccount.id && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--foreground-muted)]">
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              {/* Copy address */}
              <div className="border-t border-[var(--border)]" />
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
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

              {/* Add account button */}
              <div className="border-t border-[var(--border)]" />
              <button
                onClick={() => setView('add')}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Wallet
              </button>

              {/* Mobile-only: Contacts, Settings, Lock */}
              <div className="sm:hidden border-t border-[var(--border)]">
                <Link
                  href="/wallet/contacts"
                  onClick={closeDropdown}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  Contacts
                </Link>
                <Link
                  href="/wallet/settings"
                  onClick={closeDropdown}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  Settings
                </Link>
                <button
                  onClick={() => { closeDropdown(); logout() }}
                  className="w-full flex items-center gap-3 px-5 py-3 text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Lock Wallet
                </button>
              </div>
            </>
          )}

          {/* ===== ADD VIEW ===== */}
          {view === 'add' && (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => setView('list')} className="text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="text-sm font-medium text-[var(--foreground)]">Add Wallet</span>
              </div>
              <div className="border-t border-[var(--border)]" />

              <div className="p-2">
                {/* New Wallet (real) */}
                <button
                  onClick={() => handleAdd('real')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                      <path d="M2 17l10 5 10-5"/>
                      <path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">New Wallet</p>
                    <p className="text-xs text-[var(--foreground-subtle)]">Ethereum mainnet</p>
                  </div>
                </button>

                {/* New Test Wallet */}
                <button
                  onClick={() => handleAdd('test')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                      <path d="M9 3h6l2 7H7L9 3z"/>
                      <path d="M7 10c0 6 5 11 5 11s5-5 5-11"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">New Test Wallet</p>
                    <p className="text-xs text-[var(--foreground-subtle)]">Sepolia testnet</p>
                  </div>
                </button>

                {/* Import Existing */}
                <button
                  onClick={() => setView('import')}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-[var(--surface)] transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-[var(--foreground)]">Import Wallet</p>
                    <p className="text-xs text-[var(--foreground-subtle)]">Recovery phrase</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ===== IMPORT VIEW ===== */}
          {view === 'import' && (
            <>
              <div className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => { setView('add'); setImportPhrase(''); setImportError('') }} className="text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5"/>
                    <path d="M12 19l-7-7 7-7"/>
                  </svg>
                </button>
                <span className="text-sm font-medium text-[var(--foreground)]">Import Wallet</span>
              </div>
              <div className="border-t border-[var(--border)]" />

              <div className="p-4 space-y-3">
                <p className="text-xs text-[var(--foreground-subtle)]">
                  Enter your 12 or 24 word recovery phrase. This will replace the current wallet.
                </p>
                <textarea
                  value={importPhrase}
                  onChange={(e) => { setImportPhrase(e.target.value); setImportError('') }}
                  placeholder="word1 word2 word3 ..."
                  rows={3}
                  className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--foreground-subtle)] outline-none focus:border-[var(--border)] resize-none font-mono"
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${wordCount === 12 || wordCount === 24 ? 'text-[#22C55E]' : 'text-[var(--foreground-subtle)]'}`}>
                    {wordCount} / 12 or 24 words
                  </span>
                  {importError && (
                    <span className="text-xs text-[#EF4444]">{importError}</span>
                  )}
                </div>
                <button
                  onClick={handleImport}
                  disabled={wordCount !== 12 && wordCount !== 24}
                  className="w-full py-2.5 rounded-lg bg-[var(--foreground)] text-[var(--background)] font-semibold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90"
                >
                  Import
                </button>
              </div>
            </>
          )}

          </div>
        </>
      )}
    </div>
  )
}
