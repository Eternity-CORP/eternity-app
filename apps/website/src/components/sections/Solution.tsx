'use client'

import { motion } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'

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
    subtitle: 'The brain behind your wallet',
    description: 'AI that understands context, prevents mistakes, and speaks your language.',
  },
]

export function Solution() {
  return (
    <section
      id="solution"
      className="relative min-h-screen flex items-center py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background-secondary)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            The Solution
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6" style={{ color: 'var(--foreground)' }}>
            <span className="text-gradient-blue">AI-Native</span> by Design
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-20" style={{ color: 'var(--foreground-muted)' }}>
            Intelligence built into every layer.
          </p>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {pillars.map((pillar, index) => (
            <StaggerItem key={index}>
              <motion.div
                className="group relative p-8 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-subtle"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-light)'
                }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {/* Number */}
                <div className="text-sm font-mono mb-6" style={{ color: 'var(--foreground-light)' }}>
                  {pillar.number}
                </div>

                <div className="relative z-10">
                  <h3 className="text-2xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    {pillar.title}
                  </h3>

                  <p className="text-sm font-medium mb-4 text-gradient-blue">
                    {pillar.subtitle}
                  </p>

                  <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                    {pillar.description}
                  </p>
                </div>

                {/* Hover line */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: 'var(--foreground)' }}
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Connection mapping */}
        <FadeIn delay={0.6}>
          <div className="mt-20 flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--foreground-muted)' }}>Fear</span>
              <span style={{ color: 'var(--foreground-light)' }}>→</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>BLIK</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--foreground-muted)' }}>Confusion</span>
              <span style={{ color: 'var(--foreground-light)' }}>→</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>Abstraction</span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--foreground-muted)' }}>Exclusion</span>
              <span style={{ color: 'var(--foreground-light)' }}>→</span>
              <span className="font-medium" style={{ color: 'var(--foreground)' }}>SHARD + AI</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
