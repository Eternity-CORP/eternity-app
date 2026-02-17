// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Image from 'next/image'
import Link from 'next/link'
import * as THREE from 'three'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useWarp } from '@/components/animations/WarpTransition'
import { useTheme } from '@/context/ThemeContext'
import { MorphSphere } from '@/components/3d/MorphSphere'
import type { MorphCtrl } from '@/components/3d/MorphSphere'

/* ---------------------------------------------------------- */
/*  Constants                                                  */
/* ---------------------------------------------------------- */

const SECTIONS = 7
const TRANSITION_MS = 800
const WHEEL_THRESHOLD = 30

const SECTION_LABELS = ['Home', 'Problem', 'Solution', 'Features', 'Business', 'Roadmap', 'Join Us']

/* ---------------------------------------------------------- */
/*  Section content data                                       */
/* ---------------------------------------------------------- */

const SECTION_CONTENT = [
  {
    tag: 'Welcome',
    title: 'The AI-Native\nCrypto Wallet',
    description: 'Send crypto like a text message. No complex addresses, no network confusion — just simple, human-friendly transfers powered by AI.',
    features: null,
  },
  {
    tag: 'The Problem',
    title: 'Crypto Was Built\nfor Machines',
    description: 'Long hex addresses, dozens of networks, confusing interfaces. One wrong character means lost funds forever.',
    features: [
      { label: '0x7f3a8B2c...', text: 'Complex addresses nobody can remember' },
      { label: '50+ Networks', text: 'Which chain are your tokens on?' },
      { label: '8B vs 500M', text: '8 billion people, only 500M use crypto' },
    ],
  },
  {
    tag: 'The Solution',
    title: 'AI-Native\nby Design',
    description: 'We rebuilt the wallet experience from scratch. AI handles the complexity so you don\'t have to.',
    features: [
      { label: 'BLIK Codes', text: '6-digit code to send and receive — like cash' },
      { label: '@username', text: 'Send to anyone by nickname, not hex' },
      { label: 'Auto Network', text: 'See USDC, not "USDC on Polygon"' },
      { label: 'AI Agent', text: '"Send 0.01 ETH to Alex" — done' },
    ],
  },
  {
    tag: 'Features',
    title: 'Try It\nRight Now',
    description: 'Not a roadmap promise — these features are live today.',
    features: [
      { label: 'BLIK Payments', text: 'Generate a 6-digit code, share it, get paid' },
      { label: 'AI Commands', text: 'Natural language transactions' },
      { label: 'Multi-Token', text: 'ETH, USDC, USDT — all in one view' },
    ],
  },
  {
    tag: 'New Feature',
    title: 'Your Business,\nOn-Chain',
    description: 'Create a business wallet with shareholders, treasury, and governance — all transparent on the blockchain.',
    features: [
      { label: 'Treasury', text: 'Shared funds managed by vote' },
      { label: 'Shareholders', text: 'Token-based ownership shares' },
      { label: 'Governance', text: 'Proposals and voting on-chain' },
    ],
  },
  {
    tag: 'Roadmap',
    title: 'Where We\'re\nGoing',
    description: 'Building the future of human-friendly crypto, one milestone at a time.',
    features: [
      { label: 'Q1 2026', text: 'MVP + AI Agent — Live now' },
      { label: 'Q2 2026', text: 'Multi-chain expansion' },
      { label: 'Q3 2026', text: 'Decentralized identity (SHARD)' },
      { label: 'Q4 2026', text: 'Scale & partnerships' },
    ],
  },
  {
    tag: 'Early Access',
    title: 'Experience\nAI-Native Crypto',
    description: 'Be among the first to try a wallet that actually makes sense.',
    features: null,
  },
]

/* ---------------------------------------------------------- */
/*  Background Particles                                       */
/* ---------------------------------------------------------- */

function BackgroundParticles({ count = 50, isDark = false }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 25
      a[i * 3 + 1] = (Math.random() - 0.5) * 25
      a[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    return a
  }, [count])

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.006
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color={isDark ? '#fff' : '#000'}
        transparent
        opacity={isDark ? 0.2 : 0.1}
        sizeAttenuation
      />
    </points>
  )
}

/* ---------------------------------------------------------- */
/*  Canvas                                                     */
/* ---------------------------------------------------------- */

