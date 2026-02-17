'use client'

import { Suspense, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { EffectComposer, Vignette } from '@react-three/postprocessing'
import * as THREE from 'three'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useWarp } from '@/components/animations/WarpTransition'
import { ShardObject } from '@/components/3d/ShardObject'
import { SectionVisual } from '@/components/sections/SectionVisuals'

/* ------------------------------------------------------------------ */
/*  Scroll progress store (shared between DOM and R3F)                  */
/* ------------------------------------------------------------------ */

const scrollStore = { progress: 0 }

/* ------------------------------------------------------------------ */
/*  Gradient text helper                                                */
/* ------------------------------------------------------------------ */

const gradientStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #ffffff 0%, #a78bfa 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

/* ------------------------------------------------------------------ */
/*  Section definitions                                                 */
/* ------------------------------------------------------------------ */

interface Section {
  id: string
  tag: string
  title: string
  gradientWord: string // the word(s) in the title that get a gradient
  description: string
  bullets?: { label: string; text: string }[]
  range: [number, number]
}

const sections: Section[] = [
  {
    id: 'hero',
    tag: 'Welcome',
    title: 'The AI-Native\nCrypto Wallet',
    gradientWord: 'AI-Native',
    description: 'Send crypto like a text message. Just type a name and hit send.',
    range: [0, 0.15],
  },
  {
    id: 'problem',
    tag: 'The Problem',
    title: "Crypto wasn't built\nfor humans",
    gradientWord: 'humans',
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
    gradientWord: 'AI-Native',
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
    gradientWord: 'Now',
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
    gradientWord: 'On-Chain',
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
    gradientWord: 'Journey',
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
    gradientWord: 'AI-Native',
    description: 'Join the waitlist for early access.',
    range: [0.90, 1.0],
  },
]

/* ------------------------------------------------------------------ */
/*  Render title with gradient on specific word                         */
/* ------------------------------------------------------------------ */

function renderTitle(title: string, gradientWord: string) {
  // Split by the gradient word and rebuild with styled span
  const parts = title.split(gradientWord)
  if (parts.length === 1) {
    // gradientWord not found, render plain
    return <>{title}</>
  }
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span style={gradientStyle}>{gradientWord}</span>
          )}
        </span>
      ))}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Camera positions per section (orbit showcase)                       */
/* ------------------------------------------------------------------ */

const cameraPositions: [number, number, number][] = [
  [0, 0.3, 5],       // Section 0 (Hero): front view, slightly above
  [3, 1.5, 3.5],     // Section 1 (Problem): upper right view
  [-2, 0, 4.5],      // Section 2 (Solution): left front view
  [2.5, -0.5, 4],    // Section 3 (Features): right, slightly below
  [-3, 1, 3.5],      // Section 4 (Business): upper left view
  [0, 2.5, 3],       // Section 5 (Roadmap): top-down view
  [0, 0.3, 4.5],     // Section 6 (CTA): front view, closer
]

/* ------------------------------------------------------------------ */
/*  Camera Controller (orbit per section, lerp between positions)       */
/* ------------------------------------------------------------------ */

function CameraController() {
  const { camera } = useThree()
  const targetPos = useRef(new THREE.Vector3(0, 0.3, 5))

  useFrame(() => {
    const p = scrollStore.progress

    // Find which two section positions to interpolate between
    let fromIdx = 0
    let toIdx = 0
    let localT = 0

    for (let i = sections.length - 1; i >= 0; i--) {
      if (p >= sections[i].range[0]) {
        fromIdx = i
        toIdx = Math.min(i + 1, sections.length - 1)
        const rangeStart = sections[i].range[0]
        const rangeEnd = sections[i].range[1]
        localT = rangeEnd > rangeStart ? (p - rangeStart) / (rangeEnd - rangeStart) : 0
        localT = Math.min(Math.max(localT, 0), 1)
        break
      }
    }

    // Interpolate between section camera positions
    const from = cameraPositions[fromIdx]
    const to = cameraPositions[toIdx]
    const targetX = from[0] + (to[0] - from[0]) * localT
    const targetY = from[1] + (to[1] - from[1]) * localT
    const targetZ = from[2] + (to[2] - from[2]) * localT

    targetPos.current.set(targetX, targetY, targetZ)

    // Very smooth lerp for premium feel
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetPos.current.x, 0.04)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetPos.current.y, 0.04)
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetPos.current.z, 0.04)
    camera.lookAt(0, 0, 0)
  })

  return null
}

/* ------------------------------------------------------------------ */
/*  Void Particles (subtle white, low opacity)                          */
/* ------------------------------------------------------------------ */

