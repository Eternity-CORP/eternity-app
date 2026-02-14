'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import Link from 'next/link'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  getBusiness,
  getBusinessActivity,
  calculateOwnershipPercent,
  isQuorumReached,
  formatShareAmount,
  type BusinessWallet,
  type BusinessMember,
  type BusinessActivity,
  type Proposal,
  type EthersLikeContract,
  type ContractFactory,
  type EthersLikeProvider,
  getTokenInfo,
  getAllHolders,
  getTreasuryBalance,
  getProposalCount,
  getProposal,
} from '@e-y/shared'
import { indexToProposalStatus, indexToProposalType } from '@e-y/shared'
import { apiClient } from '@/lib/api'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'

// --------------------------------------------------
// Types
// --------------------------------------------------

interface HolderInfo {
  address: string
  balance: number
  percent: number
  role?: string
  username?: string
}

interface OnChainProposalDisplay {
  id: number
  type: string
  status: string
  forVotes: number
  againstVotes: number
  totalSupply: number
  deadline: number
  creator: string
}

// --------------------------------------------------
// Donut Chart Component (SVG)
// --------------------------------------------------

const CHART_COLORS = ['#3388FF', '#00E5FF', '#22c55e', '#F59E0B', '#EF4444', '#A855F7', '#EC4899', '#14B8A6']

function DonutChart({ holders, totalSupply }: { holders: HolderInfo[]; totalSupply: number }) {
  const size = 160
  const strokeWidth = 28
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativePercent = 0

  const segments = holders.map((h, i) => {
    const percent = totalSupply > 0 ? (h.balance / totalSupply) * 100 : 0
    const dashLength = (percent / 100) * circumference
    const dashOffset = circumference - (cumulativePercent / 100) * circumference
    cumulativePercent += percent

    return {
      color: CHART_COLORS[i % CHART_COLORS.length],
      dashLength,
      dashOffset,
      percent,
      holder: h,
    }
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
        {/* Segments */}
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.dashLength} ${circumference - seg.dashLength}`}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
            style={{ opacity: 0.85 }}
          />
        ))}
      </svg>

      {/* Legend */}
      <div className="mt-4 space-y-1.5 w-full">
        {holders.map((h, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-white/60 truncate max-w-[140px]">
                {h.username ? `@${h.username}` : `${h.address.slice(0, 6)}...${h.address.slice(-4)}`}
              </span>
            </div>
            <span className="text-white/40 font-mono">
              {h.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// --------------------------------------------------
// Activity Icon
// --------------------------------------------------

function ActivityIcon({ type }: { type: BusinessActivity['type'] }) {
  const iconMap: Record<string, { color: string; path: string }> = {
    created: {
      color: '#3388FF',
      path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
    },
    proposal: {
      color: '#F59E0B',
      path: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
    },
    vote: {
      color: '#A855F7',
      path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
    },
    executed: {
      color: '#22c55e',
      path: 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3',
    },
    transfer: {
      color: '#00E5FF',
      path: 'M16 3l4 4-4 4 M20 7H4 M8 21l-4-4 4-4 M4 17h16',
    },
    deposit: {
      color: '#22c55e',
      path: 'M12 5v14 M19 12l-7 7-7-7',
    },
    dividend: {
      color: '#F59E0B',
      path: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    },
  }

  const icon = iconMap[type] || iconMap.created

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${icon.color}15` }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={icon.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={icon.path} />
      </svg>
    </div>
  )
}

// --------------------------------------------------
// Main Page Component
// --------------------------------------------------

