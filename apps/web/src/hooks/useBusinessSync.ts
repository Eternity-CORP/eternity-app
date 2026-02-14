'use client'

import { useEffect, useRef } from 'react'
import { getUserBusinesses } from '@e-y/shared'
import { apiClient } from '@/lib/api'
import { useAccount } from '@/contexts/account-context'

/**
 * Syncs business accounts from the API with localStorage on login.
 * Ensures co-founders see business wallets in their account selector.
 * Run this once in a top-level layout component.
 */
export function useBusinessSync() {
  const { address, isLoggedIn, ready, syncBusinessAccounts } = useAccount()
  const hasSynced = useRef(false)

  useEffect(() => {
    if (!isLoggedIn || !ready || !address || hasSynced.current) return
    hasSynced.current = true

    getUserBusinesses(apiClient, address)
      .then((businesses) => {
        if (businesses.length > 0) {
          syncBusinessAccounts(businesses.map((b) => ({
            id: b.id,
            name: b.name,
            treasuryAddress: b.treasuryAddress,
          })))
        }
      })
      .catch((err) => {
        console.error('Failed to sync business accounts:', err)
      })
  }, [isLoggedIn, ready, address, syncBusinessAccounts])
}
