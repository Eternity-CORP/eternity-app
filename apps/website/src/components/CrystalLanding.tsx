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

// Section components
import { HeroSection } from '@/components/hud/sections/HeroSection'
import { ProblemSection } from '@/components/hud/sections/ProblemSection'
import { SolutionSection } from '@/components/hud/sections/SolutionSection'
import { FeaturesSection } from '@/components/hud/sections/FeaturesSection'
import { BusinessSection } from '@/components/hud/sections/BusinessSection'
import { RoadmapSection } from '@/components/hud/sections/RoadmapSection'
import { CtaSection } from '@/components/hud/sections/CtaSection'

/* ---------------------------------------------------------- */
/*  Constants                                                  */
/* ---------------------------------------------------------- */

const SECTIONS = 7
const TRANSITION_MS = 800
const WHEEL_THRESHOLD = 30

const SECTION_LABELS = ['Home', 'Problem', 'Solution', 'Features', 'Business', 'Roadmap', 'Join Us']

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
        opacity={isDark ? 0.25 : 0.15}
        sizeAttenuation
      />
    </points>
  )
}

/* ---------------------------------------------------------- */
/*  Canvas wrapper                                             */
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
        <ambientLight intensity={isDark ? 0.3 : 0.4} />
        <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.8 : 1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <MorphSphere ctrl={ctrl} isDark={isDark} />
        <BackgroundParticles count={50} isDark={isDark} />
      </Suspense>
    </Canvas>
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
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass">
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
        style={{ background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Main component                                             */
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

  // Show content after morph entry animation
  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 2100)
    return () => clearTimeout(timer)
  }, [])

  // CTA burst effect
  useEffect(() => {
    morphCtrl.current.burst = activeIndex === 6 ? 1 : 0
  }, [activeIndex])

  /* ---- Navigate between sections ---- */
  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= SECTIONS) return
    if (isTransitioning.current || !morphCtrl.current.entered) return

    isTransitioning.current = true

    // Phase 1: Fade out content
    setContentVisible(false)

    // Phase 2: Start morph transition
    setTimeout(() => {
      morphCtrl.current.targetSection = index
    }, 150)

    // Phase 3: Switch content
    setTimeout(() => {
      setActiveIndex(index)
    }, 400)

    // Phase 4: Fade in content
    setTimeout(() => {
      setContentVisible(true)
    }, 600)

    // Unlock
    setTimeout(() => {
      isTransitioning.current = false
    }, TRANSITION_MS)
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
    return () => {
      window.removeEventListener('touchstart', start)
      window.removeEventListener('touchend', end)
    }
  }, [activeIndex, navigateTo])

  /* ---- Keyboard ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        navigateTo(activeIndex + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        navigateTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeIndex, navigateTo])

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--background)' }}>
      {/* Morph canvas */}
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

      {/* Content overlay */}
      <div className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl mx-auto px-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: contentVisible ? 1 : 0, y: contentVisible ? 0 : 12 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {activeIndex === 0 && <HeroSection visible={contentVisible} onLaunch={startWarp} />}
              {activeIndex === 1 && <ProblemSection visible={contentVisible} face="full" />}
              {activeIndex === 2 && <SolutionSection visible={contentVisible} face="full" />}
              {activeIndex === 3 && <FeaturesSection visible={contentVisible} face="full" />}
              {activeIndex === 4 && <BusinessSection visible={contentVisible} face="full" />}
              {activeIndex === 5 && <RoadmapSection visible={contentVisible} face="full" />}
              {activeIndex === 6 && <CtaSection visible={contentVisible} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div
        className="transition-opacity duration-500"
        style={{ opacity: contentVisible ? 1 : 0 }}
      >
        <Sidebar activeIndex={activeIndex} onNavigate={navigateTo} />
        <DotNav activeIndex={activeIndex} onNavigate={navigateTo} />
        <SlideProgress activeIndex={activeIndex} />

        <div className="absolute bottom-4 right-6 z-40 hidden lg:block">
          <span className="text-xs font-mono hud-glow-subtle" style={{ color: 'var(--foreground-light)' }}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(SECTIONS).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Keyboard hint (hero only) */}
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
