'use client'

import { useRef, useMemo } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

interface Shard {
  id: number
  x: number // % from left
  y: number // % from top (viewport)
  size: number // px
  rotation: number // initial deg
  speed: number // parallax multiplier (how much scroll affects position)
  driftDuration: number // seconds for drift cycle
  driftX: number // px range for horizontal drift
  driftY: number // px range for vertical drift
  opacity: number
  color: 'blue' | 'cyan' | 'white'
  delay: number // animation delay
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function generateShards(count: number): Shard[] {
  const rand = seededRandom(42)
  const colors: Shard['color'][] = ['blue', 'cyan', 'white']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: 5 + rand() * 90, // 5-95% from left (avoid edges)
    y: 5 + rand() * 90, // 5-95% from top (within viewport)
    size: 6 + rand() * 14,
    rotation: rand() * 360,
    speed: 0.03 + rand() * 0.07, // parallax factor
    driftDuration: 14 + rand() * 20,
    driftX: 20 + rand() * 50,
    driftY: 15 + rand() * 40,
    opacity: 0.12 + rand() * 0.2,
    color: colors[Math.floor(rand() * colors.length)],
    delay: rand() * 8,
  }))
}

const SHARD_COUNT = 14

const colorMap = {
  blue: 'var(--accent-blue)',
  cyan: 'var(--accent-cyan)',
  white: 'var(--foreground)',
}

function ShardShape({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  const half = size / 2
  return (
    <svg width={size} height={size * 1.4} viewBox={`0 0 ${size} ${size * 1.4}`} fill="none">
      <polygon
        points={`${half},0 ${size},${size * 0.5} ${half},${size * 1.4} 0,${size * 0.5}`}
        fill={color}
        opacity={opacity}
      />
      <polygon
        points={`${half},0 ${size},${size * 0.5} ${half},${size * 0.5}`}
        fill={color}
        opacity={opacity * 1.4}
      />
    </svg>
  )
}

function FloatingShard({ shard }: { shard: Shard }) {
  const { scrollY } = useScroll()

  // Scroll-driven displacement — each shard moves at its own pace
  // Use modulo to keep shards cycling within viewport as user scrolls
  const rawY = useTransform(scrollY, (v) => {
    const displacement = v * shard.speed
    // Create a gentle sine wave so shards oscillate instead of flying off screen
    return Math.sin(displacement * 0.003) * 80
  })
  const y = useSpring(rawY, { stiffness: 25, damping: 18, mass: 1.2 })

  const rawX = useTransform(scrollY, (v) => {
    return Math.cos(v * shard.speed * 0.002 + shard.id) * 40
  })
  const x = useSpring(rawX, { stiffness: 25, damping: 18, mass: 1.2 })

  const rawRotate = useTransform(scrollY, (v) => shard.rotation + Math.sin(v * 0.001) * 30)
  const rotate = useSpring(rawRotate, { stiffness: 15, damping: 12 })

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${shard.x}%`,
        top: `${shard.y}%`,
        x,
        y,
        rotate,
        willChange: 'transform',
      }}
    >
      <motion.div
        animate={{
          x: [0, shard.driftX, -shard.driftX * 0.6, shard.driftX * 0.3, 0],
          y: [0, -shard.driftY, shard.driftY * 0.8, -shard.driftY * 0.4, 0],
          rotate: [0, 12, -8, 4, 0],
        }}
        transition={{
          duration: shard.driftDuration,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: shard.delay,
        }}
      >
        <ShardShape
          size={shard.size}
          color={colorMap[shard.color]}
          opacity={shard.opacity}
        />
      </motion.div>
    </motion.div>
  )
}

export function FloatingShards() {
  const shards = useMemo(() => generateShards(SHARD_COUNT), [])
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden pointer-events-none z-[1]"
      aria-hidden="true"
    >
      {shards.map((shard) => (
        <FloatingShard key={shard.id} shard={shard} />
      ))}
    </div>
  )
}
