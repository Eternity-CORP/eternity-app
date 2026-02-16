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
import { createHeptagonalCrystal } from '@/components/3d/Shard'

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
const ROTATION_PER_FACE = (Math.PI * 2) / SECTIONS
const TRANSITION_MS = 1100
const WHEEL_THRESHOLD = 30

/** Face configuration per section */
interface FaceConfig {
  type: 'full' | 'top' | 'bottom'
  cameraZ: number
  rotationX: number
}

const FACE_MAP: FaceConfig[] = [
  { type: 'full',   cameraZ: 8,   rotationX: 0 },        // 0: Hero
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 1: Problem
  { type: 'bottom', cameraZ: 4.5, rotationX: 0.4 },      // 2: Solution
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 3: Features
  { type: 'bottom', cameraZ: 4.5, rotationX: 0.4 },      // 4: Business
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 5: Roadmap
  { type: 'full',   cameraZ: 8,   rotationX: 0 },        // 6: CTA
]

const SECTION_LABELS = ['Home', 'Problem', 'Solution', 'Features', 'Business', 'Roadmap', 'Join Us']

/* ---------------------------------------------------------- */
/*  Helpers                                                    */
/* ---------------------------------------------------------- */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - Math.min(1, t), 3)
}

/* ---------------------------------------------------------- */
/*  Three.js — Crystal mesh                                    */
/* ---------------------------------------------------------- */

interface CrystalCtrl {
  rotationY: number
  rotationX: number
  scale: number
  cameraZ: number
  entered: boolean
}