export default function BusinessDashboardPage() {
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const businessId = params.id as string
  const { address, network } = useAccount()

  // Data state
  const [business, setBusiness] = useState<BusinessWallet | null>(null)
  const [holders, setHolders] = useState<HolderInfo[]>([])
  const [treasuryEth, setTreasuryEth] = useState('0.000000')
  const [proposals, setProposals] = useState<OnChainProposalDisplay[]>([])
  const [activities, setActivities] = useState<BusinessActivity[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [error, setError] = useState('')
  const [showDepositInfo, setShowDepositInfo] = useState(false)

  // Contract factory helper
  const contractFactory: ContractFactory = (addr, abi, signerOrProvider) =>
    new ethers.Contract(addr, abi as ethers.InterfaceAbi, signerOrProvider as ethers.ContractRunner) as unknown as EthersLikeContract

  // --------------------------------------------------
  // Load data
  // --------------------------------------------------

  useEffect(() => {
    if (!businessId || !address) return

    let cancelled = false

    async function load() {
      try {
        // 1. Get business metadata from backend
        const biz = await getBusiness(apiClient, businessId)
        if (cancelled) return
        setBusiness(biz)

        const provider = new ethers.JsonRpcProvider(network.rpcUrl)

        // 2. Collect all known member addresses from the API response
        const memberAddresses = (biz.members || []).map(m => m.address)
        if (memberAddresses.length === 0 && biz.createdBy) {
          memberAddresses.push(biz.createdBy)
        }

        // Build username lookup from API members
        const usernameByAddress: Record<string, string> = {}
        for (const m of biz.members || []) {
          if (m.username) usernameByAddress[m.address.toLowerCase()] = m.username
        }

        const [holdersData, treasuryData, proposalCountData, activityData] = await Promise.all([
          getAllHolders(contractFactory, biz.contractAddress, provider, memberAddresses).catch(() => [] as HolderInfo[]),
          getTreasuryBalance(provider as unknown as EthersLikeProvider, biz.treasuryAddress).catch(() => ({ eth: '0.000000' })),
          getProposalCount(contractFactory, biz.treasuryAddress, provider).catch(() => 0),
          getBusinessActivity(apiClient, biz.id).catch(() => [] as BusinessActivity[]),
        ])

        if (cancelled) return

        // Enrich holders with username/role from API members
        const enrichedHolders: HolderInfo[] = holdersData.length > 0
          ? holdersData.map(h => ({
              ...h,
              username: usernameByAddress[h.address.toLowerCase()],
              role: (biz.members || []).find(m => m.address.toLowerCase() === h.address.toLowerCase())?.role,
            }))
          : (biz.members || []).map(m => ({
              address: m.address,
              balance: m.initialShares,
              percent: biz.tokenSupply > 0 ? Math.round((m.initialShares / biz.tokenSupply) * 10000) / 100 : 0,
              username: m.username,
              role: m.role,
            }))

        setHolders(enrichedHolders)
        setTreasuryEth(treasuryData.eth)
        setActivities(activityData)

        // 3. Load individual proposals
        if (proposalCountData > 0) {
          const proposalPromises = []
          const count = Math.min(proposalCountData, 10) // Load last 10
          for (let i = proposalCountData - 1; i >= proposalCountData - count; i--) {
            proposalPromises.push(
              getProposal(contractFactory, biz.treasuryAddress, provider, i).catch(() => null)
            )
          }
          const proposalResults = await Promise.all(proposalPromises)
          if (cancelled) return

          const displayProposals: OnChainProposalDisplay[] = proposalResults
            .filter((p): p is NonNullable<typeof p> => p !== null)
            .map(p => ({
              id: p.id,
              type: indexToProposalType(p.proposalType),
              status: indexToProposalStatus(p.status),
              forVotes: p.forVotes,
              againstVotes: p.againstVotes,
              totalSupply: p.snapshotSupply,
              deadline: p.deadline,
              creator: p.creator,
            }))

          setProposals(displayProposals)
        }

        setStatus('succeeded')
      } catch (err) {
        if (cancelled) return
        console.error('Failed to load business:', err)
        setError(err instanceof Error ? err.message : 'Failed to load business data')
        setStatus('failed')
      }
    }

    load()
    return () => { cancelled = true }
  }, [businessId, address, network.rpcUrl])

  // --------------------------------------------------
  // Computed values
  // --------------------------------------------------

  const activeProposals = proposals.filter(p => p.status === 'active')

  const formatVotingPeriod = (seconds: number): string => {
    if (seconds >= 86400) return `${Math.round(seconds / 86400)} days`
    if (seconds >= 3600) return `${Math.round(seconds / 3600)} hours`
    return `${seconds} seconds`
  }

  const formatTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  // --------------------------------------------------
  // Loading state
  // --------------------------------------------------

  if (status === 'loading') {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12 pb-12">
          <div className="w-full max-w-[560px]">
            <BackButton />
            <div className="glass-card gradient-border rounded-2xl p-6">
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-2 border-white/20 border-t-[#3388FF] rounded-full animate-spin" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // Error state
  // --------------------------------------------------

  if (status === 'failed' || !business) {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12 pb-12">
          <div className="w-full max-w-[560px]">
            <BackButton />
            <div className="glass-card gradient-border rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-[#EF4444]/15 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Failed to load business</h2>
              <p className="text-sm text-white/40 mb-4">{error || 'Business not found'}</p>
              <button
                onClick={() => router.push('/wallet')}
                className="py-2.5 px-6 rounded-xl glass-card text-white font-medium hover:border-white/15 transition-colors"
              >
                Back to Wallet
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // --------------------------------------------------
  // Main render
  // --------------------------------------------------

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[560px]">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-white/30 mb-4 -mt-4">
            <Link href="/wallet" className="hover:text-white/60 transition-colors">Wallet</Link>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
            <span className="text-white/50">{business.name}</span>
          </div>

          {/* Header card */}
          <div className="glass-card gradient-border rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#3388FF]/15 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3388FF" strokeWidth="2">
                  <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-white">{business.name}</h1>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#3388FF]/15 text-[#3388FF] border border-[#3388FF]/20">
                    ${business.tokenSymbol}
                  </span>
                </div>
                {business.description && (
                  <p className="text-sm text-white/40 mt-1">{business.description}</p>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/3 rounded-xl p-3 text-center">
                <p className="text-xs text-white/40">Supply</p>
                <p className="text-sm font-semibold text-white">{business.tokenSupply.toLocaleString()}</p>
              </div>
              <div className="bg-white/3 rounded-xl p-3 text-center">
                <p className="text-xs text-white/40">Members</p>
                <p className="text-sm font-semibold text-white">{holders.length}</p>
              </div>
              <div className="bg-white/3 rounded-xl p-3 text-center">
                <p className="text-xs text-white/40">Proposals</p>
                <p className="text-sm font-semibold text-white">{proposals.length}</p>
              </div>
            </div>
          </div>

          {/* Dashboard grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Equity Distribution */}
            <div className="glass-card rounded-2xl p-5 sm:col-span-2">
              <h3 className="text-xs text-white/40 uppercase tracking-wide mb-4">Equity Distribution</h3>
              {holders.length > 0 ? (
                <DonutChart holders={holders} totalSupply={business.tokenSupply} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-white/30">No holder data available</p>
                  <p className="text-[10px] text-white/20 mt-1">On-chain data may take a moment to load</p>
                </div>
              )}
            </div>

            {/* Treasury Balance */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-xs text-white/40 uppercase tracking-wide mb-4">Treasury</h3>
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-1">{parseFloat(treasuryEth).toFixed(4)}</p>
                <p className="text-xs text-white/40">ETH</p>
              </div>
              <button
                onClick={() => setShowDepositInfo(!showDepositInfo)}
                className="w-full mt-4 py-2.5 rounded-xl bg-[#22c55e]/10 text-[#22c55e] text-sm font-medium border border-[#22c55e]/20 hover:bg-[#22c55e]/20 transition-colors"
              >
                {showDepositInfo ? 'Hide' : 'Deposit'}
              </button>

              {showDepositInfo && (
                <div className="mt-3 p-3 bg-white/3 rounded-xl border border-white/8">
                  <p className="text-[10px] text-white/40 mb-1.5">Send ETH to the treasury address:</p>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(business.treasuryAddress)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs font-mono text-white/60 hover:text-white hover:bg-white/8 transition-colors text-left"
                  >
                    <span className="truncate flex-1">{business.treasuryAddress}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                  </button>
                  <p className="text-[10px] text-white/25 mt-1.5">Or send from any wallet to this address</p>
                </div>
              )}
            </div>

            {/* Members List */}
            <div className="glass-card rounded-2xl p-5">
              <h3 className="text-xs text-white/40 uppercase tracking-wide mb-4">Members</h3>
              <div className="space-y-3">
                {holders.length > 0 ? holders.map((h, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-white/60 truncate font-mono">
                        {h.username ? `@${h.username}` : `${h.address.slice(0, 6)}...${h.address.slice(-4)}`}
                      </span>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0 ml-2">
                      <span className="text-xs text-white/70 font-mono">{h.balance}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-16 h-1 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${h.percent}%`,
                              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-white/40">{h.percent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-white/30 text-center py-4">No member data</p>
                )}
              </div>
            </div>

            {/* Active Proposals */}
            <div className="glass-card rounded-2xl p-5 sm:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs text-white/40 uppercase tracking-wide">Active Proposals</h3>
                <Link
                  href={`/wallet/business/${businessId}/proposals`}
                  className="text-[10px] text-[#3388FF] hover:text-[#3388FF]/80 transition-colors"
                >
                  Create Proposal
                </Link>
              </div>

              {activeProposals.length > 0 ? (
                <div className="space-y-3">
                  {activeProposals.map((p) => {
                    const totalVotes = p.forVotes + p.againstVotes
                    const forPct = totalVotes > 0 ? (p.forVotes / totalVotes) * 100 : 0
                    const againstPct = totalVotes > 0 ? (p.againstVotes / totalVotes) * 100 : 0
                    const quorumMet = business ? isQuorumReached(p.forVotes, p.totalSupply, business.quorumThreshold) : false
                    const deadline = new Date(p.deadline * 1000)
                    const timeLeft = deadline.getTime() - Date.now()
                    const hoursLeft = Math.max(0, Math.floor(timeLeft / 3600000))

                    return (
                      <div key={p.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
                              #{p.id}
                            </span>
                            <span className="text-xs text-white/50 capitalize">{p.type.replace(/_/g, ' ').toLowerCase()}</span>
                          </div>
                          <span className="text-[10px] text-white/30">
                            {hoursLeft > 0 ? `${hoursLeft}h left` : 'Ended'}
                          </span>
                        </div>

                        {/* Voting bars */}
                        <div className="space-y-1.5 mt-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#22c55e] w-8">For</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full bg-[#22c55e] transition-all"
                                style={{ width: `${forPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/40 w-8 text-right">{p.forVotes}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[#EF4444] w-8">Against</span>
                            <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full bg-[#EF4444] transition-all"
                                style={{ width: `${againstPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/40 w-8 text-right">{p.againstVotes}</span>
                          </div>
                        </div>

                        {quorumMet && (
                          <p className="text-[10px] text-[#22c55e] mt-2">Quorum reached</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/15 mb-2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <p className="text-xs text-white/30">No active proposals</p>
                </div>
              )}

              {proposals.length > activeProposals.length && (
                <Link
                  href={`/wallet/business/${businessId}/proposals`}
                  className="w-full mt-3 py-2 rounded-lg text-xs text-[#3388FF] hover:bg-[#3388FF]/5 transition-colors block text-center"
                >
                  View All ({proposals.length})
                </Link>
              )}
            </div>

            {/* Recent Activity */}
            <div className="glass-card rounded-2xl p-5 sm:col-span-2">
              <h3 className="text-xs text-white/40 uppercase tracking-wide mb-4">Recent Activity</h3>

              {activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3">
                      <ActivityIcon type={activity.type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/70">{activity.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-white/30">{formatTimeAgo(activity.createdAt)}</span>
                          {activity.txHash && (
                            <a
                              href={`https://sepolia.etherscan.io/tx/${activity.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#3388FF]/60 hover:text-[#3388FF] transition-colors font-mono"
                            >
                              {activity.txHash.slice(0, 8)}...
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-white/15 mb-2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <p className="text-xs text-white/30">No activity yet</p>
                </div>
              )}
            </div>

            {/* Business Settings */}
            <div className="glass-card rounded-2xl p-5 sm:col-span-2">
              <h3 className="text-xs text-white/40 uppercase tracking-wide mb-4">Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-white/40">Transfer Policy</span>
                  <span className="text-xs text-white/70">
                    {business.transferPolicy === 'FREE' ? 'Free Transfer' : 'Approval Required'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-white/40">Quorum Threshold</span>
                  <span className="text-xs text-white/70">{(business.quorumThreshold / 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-white/40">Voting Period</span>
                  <span className="text-xs text-white/70">{formatVotingPeriod(business.votingPeriod)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-white/40">Vesting</span>
                  <span className="text-xs text-white/70">
                    {business.vestingEnabled
                      ? `${(business.vestingConfig as VestingDisplayConfig | undefined)?.cliffMonths ?? '?'}mo cliff, ${(business.vestingConfig as VestingDisplayConfig | undefined)?.durationMonths ?? '?'}mo duration`
                      : 'Disabled'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-white/40">Dividends</span>
                  <span className="text-xs text-white/70">
                    {business.dividendsEnabled
                      ? `${(business.dividendsConfig as DividendDisplayConfig | undefined)?.percentage ?? '?'}% ${(business.dividendsConfig as DividendDisplayConfig | undefined)?.frequency ?? ''}`
                      : 'Disabled'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// --------------------------------------------------
// Display-only config types (for reading from API)
// --------------------------------------------------

interface VestingDisplayConfig {
  cliffMonths?: number
  durationMonths?: number
  schedule?: string
}

interface DividendDisplayConfig {
  frequency?: string
  percentage?: number
  token?: string
}
