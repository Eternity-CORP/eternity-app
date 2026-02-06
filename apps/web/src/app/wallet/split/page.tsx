'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from '@/contexts/account-context'
import Navigation from '@/components/Navigation'

type SplitParticipant = {
  address: string
  amount: string
  status: 'pending' | 'paid'
}

type SplitBill = {
  id: string
  creatorAddress: string
  totalAmount: string
  description: string
  participants: SplitParticipant[]
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
}

export default function SplitPage() {
  const router = useRouter()
  const { address, network, isLoggedIn } = useAccount()
  const [splits, setSplits] = useState<SplitBill[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [totalAmount, setTotalAmount] = useState('')
  const [description, setDescription] = useState('')
  const [participantAddresses, setParticipantAddresses] = useState('')
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal')

  // Auth guard: redirect to /unlock when not logged in (skip while context is loading)
  useEffect(() => {
    if (!isLoggedIn && address !== '') {
      router.push('/unlock')
    }
  }, [isLoggedIn, address, router])

  // Load splits from localStorage when address is available
  useEffect(() => {
    if (!address) return
    const saved = localStorage.getItem(`splits_${address}`)
    if (saved) {
      setSplits(JSON.parse(saved))
    }
  }, [address])

  const handleCreate = () => {
    if (!totalAmount || !participantAddresses) return

    const addresses = participantAddresses
      .split(/[,\n]/)
      .map(a => a.trim())
      .filter(a => a.length > 0)

    if (addresses.length === 0) return

    const perPerson = (parseFloat(totalAmount) / (addresses.length + 1)).toFixed(6)

    const newSplit: SplitBill = {
      id: Date.now().toString(),
      creatorAddress: address,
      totalAmount,
      description: description || 'Split bill',
      participants: addresses.map(addr => ({
        address: addr,
        amount: perPerson,
        status: 'pending',
      })),
      status: 'active',
      createdAt: new Date().toISOString(),
    }

    const updated = [...splits, newSplit]
    setSplits(updated)
    localStorage.setItem(`splits_${address}`, JSON.stringify(updated))

    setShowCreate(false)
    setTotalAmount('')
    setDescription('')
    setParticipantAddresses('')
  }

  const handleCancel = (id: string) => {
    const updated = splits.map(s =>
      s.id === id ? { ...s, status: 'cancelled' as const } : s
    )
    setSplits(updated)
    localStorage.setItem(`splits_${address}`, JSON.stringify(updated))
  }

  const createdSplits = splits.filter(s => s.creatorAddress === address && s.status === 'active')
  const pendingSplits = splits.filter(s =>
    s.status === 'active' &&
    s.participants.some(p => p.address.toLowerCase() === address.toLowerCase() && p.status === 'pending')
  )

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="glass-card gradient-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-xl font-semibold text-white">Split Bill</h1>
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
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Total Amount</label>
                  <div className="flex items-center gap-3 overflow-hidden">
                    <input
                      type="number"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      placeholder="0"
                      step="0.0001"
                      className="flex-1 min-w-0 bg-transparent text-xl font-bold text-white placeholder:text-white/25 focus:outline-none"
                    />
                    <span className="flex-shrink-0 text-white/40">{network.symbol}</span>
                  </div>
                </div>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Dinner, tickets, etc."
                    className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none"
                  />
                </div>
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Participants</label>
                  <textarea
                    value={participantAddresses}
                    onChange={(e) => setParticipantAddresses(e.target.value)}
                    placeholder="Addresses or @usernames (one per line)"
                    rows={3}
                    className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none resize-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSplitMode('equal')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      splitMode === 'equal'
                        ? 'bg-white text-black'
                        : 'glass-card text-white/40'
                    }`}
                  >
                    Equal Split
                  </button>
                  <button
                    onClick={() => setSplitMode('custom')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      splitMode === 'custom'
                        ? 'bg-white text-black'
                        : 'glass-card text-white/40'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                {totalAmount && participantAddresses && (
                  <div className="bg-[#22c55e]/8 border border-[#22c55e]/20 rounded-xl p-3">
                    <p className="text-[#22c55e] text-sm">
                      Each person pays: {(parseFloat(totalAmount) / (participantAddresses.split(/[,\n]/).filter(a => a.trim()).length + 1)).toFixed(4)} {network.symbol}
                    </p>
                  </div>
                )}
                <button
                  onClick={handleCreate}
                  disabled={!totalAmount || !participantAddresses}
                  className="w-full py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                >
                  Create Split
                </button>
              </div>
            )}

            {/* Pending Payments (you owe) */}
            {pendingSplits.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-3">You Owe</p>
                <div className="space-y-2">
                  {pendingSplits.map((split) => {
                    const myPart = split.participants.find(
                      p => p.address.toLowerCase() === address.toLowerCase()
                    )
                    return (
                      <div
                        key={split.id}
                        className="bg-white/3 border border-white/8 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium">{myPart?.amount} {network.symbol}</p>
                          <span className="text-xs px-2 py-1 rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
                            pending
                          </span>
                        </div>
                        <p className="text-sm text-white/50">{split.description}</p>
                        <button
                          onClick={() => router.push(`/wallet/send?to=${split.creatorAddress}&amount=${myPart?.amount}`)}
                          className="w-full mt-3 py-2 rounded-lg bg-white text-black text-sm font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
                        >
                          Pay Now
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Created Splits */}
            {createdSplits.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Your Splits</p>
                <div className="space-y-2">
                  {createdSplits.map((split) => {
                    const paidCount = split.participants.filter(p => p.status === 'paid').length
                    return (
                      <div
                        key={split.id}
                        className="bg-white/3 border border-white/8 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-white font-medium">{split.totalAmount} {network.symbol}</p>
                          <button
                            onClick={() => handleCancel(split.id)}
                            className="p-1 text-white/40 hover:text-[#f87171] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                        <p className="text-sm text-white/50 mb-2">{split.description}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#22c55e] transition-all"
                              style={{ width: `${(paidCount / split.participants.length) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-white/40">
                            {paidCount}/{split.participants.length}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {splits.length === 0 && !showCreate && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20 mb-4">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p className="text-white/40">No split bills</p>
                <p className="text-xs text-white/25 mt-1">Tap + to split a bill</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
