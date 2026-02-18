'use client'

import { Header } from '@/components/ui/Header'
import { TimelineIndicator } from '@/components/ui/TimelineIndicator'
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

import { SectionReveal } from '@/components/animations/SectionReveal'

export default function Home() {
  return (
    <PageWrapper>
      <WarpProvider>
        <main className="relative">
          <Header />
          <TimelineIndicator />
          <div id="hero">
            <Hero />
          </div>

          <SectionReveal>
            <Problem />
          </SectionReveal>

          <SectionReveal parallax={0.03}>
            <Solution />
          </SectionReveal>

          <SectionReveal>
            <Features />
          </SectionReveal>

          <SectionReveal parallax={0.03}>
            <ComingSoon />
          </SectionReveal>

          <SectionReveal>
            <BusinessWallet />
          </SectionReveal>

          <SectionReveal parallax={0.02}>
            <Roadmap />
          </SectionReveal>

          <SectionReveal>
            <CTA />
          </SectionReveal>

          <Footer />
        </main>
      </WarpProvider>
    </PageWrapper>
  )
}
