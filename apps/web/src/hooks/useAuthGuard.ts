import { useAccount } from '@/contexts/account-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isInviteValidated } from '@/lib/invite'

export function useAuthGuard() {
  const { isLoggedIn, ready } = useAccount()
  const router = useRouter()
  useEffect(() => {
    if (!isInviteValidated()) {
      router.replace('/gate')
      return
    }
    if (ready && !isLoggedIn) {
      router.push('/unlock')
    }
  }, [ready, isLoggedIn, router])
  return { isReady: ready && isLoggedIn }
}
