'use client'

import { Header } from '@/components/ui/Header'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { ComingSoon } from '@/components/sections/ComingSoon'
import { BusinessWallet } from '@/components/sections/BusinessWallet'
import { Roadmap } from '@/components/sections/Roadmap'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { PageWrapper } from '@/components/PageWrapper'
import { WarpProvider } from '@/components/animations/WarpTransition'

export default function Home() {
  return (
    <PageWrapper>
      <WarpProvider>
        <Header />
        <main>
          <Hero />
          <Problem />
          <Solution />
          <Features />
          <ComingSoon />
          <BusinessWallet />
          <Roadmap />
          <CTA />
        </main>
        <Footer />
      </WarpProvider>
    </PageWrapper>
  )
}
