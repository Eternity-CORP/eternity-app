'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const APP_URL = 'https://e-y-app.vercel.app'
const PARTICLE_COUNT = 300
const ANIMATION_DURATION = 1400 // 1.4s total

// Animation phases (normalized 0-1)
const PHASE = {
  PULL_END: 0.65,       // 0-0.91s: particles accelerate toward center
  COLLAPSE_END: 0.85,   // 0.91-1.19s: everything converges to point
  BLACKOUT_END: 1.0,    // 1.19-1.4s: fade to black
}

interface Particle {
  angle: number        // radial position angle
  radius: number       // starting distance from center (0-1, normalized)
  speed: number        // individual speed multiplier
  size: number         // particle size
  hue: number          // color hue
  saturation: number   // color saturation
  lightness: number    // color lightness
  trail: number        // trail length multiplier
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => {
    const colorRoll = Math.random()
    let hue: number, saturation: number, lightness: number
    if (colorRoll < 0.45) {
      // Purple family (#7c3aed range)
      hue = 260 + Math.random() * 20
      saturation = 70 + Math.random() * 20
      lightness = 55 + Math.random() * 15
    } else if (colorRoll < 0.85) {
      // Blue family (#3b82f6 range)
      hue = 210 + Math.random() * 20
      saturation = 75 + Math.random() * 20
      lightness = 55 + Math.random() * 20
    } else {
      // White/bright accent
      hue = 230 + Math.random() * 40
      saturation = 20 + Math.random() * 30
      lightness = 85 + Math.random() * 10
    }

    return {
      angle: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.7, // start from mid-to-edge
      speed: 0.5 + Math.random() * 1.0,
      size: 1 + Math.random() * 2.5,
      hue,
      saturation,
      lightness,
      trail: 0.3 + Math.random() * 0.7,
    }
  })
}

// Easing helpers
function easeInQuad(t: number) { return t * t }
function easeInCubic(t: number) { return t * t * t }
function easeInQuart(t: number) { return t * t * t * t }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

// Map a value from one phase range to 0-1
function phaseProgress(progress: number, start: number, end: number) {
  if (progress < start) return 0
  if (progress > end) return 1
  return (progress - start) / (end - start)
}

// --- Context ---
const WarpContext = createContext<{ startWarp: () => void }>({ startWarp: () => {} })

export function useWarp() {
  return useContext(WarpContext)
}

