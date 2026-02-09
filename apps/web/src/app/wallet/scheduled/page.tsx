'use client'

import { useState, useEffect } from 'react'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  getScheduledPayments,
  createScheduledPayment,
  cancelScheduledPayment,
  type ScheduledPayment,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'

export default function ScheduledPage() {
  useAuthGuard()
  const { address, network } = useAccount()
  const [payments, setPayments] = useState<ScheduledPayment[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState('')

  // Load scheduled payments from API when address is available
  useEffect(() => {
    if (!address) return

    let cancelled = false

    async function load() {
      try {
        const data = await getScheduledPayments(apiClient, address)
        if (!cancelled) setPayments(data)
      } catch {
        // ignore — empty list on error
      } finally {
        if (!cancelled) setStatus('succeeded')
      }
    }

    load()
    return () => { cancelled = true }
  }, [address])

  const handleCreate = async () => {
    if (!recipient || !amount || !scheduledDate || !scheduledTime) return

    setSubmitStatus('loading')
    setError('')

    try {
      const newPayment = await createScheduledPayment(apiClient, {
        creatorAddress: address,
        recipient,
        amount,
        tokenSymbol: network.symbol,
        scheduledAt: `${scheduledDate}T${scheduledTime}`,
      })

      setPayments((prev) => [...prev, newPayment])

      setShowCreate(false)
      setRecipient('')
      setAmount('')
      setScheduledDate('')
      setScheduledTime('')
      setSubmitStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create scheduled payment'
      setError(msg)
      setSubmitStatus('failed')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await cancelScheduledPayment(apiClient, id, address)
      setPayments((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'cancelled' as const } : p)),
      )
    } catch {
      // ignore
    }
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const pastPayments = payments.filter(p => p.status !== 'pending')

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-semibold text-white">Scheduled</h1>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-white hover:border-white/15 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <div className="mb-6 space-y-3">
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Recipient</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Address or @username"
                    className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Amount</label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                    />
                    <span className="flex-shrink-0 text-white/40">{network.symbol}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                  <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={!recipient || !amount || !scheduledDate || !scheduledTime || submitStatus === 'loading'}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                >
                  {submitStatus === 'loading' ? 'Creating...' : 'Schedule Payment'}
                </button>
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Pending Payments */}
            {status !== 'loading' && pendingPayments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Upcoming</p>
                <div className="space-y-2">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white/3 border border-white/8 rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{payment.amount} {network.symbol}</p>
                        <p className="text-xs text-white/40 font-mono truncate max-w-[180px]">
                          {payment.recipient}
                        </p>
                        <p className="text-xs text-white/40 mt-1">
                          {new Date(payment.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(payment.id)}
                        className="p-2 text-white/40 hover:text-[#f87171] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Payments */}
            {status !== 'loading' && pastPayments.length > 0 && (
              <div>
                <p className="text-xs text-white/40 uppercase tracking-wide mb-3">History</p>
                <div className="space-y-2">
                  {pastPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-white/3 border border-white/8 rounded-xl p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{payment.amount} {network.symbol}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          payment.status === 'executed'
                            ? 'bg-[#22c55e]/8 text-[#22c55e]'
                            : 'bg-[#EF4444]/5 text-[#f87171]'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/40 font-mono truncate mt-1">
                        {payment.recipient}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {status !== 'loading' && payments.length === 0 && !showCreate && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20 mb-4">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p className="text-white/40">No scheduled payments</p>
                <p className="text-xs text-white/25 mt-1">Tap + to create one</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
