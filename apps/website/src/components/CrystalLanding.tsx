// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Image from 'next/image'
import Link from 'next/link'
import * as THREE from 'three'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useWarp } from '@/components/animations/WarpTransition'
import { useTheme } from '@/context/ThemeContext'
import { createShardPieces } from '@/components/3d/Shard'
import type { ShardPiece } from '@/components/3d/Shard'

// Section components (expanded view)
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
const ROTATION_PER_FACE = (Math.PI * 2) / SECTIONS
const TRANSITION_MS = 1100
const WHEEL_THRESHOLD = 30
const SHATTER_MS = 700
const REASSEMBLE_MS = 600

const SECTION_LABELS = ['Home', 'Problem', 'Solution', 'Features', 'Business', 'Roadmap', 'Join Us']

/** Preview data for each section (shown on assembled crystal) */
const PREVIEWS = [
  { tag: 'WELCOME', title: 'The AI-Native\nCrypto Wallet', hint: 'Send crypto like a text message', cta: true },
  { tag: 'THE PROBLEM', title: 'Built for\nMachines', hint: '0x7f3a...complex addresses', cta: false },
  { tag: 'THE SOLUTION', title: 'AI-Native\nby Design', hint: 'BLIK codes • @username • AI Agent', cta: false },
  { tag: 'AVAILABLE NOW', title: 'Try It\nLive', hint: 'Interactive demos inside', cta: false },
  { tag: 'NEW FEATURE', title: 'Your Business\nOn-Chain', hint: 'Treasury • Shareholders • Governance', cta: false },
  { tag: 'ROADMAP', title: 'Our\nJourney', hint: 'Q1 2026 — MVP + AI Agent', cta: false },
  { tag: 'EARLY ACCESS', title: 'Experience\nAI-Native Crypto', hint: 'Join 4,201 pioneers', cta: true },
]

/* ---------------------------------------------------------- */
/*  Helpers                                                    */
/* ---------------------------------------------------------- */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - Math.min(1, t), 3)
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/* ---------------------------------------------------------- */
/*  Three.js — Shatter Crystal                                 */
/* ---------------------------------------------------------- */

interface CrystalCtrl {
  rotationY: number
  scale: number
  entered: boolean
  /** 0 = fully assembled, 1 = fully shattered */
  shatterTarget: number
}