function VoidParticles({ count = 40 }: { count?: number }) {
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
    ref.current.rotation.y = state.clock.elapsedTime * 0.03
    ref.current.rotation.x = state.clock.elapsedTime * 0.02
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
        size={0.01}
        color="#ffffff"
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  3D Scene                                                            */
/* ------------------------------------------------------------------ */

function Scene() {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 8, 5]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.2} color="#ffffff" />

      <CameraController />
      <ShardObject />
      <VoidParticles count={40} />

      <EffectComposer>
        <Vignette eskil={false} offset={0.3} darkness={0.5} />
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
        <h3 className="text-xl font-bold mb-2 text-white">You&apos;re In!</h3>
        <p className="text-sm text-white/60">We&apos;ll notify you when early access is available.</p>
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
      className="absolute inset-0 flex items-center pointer-events-none px-8 sm:px-16 lg:px-24"
      initial={false}
      animate={{ opacity: isActive ? 1 : 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ zIndex: isActive ? 10 : 1 }}
    >
      <div className={`w-full flex items-center gap-8 lg:gap-16 ${textOnLeft ? 'flex-row' : 'flex-row-reverse'} ${isActive ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        {/* Text content */}
        <div className={`max-w-xl flex-shrink-0 ${textOnLeft ? 'text-left' : 'text-right'}`}>
          {/* Tag */}
          <motion.p
            className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4 text-white/40"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 12 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {section.tag}
          </motion.p>

          {/* Title */}
          <motion.h2
            className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 lg:mb-5 whitespace-pre-line leading-[1.1] text-white"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {renderTitle(section.title, section.gradientWord)}
          </motion.h2>

          {/* Description */}
          <motion.p
            className="text-base lg:text-lg mb-5 lg:mb-7 text-white/60"
            animate={{ opacity: isActive ? 1 : 0, y: isActive ? 0 : 16 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {section.description}
          </motion.p>

          {/* Bullets */}
          {section.bullets && (
            <div className="space-y-2.5 lg:space-y-3 mb-5 lg:mb-7">
              {section.bullets.map((bullet, i) => (
                <motion.div
                  key={i}
                  className={`flex items-start gap-3 ${textOnLeft ? '' : 'flex-row-reverse text-right'}`}
                  animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : (textOnLeft ? -8 : 8) }}
                  transition={{ duration: 0.4, delay: 0.25 + i * 0.06, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <div className="w-1 h-1 rounded-full mt-2 flex-shrink-0 bg-white/30" />
                  <div>
                    <span className="text-sm font-semibold text-white/90">
                      {bullet.label}
                    </span>
                    <span className="text-sm ml-1.5 hidden sm:inline text-white/50">
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
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
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
              transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <WaitlistForm />
            </motion.div>
          )}
        </div>

        {/* Visual content -- shown on opposite side from text (desktop only) */}
        {hasVisual && (
          <motion.div
            className="flex-1 hidden lg:flex justify-center items-center"
            animate={{ opacity: isActive ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <SectionVisual sectionId={section.id} isActive={isActive} />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  Progress Indicator (white dots)                                     */
/* ------------------------------------------------------------------ */

function ProgressIndicator({ activeIndex }: { activeIndex: number }) {
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
          <span className="absolute right-6 whitespace-nowrap text-xs font-medium text-white/0 group-hover:text-white/60 transition-all duration-200 pointer-events-none">
            {section.tag}
          </span>
          <div
            className="rounded-full transition-all duration-300"
            style={{
              width: i === activeIndex ? 8 : 6,
              height: i === activeIndex ? 8 : 6,
              background: i === activeIndex ? '#ffffff' : 'rgba(255,255,255,0.15)',
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
      {/* Header -- clean, minimal */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 sm:px-10 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/images/logo_white.svg"
            alt="Eternity"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold text-white">Eternity</span>
        </Link>
        <Button variant="primary" size="sm" onClick={startWarp} className="hidden sm:inline-flex">
          Launch App
        </Button>
      </header>

      {/* 3D Canvas (fixed behind everything) */}
      <div className="absolute inset-0 z-0">
        <Canvas
          camera={{ position: [0, 0.3, 5], fov: 45 }}
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
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/50 to-transparent" />
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
        {/* Side gradient for text readability -- alternates per section */}
        <div
          className="absolute inset-0 transition-opacity duration-700"
          style={{
            background: activeIndex % 2 === 0
              ? 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 40%, transparent 70%)'
              : 'linear-gradient(270deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.25) 40%, transparent 70%)',
          }}
        />
        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
            backgroundRepeat: 'repeat',
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
        {/* Tall spacer to create scrollable area */}
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
      <ProgressIndicator activeIndex={activeIndex} />

      {/* Scroll hint -- subtle */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1"
        animate={{ opacity: progress < 0.03 ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.div>
        <span className="text-[9px] text-white/20">Scroll to explore</span>
      </motion.div>

      {/* Section counter */}
      <div className="absolute bottom-4 left-6 z-40 hidden lg:block">
        <span className="text-xs font-mono text-white/20">
          {String(activeIndex + 1).padStart(2, '0')} / {String(sections.length).padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar at bottom -- subtle white */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] z-40 bg-white/5">
        <motion.div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.6))',
            width: `${progress * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
