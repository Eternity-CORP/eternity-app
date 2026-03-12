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
      { text: 'Core wallet (create, import, send, receive)', done: true },
      { text: 'BLIK codes system', done: true },
      { text: '@username registry', done: true },
      { text: 'Contacts & scheduled payments', done: true },
      { text: 'AI Financial Agent', done: true },
      { text: 'Multi-chain balances', done: true },
    ],
  },
  {
    quarter: 'Q2 2026',
    title: 'DeFi',
    status: 'current',
    items: [
      { text: 'Cross-chain swaps (LI.FI)', done: true },
      { text: 'Fiat on-ramp (Onramper)', done: true },
      { text: 'Push notifications', done: true },
      { text: 'App Store & Play Store launch', done: false },
      { text: 'Network abstraction', done: false },
    ],
  },
  {
    quarter: 'Q3 2026',
    title: 'Identity & Privacy',
    status: 'upcoming',
    items: [
      { text: 'SHARD Identity system', done: false },
      { text: 'Account abstraction (ERC-4337)', done: false },
      { text: 'Privacy-preserving KYC', done: false },
    ],
  },
  {
    quarter: 'Q4 2026',
    title: 'Scale',
    status: 'future',
    items: [
      { text: 'Advanced AI insights & analytics', done: false },
      { text: 'Institutional features', done: false },
      { text: 'Proof of Personhood', done: false },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  SVG Winding Road Path                                               */
/* ------------------------------------------------------------------ */

function WindingRoad() {
  const ref = useRef<SVGSVGElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const pathProgress = useTransform(scrollYProgress, [0.05, 0.75], [0, 1])

  // S-curve winding path that flows through 4 milestone positions
  // Cards positioned at: ~y=80, ~y=260, ~y=440, ~y=620
  const roadPath =
    'M 400 20 C 400 60, 650 80, 650 140 C 650 200, 150 220, 150 280 C 150 340, 650 360, 650 420 C 650 480, 150 500, 150 560 C 150 620, 400 640, 400 680'

  return (
    <svg
      ref={ref}
      className="absolute left-0 top-0 w-full h-full pointer-events-none hidden md:block"
      viewBox="0 0 800 700"
      preserveAspectRatio="none"
      style={{ opacity: 0.9 }}
    >
      <defs>
        <linearGradient id="roadGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--accent-blue)" />
          <stop offset="50%" stopColor="var(--accent-cyan)" />
          <stop offset="100%" stopColor="var(--accent-blue)" />
        </linearGradient>
        <filter id="roadGlow">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="roadGlowSoft">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
          </feMerge>
        </filter>
      </defs>

      {/* Wide soft glow behind */}
      <path
        d={roadPath}
        fill="none"
        stroke="url(#roadGradient)"
        strokeWidth="20"
        strokeLinecap="round"
        filter="url(#roadGlowSoft)"
        opacity="0.15"
      />

      {/* Dashed background path */}
      <path
        d={roadPath}
        fill="none"
        stroke="var(--border)"
        strokeWidth="2"
        strokeDasharray="8 8"
        strokeLinecap="round"
      />

      {/* Animated glowing progress path */}
      <motion.path
        d={roadPath}
        fill="none"
        stroke="url(#roadGradient)"
        strokeWidth="3"
        strokeLinecap="round"
        filter="url(#roadGlow)"
        style={{ pathLength: pathProgress }}
      />

      {/* Milestone dots on the road */}
      {[
        { cx: 400, cy: 20 },
        { cx: 650, cy: 140 },
        { cx: 150, cy: 280 },
        { cx: 650, cy: 420 },
        { cx: 150, cy: 560 },
        { cx: 400, cy: 680 },
      ].map((dot, i) => (
        <circle
          key={i}
          cx={dot.cx}
          cy={dot.cy}
          r={i === 0 || i === 5 ? 3 : 5}
          fill={i === 0 || i === 5 ? 'var(--border)' : 'var(--foreground)'}
        />
      ))}
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/*  Milestone Card (horizontal layout)                                  */
/* ------------------------------------------------------------------ */

function MilestoneCard({
  milestone,
  index,
}: {
  milestone: (typeof milestones)[0]
  index: number
}) {
  const isCompleted = milestone.status === 'completed'
  const isCurrent = milestone.status === 'current'
  const isNext = milestone.status === 'next'

  // Desktop: alternate left/right aligned to match the S-curve
  // 0 → right, 1 → left, 2 → right, 3 → left
  const isRight = index % 2 === 0

  return (
    <motion.div
      initial={{ opacity: 0, x: isRight ? 40 : -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`relative md:w-[45%] ${isRight ? 'md:ml-auto' : 'md:mr-auto'}`}
    >
      <motion.div
        className="p-6 rounded-2xl backdrop-blur-sm transition-all duration-300"
        style={{
          background: 'var(--card-bg)',
          border: `1px solid ${isCompleted ? 'var(--accent-blue)' : isCurrent ? 'var(--accent-cyan)' : isNext ? 'var(--border)' : 'var(--border-light)'}`,
          boxShadow: isCompleted
            ? '0 0 30px rgba(51, 136, 255, 0.08)'
            : isCurrent
              ? '0 0 30px rgba(0, 229, 255, 0.12)'
              : 'none',
        }}
        whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(51, 136, 255, 0.1)' }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-4">
          {/* Status dot */}
          <div className="relative flex-shrink-0">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                background: isCompleted
                  ? 'var(--accent-blue)'
                  : isCurrent
                    ? 'var(--accent-cyan)'
                    : isNext
                      ? 'var(--foreground)'
                      : 'var(--border)',
              }}
            />
            {isCurrent && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: '1.5px solid var(--accent-cyan)' }}
                animate={{ scale: [1, 2.2, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>

          {/* Quarter */}
          <span
            className="text-xs font-mono tracking-wider"
            style={{
              color: isCompleted
                ? 'var(--accent-blue)'
                : isCurrent
                  ? 'var(--accent-cyan)'
                  : isNext
                    ? 'var(--foreground)'
                    : 'var(--foreground-muted)',
            }}
          >
            {milestone.quarter}
          </span>

          {/* Status label */}
          {isCompleted && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto"
              style={{ background: 'var(--accent-blue)', color: '#fff' }}>
              DONE
            </span>
          )}
          {isCurrent && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full ml-auto"
              style={{ background: 'var(--accent-cyan)', color: '#000' }}>
              NOW
            </span>
          )}
        </div>

        <h3
          className="text-xl font-semibold mb-3"
          style={{ color: 'var(--foreground)' }}
        >
          {milestone.title}
        </h3>

        <ul className="space-y-1.5">
          {milestone.items.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-sm"
              style={{ color: item.done ? 'var(--foreground)' : 'var(--foreground-muted)' }}
            >
              {item.done ? (
                <svg
                  className="w-3.5 h-3.5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ border: '1px solid var(--border)' }} />
              )}
              {item.text}
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                       */
/* ------------------------------------------------------------------ */

export function Roadmap() {
  const containerRef = useRef<HTMLDivElement>(null)

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
          <p
            className="text-sm font-medium tracking-widest uppercase mb-4 text-center"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Roadmap
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText delay={0.3} glitchIntensity="medium" style={{ color: 'var(--foreground)' }}>
              Our Journey
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-20" style={{ color: 'var(--foreground-muted)' }}>
            Building the future, step by step
          </p>
        </FadeIn>

        {/* Road + Cards container */}
        <div className="relative max-w-5xl mx-auto">
          {/* SVG winding road (desktop only) */}
          <WindingRoad />

          {/* Mobile: vertical glowing line */}
          <div
            className="absolute left-6 top-0 bottom-0 w-px md:hidden"
            style={{
              background: 'linear-gradient(to bottom, var(--accent-blue), var(--accent-cyan), var(--border))',
            }}
          />

          {/* Milestone cards */}
          <div className="space-y-8 md:space-y-16 relative z-10">
            {milestones.map((milestone, index) => (
              <div key={milestone.quarter} className="pl-12 md:pl-0">
                {/* Mobile dot */}
                <div className="absolute left-[18px] md:hidden">
                  <div
                    className="w-4 h-4 rounded-full border-2"
                    style={{
                      background: milestone.status === 'completed'
                        ? 'var(--accent-blue)'
                        : milestone.status === 'current'
                          ? 'var(--accent-cyan)'
                          : 'var(--background)',
                      borderColor: milestone.status === 'completed'
                        ? 'var(--accent-blue)'
                        : milestone.status === 'current'
                          ? 'var(--accent-cyan)'
                          : milestone.status === 'next'
                            ? 'var(--foreground)'
                            : 'var(--border)',
                    }}
                  />
                </div>
                <MilestoneCard milestone={milestone} index={index} />
              </div>
            ))}
          </div>

          {/* End marker */}
          <FadeIn delay={0.5}>
            <div className="text-center mt-16">
              <motion.span
                className="text-sm font-mono"
                style={{ color: 'var(--foreground-muted)' }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                This is just the beginning...
              </motion.span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}
