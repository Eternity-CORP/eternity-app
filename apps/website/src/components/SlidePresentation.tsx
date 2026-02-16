'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useWarp } from '@/components/animations/WarpTransition'
import { useTheme } from '@/context/ThemeContext'
import { shardProgress } from '@/lib/shardProgress'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TOTAL_CHECKPOINTS = 8 // must match checkpoints[] in ShardScene
const TRANSITION_COOLDOWN = 800 // ms between slide switches
const WHEEL_THRESHOLD = 30 // minimum delta to trigger switch

/* ------------------------------------------------------------------ */
/*  Slide definitions                                                  */
/* ------------------------------------------------------------------ */

interface Slide {
  id: string
  menuLabel: string
  tag: string
  title: string
  description: string
  bullets?: { label: string; text: string }[]
}

const slides: Slide[] = [
  {
    id: 'hero',
    menuLabel: 'Home',
    tag: 'Welcome',
    title: 'The AI-Native\nCrypto Wallet',
    description: 'Send crypto like a text message. Just type a name and hit send.',
  },
  {
    id: 'problem',
    menuLabel: 'Problem',
    tag: 'The Problem',
    title: "Crypto wasn't built\nfor humans",
    description: 'It was built for machines. We rebuilt it with AI.',
    bullets: [
      { label: '01 Complexity', text: 'Wallet addresses, gas fees, network selection — each step is a potential mistake.' },
      { label: '02 Fear', text: 'One wrong character, one wrong network. Funds gone forever.' },
      { label: '03 Exclusion', text: '8 billion people, 500 million users. The gap is experience.' },
    ],
  },
  {
    id: 'solution',
    menuLabel: 'Solution',
    tag: 'The Solution',
    title: 'AI-Native\nby Design',
    description: 'Intelligence built into every layer.',
    bullets: [
      { label: 'BLIK Codes', text: '6 digits instead of 42. Share a code, receive money.' },
      { label: 'Network Abstraction', text: 'See "USDC", not "USDC (Polygon)". We handle complexity.' },
      { label: 'SHARD Identity', text: 'Your passport becomes your crypto identity.' },
      { label: 'AI Agent', text: 'Natural language commands. "Send 0.01 ETH to @alex".' },
    ],
  },
  {
    id: 'features',
    menuLabel: 'Features',
    tag: 'Features',
    title: 'Available\nNow',
    description: 'Already working. Ready to try.',
    bullets: [
      { label: 'BLIK Codes', text: 'Share a 6-digit code and money arrives in seconds.' },
      { label: '@username', text: 'Send to @alex instead of 0x7f3a...9b2c.' },
      { label: 'AI Agent', text: 'Talk to your wallet in plain language.' },
      { label: 'Token Balances', text: 'All tokens in one place with real-time prices.' },
    ],
  },
  {
    id: 'business',
    menuLabel: 'Business',
    tag: 'New Feature',
    title: 'Your Business,\nOn-Chain',
    description: 'Tokenize ownership, govern collectively, and transfer shares — all from your wallet.',
    bullets: [
      { label: 'Tokenized Equity', text: 'ERC-20 tokens representing ownership shares.' },
      { label: 'Shared Treasury', text: 'Collective control through governance voting.' },
      { label: 'Governance', text: 'Proposals, weighted votes, automatic execution.' },
      { label: 'Smart Transfers', text: 'Configurable share transfer policies.' },
    ],
  },
  {
    id: 'roadmap',
    menuLabel: 'Roadmap',
    tag: 'Roadmap',
    title: 'Our\nJourney',
    description: 'Building the future, step by step.',
    bullets: [
      { label: 'Q1 2026 — MVP', text: 'Core wallet, BLIK codes, AI agent, multi-chain.' },
      { label: 'Q2 2026 — Expansion', text: 'Network abstraction, cross-chain swaps, fiat on-ramp.' },
      { label: 'Q3 2026 — Identity', text: 'SHARD Identity, Proof of Personhood, privacy KYC.' },
      { label: 'Q4 2026 — Scale', text: 'Mobile app launch, advanced AI, institutional features.' },
    ],
  },
  {
    id: 'cta',
    menuLabel: 'Join Us',
    tag: 'Join Us',
    title: 'Experience\nAI-Native Crypto',
    description: 'Join the waitlist for early access.',
  },
]

