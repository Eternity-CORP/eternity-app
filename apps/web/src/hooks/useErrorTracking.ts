'use client'

import { useEffect, useRef } from 'react'
import { useAccount } from '@/contexts/account-context'
import {
  initErrorTracking,
  setUserContext,
  clearUserContext,
} from '@/lib/error-tracking'

/**
 * Initialize error tracking on app startup.
 * Call this once in the root Providers component.
 */
export function useErrorTrackingInit(): void {
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initErrorTracking()
      initialized.current = true
    }
  }, [])
}

/**
 * Sync user context with error tracking.
 * Call this in any component that has access to the wallet address.
 * Automatically clears context on logout.
 */
export function useErrorTrackingUser(): void {
  const { address, isLoggedIn } = useAccount()

  useEffect(() => {
    if (isLoggedIn && address) {
      setUserContext(address)
    } else {
      clearUserContext()
    }
  }, [isLoggedIn, address])
}
