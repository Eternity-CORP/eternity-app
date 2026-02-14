'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import {
  type ContractFactory,
  type EthersLikeContract,
  type ProposalStatus,
  type ProposalType,
  getProposalCount,
  getProposal,
  indexToProposalStatus,
  indexToProposalType,
  getBusiness,
  type BusinessWallet,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProposalItem {
  id: number
  type: ProposalType
  status: ProposalStatus
  creator: string
  forVotes: number
  againstVotes: number
  snapshotSupply: number
  deadline: number
  data: string
}

type FilterTab = 'all' | 'active' | 'passed' | 'executed'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const contractFactory: ContractFactory = (address, abi, signerOrProvider) =>
  new ethers.Contract(
    address,
    abi as ethers.InterfaceAbi,
    signerOrProvider as ethers.ContractRunner,
  ) as unknown as EthersLikeContract

function proposalTypeLabel(t: ProposalType): string {
  const map: Record<ProposalType, string> = {
    WITHDRAW_ETH: 'Withdraw ETH',
    WITHDRAW_TOKEN: 'Withdraw Token',
    TRANSFER_SHARES: 'Transfer Shares',
    CHANGE_SETTINGS: 'Change Settings',
    CUSTOM: 'Custom',
    DISTRIBUTE_DIVIDENDS: 'Distribute Dividends',
  }
  return map[t] ?? t
}

function proposalTypeIcon(t: ProposalType) {
  switch (t) {
    case 'WITHDRAW_ETH':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 7l-5-5-5 5" />
        </svg>
      )
    case 'WITHDRAW_TOKEN':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M8 10l4-4 4 4" />
        </svg>
      )
    case 'TRANSFER_SHARES':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M14 14l7 7M3 8V3h5" />
        </svg>
      )
    case 'CHANGE_SETTINGS':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
  }
}

function statusColor(s: ProposalStatus): string {
  switch (s) {
    case 'active':
      return 'bg-[#3388FF]/15 text-[#3388FF]'
    case 'passed':
      return 'bg-[#22c55e]/15 text-[#22c55e]'
    case 'executed':
      return 'bg-white/10 text-white/60'
    case 'rejected':
      return 'bg-[#EF4444]/15 text-[#EF4444]'
    case 'canceled':
      return 'bg-[#f59e0b]/15 text-[#f59e0b]'
    default:
      return 'bg-white/10 text-white/60'
  }
}

function formatCountdown(deadline: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProposalsPage() {
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const businessId = params.id as string
  const { network } = useAccount()

  const [business, setBusiness] = useState<BusinessWallet | null>(null)
  const [proposals, setProposals] = useState<ProposalItem[]>([])
  const [filter, setFilter] = useState<FilterTab>('all')
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [error, setError] = useState('')

  // Load business metadata + on-chain proposals
  const loadProposals = useCallback(async () => {
    try {
      setStatus('loading')
      setError('')

      // Load business metadata from API
      const biz = await getBusiness(apiClient, businessId)
      setBusiness(biz)

      // Load on-chain proposals
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
      const count = await getProposalCount(contractFactory, biz.treasuryAddress, provider)

      const items: ProposalItem[] = []
      for (let i = 0; i < count; i++) {
        const p = await getProposal(contractFactory, biz.treasuryAddress, provider, i)
        items.push({
          id: p.id,
          type: indexToProposalType(p.proposalType),
          status: indexToProposalStatus(p.status),
          creator: p.creator,
          forVotes: p.forVotes,
          againstVotes: p.againstVotes,
          snapshotSupply: p.snapshotSupply,
          deadline: p.deadline,
          data: p.data,
        })
      }

      setProposals(items.reverse())
      setStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load proposals'
      setError(msg)
      setStatus('failed')
    }
  }, [businessId, network.rpcUrl])

  useEffect(() => {
    loadProposals()
  }, [loadProposals])

  const filtered = proposals.filter((p) => {
    if (filter === 'all') return true
    return p.status === filter
  })

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'passed', label: 'Passed' },
    { key: 'executed', label: 'Executed' },
  ]

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />

          <div className="glass-card gradient-border rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-white">Proposals</h1>
                {business && (
                  <p className="text-xs text-white/40 mt-1">{business.name}</p>
                )}
              </div>
              <button
                onClick={() => router.push(`/wallet/business/${businessId}/proposals/create`)}
                className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors"
              >
                Create Proposal
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filter === tab.key
                      ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                      : 'glass-card text-white/40'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Loading */}
            {status === 'loading' && (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {/* Error */}
            {status === 'failed' && error && (
              <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl mb-4">
                <p className="text-[#f87171] text-sm">{error}</p>
                <button
                  onClick={loadProposals}
                  className="text-xs text-white/40 hover:text-white mt-2 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Proposals List */}
            {status === 'succeeded' && filtered.length > 0 && (
              <div className="space-y-3">
                {filtered.map((p) => {
                  const totalVotes = p.forVotes + p.againstVotes
                  const forPercent = totalVotes > 0 ? Math.round((p.forVotes / totalVotes) * 100) : 0
                  const againstPercent = totalVotes > 0 ? 100 - forPercent : 0

                  return (
                    <button
                      key={p.id}
                      onClick={() => router.push(`/wallet/business/${businessId}/proposals/${p.id}`)}
                      className="w-full text-left bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-colors"
                    >
                      {/* Type + Status */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-white/70">
                          {proposalTypeIcon(p.type)}
                          <span className="text-sm font-medium text-white">
                            {proposalTypeLabel(p.type)}
                          </span>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </div>

                      {/* Voting Progress */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
                          <span>For: {forPercent}%</span>
                          <span>Against: {againstPercent}%</span>
                        </div>
                        <div className="h-1.5 bg-white/8 rounded-full overflow-hidden flex">
                          {forPercent > 0 && (
                            <div
                              className="h-full bg-[#22c55e] transition-all"
                              style={{ width: `${forPercent}%` }}
                            />
                          )}
                          {againstPercent > 0 && (
                            <div
                              className="h-full bg-[#EF4444] transition-all"
                              style={{ width: `${againstPercent}%` }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Deadline + Creator */}
                      <div className="flex items-center justify-between text-[10px] text-white/30">
                        <span>{formatCountdown(p.deadline)}</span>
                        <span className="font-mono">{shortenAddress(p.creator)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {/* Empty State */}
            {status === 'succeeded' && filtered.length === 0 && (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/20 mb-4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <p className="text-white/40">No proposals found</p>
                <p className="text-xs text-white/25 mt-1">
                  {filter !== 'all' ? 'Try a different filter' : 'Create the first proposal'}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
