'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ethers } from 'ethers'
import { loadAndDecrypt } from '@e-y/storage'
import { deriveWalletFromMnemonic } from '@e-y/crypto'
import { useAccount } from '@/contexts/account-context'
import { useAuthGuard } from '@/hooks/useAuthGuard'
import {
  validateBusinessParams,
  lookupUsername,
  saveBusiness,
  createBusiness,
  BUSINESS_FACTORY_ADDRESS,
  type CreateBusinessParams,
  type TransferPolicy,
  type VestingConfig,
  type DividendConfig,
  type EthersLikeContract,
  type ContractFactory,
} from '@e-y/shared'
import { apiClient } from '@/lib/api'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import ConfirmModal from '@/components/shared/ConfirmModal'

// --------------------------------------------------
// Types
// --------------------------------------------------

interface FounderEntry {
  input: string        // address or @username
  address: string      // resolved address
  username?: string
  shares: number
  resolved: boolean
  error?: string
}

type Step = 1 | 2 | 3 | 4

// --------------------------------------------------
// Constants
// --------------------------------------------------

const VOTING_PERIOD_OPTIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
] as const

const DIVIDEND_FREQUENCY_OPTIONS = ['manual', 'weekly', 'monthly', 'quarterly'] as const

// --------------------------------------------------
// Step Indicator Component
// --------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Founders' },
    { num: 3, label: 'Governance' },
    { num: 4, label: 'Review' },
  ] as const

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((step, i) => (
        <div key={step.num} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step.num < current
                  ? 'bg-[#22c55e] text-black'
                  : step.num === current
                    ? 'bg-[#3388FF] text-white shadow-[0_0_15px_rgba(51,136,255,0.4)]'
                    : 'bg-white/5 text-white/30'
              }`}
            >
              {step.num < current ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span className={`text-[10px] mt-1.5 transition-colors ${step.num === current ? 'text-white/70' : 'text-white/25'}`}>
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 mx-2 mb-5">
              <div className="h-[2px] rounded-full overflow-hidden bg-white/5">
                <div
                  className="h-full bg-[#3388FF] transition-all duration-500"
                  style={{ width: step.num < current ? '100%' : '0%' }}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// --------------------------------------------------
// Main Page Component
// --------------------------------------------------

export default function BusinessCreatePage() {
  useAuthGuard()
  const router = useRouter()
  const { address, network, currentAccount, wallet } = useAccount()

  // Step state
  const [step, setStep] = useState<Step>(1)

  // Step 1: Basic Info
  const [name, setName] = useState('')
  const [tokenSymbol, setTokenSymbol] = useState('')
  const [tokenSupply, setTokenSupply] = useState('')
  const [description, setDescription] = useState('')

  // Step 2: Founders
  const [founders, setFounders] = useState<FounderEntry[]>([
    { input: address, address: address, shares: 0, resolved: true },
  ])
  const [newFounderInput, setNewFounderInput] = useState('')
  const [resolvingFounder, setResolvingFounder] = useState(false)
  const [founderError, setFounderError] = useState('')

  // Step 3: Governance
  const [transferPolicy, setTransferPolicy] = useState<TransferPolicy>('FREE')
  const [quorumBps, setQuorumBps] = useState(5100) // 51%
  const [votingPeriod, setVotingPeriod] = useState(86400) // 24 hours
  const [vestingEnabled, setVestingEnabled] = useState(false)
  const [vestingCliff, setVestingCliff] = useState('6')
  const [vestingDuration, setVestingDuration] = useState('24')
  const [dividendsEnabled, setDividendsEnabled] = useState(false)
  const [dividendFrequency, setDividendFrequency] = useState<typeof DIVIDEND_FREQUENCY_OPTIONS[number]>('monthly')
  const [dividendPercentage, setDividendPercentage] = useState('10')

  // Step 4: Deploy
  const [showConfirm, setShowConfirm] = useState(false)
  const [deployStatus, setDeployStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('idle')
  const [deployError, setDeployError] = useState('')
  const [txHash, setTxHash] = useState('')

  // --------------------------------------------------
  // Computed values
  // --------------------------------------------------

  const supply = parseInt(tokenSupply) || 0
  const totalShares = founders.reduce((sum, f) => sum + f.shares, 0)
  const sharesRemaining = supply - totalShares

  // Step 1 validation
  const step1Valid = useMemo(() => {
    if (name.length < 3 || name.length > 50) return false
    if (!/^[A-Z]{2,6}$/.test(tokenSymbol)) return false
    if (supply < 2 || supply > 1000000) return false
    return true
  }, [name, tokenSymbol, supply])

  // Step 2 validation
  const step2Valid = useMemo(() => {
    if (founders.length === 0) return false
    if (!founders.every(f => f.resolved && !f.error)) return false
    if (totalShares !== supply) return false
    if (founders.some(f => f.shares <= 0)) return false
    return true
  }, [founders, totalShares, supply])

  // Step 3 always valid (has defaults)
  const step3Valid = useMemo(() => {
    if (quorumBps < 5100 || quorumBps > 10000) return false
    if (vestingEnabled) {
      const cliff = parseInt(vestingCliff)
      const dur = parseInt(vestingDuration)
      if (!cliff || cliff < 1 || !dur || dur < 1 || cliff >= dur) return false
    }
    if (dividendsEnabled) {
      const pct = parseFloat(dividendPercentage)
      if (!pct || pct <= 0 || pct > 100) return false
    }
    return true
  }, [quorumBps, vestingEnabled, vestingCliff, vestingDuration, dividendsEnabled, dividendPercentage])

  // Full validation for step 4
  const fullValidation = useMemo(() => {
    return validateBusinessParams({
      name,
      tokenSymbol,
      tokenSupply: supply,
      founders: founders.map(f => ({ shares: f.shares })),
    })
  }, [name, tokenSymbol, supply, founders])

  // --------------------------------------------------
  // Founder management
  // --------------------------------------------------

  const handleAddFounder = useCallback(async () => {
    const input = newFounderInput.trim()
    if (!input) return

    // Check duplicates
    if (founders.some(f => f.input.toLowerCase() === input.toLowerCase())) {
      setFounderError('Founder already added')
      return
    }

    setFounderError('')
    setResolvingFounder(true)

    try {
      let resolvedAddress = ''
      let username: string | undefined

      if (input.startsWith('@')) {
        const result = await lookupUsername(apiClient, input)
        if (!result?.address) {
          setFounderError(`Username ${input} not found`)
          setResolvingFounder(false)
          return
        }
        resolvedAddress = result.address
        username = input.startsWith('@') ? input.slice(1) : input
      } else if (ethers.isAddress(input)) {
        resolvedAddress = input
      } else {
        setFounderError('Enter a valid address or @username')
        setResolvingFounder(false)
        return
      }

      // Check resolved address is not duplicate
      if (founders.some(f => f.address.toLowerCase() === resolvedAddress.toLowerCase())) {
        setFounderError('This address is already a founder')
        setResolvingFounder(false)
        return
      }

      setFounders(prev => [
        ...prev,
        { input, address: resolvedAddress, username, shares: 0, resolved: true },
      ])
      setNewFounderInput('')
    } catch {
      setFounderError('Failed to resolve address')
    } finally {
      setResolvingFounder(false)
    }
  }, [newFounderInput, founders])

  const handleRemoveFounder = useCallback((index: number) => {
    if (index === 0) return // Cannot remove creator
    setFounders(prev => prev.filter((_, i) => i !== index))
  }, [])

  const handleShareChange = useCallback((index: number, value: string) => {
    const shares = parseInt(value) || 0
    setFounders(prev => prev.map((f, i) => i === index ? { ...f, shares } : f))
  }, [])

  // --------------------------------------------------
  // Deploy
  // --------------------------------------------------

  const handleDeploy = useCallback(async (password: string) => {
    if (!currentAccount || !wallet) return

    setDeployStatus('loading')
    setDeployError('')

    try {
      const mnemonic = await loadAndDecrypt(password)
      const signerWallet = deriveWalletFromMnemonic(mnemonic, currentAccount.accountIndex)
      const provider = new ethers.JsonRpcProvider(network.rpcUrl)
      const signer = signerWallet.connect(provider)

      const contractFactory: ContractFactory = (addr, abi, signerOrProvider) =>
        new ethers.Contract(addr, abi as ethers.InterfaceAbi, signerOrProvider as ethers.ContractRunner) as unknown as EthersLikeContract

      const params: CreateBusinessParams = {
        name,
        description: description || undefined,
        tokenSymbol,
        tokenSupply: supply,
        founders: founders.map(f => ({
          address: f.address,
          username: f.username,
          shares: f.shares,
        })),
        transferPolicy,
        quorumThreshold: quorumBps,
        votingPeriod,
        vestingEnabled,
        vestingConfig: vestingEnabled
          ? { cliffMonths: parseInt(vestingCliff), durationMonths: parseInt(vestingDuration), schedule: 'linear' as const }
          : undefined,
        dividendsEnabled,
        dividendsConfig: dividendsEnabled
          ? { frequency: dividendFrequency, percentage: parseFloat(dividendPercentage) }
          : undefined,
      }

      // 1. Deploy on-chain
      const result = await createBusiness(
        contractFactory,
        BUSINESS_FACTORY_ADDRESS,
        signer,
        params,
      )

      setTxHash(result.txHash)

      // 2. Save metadata to backend
      await saveBusiness(apiClient, {
        name,
        description: description || undefined,
        tokenSymbol,
        tokenSupply: supply,
        contractAddress: result.tokenAddress,
        treasuryAddress: result.treasuryAddress,
        factoryTxHash: result.txHash,
        network: network.name,
        transferPolicy,
        quorumThreshold: quorumBps,
        votingPeriod,
        vestingEnabled,
        vestingConfig: vestingEnabled
          ? { cliffMonths: parseInt(vestingCliff), durationMonths: parseInt(vestingDuration), schedule: 'linear' } as unknown as Record<string, unknown>
          : undefined,
        dividendsEnabled,
        dividendsConfig: dividendsEnabled
          ? { frequency: dividendFrequency, percentage: parseFloat(dividendPercentage) } as unknown as Record<string, unknown>
          : undefined,
        createdBy: address,
        members: founders.map(f => ({
          address: f.address,
          username: f.username,
          shares: f.shares,
          role: 'founder',
        })),
      })

      setDeployStatus('succeeded')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Deployment failed'
      setDeployError(msg)
      setDeployStatus('failed')
      throw err // Re-throw for ConfirmModal error display
    }
  }, [
    currentAccount, wallet, network, address, name, description, tokenSymbol,
    supply, founders, transferPolicy, quorumBps, votingPeriod,
    vestingEnabled, vestingCliff, vestingDuration,
    dividendsEnabled, dividendFrequency, dividendPercentage,
  ])

  // --------------------------------------------------
  // Navigation
  // --------------------------------------------------

  const handleNext = () => {
    if (step < 4) setStep((step + 1) as Step)
  }

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as Step)
  }

  const canProceed = step === 1 ? step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : fullValidation.valid

  // --------------------------------------------------
  // Share distribution bar
  // --------------------------------------------------

  const shareColors = ['#3388FF', '#00E5FF', '#22c55e', '#F59E0B', '#EF4444', '#A855F7', '#EC4899', '#14B8A6']

  // --------------------------------------------------
  // Render steps
  // --------------------------------------------------

  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Basic Information</h2>

      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Business Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Business"
          maxLength={50}
          className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none"
        />
        <p className="text-[10px] text-white/25 mt-1">{name.length}/50 characters (min 3)</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Token Symbol</label>
        <input
          type="text"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6))}
          placeholder="BIZ"
          maxLength={6}
          className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none font-mono"
        />
        <p className="text-[10px] text-white/25 mt-1">2-6 uppercase letters</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Total Token Supply</label>
        <input
          type="number"
          value={tokenSupply}
          onChange={(e) => setTokenSupply(e.target.value)}
          placeholder="1000"
          min={2}
          max={1000000}
          className="w-full bg-transparent text-xl font-bold text-white placeholder:text-white/25 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <p className="text-[10px] text-white/25 mt-1">2 - 1,000,000 tokens</p>
      </div>

      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the business..."
          rows={3}
          className="w-full bg-transparent text-white placeholder:text-white/25 focus:outline-none resize-none"
        />
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Founders & Shares</h2>

      {/* Share distribution bar */}
      {supply > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-white/40 uppercase tracking-wide">
            <span>Share Distribution</span>
            <span className={totalShares === supply ? 'text-[#22c55e]' : totalShares > supply ? 'text-[#EF4444]' : 'text-white/40'}>
              {totalShares} / {supply}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-white/5 flex">
            {founders.map((f, i) => {
              const pct = supply > 0 ? (f.shares / supply) * 100 : 0
              if (pct <= 0) return null
              return (
                <div
                  key={i}
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: shareColors[i % shareColors.length],
                  }}
                />
              )
            })}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-2">
            {founders.map((f, i) => {
              const pct = supply > 0 ? ((f.shares / supply) * 100).toFixed(1) : '0'
              return (
                <div key={i} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shareColors[i % shareColors.length] }} />
                  <span className="text-[10px] text-white/50">
                    {f.username ? `@${f.username}` : `${f.address.slice(0, 6)}...${f.address.slice(-4)}`}
                    {' '}{pct}%
                  </span>
                </div>
              )
            })}
            {sharesRemaining > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-white/10" />
                <span className="text-[10px] text-white/30">Unallocated {sharesRemaining}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Founders list */}
      <div className="space-y-3">
        {founders.map((f, i) => (
          <div key={i} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: shareColors[i % shareColors.length] }} />
                <span className="text-sm text-white/70 font-mono truncate max-w-[200px]">
                  {i === 0 ? 'You (creator)' : f.username ? `@${f.username}` : `${f.address.slice(0, 8)}...${f.address.slice(-6)}`}
                </span>
              </div>
              {i > 0 && (
                <button
                  onClick={() => handleRemoveFounder(i)}
                  className="text-white/20 hover:text-[#EF4444] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-white/40">Shares:</label>
              <input
                type="number"
                value={f.shares || ''}
                onChange={(e) => handleShareChange(i, e.target.value)}
                placeholder="0"
                min={0}
                max={supply}
                className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              {supply > 0 && (
                <span className="text-xs text-white/30 w-12 text-right">
                  {((f.shares / supply) * 100).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add founder */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-2 block">Add Founder</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newFounderInput}
            onChange={(e) => { setNewFounderInput(e.target.value); setFounderError('') }}
            placeholder="0x... or @username"
            className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 font-mono"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFounder() } }}
          />
          <button
            onClick={handleAddFounder}
            disabled={!newFounderInput.trim() || resolvingFounder}
            className="px-4 py-2 rounded-lg bg-[#3388FF]/20 text-[#3388FF] text-sm font-medium border border-[#3388FF]/30 hover:bg-[#3388FF]/30 transition-colors disabled:opacity-40"
          >
            {resolvingFounder ? (
              <div className="w-4 h-4 border-2 border-[#3388FF]/20 border-t-[#3388FF] rounded-full animate-spin" />
            ) : (
              'Add'
            )}
          </button>
        </div>
        {founderError && (
          <p className="text-xs text-[#EF4444] mt-2">{founderError}</p>
        )}
      </div>

      {/* Validation feedback */}
      {supply > 0 && totalShares !== supply && (
        <div className={`rounded-xl p-3 ${totalShares > supply ? 'bg-[#EF4444]/8 border border-[#EF4444]/20' : 'bg-[#F59E0B]/8 border border-[#F59E0B]/20'}`}>
          <p className={`text-sm ${totalShares > supply ? 'text-[#f87171]' : 'text-[#F59E0B]'}`}>
            {totalShares > supply
              ? `Shares exceed supply by ${totalShares - supply}`
              : `${sharesRemaining} shares remaining to allocate`
            }
          </p>
        </div>
      )}

      {totalShares === supply && supply > 0 && (
        <div className="rounded-xl p-3 bg-[#22c55e]/8 border border-[#22c55e]/20">
          <p className="text-sm text-[#22c55e]">All {supply} shares allocated</p>
        </div>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Governance Settings</h2>

      {/* Transfer Policy */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-3 block">Transfer Policy</label>
        <div className="flex gap-2">
          <button
            onClick={() => setTransferPolicy('FREE')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              transferPolicy === 'FREE'
                ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                : 'glass-card text-white/40'
            }`}
          >
            <div className="text-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-1">
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 12 12 8 8 12" />
                <line x1="12" y1="16" x2="12" y2="8" />
              </svg>
              Free Transfer
            </div>
          </button>
          <button
            onClick={() => setTransferPolicy('APPROVAL_REQUIRED')}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-all ${
              transferPolicy === 'APPROVAL_REQUIRED'
                ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                : 'glass-card text-white/40'
            }`}
          >
            <div className="text-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-1">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Approval Required
            </div>
          </button>
        </div>
      </div>

      {/* Quorum Threshold */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-white/40 uppercase tracking-wide">Quorum Threshold</label>
          <span className="text-sm font-semibold text-[#3388FF]">{(quorumBps / 100).toFixed(0)}%</span>
        </div>
        <input
          type="range"
          min={5100}
          max={10000}
          step={100}
          value={quorumBps}
          onChange={(e) => setQuorumBps(parseInt(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-[#3388FF] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#3388FF] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(51,136,255,0.5)]"
        />
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-white/25">51%</span>
          <span className="text-[10px] text-white/25">100%</span>
        </div>
      </div>

      {/* Voting Period */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <label className="text-xs text-white/40 uppercase tracking-wide mb-3 block">Voting Period</label>
        <div className="grid grid-cols-2 gap-2">
          {VOTING_PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.seconds}
              onClick={() => setVotingPeriod(opt.seconds)}
              className={`py-2 rounded-lg text-sm font-medium transition-all ${
                votingPeriod === opt.seconds
                  ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                  : 'glass-card text-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Vesting */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-white/40 uppercase tracking-wide">Vesting</label>
          <button
            onClick={() => setVestingEnabled(!vestingEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${vestingEnabled ? 'bg-[#3388FF]' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${vestingEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {vestingEnabled && (
          <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-white/30 mb-1 block">Cliff (months)</label>
                <input
                  type="number"
                  value={vestingCliff}
                  onChange={(e) => setVestingCliff(e.target.value)}
                  min={1}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-white/30 mb-1 block">Duration (months)</label>
                <input
                  type="number"
                  value={vestingDuration}
                  onChange={(e) => setVestingDuration(e.target.value)}
                  min={1}
                  className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dividends */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-white/40 uppercase tracking-wide">Dividends</label>
          <button
            onClick={() => setDividendsEnabled(!dividendsEnabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${dividendsEnabled ? 'bg-[#3388FF]' : 'bg-white/10'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${dividendsEnabled ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
        {dividendsEnabled && (
          <div className="space-y-3 mt-3 pt-3 border-t border-white/5">
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {DIVIDEND_FREQUENCY_OPTIONS.map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setDividendFrequency(freq)}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                      dividendFrequency === freq
                        ? 'bg-[#3388FF]/20 text-[#3388FF] border border-[#3388FF]/30'
                        : 'glass-card text-white/40'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/30 mb-1 block">Percentage</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={dividendPercentage}
                  onChange={(e) => setDividendPercentage(e.target.value)}
                  min={0.1}
                  max={100}
                  step={0.1}
                  className="flex-1 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm text-white/40">%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white mb-2">Review & Deploy</h2>

      {/* Summary */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-[#3388FF]/15 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3388FF" strokeWidth="2">
              <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold">{name}</p>
            <p className="text-xs text-white/40">{tokenSymbol} -- {supply.toLocaleString()} tokens</p>
          </div>
        </div>
        {description && (
          <p className="text-sm text-white/50">{description}</p>
        )}
      </div>

      {/* Founders */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Founders ({founders.length})</p>
        <div className="space-y-2">
          {founders.map((f, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: shareColors[i % shareColors.length] }} />
                <span className="text-xs text-white/60 font-mono">
                  {i === 0 ? 'You' : f.username ? `@${f.username}` : `${f.address.slice(0, 6)}...${f.address.slice(-4)}`}
                </span>
              </div>
              <span className="text-xs text-white/50">
                {f.shares} ({supply > 0 ? ((f.shares / supply) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Governance */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-4">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Governance</p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-white/40">Transfer Policy</span>
            <span className="text-xs text-white/70">{transferPolicy === 'FREE' ? 'Free Transfer' : 'Approval Required'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/40">Quorum</span>
            <span className="text-xs text-white/70">{(quorumBps / 100).toFixed(0)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/40">Voting Period</span>
            <span className="text-xs text-white/70">{VOTING_PERIOD_OPTIONS.find(o => o.seconds === votingPeriod)?.label}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/40">Vesting</span>
            <span className="text-xs text-white/70">
              {vestingEnabled ? `${vestingCliff}mo cliff, ${vestingDuration}mo duration` : 'Disabled'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-white/40">Dividends</span>
            <span className="text-xs text-white/70">
              {dividendsEnabled ? `${dividendPercentage}% ${dividendFrequency}` : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      {/* Gas estimate */}
      <div className="bg-[#F59E0B]/8 border border-[#F59E0B]/20 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
            <path d="M12 2v6M12 22v-6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M22 12h-6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
          </svg>
          <span className="text-xs text-[#F59E0B]">Estimated gas: ~0.01-0.05 ETH (depends on network conditions)</span>
        </div>
      </div>

      {/* Validation errors */}
      {!fullValidation.valid && (
        <div className="bg-[#EF4444]/8 border border-[#EF4444]/20 rounded-xl p-3">
          <p className="text-sm text-[#f87171]">{fullValidation.error}</p>
        </div>
      )}

      {/* Network */}
      <div className="bg-white/3 border border-white/8 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#22c55e]" />
          <span className="text-xs text-white/50">Deploying on {network.name}</span>
        </div>
      </div>
    </div>
  )

  // --------------------------------------------------
  // Success state
  // --------------------------------------------------

  if (deployStatus === 'succeeded') {
    return (
      <div className="min-h-screen relative z-[2]">
        <Navigation />
        <main className="w-full flex justify-center px-6 pt-12 pb-12">
          <div className="w-full max-w-[420px]">
            <div className="glass-card gradient-border rounded-2xl p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#22c55e]/15 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Business Created</h2>
              <p className="text-sm text-white/50 mb-4">{name} ({tokenSymbol}) has been deployed successfully.</p>

              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#3388FF] hover:text-[#3388FF]/80 transition-colors mb-6"
                >
                  <span className="font-mono">{txHash.slice(0, 10)}...{txHash.slice(-8)}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/wallet')}
                  className="flex-1 py-3 rounded-xl glass-card text-white font-medium hover:border-white/15 transition-colors"
                >
                  Back to Wallet
                </button>
                <button
                  onClick={() => router.push(`/wallet/business/${txHash}`)}
                  className="flex-1 py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 transition-colors"
                >
                  View Business
                </button>
              </div>
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
        <div className="w-full max-w-[420px]">
          <BackButton />

          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white mb-6">Create Business</h1>

            <StepIndicator current={step} />

            {/* Step content */}
            <div className="min-h-[300px]">
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}
              {step === 4 && renderStep4()}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/5">
              {step > 1 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-xl glass-card text-white font-medium hover:border-white/15 transition-colors"
                >
                  Back
                </button>
              )}
              {step < 4 ? (
                <button
                  onClick={handleNext}
                  disabled={!canProceed}
                  className="flex-1 py-3 rounded-xl bg-white text-black font-semibold shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!fullValidation.valid}
                  className="flex-1 py-3 rounded-xl bg-[#3388FF] text-white font-semibold hover:bg-[#3388FF]/90 hover:shadow-[0_0_20px_rgba(51,136,255,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Create Business
                </button>
              )}
            </div>

            {deployError && (
              <div className="mt-4 px-4 py-3 bg-[#EF4444]/5 border border-[#EF4444]/15 rounded-xl">
                <p className="text-[#f87171] text-sm">{deployError}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmModal
          title="Deploy Business"
          summary={`${name} (${tokenSymbol})`}
          details={[
            { label: 'Token Supply', value: supply.toLocaleString() },
            { label: 'Founders', value: String(founders.length) },
            { label: 'Quorum', value: `${(quorumBps / 100).toFixed(0)}%` },
            { label: 'Network', value: network.name },
          ]}
          confirmLabel="Deploy"
          onConfirm={handleDeploy}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
