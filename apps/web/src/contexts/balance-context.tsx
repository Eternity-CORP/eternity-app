'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useAccount } from '@/contexts/account-context'
import { fetchAllNetworkBalances } from '@/lib/multi-network'
import type { AggregatedTokenBalance, NetworkTokenBalance } from '@e-y/shared'

type BalanceStatus = 'idle' | 'loading' | 'succeeded' | 'failed'

interface BalanceContextValue {
  aggregatedBalances: AggregatedTokenBalance[]
  networkBalances: Record<string, NetworkTokenBalance[]>
  totalUsdValue: number
  status: BalanceStatus
  loading: boolean
  lastUpdated: number
  refresh: () => Promise<void>
}

const BalanceContext = createContext<BalanceContextValue>({
  aggregatedBalances: [],
  networkBalances: {},
  totalUsdValue: 0,
  status: 'loading',
  loading: true,
  lastUpdated: 0,
  refresh: async () => {},
})

export function useBalance() {
  return useContext(BalanceContext)
}

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { address, currentAccount, isLoggedIn } = useAccount()

  const [aggregatedBalances, setAggregatedBalances] = useState<AggregatedTokenBalance[]>([])
  const [networkBalances, setNetworkBalances] = useState<Record<string, NetworkTokenBalance[]>>({})
  const [totalUsdValue, setTotalUsdValue] = useState(0)
  const [status, setStatus] = useState<BalanceStatus>('loading')
  const [lastUpdated, setLastUpdated] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchBalances = useCallback(async () => {
    if (!address || !currentAccount) return

    try {
      const result = await fetchAllNetworkBalances(address, currentAccount.type)
      setAggregatedBalances(result.aggregatedBalances)
      setNetworkBalances(result.networkBalances)
      setTotalUsdValue(result.totalUsdValue)
      setLastUpdated(result.lastUpdated)
      setStatus('succeeded')
    } catch (err) {
      console.error('Failed to fetch balances:', err)
      setStatus('failed')
    }
  }, [address, currentAccount])

  // Fetch on mount + address/account change
  useEffect(() => {
    if (!isLoggedIn || !address) {
      setStatus('idle')
      return
    }

    setStatus('loading')
    fetchBalances()

    // Refresh every 60s
    intervalRef.current = setInterval(fetchBalances, 60_000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isLoggedIn, address, currentAccount?.id, fetchBalances])

  const refresh = useCallback(async () => {
    setStatus('loading')
    await fetchBalances()
  }, [fetchBalances])

  return (
    <BalanceContext.Provider
      value={{
        aggregatedBalances,
        networkBalances,
        totalUsdValue,
        status,
        loading: status === 'loading',
        lastUpdated,
        refresh,
      }}
    >
      {children}
    </BalanceContext.Provider>
  )
}
