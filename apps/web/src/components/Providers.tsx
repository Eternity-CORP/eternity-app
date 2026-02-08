'use client'

import { AccountProvider } from '@/contexts/account-context'
import { BalanceProvider } from '@/contexts/balance-context'
import type { ReactNode } from 'react'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AccountProvider>
      <BalanceProvider>{children}</BalanceProvider>
    </AccountProvider>
  )
}
