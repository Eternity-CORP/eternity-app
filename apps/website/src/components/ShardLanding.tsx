'use client'

import { Suspense, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useWarp } from '@/components/animations/WarpTransition'
import { useTheme } from '@/context/ThemeContext'
import { ShardObject } from '@/components/3d/ShardObject'
import { SectionVisual } from '@/components/sections/SectionVisuals'

/* ------------------------------------------------------------------ */
/*  Scroll progress store (shared between DOM and R3F)                  */
/* ------------------------------------------------------------------ */

const scrollStore = { progress: 0 }

/* ------------------------------------------------------------------ */
/*  Section definitions (same content as SlidePresentation)             */
/* ------------------------------------------------------------------ */

interface Section {
  id: string
  tag: string
  title: string
  description: string
  bullets?: { label: string; text: string }[]
  range: [number, number] // scroll range [start, end]
}

const sections: Section[] = [
  {
    id: 'hero',
    tag: 'Welcome',
    title: 'The AI-Native\nCrypto Wallet',
    description: 'Send crypto like a text message. Just type a name and hit send.',
    range: [0, 0.15],
  },
  {
    id: 'problem',
    tag: 'The Problem',
    title: "Crypto wasn't built\nfor humans",
    description: 'It was built for machines. We rebuilt it with AI.',
    bullets: [
      { label: '01 Complexity', text: 'Wallet addresses, gas fees, network selection — each step is a potential mistake.' },
      { label: '02 Fear', text: 'One wrong character, one wrong network. Funds gone forever.' },
      { label: '03 Exclusion', text: '8 billion people, 500 million users. The gap is experience.' },
    ],
    range: [0.15, 0.30],
  },
  {
    id: 'solution',
    tag: 'The Solution',
    title: 'AI-Native\nby Design',
    description: 'Intelligence built into every layer.',
    bullets: [
      { label: 'BLIK Codes', text: '6 digits instead of 42. Share a code, receive money.' },
      { label: 'Network Abstraction', text: 'See "USDC", not "USDC (Polygon)". We handle complexity.' },
      { label: 'SHARD Identity', text: 'Your passport becomes your crypto identity.' },
      { label: 'AI Agent', text: 'Natural language commands. "Send 0.01 ETH to @alex".' },
    ],
    range: [0.30, 0.45],
  },
  {
    id: 'features',
    tag: 'Features',
    title: 'Available\nNow',
    description: 'Already working. Ready to try.',
    bullets: [
      { label: 'BLIK Codes', text: 'Share a 6-digit code and money arrives in seconds.' },
      { label: '@username', text: 'Send to @alex instead of 0x7f3a...9b2c.' },
      { label: 'AI Agent', text: 'Talk to your wallet in plain language.' },
      { label: 'Token Balances', text: 'All tokens in one place with real-time prices.' },
    ],
    range: [0.45, 0.65],
  },
  {
    id: 'business',
    tag: 'New Feature',
    title: 'Your Business,\nOn-Chain',
    description: 'Tokenize ownership, govern collectively, and transfer shares — all from your wallet.',
    bullets: [
      { label: 'Tokenized Equity', text: 'ERC-20 tokens representing ownership shares.' },
      { label: 'Shared Treasury', text: 'Collective control through governance voting.' },
      { label: 'Governance', text: 'Proposals, weighted votes, automatic execution.' },
      { label: 'Smart Transfers', text: 'Configurable share transfer policies.' },
    ],
    range: [0.65, 0.80],
  },
  {
    id: 'roadmap',
    tag: 'Roadmap',
    title: 'Our\nJourney',
    description: 'Building the future, step by step.',
    bullets: [
      { label: 'Q1 2026 — MVP', text: 'Core wallet, BLIK codes, AI agent, multi-chain.' },
      { label: 'Q2 2026 — Expansion', text: 'Network abstraction, cross-chain swaps, fiat on-ramp.' },
      { label: 'Q3 2026 — Identity', text: 'SHARD Identity, Proof of Personhood, privacy KYC.' },
      { label: 'Q4 2026 — Scale', text: 'Mobile app launch, advanced AI, institutional features.' },
    ],
    range: [0.80, 0.90],
  },
  {
    id: 'cta',
    tag: 'Join Us',
    title: 'Experience\nAI-Native Crypto',
    description: 'Join the waitlist for early access.',
    range: [0.90, 1.0],
  },
]

