'use client'

import { AccountProvider } from '@/contexts/account-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { useBusinessSync } from '@/hooks/useBusinessSync'
import { useErrorTrackingInit, useErrorTrackingUser } from '@/hooks/useErrorTracking'
import type { ReactNode } from 'react'

function BusinessSyncRunner({ children }: { children: ReactNode }) {
  useBusinessSync()
  return <>{children}</>
}

/** Syncs wallet address with error tracking user context */
function ErrorTrackingUserSync({ children }: { children: ReactNode }) {
  useErrorTrackingUser()
  return <>{children}</>
}

export default function Providers({ children }: { children: ReactNode }) {
  // Initialize error tracking on app startup
  useErrorTrackingInit()

  return (
    <AccountProvider>
      <ErrorTrackingUserSync>
        <BalanceProvider>
          <BusinessSyncRunner>{children}</BusinessSyncRunner>
        </BalanceProvider>
      </ErrorTrackingUserSync>
    </AccountProvider>
  )
}