function ShatterCrystal({ ctrl, isDark }: { ctrl: React.MutableRefObject<CrystalCtrl>; isDark: boolean }) {
  const grp = useRef<THREE.Group>(null)
  const pieces = useMemo(() => createShardPieces(), [])
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const edgeRefs = useRef<(THREE.LineSegments | null)[]>([])
  const { viewport } = useThree()

  const cur = useRef({
    rotY: 0,
    scale: 0,
    z: -50,
    entryT: 0,
    shatterProgress: 0, // current interpolated shatter progress
  })

  const color = isDark ? '#FFFFFF' : '#000000'
  const accent = isDark ? '#3388FF' : '#0066FF'

  useFrame((state, delta) => {
    if (!grp.current) return
    const c = ctrl.current
    const t = state.clock.elapsedTime
    const s = cur.current
    const baseScale = Math.min(3.0, Math.max(1.3, viewport.width * 0.40))

    /* ---- Entry animation ---- */
    if (!c.entered) {
      s.entryT = Math.min(1, s.entryT + delta * 0.55)
      const e = easeOutCubic(s.entryT)
      s.z = lerp(-50, 0, e)
      s.scale = lerp(0, baseScale, e)
      s.rotY = e * Math.PI * 4

      grp.current.position.set(0, 0, s.z)
      grp.current.scale.setScalar(s.scale)
      grp.current.rotation.y = s.rotY
      grp.current.rotation.x = Math.sin(e * Math.PI) * 0.3

      // All pieces at home position during entry
      pieces.forEach((piece, i) => {
        const mesh = meshRefs.current[i]
        const edge = edgeRefs.current[i]
        if (mesh) {
          mesh.position.copy(piece.centroid)
          mesh.rotation.set(0, 0, 0)
        }
        if (edge) {
          edge.position.copy(piece.centroid)
          edge.rotation.set(0, 0, 0)
        }
      })

      if (s.entryT >= 1) {
        c.entered = true
        s.rotY = 0
        s.scale = baseScale
      }
      return
    }

    /* ---- Normal mode: rotation + shatter ---- */
    const tgtRotY = c.rotationY + state.mouse.x * 0.04
    const tgtRotX = -state.mouse.y * 0.03 + Math.sin(t * 0.3) * 0.015
    const tgtScale = c.scale * baseScale

    s.rotY = lerp(s.rotY, tgtRotY, 0.07)
    s.scale = lerp(s.scale, tgtScale, 0.09)

    grp.current.rotation.y = s.rotY
    grp.current.rotation.x = lerp(grp.current.rotation.x, tgtRotX, 0.05)
    grp.current.scale.setScalar(s.scale)
    grp.current.position.y = Math.sin(t * 0.5) * 0.04
    grp.current.position.z = 0

    /* ---- Shatter interpolation ---- */
    const shatterSpeed = 3.5 * delta
    if (s.shatterProgress < c.shatterTarget) {
      s.shatterProgress = Math.min(c.shatterTarget, s.shatterProgress + shatterSpeed)
    } else if (s.shatterProgress > c.shatterTarget) {
      s.shatterProgress = Math.max(c.shatterTarget, s.shatterProgress - shatterSpeed * 0.8)
    }
    const sp = easeInOutCubic(s.shatterProgress)

    pieces.forEach((piece, i) => {
      const mesh = meshRefs.current[i]
      const edge = edgeRefs.current[i]
      if (!mesh) return

      // Interpolate position: centroid → centroid + shatterOffset
      const px = lerp(piece.centroid.x, piece.centroid.x + piece.shatterOffset.x, sp)
      const py = lerp(piece.centroid.y, piece.centroid.y + piece.shatterOffset.y, sp)
      const pz = lerp(piece.centroid.z, piece.centroid.z + piece.shatterOffset.z, sp)

      // Interpolate rotation: 0 → shatterRotation
      const rx = lerp(0, piece.shatterRotation.x, sp)
      const ry = lerp(0, piece.shatterRotation.y, sp)
      const rz = lerp(0, piece.shatterRotation.z, sp)

      // Add floating motion when shattered
      const floatX = sp > 0.3 ? Math.cos(t * 0.4 + i * 0.9) * 0.08 * sp : 0
      const floatY = sp > 0.3 ? Math.sin(t * 0.5 + i * 0.7) * 0.12 * sp : 0
      const floatRot = sp > 0.3 ? Math.sin(t * 0.2 + i * 1.3) * 0.03 * sp : 0

      mesh.position.set(px + floatX, py + floatY, pz)
      mesh.rotation.set(rx + floatRot, ry, rz)

      if (edge) {
        edge.position.copy(mesh.position)
        edge.rotation.copy(mesh.rotation)
      }
    })
  })

  return (
    <group ref={grp}>
      {pieces.map((piece, i) => (
        <group key={i}>
          {/* Triangle face */}
          <mesh
            ref={(el) => { meshRefs.current[i] = el }}
            geometry={piece.geometry}
            position={[piece.centroid.x, piece.centroid.y, piece.centroid.z]}
          >
            <meshPhysicalMaterial
              color={color}
              metalness={0.92}
              roughness={0.04}
              transparent
              opacity={isDark ? 0.45 : 0.3}
              reflectivity={1}
              clearcoat={1}
              clearcoatRoughness={0.04}
              flatShading
              side={THREE.DoubleSide}
              envMapIntensity={2.5}
            />
          </mesh>
          {/* Edge lines */}
          <lineSegments
            ref={(el) => { edgeRefs.current[i] = el }}
            geometry={piece.edges}
            position={[piece.centroid.x, piece.centroid.y, piece.centroid.z]}
          >
            <lineBasicMaterial color={color} transparent opacity={isDark ? 0.5 : 0.35} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}

/* ---------------------------------------------------------- */
/*  Three.js — Particles                                       */
/* ---------------------------------------------------------- */

function Particles({ count = 50, isDark = false }) {
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
/*  Three.js — Canvas wrapper                                  */
/* ---------------------------------------------------------- */

function CrystalCanvas({
  ctrl,
  isDark,
  onClick,
}: {
  ctrl: React.MutableRefObject<CrystalCtrl>
  isDark: boolean
  onClick: () => void
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent', cursor: 'pointer' }}
      onClick={onClick}
    >
      <Suspense fallback={null}>
        <Environment preset={isDark ? 'night' : 'city'} />
        <ambientLight intensity={isDark ? 0.3 : 0.4} />
        <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.8 : 1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 3]} intensity={0.5} color={isDark ? '#3388FF' : '#0066FF'} />
        <ShatterCrystal ctrl={ctrl} isDark={isDark} />
        <Particles count={50} isDark={isDark} />
      </Suspense>
    </Canvas>
  )
}

/* ---------------------------------------------------------- */
/*  Preview card (shown on assembled crystal)                  */
/* ---------------------------------------------------------- */

function SectionPreview({
  index,
  visible,
  onLaunch,
}: {
  index: number
  visible: boolean
  onLaunch: () => void
}) {
  const preview = PREVIEWS[index]
  const isHero = index === 0
  const isCTA = index === SECTIONS - 1
  const canShatter = !isHero && !isCTA

  return (
    <div className="flex flex-col items-center text-center max-w-md mx-auto px-4">
      {/* Tag */}
      <motion.p
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
        transition={{ delay: 0.05, duration: 0.35 }}
        className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase mb-2 hud-glow-subtle"
        style={{ color: 'var(--accent-cyan)' }}
      >
        {preview.tag}
      </motion.p>

      {/* Title */}
      <motion.h2
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2 lg:mb-3 whitespace-pre-line leading-tight hud-glow"
        style={{ color: 'var(--foreground)' }}
      >
        {preview.title}
      </motion.h2>

      {/* Hint / subtitle */}
      <motion.p
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="text-sm sm:text-base mb-3 lg:mb-4 hud-mono hud-glow-subtle"
        style={{ color: 'var(--foreground-muted)' }}
      >
        {preview.hint}
      </motion.p>

      {/* Hero CTA */}
      {isHero && (
        <motion.div
          animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 8 }}
          transition={{ delay: 0.25, duration: 0.35 }}
        >
          <Button variant="primary" size="lg" onClick={onLaunch} className="hud-pulse-border">
            Launch App
          </Button>
        </motion.div>
      )}

      {/* CTA waitlist hint */}
      {isCTA && (
        <motion.p
          animate={{ opacity: visible ? 0.7 : 0 }}
          transition={{ delay: 0.25 }}
          className="text-xs hud-glow-subtle"
          style={{ color: 'var(--accent-cyan)' }}
        >
          Click crystal to join the waitlist
        </motion.p>
      )}

      {/* Explore hint for middle sections */}
      {canShatter && (
        <motion.div
          className="flex items-center gap-2 mt-2"
          animate={{ opacity: visible ? 0.6 : 0 }}
          transition={{ delay: 0.4 }}
        >
          <span className="text-[10px] tracking-widest uppercase hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>
            Click to explore
          </span>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs"
            style={{ color: 'var(--accent-cyan)' }}
          >
            ◆
          </motion.span>
        </motion.div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Expanded content (shown when crystal is shattered)         */
/* ---------------------------------------------------------- */

function ExpandedContent({
  index,
  visible,
  onClose,
  onLaunch,
}: {
  index: number
  visible: boolean
  onClose: () => void
  onLaunch: () => void
}) {
  return (
    <div className="relative w-full max-w-4xl mx-auto px-4">
      {/* Close button */}
      <motion.button
        className="absolute top-2 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hud-hover-scan"
        style={{ background: 'rgba(0, 229, 255, 0.06)', color: 'var(--accent-cyan)' }}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.8 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.1 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 1L13 13M13 1L1 13" />
        </svg>
      </motion.button>

      {/* Section content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {index === 0 && <HeroSection visible={visible} onLaunch={onLaunch} />}
        {index === 1 && <ProblemSection visible={visible} face="full" />}
        {index === 2 && <SolutionSection visible={visible} face="full" />}
        {index === 3 && <FeaturesSection visible={visible} face="full" />}
        {index === 4 && <BusinessSection visible={visible} face="full" />}
        {index === 5 && <RoadmapSection visible={visible} face="full" />}
        {index === 6 && <CtaSection visible={visible} />}
      </motion.div>
    </div>
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
  const [isShattered, setIsShattered] = useState(false)
  const [showExpanded, setShowExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isTransitioning = useRef(false)
  const touchStartY = useRef(0)
  const { isDark } = useTheme()
  const { startWarp } = useWarp()

  const crystalCtrl = useRef<CrystalCtrl>({
    rotationY: 0,
    scale: 1,
    entered: false,
    shatterTarget: 0,
  })

  useEffect(() => { setMounted(true) }, [])

  // Show content after crystal entry animation (~2s)
  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 2100)
    return () => clearTimeout(timer)
  }, [])

  /* ---- Shatter / Reassemble ---- */
  const shatter = useCallback(() => {
    if (isTransitioning.current || !crystalCtrl.current.entered) return
    // Hero and CTA don't shatter
    if (activeIndex === 0 || activeIndex === SECTIONS - 1) return

    isTransitioning.current = true
    setContentVisible(false) // hide preview

    // Start shatter
    setTimeout(() => {
      crystalCtrl.current.shatterTarget = 1
      setIsShattered(true)
    }, 150)

    // Show expanded content after shatter animation
    setTimeout(() => {
      setShowExpanded(true)
      setContentVisible(true)
      isTransitioning.current = false
    }, SHATTER_MS)
  }, [activeIndex])

  const reassemble = useCallback(() => {
    if (isTransitioning.current) return
    isTransitioning.current = true

    setContentVisible(false)
    setShowExpanded(false)

    // Start reassemble
    setTimeout(() => {
      crystalCtrl.current.shatterTarget = 0
    }, 150)

    // Show preview after reassemble
    setTimeout(() => {
      setIsShattered(false)
      setContentVisible(true)
      isTransitioning.current = false
    }, REASSEMBLE_MS)
  }, [])

  /* ---- Crystal click handler ---- */
  const handleCrystalClick = useCallback(() => {
    if (isShattered) {
      reassemble()
    } else {
      shatter()
    }
  }, [isShattered, shatter, reassemble])

  /* ---- Navigate between sections (only when assembled) ---- */
  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= SECTIONS) return
    if (isTransitioning.current || !crystalCtrl.current.entered) return

    // If shattered, reassemble first then navigate
    if (isShattered) {
      isTransitioning.current = true
      setContentVisible(false)
      setShowExpanded(false)

      setTimeout(() => {
        crystalCtrl.current.shatterTarget = 0
      }, 100)

      setTimeout(() => {
        setIsShattered(false)
        isTransitioning.current = false
        // Now navigate
        navigateAssembled(index)
      }, REASSEMBLE_MS)
      return
    }

    navigateAssembled(index)
  }, [activeIndex, isShattered])

  const navigateAssembled = useCallback((index: number) => {
    if (isTransitioning.current) return
    isTransitioning.current = true

    // Phase 1: Fade out content
    setContentVisible(false)

    // Phase 2: Pull back + scale down
    setTimeout(() => {
      crystalCtrl.current.scale = 0.82
    }, 150)

    // Phase 3: Rotate to new face
    setTimeout(() => {
      crystalCtrl.current.rotationY = -index * ROTATION_PER_FACE
      setActiveIndex(index)
    }, 350)

    // Phase 4: Scale back up
    setTimeout(() => {
      crystalCtrl.current.scale = 1
    }, 650)

    // Phase 5: Fade in content
    setTimeout(() => {
      setContentVisible(true)
    }, 700)

    setTimeout(() => { isTransitioning.current = false }, TRANSITION_MS)
  }, [])

  /* ---- Wheel ---- */
  useEffect(() => {
    const h = (e: WheelEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (isTransitioning.current || !crystalCtrl.current.entered) return
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return

      // If shattered, scroll reassembles
      if (isShattered) {
        reassemble()
        return
      }

      navigateTo(e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('wheel', h, { passive: false })
    return () => window.removeEventListener('wheel', h)
  }, [activeIndex, navigateTo, isShattered, reassemble])

  /* ---- Touch ---- */
  useEffect(() => {
    const start = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const d = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(d) < 50) return

      if (isShattered) {
        reassemble()
        return
      }

      navigateTo(d > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end) }
  }, [activeIndex, navigateTo, isShattered, reassemble])

  /* ---- Keyboard ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isShattered) {
        e.preventDefault()
        reassemble()
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        if (isShattered) { reassemble(); return }
        navigateTo(activeIndex + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        if (isShattered) { reassemble(); return }
        navigateTo(activeIndex - 1)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeIndex, navigateTo, isShattered, reassemble])

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--background)' }}>
      {/* Crystal canvas */}
      {mounted && (
        <div className="absolute inset-0 z-[1]">
          <CrystalCanvas ctrl={crystalCtrl} isDark={isDark} onClick={handleCrystalClick} />
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
        <div className="pointer-events-auto w-full">
          <AnimatePresence mode="wait">
            {showExpanded ? (
              /* Expanded content (crystal shattered) */
              <motion.div
                key={`expanded-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <ExpandedContent
                  index={activeIndex}
                  visible={contentVisible}
                  onClose={reassemble}
                  onLaunch={startWarp}
                />
              </motion.div>
            ) : (
              /* Preview card (crystal assembled) */
              <motion.div
                key={`preview-${activeIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <SectionPreview
                  index={activeIndex}
                  visible={contentVisible}
                  onLaunch={startWarp}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Background click to reassemble */}
      {isShattered && (
        <div
          className="absolute inset-0 z-[1]"
          onClick={reassemble}
          style={{ cursor: 'pointer' }}
        />
      )}

      {/* Sidebar + nav (hidden when shattered) */}
      <div
        className="transition-opacity duration-500"
        style={{ opacity: contentVisible && !isShattered ? 1 : 0, pointerEvents: isShattered ? 'none' : 'auto' }}
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
        animate={{ opacity: activeIndex === 0 && contentVisible && !isShattered ? 1 : 0 }}
        transition={{ delay: 2 }}
      >
        <span className="text-[10px]" style={{ color: 'var(--foreground-light)' }}>Scroll or use</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface)', color: 'var(--foreground-muted)' }}>↑↓</kbd>
      </motion.div>
    </div>
  )
}
