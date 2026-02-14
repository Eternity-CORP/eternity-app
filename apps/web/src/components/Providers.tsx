'use client'

import { AccountProvider } from '@/contexts/account-context'
import { BalanceProvider } from '@/contexts/balance-context'
import { useBusinessSync } from '@/hooks/useBusinessSync'
import type { ReactNode } from 'react'

function BusinessSyncRunner({ children }: { children: ReactNode }) {
  useBusinessSync()
  return <>{children}</>
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AccountProvider>
      <BalanceProvider>
        <BusinessSyncRunner>{children}</BusinessSyncRunner>
      </BalanceProvider>
    </AccountProvider>
  )
}
