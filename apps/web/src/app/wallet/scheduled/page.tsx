'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import Navigation from '@/components/Navigation'

type ScheduledPayment = {
  id: string
  recipient: string
  amount: string
  scheduledAt: string
  status: 'pending' | 'executed' | 'cancelled'
}

export default function ScheduledPage() {
  const router = useRouter()
  const [address, setAddress] = useState('')
  const [payments, setPayments] = useState<ScheduledPayment[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    const mnemonic = sessionStorage.getItem('session_mnemonic')
    if (!mnemonic) {
      router.push('/unlock')
      return
    }

    const wallet = deriveWalletFromMnemonic(mnemonic, 0)
    setAddress(wallet.address)

    // Load scheduled payments from localStorage for now
    const saved = localStorage.getItem(`scheduled_${wallet.address}`)
    if (saved) {
      setPayments(JSON.parse(saved))
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('session_mnemonic')
    router.push('/unlock')
  }

  const handleCreate = () => {
    if (!recipient || !amount || !scheduledDate || !scheduledTime) return

    const newPayment: ScheduledPayment = {
      id: Date.now().toString(),
      recipient,
      amount,
      scheduledAt: `${scheduledDate}T${scheduledTime}`,
      status: 'pending',
    }

    const updated = [...payments, newPayment]
    setPayments(updated)
    localStorage.setItem(`scheduled_${address}`, JSON.stringify(updated))

    setShowCreate(false)
    setRecipient('')
    setAmount('')
    setScheduledDate('')
    setScheduledTime('')
  }

  const handleCancel = (id: string) => {
    const updated = payments.map(p =>
      p.id === id ? { ...p, status: 'cancelled' as const } : p
    )
    setPayments(updated)
    localStorage.setItem(`scheduled_${address}`, JSON.stringify(updated))
  }

  const pendingPayments = payments.filter(p => p.status === 'pending')
  const pastPayments = payments.filter(p => p.status !== 'pending')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navigation isLoggedIn={true} address={address} onLogout={handleLogout} />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="bg-[#131313] border border-[#1f1f1f] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-semibold text-white">Scheduled</h1>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="w-8 h-8 rounded-lg bg-[#1f1f1f] border border-[#2a2a2a] flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors"
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
                <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4">
                  <label className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2 block">Recipient</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="Address or @username"
                    className="w-full bg-transparent text-white placeholder:text-[#4a4a4a] focus:outline-none"
                  />
                </div>
                <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4">
                  <label className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2 block">Amount</label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-xl font-bold text-white placeholder:text-[#4a4a4a] focus:outline-none"
                    />
                    <span className="flex-shrink-0 text-[#6b6b6b]">ETH</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4">
                    <label className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2 block">Date</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                  <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4">
                    <label className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-2 block">Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!recipient || !amount || !scheduledDate || !scheduledTime}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold hover:bg-[#e5e5e5] transition-colors disabled:opacity-40"
                >
                  Schedule Payment
                </button>
              </div>
            )}

            {/* Pending Payments */}
            {pendingPayments.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-3">Upcoming</p>
                <div className="space-y-2">
                  {pendingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-medium">{payment.amount} ETH</p>
                        <p className="text-xs text-[#6b6b6b] font-mono truncate max-w-[180px]">
                          {payment.recipient}
                        </p>
                        <p className="text-xs text-[#6b6b6b] mt-1">
                          {new Date(payment.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleCancel(payment.id)}
                        className="p-2 text-[#6b6b6b] hover:text-[#f87171] transition-colors"
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
            {pastPayments.length > 0 && (
              <div>
                <p className="text-xs text-[#6b6b6b] uppercase tracking-wide mb-3">History</p>
                <div className="space-y-2">
                  {pastPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-white font-medium">{payment.amount} ETH</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          payment.status === 'executed'
                            ? 'bg-[#0d2818] text-[#22c55e]'
                            : 'bg-[#2d1515] text-[#f87171]'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6b6b6b] font-mono truncate mt-1">
                        {payment.recipient}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {payments.length === 0 && !showCreate && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-[#3a3a3a] mb-4">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <p className="text-[#6b6b6b]">No scheduled payments</p>
                <p className="text-xs text-[#4a4a4a] mt-1">Tap + to create one</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
