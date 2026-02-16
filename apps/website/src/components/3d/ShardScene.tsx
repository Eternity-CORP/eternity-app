// @ts-nocheck
'use client'

import { Suspense, useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Environment } from '@react-three/drei'
import { ShardSimple } from './Shard'
import * as THREE from 'three'
import { useTheme } from '@/context/ThemeContext'
import { shardProgress as sharedProgress } from '@/lib/shardProgress'

/* ------------------------------------------------------------------ */
/*  Shared shard configurations                                        */
/* ------------------------------------------------------------------ */

const darkShards = [
  { position: [-3.5, 1.5, -2] as [number, number, number], scale: 0.7, color: '#00E5FF', speed: 0.9 },
  { position: [3.5, -0.5, -1.5] as [number, number, number], scale: 0.9, color: '#FFFFFF', speed: 0.75 },
  { position: [-2.5, -1.5, 1] as [number, number, number], scale: 0.55, color: '#8B5CF6', speed: 1.1 },
  { position: [2.5, 2, 0.5] as [number, number, number], scale: 0.8, color: '#FFFFFF', speed: 0.7 },
  { position: [-1.5, 2.5, -1.5] as [number, number, number], scale: 0.45, color: '#3388FF', speed: 0.85 },
  { position: [1.5, -2, 1.5] as [number, number, number], scale: 0.6, color: '#FFFFFF', speed: 1 },
  { position: [4, 0.5, -0.5] as [number, number, number], scale: 0.5, color: '#00E5FF', speed: 0.95 },
  { position: [-4, -0.5, 0] as [number, number, number], scale: 0.65, color: '#8B5CF6', speed: 0.8 },
]

const lightShards = [
  { position: [-3.5, 1.5, -2] as [number, number, number], scale: 0.7, color: '#0066FF', speed: 0.9 },
  { position: [3.5, -0.5, -1.5] as [number, number, number], scale: 0.9, color: '#000000', speed: 0.75 },
  { position: [-2.5, -1.5, 1] as [number, number, number], scale: 0.55, color: '#00D4FF', speed: 1.1 },
  { position: [2.5, 2, 0.5] as [number, number, number], scale: 0.8, color: '#000000', speed: 0.7 },
  { position: [-1.5, 2.5, -1.5] as [number, number, number], scale: 0.45, color: '#0066FF', speed: 0.85 },
  { position: [1.5, -2, 1.5] as [number, number, number], scale: 0.6, color: '#000000', speed: 1 },
  { position: [4, 0.5, -0.5] as [number, number, number], scale: 0.5, color: '#00D4FF', speed: 0.95 },
  { position: [-4, -0.5, 0] as [number, number, number], scale: 0.65, color: '#000000', speed: 0.8 },
]

/* ------------------------------------------------------------------ */
/*  Checkpoint positions per section (9 sections × 8 shards)           */
/*  Each checkpoint is a beautiful arrangement the shards "settle" at  */
/* ------------------------------------------------------------------ */

const checkpoints: [number, number, number][][] = [
  // 0: Hero — classic diamond spread, clear center for title
  [
    [-3.5, 1.5, -2], [3.5, -0.5, -1.5], [-2.5, -1.5, 1], [2.5, 2, 0.5],
    [-1.5, 2.5, -1.5], [1.5, -2, 1.5], [4, 0.5, -0.5], [-4, -0.5, 0],
  ],
  // 1: Problem — pushed to edges, center empty (problem = emptiness)
  [
    [-4, 2.5, -1], [4, 1.8, -1.5], [-3.8, -2, 0.5], [4, -1.5, 0],
    [-4, 0.3, -2], [4, -3, -1], [-2.5, 3.2, 1], [3.5, 3, 0.5],
  ],
  // 2: Solution — diagonal cascade ↘ suggesting forward momentum
  [
    [-4, 3, -1], [-2.5, 2.2, 0.5], [-0.5, 1.2, -1.5], [1.5, 0.3, 1],
    [-3, -0.5, 0], [-1, -1.8, -1], [2.5, -2.5, 0.5], [4, -3, -1],
  ],
  // 3: Features — evenly framing the content grid
  [
    [-4, 2.5, -1], [0, 3, -0.5], [4, 2.5, 0], [-4, -1.5, 0.5],
    [0, -2, -1], [4, -1.5, 1], [-2.5, -3, -0.5], [2.5, -3, 0],
  ],
  // 4: BusinessWallet — orbital ring, organization
  [
    [-3.5, 2.5, -1], [0, 3.2, -0.5], [3.5, 2.5, 0.5], [4, 0, -1],
    [3.5, -2.5, 0], [0, -3.2, -0.5], [-3.5, -2.5, 1], [-4, 0, 0.5],
  ],
  // 5: Roadmap — aligned horizontal row, fits all screens
  [
    [-3.5, 0, -1], [-2.5, 0, -0.5], [-1.5, 0, 0.5], [-0.5, 0, -1],
    [0.5, 0, 0], [1.5, 0, -0.5], [2.5, 0, 1], [3.5, 0, -0.5],
  ],
  // 6: CTA — converging to center, focus attention
  [
    [-2, 1.5, -1], [2, 1.2, -0.5], [-1.5, -0.5, 0.5], [1.5, -0.8, 0],
    [-0.5, 2, -1.5], [0.5, -1.5, 1], [-3, 0, 0], [3, 0, -0.5],
  ],
  // 7: Footer — settled at bottom, calm ending
  [
    [-3.5, -1.5, -1], [3.5, -1.5, -0.5], [-2.5, -2.8, 0.5], [2.5, -2.8, 0],
    [-4, -0.5, -1.5], [4, -0.5, 0.5], [-1.5, -3.2, 0], [1.5, -3.2, -0.5],
  ],
]