function Crystal({ ctrl, isDark }: { ctrl: React.MutableRefObject<CrystalCtrl>; isDark: boolean }) {
  const grp = useRef<THREE.Group>(null)
  const geo = useMemo(() => createHeptagonalCrystal(), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo])
  const { camera, viewport } = useThree()

  const cur = useRef({ rotY: 0, rotX: 0, scale: 0, z: -50, camZ: 8, entryT: 0 })
  const color = isDark ? '#FFFFFF' : '#000000'
  const accent = isDark ? '#3388FF' : '#0066FF'

  useFrame((state, delta) => {
    if (!grp.current) return
    const c = ctrl.current
    const t = state.clock.elapsedTime
    const s = cur.current
    const baseScale = Math.min(3.0, Math.max(1.3, viewport.width * 0.40))

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

      if (s.entryT >= 1) {
        c.entered = true
        s.rotY = 0
        s.rotX = 0
        s.scale = baseScale
        s.camZ = c.cameraZ
      }
      return
    }

    // Target values from controller
    const tgtRotY = c.rotationY + state.mouse.x * 0.04
    const tgtRotX = c.rotationX + (-state.mouse.y * 0.02) + Math.sin(t * 0.3) * 0.01
    const tgtScale = c.scale * baseScale
    const tgtCamZ = c.cameraZ

    // Smooth interpolation
    s.rotY = lerp(s.rotY, tgtRotY, 0.07)
    s.rotX = lerp(s.rotX, tgtRotX, 0.06)
    s.scale = lerp(s.scale, tgtScale, 0.09)
    s.camZ = lerp(s.camZ, tgtCamZ, 0.06)

    grp.current.rotation.y = s.rotY
    grp.current.rotation.x = s.rotX
    grp.current.scale.setScalar(s.scale)
    grp.current.position.y = Math.sin(t * 0.5) * 0.04
    grp.current.position.z = 0

    // Camera dolly for zoom
    camera.position.z = s.camZ
  })

  return (
    <group ref={grp}>
      <mesh geometry={geo}>
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
      <mesh geometry={geo} scale={1.02}>
        <meshPhysicalMaterial
          color={accent}
          metalness={0.3}
          roughness={0.5}
          transparent
          opacity={0.08}
          flatShading
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={isDark ? 0.5 : 0.35} />
      </lineSegments>
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

function CrystalCanvas({ ctrl, isDark }: { ctrl: React.MutableRefObject<CrystalCtrl>; isDark: boolean }) {
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
        <pointLight position={[0, 5, 3]} intensity={0.5} color={isDark ? '#3388FF' : '#0066FF'} />
        <Crystal ctrl={ctrl} isDark={isDark} />
        <Particles count={50} isDark={isDark} />
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
/*  Section router                                             */
/* ---------------------------------------------------------- */

function SectionContent({ index, visible }: { index: number; visible: boolean }) {
  const { startWarp } = useWarp()

  switch (index) {
    case 0: return <HeroSection visible={visible} onLaunch={startWarp} />
    case 1: return <ProblemSection visible={visible} />
    case 2: return <SolutionSection visible={visible} />
    case 3: return <FeaturesSection visible={visible} />
    case 4: return <BusinessSection visible={visible} />
    case 5: return <RoadmapSection visible={visible} />
    case 6: return <CtaSection visible={visible} />
    default: return null
  }
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

  const crystalCtrl = useRef<CrystalCtrl>({
    rotationY: 0,
    rotationX: 0,
    scale: 1,
    cameraZ: FACE_MAP[0].cameraZ,
    entered: false,
  })

  useEffect(() => { setMounted(true) }, [])

  // Show content after crystal entry animation (~2s)
  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 2100)
    return () => clearTimeout(timer)
  }, [])

  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= SECTIONS) return
    if (isTransitioning.current || !crystalCtrl.current.entered) return
    isTransitioning.current = true

    const face = FACE_MAP[index]

    // Phase 1: Fade out content (0-200ms)
    setContentVisible(false)

    // Phase 2: Pull back crystal (200-400ms)
    setTimeout(() => {
      crystalCtrl.current.scale = 0.6
      crystalCtrl.current.cameraZ = 10
    }, 200)

    // Phase 3: Rotate to new face (400-800ms)
    setTimeout(() => {
      crystalCtrl.current.rotationY = -index * ROTATION_PER_FACE
      crystalCtrl.current.rotationX = face.rotationX
      setActiveIndex(index)
    }, 400)

    // Phase 4: Push in / zoom to face (800-1000ms)
    setTimeout(() => {
      crystalCtrl.current.scale = 1
      crystalCtrl.current.cameraZ = face.cameraZ
    }, 800)

    // Phase 5: Fade in content (850-1100ms)
    setTimeout(() => {
      setContentVisible(true)
    }, 850)

    setTimeout(() => { isTransitioning.current = false }, TRANSITION_MS)
  }, [activeIndex])

  // Wheel
  useEffect(() => {
    const h = (e: WheelEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (isTransitioning.current || !crystalCtrl.current.entered) return
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return
      navigateTo(e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('wheel', h, { passive: false })
    return () => window.removeEventListener('wheel', h)
  }, [activeIndex, navigateTo])

  // Touch
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

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); navigateTo(activeIndex + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); navigateTo(activeIndex - 1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeIndex, navigateTo])

  // Determine content positioning based on face type
  const currentFace = FACE_MAP[activeIndex]
  const contentPosition = currentFace.type === 'top'
    ? 'items-start pt-4'
    : currentFace.type === 'bottom'
      ? 'items-end pb-4'
      : 'items-center'

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--background)' }}>
      {/* Crystal canvas */}
      {mounted && (
        <div className="absolute inset-0 z-[1]">
          <CrystalCanvas ctrl={crystalCtrl} isDark={isDark} />
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

      {/* Content overlay — positioned based on face type */}
      <div className={`absolute inset-0 z-[2] flex justify-center pointer-events-none ${contentPosition}`}>
        <div className="pointer-events-auto w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SectionContent index={activeIndex} visible={contentVisible} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sidebar + nav */}
      <div className="transition-opacity duration-700" style={{ opacity: contentVisible ? 1 : 0 }}>
        <Sidebar activeIndex={activeIndex} onNavigate={navigateTo} />
        <DotNav activeIndex={activeIndex} onNavigate={navigateTo} />
        <SlideProgress activeIndex={activeIndex} />

        <div className="absolute bottom-4 right-6 z-40 hidden lg:block">
          <span className="text-xs font-mono hud-glow-subtle" style={{ color: 'var(--foreground-light)' }}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(SECTIONS).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  )
}
