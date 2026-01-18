'use client'

import { motion } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'

const pillars = [
  {
    number: '01',
    title: 'BLIK Codes',
    subtitle: '6 digits instead of 42',
    description: 'Share a simple code, receive money. No addresses, no mistakes, no fear.',
  },
  {
    number: '02',
    title: 'Network Abstraction',
    subtitle: 'One token, any chain',
    description: 'See "USDC", not "USDC (Polygon)". We handle the complexity.',
  },
  {
    number: '03',
    title: 'SHARD Identity',
    subtitle: 'Your passport = your ID',
    description: 'Your passport becomes your crypto identity. Verify from home.',
  },
  {
    number: '04',
    title: 'AI Agent',
    subtitle: 'Your crypto companion',
    description: 'Proactive assistant that speaks your language and knows your style.',
  },
]

export function Solution() {
  return (
    <section
      id="solution"
      className="relative min-h-screen flex items-center py-32 overflow-hidden bg-surface-light"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest text-muted uppercase mb-4 text-center">
            The Solution
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 text-black">
            We built Eternity to fix this
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-muted text-center text-lg md:text-xl mb-20">
            Four pillars. <span className="text-black font-medium">Zero fear.</span>
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <StaggerItem key={index}>
              <motion.div
                className="group relative p-8 rounded-2xl bg-white border border-black/5 overflow-hidden transition-all duration-300 hover:border-black/10 hover:shadow-subtle"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {/* Number */}
                <div className="text-sm font-mono text-muted-light mb-6">
                  {pillar.number}
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-semibold mb-2 text-black">
                    {pillar.title}
                  </h3>

                  <p className="text-sm font-medium mb-4 text-gradient-blue">
                    {pillar.subtitle}
                  </p>

                  <p className="text-muted leading-relaxed">
                    {pillar.description}
                  </p>
                </div>

                {/* Hover line */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ originX: 0 }}
                />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Connection mapping */}
        <FadeIn delay={0.6}>
          <div className="mt-20 flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-muted">Fear</span>
              <span className="text-muted-light">→</span>
              <span className="text-black font-medium">BLIK</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted">Confusion</span>
              <span className="text-muted-light">→</span>
              <span className="text-black font-medium">Abstraction</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted">Exclusion</span>
              <span className="text-muted-light">→</span>
              <span className="text-black font-medium">SHARD + AI</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