/* ------------------------------------------------------------------ */
/*  Phone Frame                                                        */
/* ------------------------------------------------------------------ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="relative mx-auto flex-shrink-0"
      style={{ width: 260, height: 530 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Outer frame */}
      <div className="absolute inset-0 rounded-[44px] bg-gradient-to-b from-gray-800 to-gray-900 p-[3px]">
        <div className="w-full h-full rounded-[41px] bg-gradient-to-b from-gray-700 to-gray-800 p-[2px]">
          <div className="w-full h-full rounded-[39px] overflow-hidden relative bg-black">
            {/* Dynamic Island */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 z-20">
              <div className="w-24 h-7 rounded-full flex items-center justify-center gap-2 bg-black">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-800" />
                <div className="w-8 h-3 rounded-full bg-gray-900" />
              </div>
            </div>
            {/* Screen */}
            <div className="w-full h-full rounded-[39px] overflow-hidden bg-white">
              {children}
              {/* Home indicator */}
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                <div className="w-28 h-1 rounded-full bg-black/20" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Side buttons */}
      <div className="absolute -left-[2px] top-24 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-36 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-32 w-[3px] h-14 bg-gray-700 rounded-r-sm" />
      {/* Reflection */}
      <div className="absolute inset-0 rounded-[44px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      {/* Shadow */}
      <div className="absolute -inset-6 bg-black/20 rounded-[56px] blur-3xl -z-10" />
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Phone Screens per slide                                            */
/* ------------------------------------------------------------------ */

function HeroScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[11px] text-gray-400 mb-1">Good morning</p>
      <div className="rounded-2xl bg-gray-50 p-4 mb-4">
        <p className="text-[10px] text-gray-400 mb-1">Total Balance</p>
        <p className="text-2xl font-bold text-black">$1,234.56</p>
      </div>
      <div className="flex gap-2 mb-4">
        <div className="flex-1 bg-black text-white text-[11px] font-medium py-2 rounded-xl text-center">Send</div>
        <div className="flex-1 bg-gray-100 text-black text-[11px] font-medium py-2 rounded-xl text-center">Receive</div>
      </div>
      <div className="space-y-2.5">
        {[
          { name: 'ETH', amount: '$890.32', change: '+2.4%', color: '#627EEA' },
          { name: 'USDC', amount: '$344.24', change: '+0.01%', color: '#2775CA' },
          { name: 'USDT', amount: '$0.00', change: '0%', color: '#26A17B' },
        ].map((t) => (
          <div key={t.name} className="flex items-center justify-between py-2 border-b border-gray-50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold" style={{ background: t.color }}>
                {t.name[0]}
              </div>
              <span className="text-[12px] font-medium text-black">{t.name}</span>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-medium text-black">{t.amount}</p>
              <p className="text-[9px] text-gray-400">{t.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProblemScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[13px] font-semibold text-black text-center mb-4">Send Transaction</p>
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 mb-1">To Address</p>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 font-mono text-[11px] text-black truncate">
          0x7f3a8B2c4D9e1F6a3C5b7E0d2A8f4B6c9D4e9
        </div>
      </div>
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 mb-1">Network</p>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-black">Ethereum Mainnet</span>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mb-3 flex items-center gap-2">
        <span className="text-red-500 text-[11px]">&#9888;</span>
        <span className="text-[10px] text-red-600">Wrong network may result in permanent loss</span>
      </div>
      <div className="mb-4">
        <p className="text-[10px] text-gray-400 mb-1">Gas Fee</p>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-black">0.0043 ETH</span>
          <span className="text-[10px] text-red-500 font-medium">$12.80</span>
        </div>
      </div>
      <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
        <span className="text-orange-500 text-[11px]">&#9888;</span>
        <span className="text-[10px] text-orange-600">Unusually high gas fee</span>
      </div>
    </div>
  )
}

function SolutionScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[13px] font-semibold text-black text-center mb-4">Send</p>
      <div className="mb-3">
        <p className="text-[10px] text-gray-400 mb-1">To</p>
        <div className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-[12px] font-medium text-black">@alex</span>
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-[10px] text-gray-400 mb-1">Amount</p>
        <div className="bg-gray-50 rounded-xl px-3 py-4 text-center">
          <span className="text-2xl font-bold text-black">0.01 ETH</span>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {[
          { icon: '&#10003;', text: 'Best route selected', color: 'text-green-600' },
          { icon: '&#10003;', text: 'Fee: $0.02', color: 'text-green-600' },
          { icon: '&#10003;', text: 'Network: auto-detected', color: 'text-green-600' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={`text-[11px] ${item.color}`} dangerouslySetInnerHTML={{ __html: item.icon }} />
            <span className="text-[11px] text-gray-600">{item.text}</span>
          </div>
        ))}
      </div>
      <div className="mt-auto mb-8">
        <div className="bg-black text-white text-[12px] font-semibold py-3 rounded-2xl text-center">
          Send
        </div>
      </div>
    </div>
  )
}

function FeaturesScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[13px] font-semibold text-black text-center mb-4">BLIK Code</p>
      <div className="rounded-2xl bg-gray-50 p-5 mb-4 text-center">
        <p className="text-3xl font-bold tracking-[0.15em] text-black mb-3">847 291</p>
        <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 mb-1.5">
          <motion.div
            className="h-full rounded-full bg-black"
            animate={{ width: ['100%', '0%'] }}
            transition={{ duration: 120, ease: 'linear', repeat: Infinity }}
          />
        </div>
        <p className="text-[10px] text-gray-400">Expires in 1:42</p>
      </div>
      <div className="space-y-2.5">
        {['2-minute expiry for security', 'Real-time matching system', 'Zero chance of mistakes', 'Works cross-chain'].map((text, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-white border border-gray-100 rounded-xl px-3 py-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" />
            <span className="text-[11px] text-gray-600">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BusinessScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[13px] font-semibold text-black text-center mb-1">ACME Business</p>
      <p className="text-[10px] text-gray-400 text-center mb-3">$ACME</p>
      <div className="rounded-2xl bg-gray-50 p-3 mb-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-gray-400">Treasury</p>
          <p className="text-[14px] font-bold text-black">2.5 ETH</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Proposals</p>
          <p className="text-[14px] font-bold text-black">3</p>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mb-2">Shareholders</p>
      <div className="space-y-2 mb-3">
        {[
          { name: '@daniel', share: 50, color: '#3388FF' },
          { name: '@alex', share: 30, color: '#00E5FF' },
          { name: '@maria', share: 20, color: '#22C55E' },
        ].map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold" style={{ background: s.color }}>
              {s.name[1].toUpperCase()}
            </div>
            <span className="text-[11px] text-black flex-1">{s.name}</span>
            <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${s.share}%`, background: s.color }} />
            </div>
            <span className="text-[10px] text-gray-500 w-8 text-right">{s.share}%</span>
          </div>
        ))}
      </div>
      <div className="mt-auto mb-8">
        <div className="bg-black text-white text-[11px] font-medium py-2.5 rounded-xl text-center">
          Create Proposal
        </div>
      </div>
    </div>
  )
}

function RoadmapScreen() {
  const milestones = [
    { q: 'Q1 2026', title: 'MVP + AI Agent', done: true },
    { q: 'Q2 2026', title: 'Expansion', done: false },
    { q: 'Q3 2026', title: 'Identity', done: false },
    { q: 'Q4 2026', title: 'Scale', done: false },
  ]
  return (
    <div className="h-full flex flex-col pt-12 px-5">
      <p className="text-[13px] font-semibold text-black text-center mb-5">Our Journey</p>
      <div className="relative pl-6">
        {/* Vertical line */}
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gray-200" />
        <div className="space-y-5">
          {milestones.map((m, i) => (
            <div key={i} className="relative">
              {/* Dot */}
              <div
                className="absolute -left-6 top-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: m.done ? '#000' : '#D1D5DB',
                  background: m.done ? '#000' : '#fff',
                }}
              >
                {m.done && (
                  <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <p className="text-[10px] text-gray-400 font-mono">{m.q}</p>
              <p className={`text-[12px] font-medium ${m.done ? 'text-black' : 'text-gray-500'}`}>{m.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CTAScreen() {
  return (
    <div className="h-full flex flex-col pt-12 px-5 items-center">
      <p className="text-[13px] font-semibold text-black text-center mb-4">Early Access</p>
      <div className="rounded-2xl bg-gray-50 p-5 mb-4 text-center w-full">
        <motion.div
          className="w-10 h-10 mx-auto mb-3 rounded-full bg-black flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </motion.div>
        <p className="text-[13px] font-semibold text-black mb-1">Coming Soon</p>
        <p className="text-[10px] text-gray-400">Be the first to experience AI-native crypto</p>
      </div>
      <div className="space-y-2 w-full">
        {['AI Financial Agent', 'SHARD Identity', 'Network Abstraction', 'Mobile App'].map((text, i) => (
          <div key={i} className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-[11px] text-gray-600">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const phoneScreens = [HeroScreen, ProblemScreen, SolutionScreen, FeaturesScreen, BusinessScreen, RoadmapScreen, CTAScreen]

/* ------------------------------------------------------------------ */
/*  Sidebar (desktop)                                                  */
/* ------------------------------------------------------------------ */

function Sidebar({
  activeIndex,
  onNavigate,
}: {
  activeIndex: number
  onNavigate: (index: number) => void
}) {
  return (
    <nav className="hidden lg:flex flex-col justify-center gap-1 w-48 flex-shrink-0 pl-6">
      {slides.map((slide, i) => {
        const isActive = i === activeIndex
        const isPast = i < activeIndex
        return (
          <motion.button
            key={slide.id}
            onClick={() => onNavigate(i)}
            className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer"
            style={{
              background: isActive ? 'var(--foreground)' : 'transparent',
            }}
            whileHover={!isActive ? { x: 4 } : undefined}
            transition={{ duration: 0.2 }}
          >
            {/* Dot indicator */}
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300"
              style={{
                background: isActive ? 'var(--background)' : isPast ? 'var(--foreground)' : 'var(--border)',
              }}
            />
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{
                color: isActive ? 'var(--background)' : isPast ? 'var(--foreground)' : 'var(--foreground-muted)',
              }}
            >
              {slide.menuLabel}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Dot Navigation (mobile)                                            */
/* ------------------------------------------------------------------ */

function DotNav({
  activeIndex,
  onNavigate,
}: {
  activeIndex: number
  onNavigate: (index: number) => void
}) {
  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass">
      {slides.map((_, i) => (
        <button
          key={i}
          onClick={() => onNavigate(i)}
          className="relative p-1"
        >
          <motion.div
            className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{
              background: i === activeIndex ? 'var(--foreground)' : 'var(--border)',
            }}
            animate={i === activeIndex ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={i === activeIndex ? { duration: 1.5, repeat: Infinity } : {}}
          />
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  CTA Form (for the last slide)                                      */
/* ------------------------------------------------------------------ */

function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) { setStatus('error'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: '', isBetaTester: false }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl text-center"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--border-light)' }}
      >
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: 'var(--foreground)' }}
        >
          <svg className="w-7 h-7" style={{ color: 'var(--background)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>You're In!</h3>
        <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>We'll notify you when early access is available.</p>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
        placeholder="Enter your email"
        className="w-full px-4 py-3 rounded-xl outline-none text-sm"
        style={{
          background: 'var(--input-bg)',
          border: status === 'error' ? '1px solid #EF4444' : '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      />
      <Button type="submit" variant="primary" size="md" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </Button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Slide Content (right panel)                                        */
/* ------------------------------------------------------------------ */

function SlideContent({ slide, index }: { slide: Slide; index: number }) {
  const { startWarp } = useWarp()
  const isHero = index === 0
  const isCTA = index === slides.length - 1

  return (
    <div className="flex flex-col justify-center">
      {/* Tag */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xs font-medium tracking-widest uppercase mb-3"
        style={{ color: 'var(--foreground-muted)' }}
      >
        {slide.tag}
      </motion.p>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 whitespace-pre-line leading-tight"
        style={{ color: 'var(--foreground)' }}
      >
        {slide.title}
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-base md:text-lg mb-6 max-w-md"
        style={{ color: 'var(--foreground-muted)' }}
      >
        {slide.description}
      </motion.p>

      {/* Bullets */}
      {slide.bullets && (
        <div className="space-y-3 mb-6">
          {slide.bullets.map((bullet, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.08 }}
              className="flex items-start gap-3"
            >
              <div
                className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                style={{ background: 'var(--accent-blue)' }}
              />
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                  {bullet.label}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--foreground-muted)' }}>
                  — {bullet.text}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Hero CTA */}
      {isHero && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Button variant="primary" size="lg" onClick={startWarp}>
            Launch App
          </Button>
        </motion.div>
      )}

      {/* CTA Form */}
      {isCTA && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-sm"
        >
          <WaitlistForm />
        </motion.div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress indicator                                                 */
/* ------------------------------------------------------------------ */

function SlideProgress({ activeIndex }: { activeIndex: number }) {
  const progress = ((activeIndex + 1) / slides.length) * 100
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'var(--border-light)' }}>
      <motion.div
        className="h-full"
        style={{ background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main SlidePresentation                                             */
/* ------------------------------------------------------------------ */

export function SlidePresentation() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(0)
  const isTransitioning = useRef(false)
  const touchStartY = useRef(0)
  const { isDark } = useTheme()
  const { startWarp } = useWarp()

  // Navigate to a slide
  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= slides.length) return
    if (isTransitioning.current) return
    isTransitioning.current = true
    setTimeout(() => { isTransitioning.current = false }, TRANSITION_COOLDOWN)
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }, [activeIndex])

  // Update shard progress with smooth lerp
  useEffect(() => {
    const target = activeIndex / (TOTAL_CHECKPOINTS - 1)
    let frame: number
    const animate = () => {
      const diff = target - shardProgress.current
      if (Math.abs(diff) < 0.001) {
        shardProgress.current = target
        return
      }
      shardProgress.current += diff * 0.06
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [activeIndex])

  // Wheel handler
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Don't hijack wheel if user is interacting with a form input
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      e.preventDefault()
      if (isTransitioning.current) return
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return

      if (e.deltaY > 0) {
        navigateTo(activeIndex + 1)
      } else {
        navigateTo(activeIndex - 1)
      }
    }

    window.addEventListener('wheel', handleWheel, { passive: false })
    return () => window.removeEventListener('wheel', handleWheel)
  }, [activeIndex, navigateTo])

  // Touch handler
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
    }
    const handleTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(delta) < 50) return
      if (delta > 0) navigateTo(activeIndex + 1)
      else navigateTo(activeIndex - 1)
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [activeIndex, navigateTo])

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        navigateTo(activeIndex + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        navigateTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, navigateTo])

  const PhoneScreen = phoneScreens[activeIndex]

  return (
    <div className="h-screen w-screen overflow-hidden relative theme-transition" style={{ background: 'var(--background)' }}>
      {/* Background patterns */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={isDark ? '/images/logo_white.svg' : '/images/logo.svg'}
            alt="Eternity"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Eternity</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={startWarp} className="hidden sm:inline-flex">
            Launch App
          </Button>
        </div>
      </header>

      {/* Main layout */}
      <div className="h-full flex items-stretch pt-16 pb-4">
        {/* Sidebar */}
        <Sidebar activeIndex={activeIndex} onNavigate={navigateTo} />

        {/* Content area */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-12">
          <div className="grid lg:grid-cols-[auto_1fr] gap-8 lg:gap-16 items-center max-w-5xl w-full">
            {/* Phone mockup */}
            <div className="flex justify-center lg:justify-end">
              <PhoneFrame>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    className="h-full"
                    initial={{ opacity: 0, x: direction >= 0 ? 30 : -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction >= 0 ? -30 : 30 }}
                    transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                  >
                    <PhoneScreen />
                  </motion.div>
                </AnimatePresence>
              </PhoneFrame>
            </div>

            {/* Text content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIndex}
                initial={{ opacity: 0, y: direction >= 0 ? 30 : -30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction >= 0 ? -30 : 30 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <SlideContent slide={slides[activeIndex]} index={activeIndex} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Dot nav (mobile) */}
      <DotNav activeIndex={activeIndex} onNavigate={navigateTo} />

      {/* Progress bar */}
      <SlideProgress activeIndex={activeIndex} />

      {/* Slide counter */}
      <div className="absolute bottom-4 right-6 z-40 hidden lg:block">
        <span className="text-xs font-mono" style={{ color: 'var(--foreground-light)' }}>
          {String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </div>

      {/* Keyboard hint */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 hidden lg:flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeIndex === 0 ? 1 : 0 }}
        transition={{ delay: 2 }}
      >
        <span className="text-[10px]" style={{ color: 'var(--foreground-light)' }}>Scroll or use</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--foreground-muted)' }}>
          ↑↓
        </kbd>
      </motion.div>
    </div>
  )
}