/* ------------------------------------------------------------------ */
/*  Camera Controller (inside R3F Canvas)                               */
/* ------------------------------------------------------------------ */

function CameraController() {
  const { camera } = useThree()

  useFrame(() => {
    const p = scrollStore.progress

    // Camera positions at each scroll checkpoint
    // 0-15%: Far view, shard visible whole
    // 15-30%: Approaching, facets fill screen
    // 30-45%: Passing through surface
    // 45-65%: Inside void
    // 65-80%: Moving toward exit
    // 80-90%: Timeline path
    // 90-100%: Exit, two shards

    let targetZ: number
    let targetY: number
    let targetX: number

    if (p < 0.15) {
      // Far view
      const t = p / 0.15
      targetZ = 8 - t * 1.5
      targetY = 0.5 - t * 0.3
      targetX = 0
    } else if (p < 0.30) {
      // Approaching surface
      const t = (p - 0.15) / 0.15
      targetZ = 6.5 - t * 3.0
      targetY = 0.2 - t * 0.3
      targetX = t * 0.5
    } else if (p < 0.45) {
      // Passing through (close up, slight orbit)
      const t = (p - 0.30) / 0.15
      targetZ = 3.5 - t * 1.5
      targetY = -0.1 + t * 0.3
      targetX = 0.5 - t * 1.0
    } else if (p < 0.65) {
      // Inside void (orbiting slowly)
      const t = (p - 0.45) / 0.20
      targetZ = 2.0 + Math.sin(t * Math.PI) * 0.5
      targetY = 0.2 + Math.sin(t * Math.PI * 0.5) * 0.5
      targetX = -0.5 + t * 1.5
    } else if (p < 0.80) {
      // Moving toward exit
      const t = (p - 0.65) / 0.15
      targetZ = 2.5 + t * 2.0
      targetY = 0.7 - t * 0.5
      targetX = 1.0 - t * 1.0
    } else if (p < 0.90) {
      // Roadmap view
      const t = (p - 0.80) / 0.10
      targetZ = 4.5 + t * 2.0
      targetY = 0.2 + t * 0.3
      targetX = t * -0.5
    } else {
      // Exit view
      const t = (p - 0.90) / 0.10
      targetZ = 6.5 + t * 2.0
      targetY = 0.5
      targetX = -0.5 + t * 0.5
    }

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.05)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.05)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.05)
    camera.lookAt(0, 0, 0)
  })

  return null
}

/* ------------------------------------------------------------------ */
/*  Inner Void Particles (visible when "inside" the shard)              */
/* ------------------------------------------------------------------ */

