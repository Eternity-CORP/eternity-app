'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { ParallaxLayer } from '@/components/animations/SectionReveal'
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
        <path d="M15 9.5c0-1.38-1.34-2.5-3-2.5S9 8.12 9 9.5c0 1.38 1.34 2.5 3 2.5s3 1.12 3 2.5c0 1.38-1.34 2.5-3 2.5s-3-1.12-3-2.5" strokeLinecap="round" />
        <path d="M12 6v1M12 17v1" strokeLinecap="round" />
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
        <path d="M4 21V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
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
        <path d="M4 12h16M20 12l-4-4M20 12l-4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M20 6H4M4 6l4-4M4 6l4 4" strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
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

  const svgSize = 280
  const center = svgSize / 2
  const orbitRadius = 95

  const nodePositions = founders.map((_, i) => {
    const angle = (i * 120 - 90) * (Math.PI / 180)
    return {
      x: center + Math.cos(angle) * orbitRadius,
      y: center + Math.sin(angle) * orbitRadius,
    }
  })

  return (
    <div ref={ref} className="flex justify-center items-center h-64 md:h-72">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full max-w-[280px]">
        {/* Connecting dashed lines */}
        {nodePositions.map((pos, i) => (
          <motion.line
            key={`line-${i}`}
            x1={center}
            y1={center}
            x2={pos.x}
            y2={pos.y}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.5 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        ))}

        {/* Central wallet node */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', delay: 0.2 }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          <rect
            x={center - 28}
            y={center - 28}
            width={56}
            height={56}
            rx={14}
            fill="var(--card-bg)"
            stroke="var(--accent-blue)"
            strokeWidth={2}
          />
          <g transform={`translate(${center - 12}, ${center - 12})`}>
            <rect x="2" y="6" width="20" height="14" rx="2" fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} />
            <path d="M7 6V4.5a5 5 0 0 1 10 0V6" fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} />
          </g>
        </motion.g>

        {/* Founder nodes */}
        {founders.map((f, i) => {
          const pos = nodePositions[i]
          return (
            <motion.g
              key={f.name}
              initial={{ opacity: 0, scale: 0 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.4 + i * 0.15, type: 'spring' }}
              style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
            >
              <rect
                x={pos.x - 18}
                y={pos.y - 18}
                width={36}
                height={36}
                rx={10}
                fill={f.color}
              />
              <text
                x={pos.x}
                y={pos.y + 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#fff"
                fontSize="12"
                fontWeight="700"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                {f.share}
              </text>
              <text
                x={pos.x}
                y={pos.y + 30}
                textAnchor="middle"
                fill="var(--foreground-muted)"
                fontSize="10"
                fontWeight="500"
                fontFamily="var(--font-sans), system-ui, sans-serif"
              >
                @{f.name.toLowerCase()}
              </text>
            </motion.g>
          )
        })}

        {/* Animated token particles */}
        {isInView &&
          founders.map((f, fi) => {
            const pos = nodePositions[fi]
            return Array.from({ length: 3 }).map((_, pi) => (
              <motion.circle
                key={`p-${fi}-${pi}`}
                r={2.5}
                fill={f.color}
                initial={{ cx: pos.x, cy: pos.y, opacity: 0 }}
                animate={{
                  cx: [pos.x, center],
                  cy: [pos.y, center],
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
    <div ref={ref}>
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
      <ParallaxLayer speed={-0.15} className="absolute top-1/4 -left-32 pointer-events-none">
        <motion.div
          className="w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(51,136,255,0.08) 0%, transparent 70%)',
            opacity: bgOpacity,
          }}
        />
      </ParallaxLayer>
      <ParallaxLayer speed={0.12} className="absolute bottom-1/4 -right-32 pointer-events-none">
        <motion.div
          className="w-96 h-96 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
            opacity: bgOpacity,
          }}
        />
      </ParallaxLayer>

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
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', minHeight: '340px' }}
            >
              <AnimatedPieChart />
            </div>

            {/* Token flow */}
            <div
              className="p-6 rounded-2xl flex flex-col"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', minHeight: '340px' }}
            >
              <p className="text-xs font-mono mb-2" style={{ color: 'var(--foreground-light)' }}>
                TREASURY FLOW
              </p>
              <div className="flex-1 flex items-center">
                <TokenFlowAnimation />
              </div>
            </div>

            {/* Governance demo */}
            <div
              className="p-6 rounded-2xl flex flex-col justify-center"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)', minHeight: '340px' }}
            >
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
