'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useBalance } from '@/contexts/balance-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  getScheduledPayment,
  updateScheduledPayment,
  cancelScheduledPayment,
  deleteScheduledPayment,
  getNetworkLabel,
  truncateAddress,
  type ScheduledPayment,
  CHAIN_ID_TO_NETWORK,
  type NetworkId,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { signScheduledTransaction } from '@/lib/send-service'
import { getProvider, getSepoliaProvider } from '@/lib/multi-network'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'

export default function ScheduledDetailPage() {
  useAuthGuard()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { address, currentAccount } = useAccount()
  const { aggregatedBalances } = useBalance()
  const isTestAccount = currentAccount?.type === 'test'

  const [payment, setPayment] = useState<ScheduledPayment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editAmount, setEditAmount] = useState('')
  const [editRecipient, setEditRecipient] = useState('')
  const [showEditConfirm, setShowEditConfirm] = useState(false)

  useEffect(() => {
    if (!id || !address) return
    let cancelled = false
    async function load() {
      try {
        const data = await getScheduledPayment(apiClient, id, address)
        if (!cancelled) setPayment(data)
      } catch {
        if (!cancelled) setError('Payment not found')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, address])

  const handleCancel = async () => {
    if (!payment) return
    setActionLoading(true)
    try {
      await cancelScheduledPayment(apiClient, payment.id, address)
      setPayment({ ...payment, status: 'cancelled' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!payment) return
    setActionLoading(true)
    try {
      await deleteScheduledPayment(apiClient, payment.id, address)
      router.push('/wallet/scheduled')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePayNow = () => {
    if (!payment) return
    router.push(`/wallet/send?to=${payment.recipient}&amount=${payment.amount}&token=${payment.tokenSymbol}`)
  }

  const openEdit = () => {
    if (!payment) return
    setEditAmount(payment.amount)
    setEditRecipient(payment.recipient)
    setEditing(true)
  }

  const handleEditConfirm = useCallback(async (password: string) => {
    if (!payment || !currentAccount) throw new Error('No wallet connected')

    const mnemonic = await loadAndDecrypt(password)
    const wallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)

    const networkId = (payment.chainId ? CHAIN_ID_TO_NETWORK[payment.chainId] : 'base') as NetworkId
    const provider = isTestAccount ? getSepoliaProvider() : getProvider(networkId)
    const connectedWallet = wallet.connect(provider)

    // Resolve token info
    let tokenParam: { address: string; decimals: number } | undefined
    const tokenInfo = aggregatedBalances.find(t => t.symbol === payment.tokenSymbol)
    if (tokenInfo) {
      const networkData = tokenInfo.networks.find(n => n.contractAddress !== 'native')
      if (networkData) {
        tokenParam = { address: networkData.contractAddress, decimals: tokenInfo.decimals }
      }
    }

    const signedData = await signScheduledTransaction(connectedWallet, provider, editRecipient, editAmount, tokenParam)

    const updated = await updateScheduledPayment(apiClient, payment.id, {
      amount: editAmount !== payment.amount ? editAmount : undefined,
      recipient: editRecipient.toLowerCase() !== payment.recipient.toLowerCase() ? editRecipient : undefined,
      signedTransaction: signedData.signedTx,
      estimatedGasPrice: signedData.gasPrice,
      nonce: signedData.nonce,
      chainId: signedData.chainId,
    }, address)

    setPayment(updated)
    setEditing(false)
    setShowEditConfirm(false)
  }, [payment, currentAccount, editAmount, editRecipient, aggregatedBalances, isTestAccount, address])

  if (loading) {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12">
          <div className="w-full max-w-[420px]">
            <BackButton />
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--foreground)] rounded-full animate-spin" />
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12">
          <div className="w-full max-w-[420px]">
            <BackButton />
            <div className="text-center py-12">
              <p className="text-[var(--foreground-subtle)]">{error || 'Payment not found'}</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const scheduledDate = new Date(payment.scheduledAt)
  const isPast = scheduledDate.getTime() < Date.now()
  const isPending = payment.status === 'pending'
  const isOverdue = isPending && isPast
  const networkLabel = getNetworkLabel(payment.chainId)
  const recipientDisplay = payment.recipientUsername || payment.recipientName || truncateAddress(payment.recipient)

  const statusConfig = {
    pending: { label: isOverdue ? 'Overdue' : 'Pending', color: isOverdue ? '#FFA500' : '#3388FF' },
    executed: { label: 'Executed', color: '#22c55e' },
    cancelled: { label: 'Cancelled', color: '#EF4444' },
    failed: { label: 'Failed', color: '#EF4444' },
  }[payment.status] || { label: payment.status, color: '#888' }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />

          <div className="glass-card gradient-border rounded-2xl p-6 space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <span
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: statusConfig.color + '15', color: statusConfig.color }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusConfig.color }} />
                {statusConfig.label}
              </span>
            </div>

            {/* Amount */}
            <div className="text-center">
              <p className="text-3xl font-bold text-[var(--foreground)]">{payment.amount} {payment.tokenSymbol}</p>
              {payment.recurringInterval && (
                <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-[#3388FF]/10 text-[#3388FF] text-xs font-medium">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                  </svg>
                  {payment.recurringInterval.charAt(0).toUpperCase() + payment.recurringInterval.slice(1)}
                </span>
              )}
            </div>

            {/* Details */}
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
              <DetailRow label="To" value={recipientDisplay} />
              {(payment.recipientUsername || payment.recipientName) && (
                <DetailRow label="Address" value={truncateAddress(payment.recipient)} mono />
              )}
              <DetailRow
                label="Scheduled"
                value={`${scheduledDate.toLocaleDateString()} at ${scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              />
              {payment.description && <DetailRow label="Note" value={payment.description} />}
              {payment.executedTxHash && <DetailRow label="TX Hash" value={truncateAddress(payment.executedTxHash)} mono />}
              <DetailRow label="Created" value={new Date(payment.createdAt).toLocaleDateString()} />
              {networkLabel && <DetailRow label="Network" value={networkLabel} />}
            </div>

            {error && (
              <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                <p className="text-[#f87171] text-sm">{error}</p>
              </div>
            )}

            {/* Actions */}
            {isPending && (
              <div className="space-y-3">
                {isOverdue && (
                  <button
                    onClick={handlePayNow}
                    className="w-full py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold shimmer hover:opacity-90 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Pay Now
                  </button>
                )}
                {!isPast && (
                  <button
                    onClick={openEdit}
                    className="w-full py-3 rounded-xl bg-[#3388FF]/10 text-[#3388FF] font-semibold border border-[#3388FF]/20 hover:bg-[#3388FF]/15 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Edit Payment
                  </button>
                )}
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="w-full py-3 rounded-xl bg-[#EF4444]/10 text-[#f87171] font-semibold border border-[#EF4444]/20 hover:bg-[#EF4444]/15 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? 'Cancelling...' : 'Cancel Payment'}
                </button>
              </div>
            )}

            {(payment.status === 'cancelled' || payment.status === 'executed') && (
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="w-full py-3 rounded-xl bg-[#EF4444]/10 text-[#f87171] font-semibold border border-[#EF4444]/20 hover:bg-[#EF4444]/15 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditing(false)}>
          <div className="glass-card rounded-2xl p-6 max-w-sm mx-4 w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit Payment</h3>

            <div className="px-4 py-3 bg-[#FFA500]/5 border border-[#FFA500]/15 rounded-xl">
              <p className="text-[#FFA500] text-xs">Changing amount or recipient requires re-signing. Current gas prices will be used.</p>
            </div>

            <div>
              <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-1.5 block">Recipient</label>
              <input
                type="text"
                value={editRecipient}
                onChange={(e) => setEditRecipient(e.target.value)}
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-1.5 block">Amount ({payment?.tokenSymbol})</label>
              <input
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                step="0.0001"
                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 text-lg font-bold text-[var(--foreground)] focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl glass-card text-[var(--foreground)] font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowEditConfirm(true)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-medium text-sm shimmer"
              >
                Save & Re-sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal (password) */}
      {showEditConfirm && (
        <ConfirmModal
          title="Re-sign Transaction"
          summary={`${editAmount} ${payment?.tokenSymbol}`}
          details={[
            { label: 'Recipient', value: editRecipient.startsWith('0x') ? truncateAddress(editRecipient) : editRecipient },
          ]}
          onConfirm={handleEditConfirm}
          onCancel={() => setShowEditConfirm(false)}
        />
      )}
    </div>
  )
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <p className="text-xs text-[var(--foreground-subtle)] flex-shrink-0">{label}</p>
      <p className={`text-sm text-[var(--foreground)] text-right ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}
