'use client'

import { useState, useMemo, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { getSepoliaProvider } from '@/lib/multi-network'
import {
  type ProposalType,
  createProposal,
  getBusiness,
  getShareBalance,
  saveProposal,
  truncateAddress,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { createContractFactory } from '@/lib/contract-utils'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Step = 'type' | 'fields' | 'review'

interface ProposalTypeOption {
  value: ProposalType
  label: string
  description: string
}

const PROPOSAL_TYPES: ProposalTypeOption[] = [
  { value: 'WITHDRAW_ETH', label: 'Withdraw ETH', description: 'Send ETH from treasury to an address' },
  { value: 'DISTRIBUTE_DIVIDENDS', label: 'Distribute Dividends', description: 'Distribute treasury ETH to all holders proportionally' },
  { value: 'TRANSFER_SHARES', label: 'Transfer Shares', description: 'Transfer ownership shares between addresses' },
  { value: 'CHANGE_SETTINGS', label: 'Change Settings', description: 'Update quorum or voting period' },
  { value: 'CUSTOM', label: 'Custom', description: 'Off-chain governance proposal' },
]

function typeIcon(t: ProposalType) {
  switch (t) {
    case 'WITHDRAW_ETH':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v20M17 7l-5-5-5 5" />
        </svg>
      )
    case 'TRANSFER_SHARES':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M14 14l7 7M3 8V3h5" />
        </svg>
      )
    case 'CHANGE_SETTINGS':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'DISTRIBUTE_DIVIDENDS':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v12M6 12h12" />
        </svg>
      )
    default:
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      )
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CreateProposalPage() {
  useAuthGuard()
  const router = useRouter()
  const params = useParams()
  const businessId = params.id as string
  const { wallet, address, network, currentAccount, accounts } = useAccount()

  // For proposals, always use a personal wallet with shares (not treasury)
  const personalAccounts = useMemo(() => accounts.filter((a) => a.type !== 'business'), [accounts])
  const [holderAccount, setHolderAccount] = useState<typeof personalAccounts[0] | null>(null)
  const creatorAddress = holderAccount?.address || wallet?.address || address

  // Find the personal account that holds shares in this business
  useEffect(() => {
    let cancelled = false
    async function findHolder() {
      try {
        const biz = await getBusiness(apiClient, businessId)
        const provider = getSepoliaProvider()
        for (const acc of personalAccounts) {
          const shares = await getShareBalance(createContractFactory, biz.contractAddress, provider, acc.address)
          if (shares > 0 && !cancelled) {
            setHolderAccount(acc)
            return
          }
        }
        // Fallback: use first personal account
        if (!cancelled && personalAccounts.length > 0) {
          setHolderAccount(personalAccounts[0])
        }
      } catch {
        if (!cancelled && personalAccounts.length > 0) {
          setHolderAccount(personalAccounts[0])
        }
      }
    }
    findHolder()
    return () => { cancelled = true }
  }, [businessId, personalAccounts])

  const [step, setStep] = useState<Step>('type')
  const [selectedType, setSelectedType] = useState<ProposalType | null>(null)

  // WITHDRAW_ETH fields
  const [ethRecipient, setEthRecipient] = useState('')
  const [ethAmount, setEthAmount] = useState('')

  // TRANSFER_SHARES fields
  const [sharesFrom, setSharesFrom] = useState('')
  const [sharesTo, setSharesTo] = useState('')
  const [sharesAmount, setSharesAmount] = useState('')

  // CHANGE_SETTINGS fields
  const [newQuorum, setNewQuorum] = useState('')
  const [newVotingPeriod, setNewVotingPeriod] = useState('')

  // DISTRIBUTE_DIVIDENDS fields
  const [dividendAmount, setDividendAmount] = useState('')
  const [dividendHolders, setDividendHolders] = useState<string[]>([])
  const [loadingHolders, setLoadingHolders] = useState(false)

  // CUSTOM fields
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')

  // Submission
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [error, setError] = useState('')

  // Validation for current step
  const fieldsValid = useMemo(() => {
    if (!selectedType) return false
    switch (selectedType) {
      case 'WITHDRAW_ETH':
        return ethers.isAddress(ethRecipient) && parseFloat(ethAmount) > 0
      case 'TRANSFER_SHARES':
        return ethers.isAddress(sharesFrom) && ethers.isAddress(sharesTo) && parseInt(sharesAmount) > 0
      case 'CHANGE_SETTINGS':
        return parseInt(newQuorum) > 0 && parseInt(newQuorum) <= 10000 && parseInt(newVotingPeriod) > 0
      case 'DISTRIBUTE_DIVIDENDS':
        return parseFloat(dividendAmount) > 0 && dividendHolders.length > 0
      case 'CUSTOM':
        return customTitle.trim().length >= 3
      default:
        return false
    }
  }, [
    selectedType, ethRecipient, ethAmount,
    sharesFrom, sharesTo, sharesAmount, newQuorum,
    newVotingPeriod, dividendAmount, dividendHolders, customTitle,
  ])

  // Build ABI-encoded data
  const encodedData = useMemo((): Uint8Array => {
    if (!selectedType) return new Uint8Array(0)
    const coder = ethers.AbiCoder.defaultAbiCoder()
    try {
      switch (selectedType) {
        case 'WITHDRAW_ETH':
          return ethers.getBytes(
            coder.encode(['address', 'uint256'], [ethRecipient, ethers.parseEther(ethAmount || '0')]),
          )
        case 'TRANSFER_SHARES':
          return ethers.getBytes(
            coder.encode(
              ['address', 'address', 'uint256'],
              [sharesFrom, sharesTo, BigInt(sharesAmount || '0')],
            ),
          )
        case 'CHANGE_SETTINGS':
          return ethers.getBytes(
            coder.encode(
              ['uint256', 'uint256'],
              [BigInt(newQuorum || '0'), BigInt(newVotingPeriod || '0')],
            ),
          )
        case 'DISTRIBUTE_DIVIDENDS':
          return ethers.getBytes(
            coder.encode(
              ['uint256', 'address[]'],
              [ethers.parseEther(dividendAmount || '0'), dividendHolders],
            ),
          )
        case 'CUSTOM':
          return ethers.getBytes(
            coder.encode(['string', 'string'], [customTitle, customDescription]),
          )
        default:
          return new Uint8Array(0)
      }
    } catch {
      return new Uint8Array(0)
    }
  }, [
    selectedType, ethRecipient, ethAmount,
    sharesFrom, sharesTo, sharesAmount, newQuorum,
    newVotingPeriod, dividendAmount, dividendHolders, customTitle, customDescription,
  ])

  // Get proposal title for metadata
  const proposalTitle = useMemo(() => {
    switch (selectedType) {
      case 'WITHDRAW_ETH':
        return `Withdraw ${ethAmount} ETH to ${truncateAddress(ethRecipient)}`
      case 'TRANSFER_SHARES':
        return `Transfer ${sharesAmount} shares from ${truncateAddress(sharesFrom)} to ${truncateAddress(sharesTo)}`
      case 'CHANGE_SETTINGS':
        return `Change settings: quorum ${newQuorum} bps, period ${newVotingPeriod}s`
      case 'DISTRIBUTE_DIVIDENDS':
        return `Distribute ${dividendAmount} ETH as dividends to ${dividendHolders.length} holders`
      case 'CUSTOM':
        return customTitle
      default:
        return 'New Proposal'
    }
  }, [
    selectedType, ethAmount, ethRecipient,
    sharesAmount, sharesFrom, sharesTo, newQuorum, newVotingPeriod,
    dividendAmount, dividendHolders, customTitle,
  ])

  const handleConfirmSubmit = async (password: string) => {
    if (!selectedType || !holderAccount) return

    setSubmitStatus('loading')
    setError('')

    try {
      const mnemonic = await loadAndDecrypt(password)
      const wallet = deriveWalletFromMnemonic(mnemonic, holderAccount.accountIndex)
      const provider = getSepoliaProvider()
      const signer = wallet.connect(provider)

      // Load business metadata
      const biz = await getBusiness(apiClient, businessId)

      // Create on-chain proposal
      const result = await createProposal(
        createContractFactory,
        biz.treasuryAddress,
        signer,
        selectedType,
        encodedData,
      )

      // Save metadata to API
      const deadline = new Date(Date.now() + biz.votingPeriod * 1000).toISOString()
      await saveProposal(apiClient, biz.id, {
        onChainId: result.proposalId,
        type: selectedType,
        title: proposalTitle,
        description: selectedType === 'CUSTOM' ? customDescription : undefined,
        deadline,
        createdBy: creatorAddress,
      })

      setSubmitStatus('succeeded')
      setShowConfirm(false)
      router.push(`/wallet/business/${businessId}/proposals/${result.proposalId}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create proposal'
      setError(message)
      setSubmitStatus('failed')
      setShowConfirm(false)
    }
  }

  const handleSelectType = (type: ProposalType) => {
    setSelectedType(type)
    setStep('fields')
  }

  const handleBack = () => {
    if (step === 'fields') setStep('type')
    else if (step === 'review') setStep('fields')
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />

          <div className="glass-card gradient-border rounded-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-semibold text-[var(--foreground)]">Create Proposal</h1>
              {step !== 'type' && (
                <button
                  onClick={handleBack}
                  className="text-xs text-[var(--foreground-subtle)] hover:text-[var(--foreground)] transition-colors"
                >
                  Back
                </button>
              )}
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-6">
              {['type', 'fields', 'review'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                      step === s
                        ? 'bg-[#3388FF] text-white'
                        : ['type', 'fields', 'review'].indexOf(step) > i
                        ? 'bg-[#22c55e] text-white'
                        : 'bg-[var(--surface-hover)] text-[var(--foreground-subtle)]'
                    }`}
                  >
                    {i + 1}
                  </div>
                  {i < 2 && <div className="flex-1 h-px bg-[var(--surface-hover)]" />}
                </div>
              ))}
            </div>

            {/* Step 1: Type Selection */}
            {step === 'type' && (
              <div className="space-y-3">
                {PROPOSAL_TYPES.map((pt) => (
                  <button
                    key={pt.value}
                    onClick={() => handleSelectType(pt.value)}
                    className="w-full text-left bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-[#3388FF]/30 hover:bg-[#3388FF]/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#3388FF]">{typeIcon(pt.value)}</div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{pt.label}</p>
                        <p className="text-[11px] text-[var(--foreground-subtle)] mt-0.5">{pt.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Type-Specific Fields */}
            {step === 'fields' && selectedType && (
              <div className="space-y-4">
                {selectedType === 'WITHDRAW_ETH' && (
                  <>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={ethRecipient}
                        onChange={(e) => setEthRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none text-sm font-mono"
                      />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        ETH Amount
                      </label>
                      <input
                        type="number"
                        value={ethAmount}
                        onChange={(e) => setEthAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.0001"
                        className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedType === 'DISTRIBUTE_DIVIDENDS' && (
                  <>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        Total ETH to Distribute
                      </label>
                      <input
                        type="number"
                        value={dividendAmount}
                        onChange={(e) => setDividendAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.0001"
                        className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide">
                          Holders
                        </label>
                        <button
                          onClick={async () => {
                            setLoadingHolders(true)
                            try {
                              const biz = await getBusiness(apiClient, businessId)
                              const members = biz.members ?? []
                              const addresses = members.map((m) => m.address)
                              setDividendHolders(addresses)
                            } catch {
                              // fallback: use current user address
                              setDividendHolders([creatorAddress])
                            } finally {
                              setLoadingHolders(false)
                            }
                          }}
                          disabled={loadingHolders}
                          className="text-xs text-[#3388FF] hover:text-[#3388FF]/80 transition-colors"
                        >
                          {loadingHolders ? 'Loading...' : 'Load holders'}
                        </button>
                      </div>
                      {dividendHolders.length === 0 ? (
                        <p className="text-xs text-[var(--foreground-subtle)]">Click &quot;Load holders&quot; to fetch all business members</p>
                      ) : (
                        <div className="space-y-1">
                          {dividendHolders.map((h, i) => (
                            <p key={i} className="text-xs text-[var(--foreground-muted)] font-mono">{truncateAddress(h)}</p>
                          ))}
                          <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">{dividendHolders.length} holders will receive dividends</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedType === 'TRANSFER_SHARES' && (
                  <>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        From Address
                      </label>
                      <input
                        type="text"
                        value={sharesFrom}
                        onChange={(e) => setSharesFrom(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none text-sm font-mono"
                      />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        To Address
                      </label>
                      <input
                        type="text"
                        value={sharesTo}
                        onChange={(e) => setSharesTo(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none text-sm font-mono"
                      />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        Share Amount
                      </label>
                      <input
                        type="number"
                        value={sharesAmount}
                        onChange={(e) => setSharesAmount(e.target.value)}
                        placeholder="0"
                        step="1"
                        className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {selectedType === 'CHANGE_SETTINGS' && (
                  <>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        New Quorum (basis points, 1-10000)
                      </label>
                      <input
                        type="number"
                        value={newQuorum}
                        onChange={(e) => setNewQuorum(e.target.value)}
                        placeholder="5000"
                        step="100"
                        min="1"
                        max="10000"
                        className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                      <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">
                        {newQuorum ? `${(parseInt(newQuorum) / 100).toFixed(1)}% of total supply required` : '50% = 5000 bps'}
                      </p>
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        New Voting Period (seconds)
                      </label>
                      <input
                        type="number"
                        value={newVotingPeriod}
                        onChange={(e) => setNewVotingPeriod(e.target.value)}
                        placeholder="86400"
                        step="3600"
                        min="3600"
                        className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                      <p className="text-[10px] text-[var(--foreground-subtle)] mt-1">
                        {newVotingPeriod ? `${(parseInt(newVotingPeriod) / 3600).toFixed(1)} hours` : '24 hours = 86400 seconds'}
                      </p>
                    </div>
                  </>
                )}

                {selectedType === 'CUSTOM' && (
                  <>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        Title
                      </label>
                      <input
                        type="text"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Proposal title"
                        className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none"
                      />
                    </div>
                    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                      <label className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2 block">
                        Description
                      </label>
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Describe the proposal..."
                        rows={4}
                        className="w-full bg-transparent text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] focus:outline-none resize-none"
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={() => setStep('review')}
                  disabled={!fieldsValid}
                  className="w-full py-3 rounded-xl bg-[#3388FF] text-white font-semibold hover:bg-[#3388FF]/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Review
                </button>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 'review' && selectedType && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
                  <p className="text-xs text-[var(--foreground-subtle)] uppercase tracking-wide mb-2">Proposal Type</p>
                  <div className="flex items-center gap-2 text-[#3388FF]">
                    {typeIcon(selectedType)}
                    <span className="text-[var(--foreground)] font-medium">
                      {PROPOSAL_TYPES.find((t) => t.value === selectedType)?.label}
                    </span>
                  </div>
                </div>

                {/* Type-specific review details */}
                {selectedType === 'WITHDRAW_ETH' && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">Recipient</span>
                      <span className="text-xs text-[var(--foreground)] font-mono">{truncateAddress(ethRecipient)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">Amount</span>
                      <span className="text-sm text-[var(--foreground)] font-bold">{ethAmount} ETH</span>
                    </div>
                  </div>
                )}

                {selectedType === 'DISTRIBUTE_DIVIDENDS' && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">Total Amount</span>
                      <span className="text-sm text-[var(--foreground)] font-bold">{dividendAmount} ETH</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">Recipients</span>
                      <span className="text-xs text-[var(--foreground)]">{dividendHolders.length} holders</span>
                    </div>
                  </div>
                )}

                {selectedType === 'TRANSFER_SHARES' && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">From</span>
                      <span className="text-xs text-[var(--foreground)] font-mono">{truncateAddress(sharesFrom)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">To</span>
                      <span className="text-xs text-[var(--foreground)] font-mono">{truncateAddress(sharesTo)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">Shares</span>
                      <span className="text-sm text-[var(--foreground)] font-bold">{sharesAmount}</span>
                    </div>
                  </div>
                )}

                {selectedType === 'CHANGE_SETTINGS' && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">New Quorum</span>
                      <span className="text-sm text-[var(--foreground)] font-bold">
                        {newQuorum} bps ({(parseInt(newQuorum) / 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--foreground-subtle)]">New Voting Period</span>
                      <span className="text-sm text-[var(--foreground)] font-bold">
                        {newVotingPeriod}s ({(parseInt(newVotingPeriod) / 3600).toFixed(1)}h)
                      </span>
                    </div>
                  </div>
                )}

                {selectedType === 'CUSTOM' && (
                  <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 space-y-3">
                    <div>
                      <span className="text-xs text-[var(--foreground-subtle)]">Title</span>
                      <p className="text-[var(--foreground)] text-sm mt-1">{customTitle}</p>
                    </div>
                    {customDescription && (
                      <div>
                        <span className="text-xs text-[var(--foreground-subtle)]">Description</span>
                        <p className="text-[var(--foreground-muted)] text-sm mt-1">{customDescription}</p>
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                    <p className="text-[#f87171] text-sm">{error}</p>
                  </div>
                )}

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={submitStatus === 'loading' || !holderAccount}
                  className="w-full py-3 rounded-xl bg-[var(--foreground)] text-[var(--background)] font-semibold shimmer hover:opacity-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-colors disabled:opacity-40"
                >
                  {submitStatus === 'loading' ? 'Submitting...' : !holderAccount ? 'Finding signer...' : 'Submit Proposal'}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmModal
          title="Create Proposal"
          summary={proposalTitle}
          details={[
            { label: 'Type', value: PROPOSAL_TYPES.find((t) => t.value === selectedType)?.label ?? '' },
            { label: 'Network', value: network.name },
          ]}
          onConfirm={handleConfirmSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
