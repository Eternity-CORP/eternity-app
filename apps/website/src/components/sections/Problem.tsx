'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { FadeIn } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'

const barriers = [
  {
    number: '01',
    title: 'Complexity',
    description: 'Wallet addresses, gas fees, network selection, bridges — each step is a potential mistake.',
    solution: 'BLIK Codes',
  },
  {
    number: '02',
    title: 'Fear',
    description: 'One wrong character, one wrong network. Funds gone forever. No customer support.',
    solution: 'Network Abstraction',
  },
  {
    number: '03',
    title: 'Exclusion',
    description: '8 billion people. 500 million crypto users. The gap isn\'t interest — it\'s experience.',
    solution: 'SHARD Identity',
  },
]

export function Problem() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  const scrollToSolution = () => {
    const element = document.getElementById('solution')
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      id="problem"
      ref={containerRef}
      className="relative min-h-screen flex items-center py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      <motion.div style={{ opacity }} className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            The Problem
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText
              delay={0.3}
              glitchIntensity="medium"
              style={{ color: 'var(--foreground)' }}
            >
              Crypto wasn't built for humans
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl max-w-2xl mx-auto mb-20" style={{ color: 'var(--foreground-muted)' }}>
            It was built for machines. We rebuilt it with AI.
          </p>
        </FadeIn>

        <div className="max-w-4xl mx-auto">
          {barriers.map((barrier, index) => (
            <FadeIn key={index} delay={0.3 + index * 0.1}>
              <motion.button
                onClick={scrollToSolution}
                className="group flex items-start gap-8 py-10 w-full text-left cursor-pointer"
                style={{ borderTop: index === 0 ? 'none' : '1px solid var(--border)' }}
                whileHover={{ x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-sm font-mono mt-1" style={{ color: 'var(--foreground-light)' }}>
                  {barrier.number}
                </span>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3 group-hover:text-gradient-blue transition-all duration-300" style={{ color: 'var(--foreground)' }}>
                    {barrier.title}
                  </h3>
                  <p className="text-lg leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                    {barrier.description}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>{barrier.solution}</span>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    style={{ color: 'var(--foreground)' }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </div>
              </motion.button>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={0.7}>
          <div className="max-w-3xl mx-auto mt-20 text-center">
            <p className="text-2xl md:text-3xl font-light leading-relaxed" style={{ color: 'var(--foreground)' }}>
              Mass adoption isn't blocked by technology.
              <br />
              <span className="font-semibold">It's blocked by experience.</span>
            </p>
          </div>
        </FadeIn>
      </motion.div>
    </section>
  )
}
