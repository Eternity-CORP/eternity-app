'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'
import { SpotlightGrid } from '@/components/animations/SpotlightGrid'

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type ShowcaseCategory = 'personal' | 'business'

interface ShowcaseFeature {
  id: string
  category: ShowcaseCategory
  title: string
  description: string
  details: string[]
  visual: 'phone' | 'pie-chart' | 'token-flow' | 'governance' | 'transfer-visual'
  phoneScreen?: { title: string; content: string; details: string[] }
}

/* ================================================================== */
/*  Data                                                               */
/* ================================================================== */

const founders = [
  { name: 'Daniel', share: 50, color: 'var(--accent-blue)' },
  { name: 'Alex', share: 30, color: 'var(--accent-cyan)' },
  { name: 'Maria', share: 20, color: '#22C55E' },
]

const personalFeatures: ShowcaseFeature[] = [
  {
    id: 'wallet',
    category: 'personal',
    title: 'Create & Import',
    description: 'Your keys, your crypto. Create a new wallet or import an existing one with secure seed phrase management.',
    details: ['Secure generation', 'Biometric protection', 'Multi-account support'],
    visual: 'phone',
    phoneScreen: { title: 'Create Wallet', content: 'Your 12-word recovery phrase', details: ['Secure generation', 'Biometric protection', 'Multi-account support'] },
  },
  {
    id: 'blik',
    category: 'personal',
    title: 'BLIK Codes',
    description: 'Share a 6-digit code and money arrives in seconds. No addresses needed.',
    details: ['2-minute expiry', 'Real-time matching', 'Zero mistakes'],
    visual: 'phone',
    phoneScreen: { title: 'BLIK Code', content: '847 291', details: ['2-minute expiry', 'Real-time matching', 'Zero mistakes'] },
  },
  {
    id: 'username',
    category: 'personal',
    title: '@username System',
    description: 'Send to @alex instead of long hex addresses like 0x7f3a...9b2c.',
    details: ['Human-readable', 'Instant lookup', 'Free to register'],
    visual: 'phone',
    phoneScreen: { title: 'Send to', content: '@alex', details: ['Human-readable', 'Instant lookup', 'Free to register'] },
  },
  {
    id: 'balances',
    category: 'personal',
    title: 'Token Balances',
    description: 'All your tokens in one place with real-time USD prices.',
    details: ['ETH, USDC, USDT', 'Live prices', 'Pull to refresh'],
    visual: 'phone',
    phoneScreen: { title: 'Portfolio', content: '$1,234.56', details: ['ETH, USDC, USDT', 'Live prices', 'Pull to refresh'] },
  },
  {
    id: 'contacts',
    category: 'personal',
    title: 'Contacts Book',
    description: 'Save frequent recipients and send again in one tap.',
    details: ['Quick select', 'Address + username', 'Quick access'],
    visual: 'phone',
    phoneScreen: { title: 'Contacts', content: '12 saved', details: ['Quick select', 'Address + username', 'Quick access'] },
  },
  {
    id: 'scheduled',
    category: 'personal',
    title: 'Scheduled Payments',
    description: 'Automate recurring payments. Set it once and forget about it.',
    details: ['Daily, weekly, monthly', 'Smart reminders', 'Notifications'],
    visual: 'phone',
    phoneScreen: { title: 'Scheduled', content: '3 active', details: ['Daily, weekly, monthly', 'Smart reminders', 'Notifications'] },
  },
  {
    id: 'ai',
    category: 'personal',
    title: 'AI Agent',
    description: 'Talk to your wallet in plain language. It understands context.',
    details: ['Natural language', 'Proactive suggestions', 'Full context awareness'],
    visual: 'phone',
    phoneScreen: { title: 'AI Chat', content: '"Send 0.01 ETH to @alex"', details: ['Natural language', 'Proactive suggestions', 'Full context awareness'] },
  },
  {
    id: 'split',
    category: 'personal',
    title: 'Split Bill',
    description: 'Dinner with friends? Split the bill fairly in one tap.',
    details: ['Equal or custom', 'Track payments', 'Push notifications'],
    visual: 'phone',
    phoneScreen: { title: 'Split Bill', content: '$45.00 / 3', details: ['Equal or custom', 'Track payments', 'Push notifications'] },
  },
  {
    id: 'swap',
    category: 'personal',
    title: 'Token Swap',
    description: 'Swap tokens across chains. Best rates from LI.FI aggregator.',
    details: ['Cross-chain', 'Best rates', '5 networks'],
    visual: 'phone',
    phoneScreen: { title: 'Token Swap', content: 'ETH → USDC', details: ['Cross-chain', 'Best rates', '5 networks'] },
  },
  {
    id: 'onramp',
    category: 'personal',
    title: 'Fiat On-Ramp',
    description: 'Buy crypto with your card. Multiple providers, best rates.',
    details: ['Card payments', 'Multiple providers', 'Instant'],
    visual: 'phone',
    phoneScreen: { title: 'Buy Crypto', content: '$100 → ETH', details: ['Card payments', 'Multiple providers', 'Instant'] },
  },
]

