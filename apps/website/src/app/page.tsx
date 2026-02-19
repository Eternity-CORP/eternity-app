'use client'

import { Header } from '@/components/ui/Header'
import { TimelineIndicator } from '@/components/ui/TimelineIndicator'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Showcase } from '@/components/sections/Showcase'
import { Roadmap } from '@/components/sections/Roadmap'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { PageWrapper } from '@/components/PageWrapper'
import { WarpProvider } from '@/components/animations/WarpTransition'

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
          <Problem />
          <Solution />
          <Showcase />
          <Roadmap />
          <CTA />
          <Footer />
        </main>
      </WarpProvider>
    </PageWrapper>
  )
}
