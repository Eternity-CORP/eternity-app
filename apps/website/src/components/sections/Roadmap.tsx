'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'

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
        className={`w-3 h-3 rounded-full ${
          isActive ? 'bg-black' : 'bg-black/20'
        }`}
      />
      {status === 'next' && (
        <motion.div
          className="absolute inset-0 rounded-full border border-black"
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
      <div className="p-6 rounded-2xl bg-white border border-black/5 hover:border-black/10 transition-colors">
        {/* Quarter badge */}
        <div
          className={`inline-block px-3 py-1 rounded-full text-xs font-mono mb-3 ${
            milestone.status === 'completed'
              ? 'bg-black text-white'
              : milestone.status === 'next'
              ? 'bg-black/10 text-black'
              : 'bg-surface-light text-muted'
          }`}
        >
          {milestone.quarter}
        </div>

        <h3 className="text-xl font-semibold text-black mb-4">{milestone.title}</h3>

        <ul className={`space-y-2 ${isLeft ? 'md:text-right' : ''}`}>
          {milestone.items.map((item, i) => (
            <li
              key={i}
              className={`flex items-center gap-2 text-sm ${
                isLeft ? 'md:flex-row-reverse' : ''
              } ${item.done ? 'text-black' : 'text-muted'}`}
            >
              {item.done ? (
                <svg
                  className="w-4 h-4 text-black flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <div className="w-4 h-4 rounded-full border border-black/20 flex-shrink-0" />
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
      className="relative min-h-screen py-32 overflow-hidden bg-white"
    >
      <div className="absolute inset-0 bg-grid opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest text-muted uppercase mb-4 text-center">
            Roadmap
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 text-black">
            Our Journey
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-muted text-center text-lg md:text-xl mb-16">
            Building the future, step by step
          </p>
        </FadeIn>

        {/* Timeline */}
        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black/10 -translate-x-1/2 hidden md:block">
            <motion.div
              className="w-full bg-black"
              style={{ height: lineHeight }}
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
                  <span className="text-sm text-muted font-mono">{milestone.quarter}</span>
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
              <span className="text-muted text-sm">
                This is just the beginning
              </span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