const businessFeatures: ShowcaseFeature[] = [
  {
    id: 'equity',
    category: 'business',
    title: 'Tokenized Equity',
    description: 'Create a fixed-supply token representing your business. Each token is a share. Transfer tokens, transfer ownership.',
    details: ['ERC-20 ownership tokens', 'Fixed supply at creation', 'Proportional voting rights'],
    visual: 'pie-chart',
  },
  {
    id: 'treasury',
    category: 'business',
    title: 'Shared Treasury',
    description: 'Clients pay your business address. Funds are controlled by governance voting weighted by ownership.',
    details: ['Collective fund control', 'Incoming payment routing', 'Governance-managed spending'],
    visual: 'token-flow',
  },
  {
    id: 'governance',
    category: 'business',
    title: 'Governance',
    description: 'Create proposals, cast weighted votes, execute decisions automatically when quorum is reached.',
    details: ['Create & vote on proposals', 'Weighted by token ownership', 'Auto-execute at quorum'],
    visual: 'governance',
  },
  {
    id: 'transfers',
    category: 'business',
    title: 'Smart Transfers',
    description: 'Free transfers or approval-required mode. Sell shares, onboard new partners, or lock ownership with a vote.',
    details: ['Configurable transfer policy', 'Sell or gift shares', 'Lock ownership by vote'],
    visual: 'transfer-visual',
  },
  {
    id: 'dividends',
    category: 'business',
    title: 'Dividends',
    description: 'Distribute profits to all shareholders proportionally.',
    details: ['Pull-based claiming', 'Pro-rata distribution', 'On-chain records'],
    visual: 'governance',
  },
  {
    id: 'vesting',
    category: 'business',
    title: 'Vesting',
    description: 'Auto-vest tokens for team members with time-based release.',
    details: ['Automatic at creation', 'Time-based release', 'Cliff periods'],
    visual: 'governance',
  },
]

const allFeatures: Record<ShowcaseCategory, ShowcaseFeature[]> = {
  personal: personalFeatures,
  business: businessFeatures,
}

/* ================================================================== */
/*  IPhoneMockup                                                       */
/* ================================================================== */