function MorphCanvas({ ctrl, isDark }: { ctrl: React.MutableRefObject<MorphCtrl>; isDark: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <Environment preset={isDark ? 'night' : 'city'} />
        <ambientLight intensity={isDark ? 0.3 : 0.5} />
        <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.8 : 1.2} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <MorphSphere ctrl={ctrl} isDark={isDark} />
        <BackgroundParticles count={50} isDark={isDark} />
      </Suspense>
    </Canvas>
  )
}

/* ---------------------------------------------------------- */
/*  Section View — clean text, no HUD                          */
/* ---------------------------------------------------------- */

function SectionView({
  index,
  visible,
  onLaunch,
}: {
  index: number
  visible: boolean
  onLaunch: () => void
}) {
  const section = SECTION_CONTENT[index]
  const isHero = index === 0
  const isCTA = index === SECTIONS - 1

  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto px-6">
      {/* Tag */}
      <motion.p
        animate={{ opacity: visible ? 0.6 : 0, y: visible ? 0 : 8 }}
        transition={{ delay: 0.05, duration: 0.3 }}
        className="text-[11px] sm:text-xs font-medium tracking-[0.25em] uppercase mb-3"
        style={{ color: 'var(--foreground-muted)' }}
      >
        {section.tag}
      </motion.p>

      {/* Title */}
      <motion.h2
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 whitespace-pre-line leading-[1.15]"
        style={{ color: 'var(--foreground)' }}
      >
        {section.title}
      </motion.h2>

      {/* Description */}
      <motion.p
        animate={{ opacity: visible ? 0.8 : 0, y: visible ? 0 : 8 }}
        transition={{ delay: 0.15, duration: 0.3 }}
        className="text-sm sm:text-base leading-relaxed mb-6 max-w-md"
        style={{ color: 'var(--foreground-muted)' }}
      >
        {section.description}
      </motion.p>

      {/* Feature cards */}
      {section.features && (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg"
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          {section.features.map((feat, i) => (
            <div
              key={i}
              className="text-left px-4 py-3 rounded-xl backdrop-blur-sm transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                {feat.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                {feat.text}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Hero CTA */}
      {isHero && (
        <motion.div
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          <Button variant="primary" size="lg" onClick={onLaunch}>
            Launch App
          </Button>
        </motion.div>
      )}

      {/* CTA waitlist */}
      {isCTA && <WaitlistForm visible={visible} />}

      {/* Scroll hint (hero only) */}
      {isHero && (
        <motion.div
          className="mt-8 flex flex-col items-center gap-1"
          animate={{ opacity: visible ? 0.5 : 0 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--foreground-light)' }}>
            Scroll to explore
          </span>
          <motion.svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ color: 'var(--foreground-light)' }}
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </motion.svg>
        </motion.div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Waitlist form (CTA section)                                */
/* ---------------------------------------------------------- */

function WaitlistForm({ visible }: { visible: boolean }) {
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
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <div
          className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <svg className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>You're in!</p>
      </motion.div>
    )
  }

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto w-full"
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ delay: 0.3 }}
    >
      <input
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
        placeholder="Enter your email"
        className="flex-1 px-4 py-2.5 rounded-xl outline-none text-sm backdrop-blur-sm"
        style={{
          background: 'var(--surface)',
          border: status === 'error' ? '1px solid #EF4444' : '1px solid var(--border)',
          color: 'var(--foreground)',
        }}
      />
      <Button type="submit" variant="primary" size="sm" disabled={status === 'loading'}>
        {status === 'loading' ? '...' : 'Join Waitlist'}
      </Button>
    </motion.form>
  )
}

/* ---------------------------------------------------------- */
/*  Sidebar (desktop)                                          */
/* ---------------------------------------------------------- */

function Sidebar({ activeIndex, onNavigate }: { activeIndex: number; onNavigate: (i: number) => void }) {
  return (
    <nav className="hidden lg:flex flex-col justify-center gap-1 fixed left-0 top-0 bottom-0 w-48 pl-6 z-20">
      {SECTION_LABELS.map((label, i) => {
        const active = i === activeIndex
        const past = i < activeIndex
        return (
          <motion.button
            key={label}
            onClick={() => onNavigate(i)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
            style={{ background: active ? 'var(--foreground)' : 'transparent' }}
            whileHover={!active ? { x: 4 } : undefined}
            transition={{ duration: 0.2 }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300"
              style={{ background: active ? 'var(--background)' : past ? 'var(--foreground)' : 'var(--border)' }}
            />
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: active ? 'var(--background)' : past ? 'var(--foreground)' : 'var(--foreground-muted)' }}
            >
              {label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}

/* ---------------------------------------------------------- */
/*  Dot nav (mobile)                                           */
/* ---------------------------------------------------------- */

function DotNav({ activeIndex, onNavigate }: { activeIndex: number; onNavigate: (i: number) => void }) {
  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {SECTION_LABELS.map((_, i) => (
        <button key={i} onClick={() => onNavigate(i)} className="p-1">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: i === activeIndex ? 'var(--foreground)' : 'var(--border)' }}
            animate={i === activeIndex ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={i === activeIndex ? { duration: 1.5, repeat: Infinity } : {}}
          />
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Progress bar                                               */
/* ---------------------------------------------------------- */

function SlideProgress({ activeIndex }: { activeIndex: number }) {
  const pct = ((activeIndex + 1) / SECTIONS) * 100
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[2px] z-50" style={{ background: 'var(--border-light)' }}>
      <motion.div
        className="h-full"
        style={{ background: 'var(--foreground)' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Main                                                       */
/* ---------------------------------------------------------- */

export function CrystalLanding() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [contentVisible, setContentVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isTransitioning = useRef(false)
  const touchStartY = useRef(0)
  const { isDark } = useTheme()
  const { startWarp } = useWarp()

  const morphCtrl = useRef<MorphCtrl>({
    targetSection: 0,
    entered: false,
    burst: 0,
  })

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    const t = setTimeout(() => setContentVisible(true), 2100)
    return () => clearTimeout(t)
  }, [])

  // CTA burst
  useEffect(() => {
    morphCtrl.current.burst = activeIndex === 6 ? 1 : 0
  }, [activeIndex])

  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= SECTIONS) return
    if (isTransitioning.current || !morphCtrl.current.entered) return
    isTransitioning.current = true

    setContentVisible(false)
    setTimeout(() => { morphCtrl.current.targetSection = index }, 150)
    setTimeout(() => { setActiveIndex(index) }, 400)
    setTimeout(() => { setContentVisible(true) }, 600)
    setTimeout(() => { isTransitioning.current = false }, TRANSITION_MS)
  }, [activeIndex])

  /* ---- Wheel ---- */
  useEffect(() => {
    const h = (e: WheelEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (isTransitioning.current || !morphCtrl.current.entered) return
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return
      navigateTo(e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('wheel', h, { passive: false })
    return () => window.removeEventListener('wheel', h)
  }, [activeIndex, navigateTo])

  /* ---- Touch ---- */
  useEffect(() => {
    const start = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const d = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(d) < 50) return
      navigateTo(d > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end) }
  }, [activeIndex, navigateTo])

  /* ---- Keyboard ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); navigateTo(activeIndex + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); navigateTo(activeIndex - 1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeIndex, navigateTo])

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--background)' }}>
      {/* Morph sphere */}
      {mounted && (
        <div className="absolute inset-0 z-[1]">
          <MorphCanvas ctrl={morphCtrl} isDark={isDark} />
        </div>
      )}

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

      {/* Content */}
      <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.3 }}
            >
              <SectionView index={activeIndex} visible={contentVisible} onLaunch={startWarp} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="transition-opacity duration-500" style={{ opacity: contentVisible ? 1 : 0 }}>
        <Sidebar activeIndex={activeIndex} onNavigate={navigateTo} />
        <DotNav activeIndex={activeIndex} onNavigate={navigateTo} />
        <SlideProgress activeIndex={activeIndex} />

        <div className="absolute bottom-4 right-6 z-40 hidden lg:block">
          <span className="text-xs font-mono" style={{ color: 'var(--foreground-light)' }}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(SECTIONS).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Keyboard hint */}
      <motion.div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 hidden lg:flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: activeIndex === 0 && contentVisible ? 1 : 0 }}
        transition={{ delay: 2 }}
      >
        <span className="text-[10px]" style={{ color: 'var(--foreground-light)' }}>Scroll or use</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--foreground-muted)' }}>↑↓</kbd>
      </motion.div>
    </div>
  )
}
