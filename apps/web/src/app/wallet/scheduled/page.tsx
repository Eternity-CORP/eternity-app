'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  getScheduledPayments,
  getIncomingScheduledPayments,
  createScheduledPayment,
  cancelScheduledPayment,
  deleteScheduledPayment,
  lookupUsername,
  formatErrorMessage,
  SUPPORTED_NETWORKS,
  TIER1_NETWORK_IDS,
  resolveChainId,
  getNetworkLabel,
  truncateAddress,
  type NetworkId,
  type ScheduledPayment,
  type RecurringInterval,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { signScheduledTransaction } from '@/lib/send-service'
import { getProvider, getSepoliaProvider } from '@/lib/multi-network'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'

export default function ScheduledPage() {
  useAuthGuard()
  const { address, network, currentAccount } = useAccount()
  const { aggregatedBalances } = useBalance()
  const isTestAccount = currentAccount?.type === 'test'

  const [selectedNetwork, setSelectedNetwork] = useState<NetworkId>('base')
  const [payments, setPayments] = useState<ScheduledPayment[]>([])
  const [incomingPayments, setIncomingPayments] = useState<ScheduledPayment[]>([])
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [recipient, setRecipient] = useState('')
  const [recipientResolved, setRecipientResolved] = useState<{ address: string; username?: string; name?: string } | null>(null)
  const [resolving, setResolving] = useState(false)
  const [selectedToken, setSelectedToken] = useState(network.symbol)
  const [amount, setAmount] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringInterval, setRecurringInterval] = useState<RecurringInterval>('weekly')

  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  // Token info for selected token
  const selectedTokenInfo = useMemo(() => {
    return aggregatedBalances.find(t => t.symbol === selectedToken)
  }, [aggregatedBalances, selectedToken])

  // Available tokens for dropdown
  const availableTokens = useMemo(() => {
    if (aggregatedBalances.length === 0) return [{ symbol: network.symbol, name: network.name }]
    return aggregatedBalances.map(t => ({ symbol: t.symbol, name: t.name }))
  }, [aggregatedBalances, network])

  // Resolve username when recipient changes
  useEffect(() => {
    if (!recipient.startsWith('@') || recipient.length < 2) {
      setRecipientResolved(null)
      return
    }
    const username = recipient.slice(1)
    setResolving(true)
    const timer = setTimeout(async () => {
      try {
        const result = await lookupUsername(apiClient, username)
        if (result) {
          setRecipientResolved({ address: result.address, username: `@${username}` })
        } else {
          setRecipientResolved(null)
        }
      } catch {
        setRecipientResolved(null)
      } finally {
        setResolving(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [recipient])

  // Load payments (outgoing + incoming)
  useEffect(() => {
    if (!address) return
    let cancelled = false
    async function load() {
      try {
        const [outgoing, incoming] = await Promise.all([
          getScheduledPayments(apiClient, address),
          getIncomingScheduledPayments(apiClient, address),
        ])
        if (!cancelled) {
          setPayments(outgoing)
          setIncomingPayments(incoming)
        }
      } catch (err) {
        console.error('Failed to load scheduled payments:', err)
      } finally {
        if (!cancelled) setStatus('succeeded')
      }
    }
    load()
    return () => { cancelled = true }
  }, [address])

  const reloadPayments = useCallback(async () => {
    if (!address) return
    try {
      const [outgoing, incoming] = await Promise.all([
        getScheduledPayments(apiClient, address),
        getIncomingScheduledPayments(apiClient, address),
      ])
      setPayments(outgoing)
      setIncomingPayments(incoming)
    } catch {}
  }, [address])

  const handleCreate = () => {
    if (!recipient || !amount || !scheduledDate || !scheduledTime) return
    setError('')
    setShowConfirm(true)
  }

  const handleConfirmSubmit = useCallback(async (password: string) => {
    if (!currentAccount) throw new Error('No wallet connected')

    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)

    const provider = isTestAccount ? getSepoliaProvider() : getProvider(selectedNetwork)
    const connectedWallet = wallet.connect(provider)

    // Resolve final recipient address
    const finalRecipient = recipientResolved?.address || recipient

    // Find token contract info
    let tokenParam: { address: string; decimals: number } | undefined
    if (selectedTokenInfo) {
      const networkData = selectedTokenInfo.networks.find(n => n.contractAddress !== 'native')
      if (networkData) {
        tokenParam = { address: networkData.contractAddress, decimals: selectedTokenInfo.decimals }
      }
    }

    const signedData = await signScheduledTransaction(connectedWallet, provider, finalRecipient, amount, tokenParam)
    const chainId = resolveChainId(isTestAccount, selectedNetwork)

    const newPayment = await createScheduledPayment(apiClient, {
      creatorAddress: address,
      recipient: finalRecipient,
      recipientUsername: recipientResolved?.username,
      recipientName: recipientResolved?.name,
      amount,
      tokenSymbol: selectedToken,
      scheduledAt: new Date(`${scheduledDate}T${scheduledTime}`).toISOString(),
      recurringInterval: isRecurring ? recurringInterval : undefined,
      description: description.trim() || undefined,
      signedTransaction: signedData.signedTx,
      estimatedGasPrice: signedData.gasPrice,
      nonce: signedData.nonce,
      chainId,
    })

    setPayments((prev) => [...prev, newPayment])
    setShowCreate(false)
    setShowConfirm(false)
    setRecipient('')
    setRecipientResolved(null)
    setAmount('')
    setScheduledDate('')
    setScheduledTime('')
    setDescription('')
    setIsRecurring(false)
    setSelectedToken(network.symbol)
    setSubmitStatus('succeeded')
  }, [currentAccount, network, address, recipient, recipientResolved, amount, selectedToken, selectedTokenInfo, scheduledDate, scheduledTime, description, isRecurring, recurringInterval, selectedNetwork, isTestAccount])

  const handleCancel = async (id: string) => {
    try {
      await cancelScheduledPayment(apiClient, id, address)
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)),
      )
      setCancelConfirmId(null)
    } catch (err) {
      setError(formatErrorMessage(err, 'Failed to cancel payment'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduledPayment(apiClient, id, address)
      setPayments((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(formatErrorMessage(err, 'Failed to delete payment'))
    }
  }

  const confirmNetworkName = isTestAccount
    ? network.name
    : SUPPORTED_NETWORKS[selectedNetwork].name

  // Split into overdue, upcoming, and past
  const now = Date.now()
  const overduePayments = payments.filter(p => p.status === 'pending' && new Date(p.scheduledAt).getTime() < now)
  const upcomingPayments = payments.filter(p => p.status === 'pending' && new Date(p.scheduledAt).getTime() >= now)
  const pastPayments = payments.filter(p => p.status !== 'pending')

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Scheduled</h1>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-[var(--foreground)] hover:border-[var(--border)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showCreate ? (
                    <>
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </>
                  ) : (
                    <>
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <div className="mb-6 space-y-3">
                {/* Network Selector (real accounts only) */}
                {!isTestAccount && (
                  <div className="mb-4">
                    <label className="text-[10px] text-[var(--foreground-subtle)] uppercase tracking-wider mb-1.5 block">Network</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TIER1_NETWORK_IDS.map((id) => {
                        const net = SUPPORTED_NETWORKS[id]
                        const isSelected = id === selectedNetwork
                        return (
                          <button
                            key={id}
                            onClick={() => setSelectedNetwork(id)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all border"
                            style={{
                              backgroundColor: isSelected ? net.color + '20' : 'transparent',
                              borderColor: isSelected ? net.color + '60' : 'var(--border)',
                              color: isSelected ? net.color : 'var(--foreground-subtle)',
                            }}
                          >
                            <span className="inline-block w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: net.color }} />
                            {net.shortName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Recipient */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Recipient</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Address or @username"
                    className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                  />
                  {resolving && (
                    <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">Looking up...</p>
                  )}
                  {recipientResolved && (
                    <p className="text-[10px] text-[#22c55e] mt-1">
                      {recipientResolved.name || recipientResolved.username} — {truncateAddress(recipientResolved.address)}
                    </p>
                  )}
                  {recipient.startsWith('@') && !resolving && !recipientResolved && recipient.length > 1 && (
                    <p className="text-[10px] text-[#f87171] mt-1">Username not found</p>
                  )}
                </div>

                {/* Token selector + Amount */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Amount</label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                    />
                    <select
                      value={selectedToken}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2 py-1 text-sm cursor-pointer"
                    >
                      {availableTokens.map(t => (
                        <option key={t.symbol} value={t.symbol}>{t.symbol}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-transparent text-[var(--foreground)] focus:outline-none"
                    />
                  </div>
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                    <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-transparent text-[var(--foreground)] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">Description (optional)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Monthly rent, subscription, etc."
                    className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none text-sm"
                  />
                </div>

                {/* Recurring toggle */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[var(--foreground)]">Recurring</p>
                      <p className="text-[10px] text-[var(--foreground-subtle)]">Repeat this payment automatically</p>
                    </div>
                    <button
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={`w-10 h-5 rounded-full transition-colors ${isRecurring ? 'bg-[#3388FF]' : 'bg-[var(--border)]'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${isRecurring ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  {isRecurring && (
                    <div className="flex gap-2 mt-3">
                      {(['daily', 'weekly', 'monthly'] as RecurringInterval[]).map(interval => (
                        <button
                          key={interval}
                          onClick={() => setRecurringInterval(interval)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            recurringInterval === interval
                              ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                              : 'glass-card text-[var(--foreground-subtle)]'
                          }`}
                        >
                          {interval.charAt(0).toUpperCase() + interval.slice(1)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={!recipient || !amount || !scheduledDate || !scheduledTime || submitStatus === 'loading'}
                  className="w-full py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                >
                  {submitStatus === 'loading' ? 'Creating...' : 'Schedule Payment'}
                </button>
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
              </div>
            )}

            {/* Overdue Payments */}
            {status !== 'loading' && overduePayments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#FFA500] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Overdue
                </p>
                <div className="space-y-2">
                  {overduePayments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} isOverdue onCancel={() => setCancelConfirmId(payment.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Payments */}
            {status !== 'loading' && upcomingPayments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-3">Upcoming</p>
                <div className="space-y-2">
                  {upcomingPayments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} onCancel={() => setCancelConfirmId(payment.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Incoming Payments (where user is recipient) */}
            {status !== 'loading' && incomingPayments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#3388FF] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
                  </svg>
                  Incoming
                </p>
                <div className="space-y-2">
                  {incomingPayments.map((payment) => (
                    <IncomingPaymentCard key={payment.id} payment={payment} />
                  ))}
                </div>
              </div>
            )}

            {/* Past Payments */}
            {status !== 'loading' && pastPayments.length > 0 && (
              <div>
                <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-3">History</p>
                <div className="space-y-2">
                  {pastPayments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} showDelete onDelete={() => handleDelete(payment.id)} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {status !== 'loading' && payments.length === 0 && incomingPayments.length === 0 && !showCreate && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-[var(--foreground-subtle)] mb-4">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p className="text-[var(--foreground-subtle)]">No scheduled payments</p>
                <p className="text-xs text-[var(--foreground-subtle)] mt-1">Tap + to create one</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Confirm Modal */}
      {showConfirm && (
        <ConfirmModal
          title="Confirm Scheduled Payment"
          summary={`${amount} ${selectedToken}`}
          details={[
            { label: 'Recipient', value: recipientResolved ? `${recipientResolved.username || recipientResolved.name} (${truncateAddress(recipientResolved.address)})` : (recipient.startsWith('0x') ? truncateAddress(recipient) : recipient) },
            { label: 'Scheduled', value: new Date(`${scheduledDate}T${scheduledTime}`).toLocaleString() },
            { label: 'Network', value: confirmNetworkName },
            ...(isRecurring ? [{ label: 'Recurring', value: recurringInterval.charAt(0).toUpperCase() + recurringInterval.slice(1) }] : []),
            ...(description ? [{ label: 'Note', value: description }] : []),
          ]}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      {/* Cancel Confirm Dialog */}
      {cancelConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setCancelConfirmId(null)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Cancel Payment</h3>
            <p className="text-sm text-[var(--foreground-subtle)] mb-6">Are you sure you want to cancel this scheduled payment?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setCancelConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl glass-card text-[var(--foreground)] font-medium text-sm"
              >
                No
              </button>
              <button
                onClick={() => handleCancel(cancelConfirmId)}
                className="flex-1 py-2.5 rounded-xl bg-[#EF4444]/10 text-[#f87171] font-medium text-sm border border-[#EF4444]/20"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Incoming Payment Card (receiver view — read-only)
// ---------------------------------------------------------------------------

function IncomingPaymentCard({ payment }: { payment: ScheduledPayment }) {
  const networkLabel = getNetworkLabel(payment.chainId)
  const senderDisplay = truncateAddress(payment.creatorAddress)
  const scheduledDate = new Date(payment.scheduledAt)
  const isPast = payment.status !== 'pending'

  return (
    <div className={`bg-[var(--surface)] border rounded-xl p-4 ${
      isPast ? 'border-[var(--border)] opacity-60' : 'border-[#3388FF]/20'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[#22c55e] font-medium">+{payment.amount} {payment.tokenSymbol}</p>
            {payment.recurringInterval && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3388FF" strokeWidth="2" className="flex-shrink-0">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            )}
            {networkLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--foreground-subtle)] font-mono flex-shrink-0">
                {networkLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--foreground-subtle)] truncate">From {senderDisplay}</p>
          <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">
            {scheduledDate.toLocaleString()}
          </p>
          {payment.description && (
            <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5 italic truncate">{payment.description}</p>
          )}
        </div>
        {isPast && (
          <span className={`text-xs px-2 py-1 rounded-full ml-3 flex-shrink-0 ${
            payment.status === 'executed'
              ? 'bg-[#22c55e]/8 text-[#22c55e]'
              : 'bg-[#EF4444]/5 text-[#f87171]'
          }`}>
            {payment.status}
          </span>
        )}
        {!isPast && (
          <span className="text-xs px-2 py-1 rounded-full bg-[#3388FF]/10 text-[#3388FF] ml-3 flex-shrink-0">
            pending
          </span>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Payment Card Component
// ---------------------------------------------------------------------------

function PaymentCard({ payment, isOverdue, showDelete, onCancel, onDelete }: {
  payment: ScheduledPayment
  isOverdue?: boolean
  showDelete?: boolean
  onCancel?: () => void
  onDelete?: () => void
}) {
  const networkLabel = getNetworkLabel(payment.chainId)
  const recipientDisplay = payment.recipientUsername || payment.recipientName || truncateAddress(payment.recipient)
  const isPast = payment.status !== 'pending'

  return (
    <Link
      href={`/wallet/scheduled/${payment.id}`}
      className={`block bg-[var(--surface)] border rounded-xl p-4 hover:border-[#3388FF]/30 transition-colors ${
        isOverdue
          ? 'border-[#FFA500]/30'
          : isPast
            ? 'border-[var(--border)] opacity-60'
            : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-[var(--foreground)] font-medium">{payment.amount} {payment.tokenSymbol}</p>
            {payment.recurringInterval && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3388FF" strokeWidth="2" className="flex-shrink-0">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            )}
            {networkLabel && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--background)] text-[var(--foreground-subtle)] font-mono flex-shrink-0">
                {networkLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--foreground-subtle)] truncate">{recipientDisplay}</p>
          <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">
            {isOverdue ? 'Was due: ' : ''}{new Date(payment.scheduledAt).toLocaleString()}
          </p>
          {payment.description && (
            <p className="text-[10px] text-[var(--foreground-subtle)] mt-0.5 italic truncate">{payment.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {isPast && (
            <span className={`text-xs px-2 py-1 rounded-full ${
              payment.status === 'executed'
                ? 'bg-[#22c55e]/8 text-[#22c55e]'
                : 'bg-[#EF4444]/5 text-[#f87171]'
            }`}>
              {payment.status}
            </span>
          )}
          {!isPast && onCancel && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCancel() }}
              className="p-2 text-[var(--foreground-subtle)] hover:text-[#f87171] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
          {showDelete && onDelete && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
              className="p-2 text-[var(--foreground-subtle)] hover:text-[#f87171] transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </Link>
  )
}
