'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ethers } from 'ethers'
import {
  getUserBusinesses,
  getShareBalance,
  type BusinessWallet,
} from '@e-y/shared'
import { useAccount } from '@/contexts/account-context'
import { apiClient } from '@/lib/api'
import { getNetwork } from '@/lib/network'
import { createContractFactory } from '@/lib/contract-utils'

interface ShareInfo {
  businessId: string
  businessName: string
  tokenSymbol: string
  shares: number
  totalSupply: number
  percent: number
}

export default function BusinessShares() {
  const { address, currentAccount, isLoggedIn, ready } = useAccount()
  const [shares, setShares] = useState<ShareInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoggedIn || !ready || !address || !currentAccount || currentAccount.type === 'business') {
      setShares([])
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchShares = async () => {
      try {
        setLoading(true)
        const businesses = await getUserBusinesses(apiClient, address)
        if (cancelled || businesses.length === 0) {
          if (!cancelled) {
            setShares([])
            setLoading(false)
          }
          return
        }

        const network = getNetwork('test')
        const provider = new ethers.JsonRpcProvider(network.rpcUrl)

        const results: ShareInfo[] = []
        await Promise.all(
          businesses.map(async (biz: BusinessWallet) => {
            try {
              const balance = await getShareBalance(
                createContractFactory,
                biz.contractAddress,
                provider,
                address,
              )
              if (balance > 0) {
                results.push({
                  businessId: biz.id,
                  businessName: biz.name,
                  tokenSymbol: biz.tokenSymbol,
                  shares: balance,
                  totalSupply: biz.tokenSupply,
                  percent: Math.round((balance / biz.tokenSupply) * 10000) / 100,
                })
              }
            } catch {
              // Skip this business if on-chain call fails
            }
          }),
        )

        if (!cancelled) {
          setShares(results)
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setShares([])
          setLoading(false)
        }
      }
    }

    fetchShares()
    return () => { cancelled = true }
  }, [address, currentAccount?.id, isLoggedIn, ready])

  if (loading || shares.length === 0) return null

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-[var(--border-light)]">
        <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Business Shares</h2>
      </div>
      <div className="divide-y divide-[var(--border-light)]">
        {shares.map((s) => (
          <Link
            key={s.businessId}
            href={`/wallet/business/${s.businessId}`}
            className="flex items-center justify-between p-4 hover:bg-[var(--surface)] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-[var(--foreground)]"
                style={{ backgroundColor: '#3388FF20', border: '2px solid #3388FF40' }}
              >
                {s.tokenSymbol.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--foreground)]">
                  {s.tokenSymbol}
                </p>
                <span className="text-xs text-[var(--foreground-subtle)]">{s.businessName}</span>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {s.shares.toLocaleString()}
              </p>
              <p className="text-xs text-[#3388FF]">{s.percent}% ownership</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