function IPhoneMockup({ screen }: { screen: { title: string; content: string; details: string[] } }) {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: 280, height: 572 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Phone outer frame */}
      <div className="absolute inset-0 rounded-[46px] bg-gradient-to-b from-gray-800 to-gray-900 p-[3px]">
        <div className="w-full h-full rounded-[43px] bg-gradient-to-b from-gray-700 to-gray-800 p-[2px]">
          <div className="w-full h-full rounded-[41px] overflow-hidden relative bg-black">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <div className="w-24 h-7 rounded-full flex items-center justify-center gap-2 bg-black">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <div className="w-8 h-3.5 rounded-full bg-gray-900" />
              </div>
            </div>

            {/* Screen content */}
            <div className="w-full h-full rounded-[41px] overflow-hidden bg-white">
              <div className="h-full flex flex-col">
                {/* App header */}
                <div className="px-5 py-3 pt-13 border-b border-gray-100">
                  <h4 className="text-lg font-bold text-center text-black">
                    {screen.title}
                  </h4>
                </div>

                {/* Main content */}
                <div className="flex-1 p-5 flex flex-col">
                  <div className="rounded-2xl p-5 mb-5 bg-gray-50">
                    <div className="text-2xl font-bold text-center text-black">
                      {screen.content}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {screen.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-3 text-sm rounded-xl p-2.5 text-gray-600 bg-white border border-gray-100"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-black" />
                        {detail}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="pb-2 pt-2">
                  <div className="w-28 h-1 mx-auto rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute -left-[2px] top-24 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-36 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-32 w-[3px] h-14 bg-gray-700 rounded-r-sm" />

      {/* Reflection + Shadow */}
      <div className="absolute inset-0 rounded-[46px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -inset-6 bg-black/15 rounded-[56px] blur-3xl -z-10" />
    </motion.div>
  )
}

/* ================================================================== */
/*  AnimatedPieChart                                                   */
/* ================================================================== */