/* ------------------------------------------------------------------ */
/*  Fixed z-depth layers — one per shard, prevents visual clipping     */
/* ------------------------------------------------------------------ */

const SHARD_Z_LAYERS = [-2.8, -2.0, -1.2, -0.4, 0.4, 1.2, 2.0, 2.8]

/* ------------------------------------------------------------------ */
/*  Math utilities                                                     */
/* ------------------------------------------------------------------ */

/** Seeded PRNG for deterministic "random" control points */
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Ken Perlin's smootherstep — zero velocity at endpoints */
function smootherstep(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * c * (c * (c * 6 - 15) + 10)
}

/** Cubic bezier evaluation for a single axis */
function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t
  return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3
}

/* ------------------------------------------------------------------ */
/*  Shared components                                                  */
/* ------------------------------------------------------------------ */

function Particles({ count = 100, isDark = false }) {
  const ref = useRef<THREE.Points>(null)

  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 25
    positions[i * 3 + 1] = (Math.random() - 0.5) * 25
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15
  }

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.01
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
        size={0.015}
        color={isDark ? '#FFFFFF' : '#000000'}
        transparent
        opacity={isDark ? 0.5 : 0.3}
        sizeAttenuation
      />
    </points>
  )
}

function MouseParallax({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const { viewport } = useThree()

  useFrame((state) => {
    if (!groupRef.current) return
    const x = (state.mouse.x * viewport.width) / 60
    const y = (state.mouse.y * viewport.height) / 60
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.08, 0.03)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.08, 0.03)
  })

  return <group ref={groupRef}>{children}</group>
}

