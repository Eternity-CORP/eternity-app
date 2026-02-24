'use client'

import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAccount } from '@/contexts/account-context'
import { SUPPORTED_NETWORKS, TIER1_NETWORK_IDS, type NetworkId } from '@e-y/shared'
import Navigation from '@/components/Navigation'
import BackButton from '@/components/BackButton'
import { useAuthGuard } from '@/hooks/useAuthGuard'

export default function ReceivePage() {
  useAuthGuard()
  const { address, network, currentAccount } = useAccount()
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen relative z-[2]">
      <Navigation />

      <main className="w-full flex justify-center px-6 pt-12 pb-12">
        <div className="w-full max-w-[420px]">
          <BackButton />
          <div className="glass-card gradient-border rounded-2xl p-6">
            <h1 className="text-xl font-semibold text-white text-center mb-8">Receive</h1>

            {/* Testnet Warning */}
            {currentAccount?.type === 'test' && (
              <div className="mb-6 px-4 py-3 rounded-xl" style={{
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>
                  Testnet Address (Sepolia)
                </p>
                <p className="text-xs mt-1" style={{ color: 'rgba(251, 191, 36, 0.7)' }}>
                  This is a testnet (Sepolia) address. Only send Sepolia test tokens here. Real mainnet tokens sent to this address will not appear in this account.
                </p>
              </div>
            )}

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl">
                {address && (
                  <QRCodeSVG
                    value={address}
                    size={180}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>
            </div>

            {/* Address */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-4 mb-4">
              <p className="text-xs text-white/40 uppercase tracking-wide mb-2">Your address</p>
              <p className="font-mono text-sm text-white/50 break-all leading-relaxed">{address}</p>
            </div>

            {/* Network hints — real accounts work on all EVM chains */}
            {currentAccount?.type === 'real' && (
              <div className="mb-4 text-center">
                <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Same address works on all networks
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {TIER1_NETWORK_IDS.map((id) => {
                    const net = SUPPORTED_NETWORKS[id]
                    return (
                      <span
                        key={id}
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: net.color + '20',
                          color: net.color,
                          border: `1px solid ${net.color}40`,
                        }}
                      >
                        {net.shortName}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full py-4 rounded-xl font-semibold transition-all bg-white text-black shimmer hover:bg-white/90 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-black">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-black">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy Address
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