// --- Provider: wraps the page, renders overlay once ---
export function WarpProvider({ children }: { children: ReactNode }) {
  const [isWarping, setIsWarping] = useState(false)
  const [particles] = useState<Particle[]>(generateParticles)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const startWarp = useCallback(() => {
    setIsWarping(true)
    setTimeout(() => {
      window.location.href = APP_URL
    }, ANIMATION_DURATION + 200) // small buffer after animation ends
  }, [])

  useEffect(() => {
    if (!isWarping || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.scale(dpr, dpr)

    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2
    const maxRadius = Math.sqrt(cx * cx + cy * cy)
    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

      const pullP = phaseProgress(progress, 0, PHASE.PULL_END)
      const collapseP = phaseProgress(progress, PHASE.PULL_END, PHASE.COLLAPSE_END)
      const blackoutP = phaseProgress(progress, PHASE.COLLAPSE_END, PHASE.BLACKOUT_END)

      // Dark background
      ctx.fillStyle = '#0a0a1a'
      ctx.fillRect(0, 0, w, h)

      // --- Radial distortion rings (chromatic aberration feel) ---
      if (pullP > 0.1) {
        const ringIntensity = pullP < 0.8
          ? easeInQuad((pullP - 0.1) / 0.7)
          : 1.0 - easeInCubic(collapseP)
        const ringCount = 6
        for (let r = 0; r < ringCount; r++) {
          const baseRadius = maxRadius * (0.3 + r * 0.12) * (1 - easeInCubic(pullP) * 0.6 - collapseP * 0.35)
          if (baseRadius < 2) continue
          const alpha = ringIntensity * 0.12 * (1 - r / ringCount)

          // Red channel offset (outward)
          ctx.beginPath()
          ctx.arc(cx, cy, baseRadius + 3, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255, 80, 80, ${alpha * 0.7})`
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Blue/purple channel (inward)
          ctx.beginPath()
          ctx.arc(cx, cy, Math.max(baseRadius - 3, 1), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(124, 58, 237, ${alpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()

          // Core ring
          ctx.beginPath()
          ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(59, 130, 246, ${alpha * 0.5})`
          ctx.lineWidth = 1
          ctx.stroke()
        }
      }

      // --- Edge vignette with chromatic aberration ---
      const vignetteStrength = 0.3 + easeInQuad(pullP) * 0.5 + collapseP * 0.2
      // Purple-tinted vignette
      const vGrad = ctx.createRadialGradient(cx, cy, maxRadius * 0.15, cx, cy, maxRadius)
      vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
      vGrad.addColorStop(0.75, `rgba(40, 10, 80, ${vignetteStrength * 0.3})`)
      vGrad.addColorStop(1, `rgba(0, 0, 0, ${vignetteStrength})`)
      ctx.fillStyle = vGrad
      ctx.fillRect(0, 0, w, h)

      // --- Particles accelerating toward center ---
      for (const particle of particles) {
        // Current radius: starts at initial position, moves toward 0
        const pullEase = easeInCubic(pullP)
        const collapseEase = easeInQuart(collapseP)
        const radiusFraction = particle.radius * (1 - pullEase * 0.85) * (1 - collapseEase)
        const currentRadius = radiusFraction * maxRadius

        if (currentRadius < 1 && collapseP > 0) continue // already at center

        const px = cx + Math.cos(particle.angle) * currentRadius
        const py = cy + Math.sin(particle.angle) * currentRadius

        // Trail: line from current position toward where particle was
        const trailRadius = currentRadius + particle.trail * 30 * (pullEase + collapseEase * 2)
        const trailX = cx + Math.cos(particle.angle) * Math.min(trailRadius, maxRadius)
        const trailY = cy + Math.sin(particle.angle) * Math.min(trailRadius, maxRadius)

        // Alpha: particles get brighter as they accelerate, then fade at collapse
        const moveAlpha = Math.min(pullP * 2, 1)
        const fadeAlpha = 1 - collapseP * 0.8
        const alpha = moveAlpha * fadeAlpha * (0.4 + particle.speed * 0.4)

        // Size increases slightly as particles compress
        const size = particle.size * (1 + pullEase * 0.5)

        // Draw trail
        if (pullP > 0.15) {
          const trailGrad = ctx.createLinearGradient(trailX, trailY, px, py)
          trailGrad.addColorStop(0, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, 0)`)
          trailGrad.addColorStop(1, `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${alpha * 0.6})`)
          ctx.beginPath()
          ctx.moveTo(trailX, trailY)
          ctx.lineTo(px, py)
          ctx.strokeStyle = trailGrad
          ctx.lineWidth = size * 0.6
          ctx.lineCap = 'round'
          ctx.stroke()
        }

        // Draw particle head
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${particle.hue}, ${particle.saturation}%, ${particle.lightness}%, ${alpha})`
        ctx.fill()
      }

      // --- Central glow: grows as particles converge ---
      const glowIntensity = easeInQuad(pullP) * 0.6 + collapseP * 0.4
      const glowSize = 20 + glowIntensity * 180
      const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
      coreGlow.addColorStop(0, `rgba(124, 58, 237, ${glowIntensity * 0.8})`)   // purple core
      coreGlow.addColorStop(0.3, `rgba(59, 130, 246, ${glowIntensity * 0.5})`) // blue mid
      coreGlow.addColorStop(0.6, `rgba(99, 102, 241, ${glowIntensity * 0.2})`) // indigo
      coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = coreGlow
      ctx.fillRect(0, 0, w, h)

      // --- Collapse: bright flash at center point ---
      if (collapseP > 0.3) {
        const flashP = (collapseP - 0.3) / 0.7
        const flashEase = easeOutCubic(flashP)
        const flashSize = 5 + flashEase * 60
        const flashAlpha = flashEase * 0.9

        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, flashSize)
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`)
        flashGrad.addColorStop(0.3, `rgba(139, 92, 246, ${flashAlpha * 0.7})`)
        flashGrad.addColorStop(0.7, `rgba(59, 130, 246, ${flashAlpha * 0.3})`)
        flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = flashGrad
        ctx.fillRect(0, 0, w, h)
      }

      // --- Blackout: fade to black ---
      if (blackoutP > 0) {
        const blackAlpha = easeInQuad(blackoutP)
        ctx.fillStyle = `rgba(0, 0, 0, ${blackAlpha})`
        ctx.fillRect(0, 0, w, h)
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isWarping, particles])

  return (
    <WarpContext.Provider value={{ startWarp }}>
      {children}

      <AnimatePresence>
        {isWarping && (
          <motion.div
            className="fixed inset-0 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-[#0a0a1a]" />

            {/* Shard pull canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </WarpContext.Provider>
  )
}

// --- "Launch App" button (uses context) ---
export function WarpTransition() {
  const { startWarp } = useWarp()

  return (
    <button
      onClick={startWarp}
      className="group relative inline-flex items-center justify-center gap-2 px-7 py-3 text-base font-medium rounded-full transition-all duration-300 bg-transparent border dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black border-black text-black hover:bg-black hover:text-white"
    >
      <span className="relative z-10 flex items-center gap-2">
        Launch App
        <svg
          className="w-4 h-4 transition-transform group-hover:translate-x-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </button>
  )
}
