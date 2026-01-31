'use client'

import { Header } from '@/components/ui/Header'
import { TimelineIndicator } from '@/components/ui/TimelineIndicator'
import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Solution } from '@/components/sections/Solution'
import { Features } from '@/components/sections/Features'
import { ComingSoon } from '@/components/sections/ComingSoon'
import { Roadmap } from '@/components/sections/Roadmap'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { PageWrapper } from '@/components/PageWrapper'

export default function Home() {
  return (
    <PageWrapper>
      <main className="relative">
        <Header />
        <TimelineIndicator />

        <div id="hero">
          <Hero />
        </div>

        <Problem />
        <Solution />
        <Features />
        <ComingSoon />
        <Roadmap />
        <CTA />
        <Footer />
      </main>
    </PageWrapper>
  )
}
