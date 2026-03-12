'use client'

import { AccountProvider } from '@/contexts/account-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { ThemeProvider } from '@/contexts/theme-context'
import { useErrorTrackingInit, useErrorTrackingUser } from '@/hooks/useErrorTracking'
import type { ReactNode } from 'react'

/** Syncs wallet address with error tracking user context */
function ErrorTrackingUserSync({ children }: { children: ReactNode }) {
  useErrorTrackingUser()
  return <>{children}</>
}

export default function Providers({ children }: { children: ReactNode }) {
  // Initialize error tracking on app startup
  useErrorTrackingInit()

  return (
    <ThemeProvider>
      <AccountProvider>
        <ErrorTrackingUserSync>
          <BalanceProvider>
            {children}
          </BalanceProvider>
        </ErrorTrackingUserSync>
      </AccountProvider>
    </ThemeProvider>
  )
}
