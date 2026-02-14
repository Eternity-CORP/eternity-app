'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'
import { Button } from '@/components/ui/Button'

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    id: 'equity',
    title: 'Tokenized Equity',
    subtitle: 'Ownership as ERC-20 tokens',
    description:
      'Create a fixed-supply token representing your business. Each token is a share. Transfer tokens, transfer ownership.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'treasury',
    title: 'Shared Treasury',
    subtitle: 'One wallet, collective control',
    description:
      'Clients pay your business address. Funds are controlled by governance voting weighted by ownership.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M7 8V6a5 5 0 0 1 10 0v2" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    ),
  },
  {
    id: 'governance',
    title: 'Governance',
    subtitle: 'Democracy, not dictatorship',
    description:
      'Create proposals, cast weighted votes, execute decisions automatically when quorum is reached.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="3" width="18" height="18" rx="3" />
      </svg>
    ),
  },
  {
    id: 'transfers',
    title: 'Smart Transfers',
    subtitle: 'Configurable share policies',
    description:
      'Free transfers or approval-required mode. Sell shares, onboard new partners, or lock ownership with a vote.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M7 17l10-10M17 7v6M17 7h-6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 17H7V7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const steps = [
  {
    number: '01',
    title: 'Create',
    description: 'Name your business, set token supply, and choose a ticker symbol.',
  },
  {
    number: '02',
    title: 'Allocate',
    description: 'Invite co-founders and assign shares proportionally.',
  },
  {
    number: '03',
    title: 'Govern',
    description: 'Manage treasury through proposals and weighted voting.',
  },
  {
    number: '04',
    title: 'Transfer',
    description: 'Sell or transfer ownership with a single transaction.',
  },
]

const founders = [
  { name: 'Daniel', share: 50, color: 'var(--accent-blue)' },
  { name: 'Alex', share: 30, color: 'var(--accent-cyan)' },
  { name: 'Maria', share: 20, color: '#22C55E' },
]

/* ------------------------------------------------------------------ */
/*  Animated Pie Chart                                                 */
/* ------------------------------------------------------------------ */

