'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { FadeIn } from '@/components/animations/FadeIn'

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
      className="relative min-h-screen flex items-center py-32 overflow-hidden bg-white"
    >
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      <motion.div style={{ opacity }} className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest text-muted uppercase mb-4 text-center">
            The Problem
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 text-black">
            Crypto wasn't built for humans
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-muted text-center text-lg md:text-xl max-w-2xl mx-auto mb-20">
            It was built for machines. We're changing that.
          </p>
        </FadeIn>

        <div className="max-w-4xl mx-auto">
          {barriers.map((barrier, index) => (
            <FadeIn key={index} delay={0.3 + index * 0.1}>
              <motion.button
                onClick={scrollToSolution}
                className="group flex items-start gap-8 py-10 border-t border-black/10 first:border-t-0 w-full text-left cursor-pointer"
                whileHover={{ x: 8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-sm font-mono text-muted-light mt-1">
                  {barrier.number}
                </span>
                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold text-black mb-3 group-hover:text-gradient-blue transition-all duration-300">
                    {barrier.title}
                  </h3>
                  <p className="text-muted text-lg leading-relaxed">
                    {barrier.description}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-sm text-muted whitespace-nowrap">{barrier.solution}</span>
                  <svg
                    className="w-5 h-5 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
            <p className="text-2xl md:text-3xl text-black font-light leading-relaxed">
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
