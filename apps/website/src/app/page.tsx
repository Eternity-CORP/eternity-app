'use client'

import dynamic from 'next/dynamic'
import { PageWrapper } from '@/components/PageWrapper'
import { WarpProvider } from '@/components/animations/WarpTransition'
import { SlidePresentation } from '@/components/SlidePresentation'

const GlobalShardScene = dynamic(
  () => import('@/components/3d/ShardScene').then((mod) => mod.GlobalShardScene),
  { ssr: false }
)

export default function Home() {
  return (
    <PageWrapper>
      <WarpProvider>
        <GlobalShardScene />
        <SlidePresentation />
      </WarpProvider>
    </PageWrapper>
  )
}
