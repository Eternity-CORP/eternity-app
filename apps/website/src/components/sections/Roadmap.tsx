'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { ScrollReveal } from '@/components/animations/ScrollReveal'

const phases = [
  {
    quarter: 'Q1 2026',
    title: 'MVP',
    description: 'Wallet + BLIK + AI Agent',
    status: 'current' as const,
  },
  {
    quarter: 'Q2 2026',
    title: 'Expansion',
    description: 'Splits, Swap, Scheduled',
    status: 'future' as const,
  },
  {
    quarter: 'Q3 2026',
    title: 'Business',
    description: 'Business Wallets + Governance',
    status: 'future' as const,
  },
  {
    quarter: 'Q4 2026',
    title: 'Scale',
    description: 'Multi-chain mainnet + Mobile',
    status: 'future' as const,
  },
]

export function Roadmap() {
  const timelineRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(timelineRef, { once: true, amount: 0.3 })

  return (
    <section id="roadmap" className="relative py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <p className="text-tag text-white/30 text-center mb-4">ROADMAP</p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-heading text-center mb-16">
            The <span className="text-gradient-blue">journey</span> ahead.
          </h2>
        </ScrollReveal>

        {/* Horizontal Timeline — Desktop */}
        <div ref={timelineRef} className="hidden md:block relative">
          {/* Timeline line */}
          <div className="absolute top-6 left-0 right-0 h-px bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
              initial={{ width: '0%' }}
              animate={isInView ? { width: '25%' } : {}}
              transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            />
          </div>

          <div className="grid grid-cols-4 gap-8">
            {phases.map((phase, i) => (
              <motion.div
                key={phase.quarter}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative pt-12"
              >
                {/* Dot */}
                <div className="absolute top-[18px] left-0">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      phase.status === 'current' ? 'bg-white' : 'bg-white/20'
                    }`}
                  />
                  {phase.status === 'current' && (
                    <motion.div
                      className="absolute inset-0 rounded-full border border-white"
                      animate={{ scale: [1, 2, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </div>

                <p className="text-xs font-mono text-white/30 mb-2">{phase.quarter}</p>
                <h3 className={`text-lg font-semibold mb-1 ${phase.status === 'current' ? 'text-white' : 'text-white/50'}`}>
                  {phase.title}
                </h3>
                <p className="text-sm text-white/30">{phase.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Vertical Timeline — Mobile */}
        <div className="md:hidden space-y-8">
          {phases.map((phase, i) => (
            <motion.div
              key={phase.quarter}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.15 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${phase.status === 'current' ? 'bg-white' : 'bg-white/20'}`} />
                {i < phases.length - 1 && <div className="w-px flex-1 bg-white/10 mt-2" />}
              </div>
              <div className="pb-6">
                <p className="text-xs font-mono text-white/30 mb-1">{phase.quarter}</p>
                <h3 className={`text-base font-semibold mb-1 ${phase.status === 'current' ? 'text-white' : 'text-white/50'}`}>
                  {phase.title}
                </h3>
                <p className="text-sm text-white/30">{phase.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
