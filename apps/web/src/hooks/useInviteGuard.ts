import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { isInviteValidated } from '@/lib/invite'

/**
 * Guard for pages that don't require wallet auth but still need invite validation.
 * Use on: /, /create, /import, /unlock
 */
export function useInviteGuard() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (!isInviteValidated()) {
      router.replace('/gate')
    } else {
      setChecked(true)
    }
  }, [router])

  return { isInviteValid: checked }
}