function SceneLighting({ isDark }: { isDark: boolean }) {
  return (
    <>
      <Environment preset={isDark ? 'night' : 'city'} />
      <ambientLight intensity={isDark ? 0.3 : 0.4} />
      <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.8 : 1} />
      <directionalLight position={[-10, -10, -5]} intensity={isDark ? 0.4 : 0.5} />
      <directionalLight position={[0, -10, 0]} intensity={0.3} />
      <pointLight position={[0, 5, 0]} intensity={isDark ? 0.4 : 0.5} color={isDark ? '#8B5CF6' : '#FFFFFF'} />
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Hero-local ShardScene (kept for backward compat)                   */
/* ------------------------------------------------------------------ */

function ShardsGroup({ isDark = false }) {
  const shards = isDark ? darkShards : lightShards

  return (
    <MouseParallax>
      {shards.map((shard, i) => (
        <Float
          key={i}
          speed={1.5}
          rotationIntensity={0.3}
          floatIntensity={0.4}
        >
          <ShardSimple
            position={shard.position}
            scale={shard.scale}
            color={shard.color}
            speed={shard.speed}
            floatIntensity={0.2}
          />
        </Float>
      ))}
    </MouseParallax>
  )
}

export function ShardScene({ className = '' }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {isVisible && (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <SceneLighting isDark={isDark} />
            <ShardsGroup isDark={isDark} />
            <Particles count={80} isDark={isDark} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Global Scroll-Driven ShardScene — checkpoint interpolation         */
/* ------------------------------------------------------------------ */

/**
 * Each shard interpolates between checkpoint positions via cubic bezier.
 * Random control points per segment create organic, chaotic paths.
 */
function CheckpointShard({
  shard,
  index,
  scrollRef,
  positionScaleX,
  visualScale,
  maxX,
}: {
  shard: (typeof darkShards)[number]
  index: number
  scrollRef: React.MutableRefObject<number>
  positionScaleX: number
  visualScale: number
  maxX: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  // Pre-compute random bezier control point offsets for each segment (x,y only)
  // Reduced offsets (±1.5) to prevent shards flying off-screen during transitions
  const controlPoints = useMemo(() => {
    const rand = seededRandom(42 + index * 137)
    const numSegments = checkpoints.length - 1
    return Array.from({ length: numSegments }, () => ({
      cp1: [(rand() - 0.5) * 3, (rand() - 0.5) * 2.5] as [number, number],
      cp2: [(rand() - 0.5) * 3, (rand() - 0.5) * 2.5] as [number, number],
    }))
  }, [index])

  // Fixed z-depth — each shard stays on its own layer, no clipping
  const zDepth = SHARD_Z_LAYERS[index] ?? 0

  useFrame((state) => {
    if (!groupRef.current) return

    const scroll = scrollRef.current
    const numSegments = checkpoints.length - 1
    const rawSegment = scroll * numSegments

    const segIndex = Math.min(Math.floor(rawSegment), numSegments - 1)
    const t = smootherstep(rawSegment - segIndex)

    const from = checkpoints[segIndex][index]
    const to = checkpoints[Math.min(segIndex + 1, checkpoints.length - 1)][index]
    const cp = controlPoints[Math.min(segIndex, controlPoints.length - 1)]

    // Bezier control points = lerp between from/to + random offset (x,y only)
    const cp1x = from[0] + (to[0] - from[0]) * 0.33 + cp.cp1[0]
    const cp1y = from[1] + (to[1] - from[1]) * 0.33 + cp.cp1[1]

    const cp2x = from[0] + (to[0] - from[0]) * 0.66 + cp.cp2[0]
    const cp2y = from[1] + (to[1] - from[1]) * 0.66 + cp.cp2[1]

    // Cubic bezier path (x,y), fixed z-layer per shard
    const x = cubicBezier(from[0], cp1x, cp2x, to[0], t)
    const y = cubicBezier(from[1], cp1y, cp2y, to[1], t)

    // Small time-based noise for liveliness
    const time = state.clock.elapsedTime
    const noiseX = Math.sin(time * shard.speed * 0.4 + index * 2.1) * 0.12
    const noiseY = Math.cos(time * shard.speed * 0.3 + index * 1.7) * 0.08

    // Clamp both X and Y so shards never leave the visible viewport
    groupRef.current.position.x = Math.max(-maxX, Math.min(maxX, (x + noiseX) * positionScaleX))
    groupRef.current.position.y = Math.max(-3.4, Math.min(3.4, y + noiseY))
    groupRef.current.position.z = zDepth

    // Visual size scales gently so shards stay visible on small screens
    groupRef.current.scale.setScalar(visualScale)
  })

  return (
    <group ref={groupRef}>
      <ShardSimple
        position={[0, 0, 0]}
        scale={shard.scale}
        color={shard.color}
        speed={shard.speed}
        floatIntensity={0.15}
      />
    </group>
  )
}

function CheckpointShardsGroup({
  isDark,
  scrollRef,
}: {
  isDark: boolean
  scrollRef: React.MutableRefObject<number>
}) {
  const shards = isDark ? darkShards : lightShards
  const { viewport } = useThree()

  // Desktop viewport.width ≈ 13, phone ≈ 3.4
  // X scale: compress horizontal positions to fit narrow screens
  // Max checkpoint |x| = 4; keep within ~85% of half-viewport
  const positionScaleX = Math.min(1, (viewport.width * 0.42) / 4)
  // Visual scale: gentler so shards remain visible on small screens
  const visualScale = Math.min(1, 0.35 + (viewport.width / 13) * 0.65)
  // Hard clamp: shards never go beyond 90% of half-viewport
  const maxX = (viewport.width / 2) * 0.9

  return (
    <MouseParallax>
      {shards.map((shard, i) => (
        <CheckpointShard
          key={i}
          shard={shard}
          index={i}
          scrollRef={scrollRef}
          positionScaleX={positionScaleX}
          visualScale={visualScale}
          maxX={maxX}
        />
      ))}
    </MouseParallax>
  )
}

/** Fixed full-viewport 3D scene — shards follow checkpoints driven by shardProgress */
export function GlobalShardScene() {
  const [isClient, setIsClient] = useState(false)
  const { isDark } = useTheme()

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className="shard-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <SceneLighting isDark={isDark} />
          <CheckpointShardsGroup isDark={isDark} scrollRef={sharedProgress} />
          <Particles count={80} isDark={isDark} />
        </Suspense>
      </Canvas>
    </div>
  )
}