function VoidParticles({ count = 80 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6
    }
    return pos
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const p = scrollStore.progress
    // Only visible when "inside" (30%-80%)
    const insideAmount = p > 0.30 && p < 0.80
      ? Math.min((p - 0.30) / 0.05, 1) * Math.min((0.80 - p) / 0.05, 1)
      : 0
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = insideAmount * 0.6
    ref.current.rotation.y = state.clock.elapsedTime * 0.05
    ref.current.rotation.x = state.clock.elapsedTime * 0.03
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#7c3aed"
        transparent
        opacity={0}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  3D Scene (full viewport background)                                 */
/* ------------------------------------------------------------------ */

function Scene() {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} color="#ffffff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.4} color="#6366f1" />
      <pointLight position={[0, 3, 2]} intensity={0.6} color="#7c3aed" distance={10} />
      <pointLight position={[0, -2, -2]} intensity={0.4} color="#3b82f6" distance={8} />
      <spotLight position={[3, 5, 3]} intensity={0.3} color="#06b6d4" angle={0.3} penumbra={0.5} />

      <CameraController />
      <ShardObject />
      <VoidParticles count={80} />

      <EffectComposer>
        <Bloom
          intensity={0.7}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette eskil={false} offset={0.3} darkness={0.6} />
      </EffectComposer>
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Waitlist Form                                                       */
/* ------------------------------------------------------------------ */

function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [isBetaTester, setIsBetaTester] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) {
      setStatus('error')
      setErrorMessage('Please enter a valid email')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message, isBetaTester }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join waitlist')
      }
      setStatus('success')
    } catch (error) {
      setStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong')
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-2xl text-center"
        style={{ background: 'rgba(20,20,20,0.6)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
      >
        <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-white">
          <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2 text-white">You're In!</h3>
        <p className="text-sm text-white/60">We'll notify you when early access is available.</p>
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
        className="w-full px-4 py-3 rounded-xl outline-none text-sm text-white placeholder-white/40"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: status === 'error' ? '1px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
      />
      {status === 'error' && (
        <p className="text-red-400 text-sm">{errorMessage}</p>
      )}
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Any feedback? (optional)"
        rows={2}
        className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none text-white placeholder-white/40"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
        }}
      />
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isBetaTester}
          onChange={(e) => setIsBetaTester(e.target.checked)}
          className="sr-only"
        />
        <div
          className="w-5 h-5 rounded flex items-center justify-center transition-colors"
          style={{
            background: isBetaTester ? '#fff' : 'transparent',
            border: isBetaTester ? 'none' : '1px solid rgba(255,255,255,0.2)',
          }}
        >
          {isBetaTester && (
            <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="text-sm text-white/60">I want to be a beta tester</span>
      </label>
      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
      </Button>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Section Content Overlay                                             */
/* ------------------------------------------------------------------ */

function SectionOverlay({ section, isActive, index }: { section: Section; isActive: boolean; index: number }) {
  const { startWarp } = useWarp()
  const isHero = index === 0
  const isCTA = index === sections.length - 1
  const textOnLeft = index % 2 === 0
  const hasVisual = !isHero && !isCTA

  return (
    <motion.div
      className="absolute inset-0 flex items-center pointer-events-none px-6 sm:px-12 lg:px-20"
      initial={false}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.6 }}
      style={{ zIndex: isActive ? 10 : 1 }}
    >
      <div className={`w-full flex items-center gap-8 lg:gap-16 ${textOnLeft ? 'flex-row' : 'flex-row-reverse'} ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Text content */}
        <div className={`max-w-lg flex-shrink-0 ${textOnLeft ? 'text-left' : 'text-right'}`}>
          {/* Tag */}
          <motion.p
            className="text-xs font-medium tracking-widest uppercase mb-3 text-white/50"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 15 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {section.tag}
          </motion.p>

          {/* Title */}
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 lg:mb-4 whitespace-pre-line leading-tight text-white"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {section.title}
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-sm sm:text-base lg:text-lg mb-4 lg:mb-6 text-white/60"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {section.description}
          </motion.p>

          {/* Bullets */}
          {section.bullets && (
            <div className="space-y-2 lg:space-y-3 mb-4 lg:mb-6">
              {section.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  className={`flex items-start gap-3 ${textOnLeft ? '' : 'flex-row-reverse text-right'}`}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : (textOnLeft ? -10 : 10) }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.08 }}
                >
                  <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 bg-violet-400" />
                  <div>
                    <span className="text-xs lg:text-sm font-semibold text-white">
                      {bullet.label}
                    </span>
                    <span className="text-xs lg:text-sm ml-1 hidden sm:inline text-white/50">
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
              animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
              transition={{ duration: 0.5, delay: 0.35 }}
            >
              <Button variant="primary" size="lg" onClick={startWarp}>
                Launch App
              </Button>
            </motion.div>
          )}

          {/* CTA Waitlist Form */}
          {isCTA && (
            <motion.div
              className="max-w-sm"
              animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 10 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <WaitlistForm />
            </motion.div>
          )}
        </div>

        {/* Visual content — shown on opposite side from text */}
        {hasVisual && (
          <div className="flex-1 hidden lg:flex justify-center items-center">
            <SectionVisual sectionId={section.id} isActive={isActive} />
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress Indicator                                                  */
/* ------------------------------------------------------------------ */

function ProgressIndicator({ progress, activeIndex }: { progress: number; activeIndex: number }) {
  return (
    <div className="fixed right-4 lg:right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
      {sections.map((section, i) => (
        <button
          key={section.id}
          className="group relative flex items-center"
          onClick={() => {
            const target = section.range[0]
            const scrollContainer = document.getElementById('shard-scroll-container')
            if (scrollContainer) {
              scrollContainer.scrollTop = target * (scrollContainer.scrollHeight - scrollContainer.clientHeight)
            }
          }}
        >
          {/* Label on hover */}
          <span className="absolute right-6 whitespace-nowrap text-xs font-medium text-white/0 group-hover:text-white/70 transition-all duration-200 pointer-events-none">
            {section.tag}
          </span>
          <div
            className="w-2 h-2 rounded-full transition-all duration-300"
            style={{
              background: i === activeIndex ? '#7c3aed' : 'rgba(255,255,255,0.2)',
              transform: i === activeIndex ? 'scale(1.5)' : 'scale(1)',
            }}
          />
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main ShardLanding Component                                         */
/* ------------------------------------------------------------------ */

export function ShardLanding() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const { isDark } = useTheme()
  const { startWarp } = useWarp()

  // Handle scroll and update progress
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const scrollTop = el.scrollTop
    const scrollHeight = el.scrollHeight - el.clientHeight
    const p = scrollHeight > 0 ? Math.min(scrollTop / scrollHeight, 1) : 0
    scrollStore.progress = p
    setProgress(p)

    // Determine active section
    for (let i = sections.length - 1; i >= 0; i--) {
      if (p >= sections[i].range[0]) {
        setActiveIndex(i)
        break
      }
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: '#050505' }}>
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo_white.svg"
            alt="Eternity"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold text-white">Eternity</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={startWarp} className="hidden sm:inline-flex">
            Launch App
          </Button>
        </div>
      </header>

      {/* 3D Canvas (fixed behind everything) */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.5, 8], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <Scene />
          </Suspense>
        </Canvas>
      </div>

      {/* Gradient overlays for readability */}
      <div className="absolute inset-0 z-[1] pointer-events-none">
        {/* Top gradient for header */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent" />
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 to-transparent" />
        {/* Side gradient for text readability — alternates per section */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: activeIndex % 2 === 0
              ? 'linear-gradient(90deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)'
              : 'linear-gradient(270deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
          }}
        />
      </div>

      {/* Scrollable content container */}
      <div
        id="shard-scroll-container"
        ref={scrollRef}
        className="absolute inset-0 z-[2] overflow-y-auto"
        style={{ scrollBehavior: 'smooth' }}
      >
        {/* Tall spacer to create scrollable area — 700vh gives room for all sections */}
        <div style={{ height: '700vh' }} />
      </div>

      {/* Section overlays (fixed, controlled by scroll progress) */}
      <div className="absolute inset-0 z-[3] pointer-events-none pt-16 pb-8">
        {sections.map((section, i) => {
          const sectionProgress = progress
          const isActive = sectionProgress >= section.range[0] && sectionProgress < section.range[1]
          return (
            <SectionOverlay
              key={section.id}
              section={section}
              isActive={isActive}
              index={i}
            />
          )
        })}
      </div>

      {/* Progress dots */}
      <ProgressIndicator progress={progress} activeIndex={activeIndex} />

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1"
        animate={{ opacity: progress < 0.03 ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
        <span className="text-[10px] text-white/30">Scroll to explore</span>
      </motion.div>

      {/* Section counter */}
      <div className="absolute bottom-4 left-6 z-40 hidden lg:block">
        <span className="text-xs font-mono text-white/30">
          {String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-40 bg-white/5">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
