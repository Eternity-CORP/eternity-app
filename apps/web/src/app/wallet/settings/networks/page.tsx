'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import { useAccount } from '@/contexts/account-context'
import { apiClient } from '@/lib/api'
import {
  SUPPORTED_NETWORKS,
  type NetworkId,
  TIER1_NETWORK_IDS,
  getAddressPreferences,
  savePreferences,
  type NetworkPreferences,
} from '@e-y/shared'

const POPULAR_TOKENS = ['USDC', 'USDT', 'DAI', 'WETH', 'WBTC', 'LINK', 'UNI']

interface NetworkOption {
  id: NetworkId | null
  name: string
  description?: string
  recommended?: boolean
}

const NETWORK_OPTIONS: NetworkOption[] = [
  { id: null, name: 'Any network', description: 'Sender chooses the network' },
  { id: 'base', name: 'Base', description: 'Lowest fees', recommended: true },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'ethereum', name: 'Ethereum', description: 'Highest fees' },
]

export default function NetworkPreferencesPage() {
  const router = useRouter()
  const { isLoggedIn, address, wallet } = useAccount()

  const [defaultNetwork, setDefaultNetwork] = useState<NetworkId | null>(null)
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [selectedToken, setSelectedToken] = useState<string | null>(null)
  const [showNetworkModal, setShowNetworkModal] = useState(false)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/unlock')
      return
    }
    // Load existing preferences
    getAddressPreferences(apiClient, address).then((prefs) => {
      if (prefs) {
        setDefaultNetwork((prefs.defaultNetwork as NetworkId) || null)
        setTokenOverrides(prefs.tokenOverrides || {})
      }
    }).catch(() => {})
  }, [isLoggedIn, address, router])

  const handleSave = useCallback(async (
    newDefault: NetworkId | null,
    newOverrides: Record<string, string>,
  ) => {
    if (!wallet || !address) return
    setSaving(true)

    try {
      const preferences: NetworkPreferences = {
        defaultNetwork: newDefault,
        tokenOverrides: newOverrides,
      }

      const timestamp = Date.now()
      const message = `Set network preferences\nTimestamp: ${timestamp}`
      const signature = await wallet.signMessage(message)

      await savePreferences(apiClient, {
        preferences,
        address,
        signature,
        timestamp,
      })
    } catch (err) {
      console.error('Failed to save preferences:', err)
    } finally {
      setSaving(false)
    }
  }, [wallet, address])

  const handleDefaultChange = (networkId: NetworkId | null) => {
    setDefaultNetwork(networkId)
    handleSave(networkId, tokenOverrides)
  }

  const handleAddOverride = (symbol: string, networkId: NetworkId) => {
    const updated = { ...tokenOverrides, [symbol.toUpperCase()]: networkId }
    setTokenOverrides(updated)
    handleSave(defaultNetwork, updated)
    setShowNetworkModal(false)
    setSelectedToken(null)
  }

  const handleRemoveOverride = (symbol: string) => {
    const updated = { ...tokenOverrides }
    delete updated[symbol]
    setTokenOverrides(updated)
    handleSave(defaultNetwork, updated)
  }

  const availableTokens = POPULAR_TOKENS.filter(
    (s) => !tokenOverrides[s.toUpperCase()],
  )

  const overridesList = Object.entries(tokenOverrides).map(([symbol, networkId]) => ({
    symbol,
    networkId: networkId as NetworkId,
    networkName: SUPPORTED_NETWORKS[networkId as NetworkId]?.name || networkId,
  }))

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-8 pb-12">
        <div className="w-full max-w-[420px]">
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white">Network Preferences</h1>
          </div>

          {/* Info Banner */}
          <div className="glass-card rounded-2xl p-4 mb-4 border border-[#3388FF]/20">
            <p className="text-xs text-white/50">
              Choose your preferred network for receiving tokens. Senders will see your preference and can send on that network without conversion fees.
            </p>
          </div>

          {/* Default Network */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide mb-3">Default Receiving Network</h2>
            <div className="space-y-2">
              {NETWORK_OPTIONS.map((option) => {
                const isSelected = defaultNetwork === option.id
                const netConfig = option.id ? SUPPORTED_NETWORKS[option.id] : null

                return (
                  <button
                    key={option.id ?? 'any'}
                    onClick={() => handleDefaultChange(option.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl glass-card transition-colors ${
                      isSelected ? 'border border-[#3388FF]/30 bg-[#3388FF]/5' : 'hover:bg-white/3'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-[#3388FF]' : 'border-white/20'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#3388FF]" />}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{option.name}</span>
                          {option.recommended && (
                            <span className="text-[10px] font-medium text-[#22c55e] bg-[#22c55e]/10 px-1.5 py-0.5 rounded">Recommended</span>
                          )}
                        </div>
                        {option.description && (
                          <p className="text-xs text-white/40">{option.description}</p>
                        )}
                      </div>
                    </div>
                    {netConfig && (
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: netConfig.color }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Token Exceptions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wide">Token Exceptions</h2>
              {availableTokens.length > 0 && (
                <button
                  onClick={() => setShowTokenModal(true)}
                  className="text-xs text-[#3388FF] hover:text-[#3388FF]/80 transition-colors font-medium"
                >
                  + Add
                </button>
              )}
            </div>

            {overridesList.length === 0 ? (
              <div className="glass-card rounded-2xl p-6 text-center border border-dashed border-white/10">
                <p className="text-xs text-white/40">No exceptions. All tokens use default network.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {overridesList.map(({ symbol, networkId, networkName }) => {
                  const netConfig = SUPPORTED_NETWORKS[networkId]
                  return (
                    <div key={symbol} className="flex items-center justify-between p-3 glass-card rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{symbol}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: netConfig?.color || '#888' }} />
                          <span className="text-sm text-white/60">{networkName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveOverride(symbol)}
                        className="p-1 text-white/20 hover:text-[#EF4444] transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {saving && (
            <div className="mt-4 text-center">
              <p className="text-xs text-white/40">Saving...</p>
            </div>
          )}
        </div>
      </main>

      {/* Token Selection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTokenModal(false)} />
          <div className="relative w-full max-w-[360px] glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Select Token</h3>
              <button onClick={() => setShowTokenModal(false)} className="text-white/40 hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-2">
              {availableTokens.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => {
                    setSelectedToken(symbol)
                    setShowTokenModal(false)
                    setShowNetworkModal(true)
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-medium text-white">{symbol}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/20">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Network Selection Modal */}
      {showNetworkModal && selectedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowNetworkModal(false); setSelectedToken(null) }} />
          <div className="relative w-full max-w-[360px] glass-card rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h3 className="text-sm font-semibold text-white">Network for {selectedToken}</h3>
              <button onClick={() => { setShowNetworkModal(false); setSelectedToken(null) }} className="text-white/40 hover:text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="p-2">
              {TIER1_NETWORK_IDS.map((networkId) => {
                const net = SUPPORTED_NETWORKS[networkId]
                return (
                  <button
                    key={networkId}
                    onClick={() => handleAddOverride(selectedToken, networkId)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: net.color }} />
                    <span className="text-sm font-medium text-white">{net.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