function AnimatedPieChart() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [activeSlice, setActiveSlice] = useState<number | null>(null)

  // Build SVG arcs
  const size = 200
  const cx = size / 2
  const cy = size / 2
  const radius = 80
  const gap = 2 // degrees gap between slices

  function describeArc(startAngle: number, endAngle: number, r: number) {
    const start = ((startAngle - 90) * Math.PI) / 180
    const end = ((endAngle - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  let currentAngle = 0
  const slices = founders.map((f) => {
    const startAngle = currentAngle + gap / 2
    const sliceAngle = (f.share / 100) * 360 - gap
    const endAngle = startAngle + sliceAngle
    currentAngle = endAngle + gap / 2
    return { ...f, startAngle, endAngle, path: describeArc(startAngle, endAngle, radius) }
  })

  return (
    <div ref={ref} className="relative flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-48 h-48 md:w-56 md:h-56"
        style={{ filter: 'drop-shadow(0 4px 24px rgba(0,0,0,0.15))' }}
      >
        {slices.map((slice, i) => (
          <motion.path
            key={slice.name}
            d={slice.path}
            fill={slice.color}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              isInView
                ? {
                    scale: activeSlice === i ? 1.06 : 1,
                    opacity: 1,
                  }
                : { scale: 0, opacity: 0 }
            }
            transition={{
              scale: { type: 'spring', stiffness: 200, damping: 20 },
              opacity: { duration: 0.6, delay: 0.2 + i * 0.15 },
            }}
            style={{ transformOrigin: `${cx}px ${cy}px` }}
            onMouseEnter={() => setActiveSlice(i)}
            onMouseLeave={() => setActiveSlice(null)}
            className="cursor-pointer"
          />
        ))}
        {/* Center circle */}
        <circle cx={cx} cy={cy} r="36" fill="var(--background)" />
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fill="var(--foreground)"
          fontSize="14"
          fontWeight="700"
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          $ACME
        </text>
        <text
          x={cx}
          y={cy + 10}
          textAnchor="middle"
          fill="var(--foreground-muted)"
          fontSize="9"
          fontFamily="var(--font-sans), system-ui, sans-serif"
        >
          100 tokens
        </text>
      </svg>

      {/* Legend */}
      <div className="flex gap-5 mt-6">
        {founders.map((f, i) => (
          <motion.div
            key={f.name}
            className="flex items-center gap-2 cursor-pointer"
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5 + i * 0.1 }}
            onMouseEnter={() => setActiveSlice(i)}
            onMouseLeave={() => setActiveSlice(null)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full transition-transform duration-200"
              style={{
                background: f.color,
                transform: activeSlice === i ? 'scale(1.4)' : 'scale(1)',
              }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: activeSlice === i ? 'var(--foreground)' : 'var(--foreground-muted)' }}
            >
              @{f.name.toLowerCase()} ({f.share}%)
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Token Flow Animation                                               */
/* ------------------------------------------------------------------ */

function TokenFlowAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <div ref={ref} className="relative h-64 md:h-72 overflow-hidden">
      {/* Central wallet node */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-2xl flex items-center justify-center z-10"
        style={{
          background: 'var(--card-bg)',
          border: '2px solid var(--accent-blue)',
          boxShadow: '0 0 40px rgba(51,136,255,0.2)',
        }}
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ type: 'spring', delay: 0.2 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} className="w-8 h-8">
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M7 8V6a5 5 0 0 1 10 0v2" />
        </svg>
      </motion.div>

      {/* Orbiting wallet nodes */}
      {founders.map((f, i) => {
        const angle = (i * 120 - 90) * (Math.PI / 180)
        const orbitRadius = 100
        const x = Math.cos(angle) * orbitRadius
        const y = Math.sin(angle) * orbitRadius

        return (
          <motion.div
            key={f.name}
            className="absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
            style={{ x: x - 20, y: y - 20 }}
            initial={{ opacity: 0, scale: 0 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.4 + i * 0.15, type: 'spring' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold"
              style={{ background: f.color, color: '#fff' }}
            >
              {f.share}
            </div>
            <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: 'var(--foreground-muted)' }}>
              @{f.name.toLowerCase()}
            </span>
          </motion.div>
        )
      })}

      {/* Animated token particles flowing toward center */}
      {isInView &&
        founders.map((f, fi) => {
          const angle = (fi * 120 - 90) * (Math.PI / 180)
          const startX = Math.cos(angle) * 100
          const startY = Math.sin(angle) * 100
          return Array.from({ length: 3 }).map((_, pi) => (
            <motion.div
              key={`${fi}-${pi}`}
              className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full"
              style={{ background: f.color }}
              initial={{ x: startX, y: startY, opacity: 0 }}
              animate={{
                x: [startX, 0],
                y: [startY, 0],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 2,
                delay: 1 + pi * 0.6 + fi * 0.3,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
            />
          ))
        })}

      {/* Connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {founders.map((f, i) => {
          const angle = (i * 120 - 90) * (Math.PI / 180)
          const endX = Math.cos(angle) * 100
          const endY = Math.sin(angle) * 100
          return (
            <motion.line
              key={i}
              x1="50%"
              y1="50%"
              x2={`calc(50% + ${endX}px)`}
              y2={`calc(50% + ${endY}px)`}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 4"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={isInView ? { pathLength: 1, opacity: 0.5 } : {}}
              transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
            />
          )
        })}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Governance Demo Animation                                          */
/* ------------------------------------------------------------------ */

function GovernanceDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4)
    }, 2500)
    return () => clearInterval(interval)
  }, [isInView])

  const demoSteps = [
    { label: 'Proposal Created', detail: 'Withdraw 0.1 ETH for hosting', progress: 0 },
    { label: '@daniel voted For', detail: '50 / 51 needed', progress: 50 },
    { label: '@alex voted For', detail: '80 / 51 needed', progress: 80 },
    { label: 'Proposal Passed', detail: 'Executing withdrawal...', progress: 100 },
  ]

  return (
    <div
      ref={ref}
      className="p-5 rounded-2xl"
      style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono" style={{ color: 'var(--foreground-light)' }}>
          LIVE DEMO
        </span>
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: '#22C55E' }}
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
            {demoSteps[step].label}
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
            {demoSteps[step].detail}
          </p>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  demoSteps[step].progress >= 100
                    ? '#22C55E'
                    : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${demoSteps[step].progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Quorum line */}
          <div className="relative mt-1">
            <div
              className="absolute left-[51%] -top-[10px] w-px h-[10px]"
              style={{ background: 'var(--foreground-light)' }}
            />
            <span
              className="absolute left-[51%] -translate-x-1/2 text-[9px]"
              style={{ color: 'var(--foreground-light)' }}
            >
              51%
            </span>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Step indicators */}
      <div className="flex gap-1 mt-6">
        {demoSteps.map((_, i) => (
          <div
            key={i}
            className="h-0.5 flex-1 rounded-full transition-colors duration-300"
            style={{
              background: i <= step ? 'var(--foreground)' : 'var(--border)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Section                                                       */
/* ------------------------------------------------------------------ */

export function BusinessWallet() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const bgOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0])

  return (
    <section
      id="business-wallet"
      ref={sectionRef}
      className="relative py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-grid opacity-30" />

      {/* Ambient glow */}
      <motion.div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(51,136,255,0.08) 0%, transparent 70%)',
          opacity: bgOpacity,
        }}
      />
      <motion.div
        className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
          opacity: bgOpacity,
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        {/* ---------- Header ---------- */}
        <FadeIn>
          <p
            className="text-sm font-medium tracking-widest uppercase mb-4 text-center"
            style={{ color: 'var(--foreground-muted)' }}
          >
            New Feature
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText delay={0.3} glitchIntensity="medium" style={{ color: 'var(--foreground)' }}>
              Your Business, On-Chain
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p
            className="text-center text-lg md:text-xl max-w-2xl mx-auto mb-20 [text-wrap:balance]"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Tokenize ownership, govern collectively, and transfer shares
            — all from your wallet.
          </p>
        </FadeIn>

        {/* ---------- Interactive Animation Area ---------- */}
        <FadeIn delay={0.3}>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-28">
            {/* Pie chart */}
            <div
              className="p-6 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
            >
              <AnimatedPieChart />
            </div>

            {/* Token flow */}
            <div
              className="p-6 rounded-2xl"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
            >
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--foreground-light)' }}>
                TREASURY FLOW
              </p>
              <TokenFlowAnimation />
            </div>

            {/* Governance demo */}
            <div className="flex flex-col justify-center">
              <GovernanceDemo />
            </div>
          </div>
        </FadeIn>

        {/* ---------- Features Grid ---------- */}
        <FadeIn>
          <p
            className="text-sm font-medium tracking-widest uppercase mb-4 text-center"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Capabilities
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ color: 'var(--foreground)' }}>
            Everything You Need to{' '}
            <span className="text-gradient-blue">Run a Business</span>
          </h3>
        </FadeIn>

        <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto mb-28">
          {features.map((feature) => (
            <StaggerItem key={feature.id}>
              <motion.div
                className="group relative p-6 rounded-2xl h-full transition-all duration-300 hover:shadow-subtle"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-light)',
                }}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                {/* Icon */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'var(--surface)', color: 'var(--foreground)' }}
                >
                  {feature.icon}
                </div>

                <h4 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                  {feature.title}
                </h4>
                <p className="text-xs font-medium mb-3 text-gradient-blue">{feature.subtitle}</p>
                <p className="text-sm leading-relaxed [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
                  {feature.description}
                </p>

                {/* Hover bottom line */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-blue to-accent-cyan rounded-b-2xl"
                  initial={{ scaleX: 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{ originX: 0 }}
                />
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* ---------- How It Works ---------- */}
        <FadeIn>
          <p
            className="text-sm font-medium tracking-widest uppercase mb-4 text-center"
            style={{ color: 'var(--foreground-muted)' }}
          >
            How It Works
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h3 className="text-3xl md:text-4xl font-bold text-center mb-16" style={{ color: 'var(--foreground)' }}>
            Four Steps to{' '}
            <span className="text-gradient-blue">Launch</span>
          </h3>
        </FadeIn>

        <div className="max-w-4xl mx-auto mb-20 relative">
          {/* Connecting line */}
          <div
            className="absolute top-5 left-0 right-0 h-px hidden md:block"
            style={{ background: 'var(--border)' }}
          />

          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {steps.map((s) => (
              <StaggerItem key={s.number}>
                <div className="relative text-center">
                  {/* Step circle */}
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-4 text-sm font-bold relative z-10"
                    style={{
                      background: 'var(--foreground)',
                      color: 'var(--background)',
                    }}
                    whileHover={{ scale: 1.15 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    {s.number}
                  </motion.div>

                  <h4 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    {s.title}
                  </h4>
                  <p className="text-sm leading-relaxed [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
                    {s.description}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>

        {/* ---------- CTA ---------- */}
        <FadeIn delay={0.2}>
          <div className="text-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => window.open('https://e-y-app.vercel.app', '_blank')}
            >
              Try Business Wallet
            </Button>
            <p className="text-sm mt-4" style={{ color: 'var(--foreground-light)' }}>
              Available on Sepolia testnet. Zero cost.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
