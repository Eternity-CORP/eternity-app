'use client'

import dynamic from 'next/dynamic'
import { PageWrapper } from '@/components/PageWrapper'
import { WarpProvider } from '@/components/animations/WarpTransition'

// Dynamic import to avoid SSR issues with Three.js / R3F
const ShardLanding = dynamic(
  () => import('@/components/ShardLanding').then((mod) => mod.ShardLanding),
  { ssr: false }
)

export default function Home() {
  return (
    <PageWrapper>
      <WarpProvider>
        <ShardLanding />
      </WarpProvider>
    </PageWrapper>
  )
}
