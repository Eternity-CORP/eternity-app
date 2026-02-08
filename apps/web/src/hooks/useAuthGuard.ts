import { useAccount } from '@/contexts/account-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuthGuard() {
  const { isLoggedIn, address } = useAccount()
  const router = useRouter()
  useEffect(() => {
    if (!isLoggedIn && address !== '') {
      router.push('/unlock')
    }
  }, [isLoggedIn, address, router])
  return { isReady: isLoggedIn && address !== '' }
}
