'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'

const milestones = [
  {
    quarter: 'Q1 2026',
    title: 'MVP Launch',
    status: 'completed',
    items: [
      { text: 'Core wallet functionality', done: true },
      { text: 'BLIK codes system', done: true },
      { text: '@username registry', done: true },
      { text: 'Contacts & scheduled payments', done: true },
    ],
  },
  {
    quarter: 'Q2 2026',
    title: 'Expansion',
    status: 'next',
    items: [
      { text: 'Network abstraction', done: false },
      { text: 'Multi-chain support', done: false },
      { text: 'Fiat on-ramp', done: false },
    ],
  },
  {
    quarter: 'Q3 2026',
    title: 'Identity',
    status: 'upcoming',
    items: [
      { text: 'SHARD Identity', done: false },
      { text: 'Proof of Personhood', done: false },
      { text: 'Privacy-preserving KYC', done: false },
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'Intelligence',
    status: 'future',
    items: [
      { text: 'AI Financial Agent', done: false },
      { text: 'Smart notifications', done: false },
      { text: 'Portfolio insights', done: false },
    ],
  },
]

function TimelineMarker({ status }: { status: string }) {
  const isActive = status === 'completed' || status === 'next'

  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <div
        className="w-3 h-3 rounded-full"
        style={{ background: isActive ? 'var(--foreground)' : 'var(--border)' }}
      />
      {status === 'next' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '1px solid var(--foreground)' }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </div>
  )
}

function MilestoneCard({
  milestone,
  index,
  isLeft,
}: {
  milestone: typeof milestones[0]
  index: number
  isLeft: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative ${isLeft ? 'md:pr-16 md:text-right' : 'md:pl-16'}`}
    >
      <div
        className="p-6 rounded-2xl transition-colors"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
      >
        {/* Quarter badge */}
        <div
          className="inline-block px-3 py-1 rounded-full text-xs font-mono mb-3"
          style={{
            background: milestone.status === 'completed' ? 'var(--foreground)' : milestone.status === 'next' ? 'var(--border)' : 'var(--surface-light)',
            color: milestone.status === 'completed' ? 'var(--background)' : milestone.status === 'next' ? 'var(--foreground)' : 'var(--foreground-muted)',
          }}
        >
          {milestone.quarter}
        </div>

        <h3 className="text-xl font-semibold mb-4" style={{ color: 'var(--foreground)' }}>{milestone.title}</h3>

        <ul className={`space-y-2 ${isLeft ? 'md:text-right' : ''}`}>
          {milestone.items.map((item, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 text-sm ${
                isLeft ? 'md:flex-row-reverse' : ''
              }`}
              style={{ color: item.done ? 'var(--foreground)' : 'var(--foreground-muted)' }}
            >
              {item.done ? (
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--foreground)' }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ border: '1px solid var(--border)' }} />
              )}
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

export function Roadmap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  })

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section
      id="roadmap"
      ref={containerRef}
      className="relative min-h-screen py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
    >
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            Roadmap
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText
              delay={0.3}
              glitchIntensity="medium"
              style={{ color: 'var(--foreground)' }}
            >
              Our Journey
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-16" style={{ color: 'var(--foreground-muted)' }}>
            Building the future, step by step
          </p>
        </FadeIn>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block" style={{ background: 'var(--border)' }}>
            <motion.div
              className="w-full"
              style={{ height: lineHeight, background: 'var(--foreground)' }}
            />
          </div>

          {/* Milestones */}
          <div className="space-y-12 md:space-y-24">
            {milestones.map((milestone, index) => (
              <div
                key={milestone.quarter}
                className="relative grid md:grid-cols-2 gap-8 md:gap-0"
              >
                {/* Marker (center) */}
                <div className="absolute left-1/2 top-6 -translate-x-1/2 z-10 hidden md:block">
                  <TimelineMarker status={milestone.status} />
                </div>

                {/* Mobile marker */}
                <div className="md:hidden flex items-center gap-4 mb-4">
                  <TimelineMarker status={milestone.status} />
                  <span className="text-sm font-mono" style={{ color: 'var(--foreground-muted)' }}>{milestone.quarter}</span>
                </div>

                {/* Card - alternating sides */}
                {index % 2 === 0 ? (
                  <>
                    <MilestoneCard
                      milestone={milestone}
                      index={index}
                      isLeft={true}
                    />
                    <div className="hidden md:block" />
                  </>
                ) : (
                  <>
                    <div className="hidden md:block" />
                    <MilestoneCard
                      milestone={milestone}
                      index={index}
                      isLeft={false}
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* End marker */}
          <FadeIn delay={0.5}>
            <div className="text-center mt-16">
              <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                This is just the beginning
              </span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