function AnimatedPieChart() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-80px' })
  const [activeSlice, setActiveSlice] = useState<number | null>(null)

  const size = 200
  const cx = size / 2
  const cy = size / 2
  const radius = 80
  const gap = 2

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
    <div ref={ref} className="relative flex flex-col items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-44 h-44 md:w-52 md:h-52"
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
                ? { scale: activeSlice === i ? 1.06 : 1, opacity: 1 }
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
        <circle cx={cx} cy={cy} r="36" fill="var(--background)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--foreground)" fontSize="14" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
          $ACME
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--foreground-muted)" fontSize="9" fontFamily="var(--font-sans), system-ui, sans-serif">
          100 tokens
        </text>
      </svg>

      <div className="flex gap-4 mt-4">
        {founders.map((f, i) => (
          <div
            key={f.name}
            className="flex items-center gap-1.5 cursor-pointer"
            onMouseEnter={() => setActiveSlice(i)}
            onMouseLeave={() => setActiveSlice(null)}
          >
            <div
              className="w-2 h-2 rounded-full transition-transform duration-200"
              style={{ background: f.color, transform: activeSlice === i ? 'scale(1.4)' : 'scale(1)' }}
            />
            <span className="text-[10px] font-medium" style={{ color: activeSlice === i ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
              @{f.name.toLowerCase()} ({f.share}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  TokenFlowAnimation                                                 */
/* ================================================================== */

function TokenFlowAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-60px' })

  const svgSize = 260
  const center = svgSize / 2
  const orbitRadius = 90

  const nodePositions = founders.map((_, i) => {
    const angle = (i * 120 - 90) * (Math.PI / 180)
    return { x: center + Math.cos(angle) * orbitRadius, y: center + Math.sin(angle) * orbitRadius }
  })

  return (
    <div ref={ref} className="flex justify-center items-center h-full">
      <svg viewBox={`0 0 ${svgSize} ${svgSize}`} className="w-full h-full max-w-[260px]">
        {nodePositions.map((pos, i) => (
          <motion.line
            key={`line-${i}`}
            x1={center} y1={center} x2={pos.x} y2={pos.y}
            stroke="var(--border)" strokeWidth={1} strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={isInView ? { pathLength: 1, opacity: 0.5 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        ))}

        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', delay: 0.2 }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        >
          <rect x={center - 26} y={center - 26} width={52} height={52} rx={13} fill="var(--card-bg)" stroke="var(--accent-blue)" strokeWidth={2} />
          <g transform={`translate(${center - 11}, ${center - 11})`}>
            <rect x="2" y="5" width="18" height="13" rx="2" fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} />
            <path d="M6 5V3.5a5 5 0 0 1 10 0V5" fill="none" stroke="var(--accent-blue)" strokeWidth={1.5} />
          </g>
        </motion.g>

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
              <rect x={pos.x - 17} y={pos.y - 17} width={34} height={34} rx={9} fill={f.color} />
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize="11" fontWeight="700" fontFamily="var(--font-sans), system-ui, sans-serif">
                {f.share}
              </text>
              <text x={pos.x} y={pos.y + 28} textAnchor="middle" fill="var(--foreground-muted)" fontSize="9" fontWeight="500" fontFamily="var(--font-sans), system-ui, sans-serif">
                @{f.name.toLowerCase()}
              </text>
            </motion.g>
          )
        })}

        {isInView && founders.map((f, fi) => {
          const pos = nodePositions[fi]
          return Array.from({ length: 3 }).map((_, pi) => (
            <motion.circle
              key={`p-${fi}-${pi}`}
              r={2.5}
              fill={f.color}
              initial={{ cx: pos.x, cy: pos.y, opacity: 0 }}
              animate={{ cx: [pos.x, center], cy: [pos.y, center], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2, delay: 1 + pi * 0.6 + fi * 0.3, repeat: Infinity, repeatDelay: 1, ease: 'easeInOut' }}
            />
          ))
        })}
      </svg>
    </div>
  )
}

/* ================================================================== */
/*  GovernanceDemo                                                     */
/* ================================================================== */

function GovernanceDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-60px' })
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isInView) return
    const interval = setInterval(() => setStep((prev) => (prev + 1) % 4), 2500)
    return () => clearInterval(interval)
  }, [isInView])

  const demoSteps = [
    { label: 'Proposal Created', detail: 'Withdraw 0.1 ETH for hosting', progress: 0 },
    { label: '@daniel voted For', detail: '50 / 51 needed', progress: 50 },
    { label: '@alex voted For', detail: '80 / 51 needed', progress: 80 },
    { label: 'Proposal Passed', detail: 'Executing withdrawal...', progress: 100 },
  ]

  return (
    <div ref={ref} className="flex flex-col justify-center h-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono" style={{ color: 'var(--foreground-light)' }}>LIVE DEMO</span>
        <motion.div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--foreground)' }}>{demoSteps[step].label}</p>
          <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>{demoSteps[step].detail}</p>

          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: demoSteps[step].progress >= 100 ? '#22C55E' : 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
              initial={{ width: 0 }}
              animate={{ width: `${demoSteps[step].progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          <div className="relative mt-1">
            <div className="absolute left-[51%] -top-[10px] w-px h-[10px]" style={{ background: 'var(--foreground-light)' }} />
            <span className="absolute left-[51%] -translate-x-1/2 text-[9px]" style={{ color: 'var(--foreground-light)' }}>51%</span>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-1 mt-5">
        {demoSteps.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 rounded-full transition-colors duration-300" style={{ background: i <= step ? 'var(--foreground)' : 'var(--border)' }} />
        ))}
      </div>
    </div>
  )
}

/* ================================================================== */
/*  TransferVisual                                                     */
/* ================================================================== */

function TransferVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: false, margin: '-60px' })

  const w = 260
  const h = 200
  const walletA = { x: 50, y: 100 }
  const walletB = { x: 210, y: 100 }

  return (
    <div ref={ref} className="flex justify-center items-center h-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full max-w-[260px]">
        {/* Connection line */}
        <motion.line
          x1={walletA.x + 28} y1={walletA.y} x2={walletB.x - 28} y2={walletB.y}
          stroke="var(--border)" strokeWidth={1} strokeDasharray="6 4"
          initial={{ pathLength: 0 }} animate={isInView ? { pathLength: 1 } : {}} transition={{ duration: 0.8, delay: 0.3 }}
        />

        {/* Arrow indicator */}
        <motion.polygon
          points={`${w / 2 + 8},${100 - 4} ${w / 2 + 16},${100} ${w / 2 + 8},${100 + 4}`}
          fill="var(--accent-blue)"
          initial={{ opacity: 0 }} animate={isInView ? { opacity: [0, 1, 0.6, 1] } : {}} transition={{ duration: 1.5, delay: 0.8, repeat: Infinity }}
        />

        {/* Wallet A */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.1, type: 'spring' }}
          style={{ transformOrigin: `${walletA.x}px ${walletA.y}px` }}
        >
          <rect x={walletA.x - 26} y={walletA.y - 26} width={52} height={52} rx={14} fill="var(--card-bg)" stroke="var(--accent-blue)" strokeWidth={1.5} />
          <text x={walletA.x} y={walletA.y + 2} textAnchor="middle" dominantBaseline="central" fill="var(--accent-blue)" fontSize="16" fontWeight="700">A</text>
          <text x={walletA.x} y={walletA.y + 42} textAnchor="middle" fill="var(--foreground-muted)" fontSize="9">Seller</text>
        </motion.g>

        {/* Wallet B */}
        <motion.g
          initial={{ opacity: 0, scale: 0 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.2, type: 'spring' }}
          style={{ transformOrigin: `${walletB.x}px ${walletB.y}px` }}
        >
          <rect x={walletB.x - 26} y={walletB.y - 26} width={52} height={52} rx={14} fill="var(--card-bg)" stroke="var(--accent-cyan)" strokeWidth={1.5} />
          <text x={walletB.x} y={walletB.y + 2} textAnchor="middle" dominantBaseline="central" fill="var(--accent-cyan)" fontSize="16" fontWeight="700">B</text>
          <text x={walletB.x} y={walletB.y + 42} textAnchor="middle" fill="var(--foreground-muted)" fontSize="9">Buyer</text>
        </motion.g>

        {/* Animated token particles */}
        {isInView && Array.from({ length: 4 }).map((_, i) => (
          <motion.circle
            key={`t-${i}`}
            r={3}
            fill="var(--accent-blue)"
            initial={{ cx: walletA.x + 28, cy: walletA.y, opacity: 0 }}
            animate={{ cx: [walletA.x + 28, walletB.x - 28], cy: [walletA.y, walletB.y], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, delay: 0.5 + i * 0.4, repeat: Infinity, repeatDelay: 0.6, ease: 'easeInOut' }}
          />
        ))}

        {/* Status label */}
        <motion.text
          x={w / 2} y={55} textAnchor="middle" fill="var(--foreground-muted)" fontSize="10" fontWeight="500"
          fontFamily="var(--font-sans), system-ui, sans-serif"
          initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ delay: 0.6 }}
        >
          Share Transfer
        </motion.text>
      </svg>
    </div>
  )
}

/* ================================================================== */
/*  FeatureVisual — renders the right visual for each feature          */
/* ================================================================== */

function FeatureVisual({ feature }: { feature: ShowcaseFeature }) {
  switch (feature.visual) {
    case 'phone':
      return feature.phoneScreen ? (
        <IPhoneMockup screen={feature.phoneScreen} />
      ) : null
    case 'pie-chart':
      return (
        <div className="p-4 rounded-2xl h-[320px] lg:h-[380px] flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
          <AnimatedPieChart />
        </div>
      )
    case 'token-flow':
      return (
        <div className="p-4 rounded-2xl h-[320px] lg:h-[380px] flex flex-col" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
          <p className="text-xs font-mono mb-2" style={{ color: 'var(--foreground-light)' }}>TREASURY FLOW</p>
          <div className="flex-1 flex items-center">
            <TokenFlowAnimation />
          </div>
        </div>
      )
    case 'governance':
      return (
        <div className="p-6 rounded-2xl h-[320px] lg:h-[380px] flex flex-col justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
          <GovernanceDemo />
        </div>
      )
    case 'transfer-visual':
      return (
        <div className="p-4 rounded-2xl h-[320px] lg:h-[380px] flex items-center justify-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}>
          <TransferVisual />
        </div>
      )
    default:
      return null
  }
}

/* ================================================================== */
/*  SlideNavigation — dots + arrows + progress bar                     */
/* ================================================================== */

function SlideNavigation({
  total,
  activeIndex,
  onPrev,
  onNext,
  onDot,
  progress,
}: {
  total: number
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  onDot: (i: number) => void
  progress: number
}) {
  return (
    <div className="flex flex-col gap-3 mt-8">
      {/* Dots + arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => onDot(i)}
              className="relative p-1"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i === activeIndex ? 'var(--foreground)' : 'var(--border)',
                  transform: i === activeIndex ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 3L5 7L9 11" />
            </svg>
          </button>
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
            aria-label="Next slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 3L9 7L5 11" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Main Showcase Component                                            */
/* ================================================================== */

const SLIDE_DURATION = 5000 // 5 seconds per slide

export function Showcase() {
  const [category, setCategory] = useState<ShowcaseCategory>('personal')
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1) // 1 = forward, -1 = backward
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())

  const features = allFeatures[category]
  const activeFeature = features[activeIndex]

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    startTimeRef.current = Date.now()
    setProgress(0)

    timerRef.current = setInterval(() => {
      if (isPaused) return
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        setSlideDirection(1)
        setActiveIndex((prev) => (prev + 1) % features.length)
        startTimeRef.current = Date.now()
        setProgress(0)
      }
    }, 50)
  }, [isPaused, features.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  // When paused, stop the timer progress
  useEffect(() => {
    if (!isPaused) {
      startTimeRef.current = Date.now() - (progress / 100) * SLIDE_DURATION
    }
  }, [isPaused, progress])

  // Reset on category change
  const switchCategory = (cat: ShowcaseCategory) => {
    if (cat === category) return
    setCategory(cat)
    setActiveIndex(0)
    setSlideDirection(1)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const goToSlide = (index: number) => {
    setSlideDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const goPrev = () => {
    setSlideDirection(-1)
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const goNext = () => {
    setSlideDirection(1)
    setActiveIndex((prev) => (prev + 1) % features.length)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.97,
    }),
  }

  return (
    <section
      id="showcase"
      className="relative min-h-screen flex items-center py-24 lg:py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <SpotlightGrid />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            Features
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-4">
            <GlitchText delay={0.3} glitchIntensity="medium" style={{ color: 'var(--foreground)' }}>
              Everything You Need
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-12 [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
            Personal wallet features and business tools, all in one app.
          </p>
        </FadeIn>

        {/* Category Tabs */}
        <FadeIn delay={0.3}>
          <div className="flex justify-center mb-12 lg:mb-16">
            <div className="relative flex rounded-full p-1" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              {(['personal', 'business'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => switchCategory(cat)}
                  className="relative z-10 px-6 py-2.5 text-sm font-semibold rounded-full transition-colors duration-300"
                  style={{ color: category === cat ? 'var(--background)' : 'var(--foreground-muted)' }}
                >
                  {cat === 'personal' ? 'Personal Wallet' : 'Business Wallet'}
                </button>
              ))}

              {/* Animated pill */}
              <motion.div
                className="absolute top-1 bottom-1 rounded-full"
                style={{ background: 'var(--foreground)' }}
                animate={{
                  left: category === 'personal' ? '4px' : '50%',
                  right: category === 'personal' ? '50%' : '4px',
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            </div>
          </div>
        </FadeIn>

        {/* Slide Content */}
        <div className="relative max-w-6xl mx-auto">
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={`${category}-${activeIndex}`}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
              className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
            >
              {/* Left: Text content */}
              <div className="order-2 lg:order-1">
                <div className="mb-2">
                  <span className="text-xs font-mono tracking-wider" style={{ color: 'var(--accent-blue)' }}>
                    {String(activeIndex + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                  {activeFeature.title}
                </h3>

                <p className="text-base lg:text-lg mb-8 leading-relaxed [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
                  {activeFeature.description}
                </p>

                {/* Detail bullets */}
                <div className="space-y-3">
                  {activeFeature.details.map((detail, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-blue)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {detail}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Visual */}
              <div className="order-1 lg:order-2 flex justify-center">
                <FeatureVisual feature={activeFeature} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <SlideNavigation
            total={features.length}
            activeIndex={activeIndex}
            onPrev={goPrev}
            onNext={goNext}
            onDot={goToSlide}
            progress={progress}
          />
        </div>
      </div>
    </section>
  )
}
