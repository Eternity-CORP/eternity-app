'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const APP_URL = 'https://e-y-app.vercel.app'
const DURATION = 4500
const PARTICLE_COUNT = 900

interface Particle {
  // spawn position (edges of screen)
  originX: number
  originY: number
  // current
  x: number
  y: number
  // orbit properties
  angle: number
  orbitSpeed: number
  orbitRadius: number
  baseOrbitRadius: number
  // burst properties
  burstAngle: number
  burstSpeed: number
  // visual
  size: number
  hue: number
  alpha: number
}

function easeInCubic(t: number) { return t * t * t }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }
function easeOutExpo(t: number) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t) }
function easeInExpo(t: number) { return t === 0 ? 0 : Math.pow(2, 10 * t - 10) }

// --- Context ---
const WarpContext = createContext<{ startWarp: () => void }>({ startWarp: () => {} })

export function useWarp() {
  return useContext(WarpContext)
}

// --- Provider ---
export function WarpProvider({ children }: { children: ReactNode }) {
  const [isWarping, setIsWarping] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const shakeRef = useRef({ x: 0, y: 0 })

  const startWarp = useCallback(() => {
    setIsWarping(true)
    setTimeout(() => {
      window.location.href = APP_URL
    }, DURATION)
  }, [])

  useEffect(() => {
    if (!isWarping || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)

    const cx = w / 2
    const cy = h / 2
    const maxDim = Math.max(w, h)
    const diag = Math.sqrt(w * w + h * h)

    // Create particles distributed in a wide ring around center
    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const spawnAngle = Math.random() * Math.PI * 2
      const spawnDist = diag * 0.25 + Math.random() * diag * 0.45
      const ox = cx + Math.cos(spawnAngle) * spawnDist
      const oy = cy + Math.sin(spawnAngle) * spawnDist

      const hueRoll = Math.random()
      let hue: number
      if (hueRoll < 0.35) hue = 200 + Math.random() * 20       // blue
      else if (hueRoll < 0.65) hue = 178 + Math.random() * 22  // cyan
      else if (hueRoll < 0.85) hue = 255 + Math.random() * 35  // purple
      else hue = 35 + Math.random() * 25                         // warm accent (rare)

      particles.push({
        originX: ox,
        originY: oy,
        x: ox,
        y: oy,
        angle: spawnAngle + Math.PI + (Math.random() - 0.5) * 0.8,
        orbitSpeed: 0.4 + Math.random() * 2.2,
        orbitRadius: spawnDist,
        baseOrbitRadius: spawnDist,
        burstAngle: spawnAngle + (Math.random() - 0.5) * 0.6,
        burstSpeed: 0.4 + Math.random() * 2,
        size: 0.5 + Math.random() * 2.5,
        hue,
        alpha: 0.3 + Math.random() * 0.7,
      })
    }

    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)

      /*
       * PHASES:
       * 0.00–0.35  ACCRETION   — particles spiral inward, trails persist
       * 0.35–0.50  SINGULARITY — all compress to center, energy rings, logo flash
       * 0.50–0.75  DETONATION  — massive explosion outward, shockwaves, flash
       * 0.75–1.00  WARP OUT    — speed lines, white-out, redirect
       */

      // --- Trail persistence (motion blur) ---
      // Don't fully clear canvas — paint semi-transparent black for organic trails
      if (progress < 0.50) {
        // Accretion + Singularity: medium trail persistence
        const trailAlpha = progress < 0.15 ? 0.25 : 0.12
        ctx.fillStyle = `rgba(0, 0, 0, ${trailAlpha})`
        ctx.fillRect(0, 0, w, h)
      } else if (progress < 0.75) {
        // Detonation: very long trails (low clear alpha)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.06)'
        ctx.fillRect(0, 0, w, h)
      } else {
        // Warp: clean canvas each frame
        ctx.fillStyle = 'rgb(0, 0, 0)'
        ctx.fillRect(0, 0, w, h)
      }

      // Screen shake during detonation
      if (progress >= 0.50 && progress < 0.70) {
        const shakeIntensity = (1 - (progress - 0.50) / 0.20) * 8
        shakeRef.current.x = (Math.random() - 0.5) * shakeIntensity
        shakeRef.current.y = (Math.random() - 0.5) * shakeIntensity
        ctx.save()
        ctx.translate(shakeRef.current.x, shakeRef.current.y)
      }

      // ============================
      // PHASE 1: ACCRETION (0–0.35)
      // ============================
      if (progress < 0.35) {
        const accP = progress / 0.35
        const shrink = 1 - easeInCubic(accP) * 0.97 // orbit → 3% of original
        const fadeIn = Math.min(1, accP * 3) // fade in first 33%
        const speedUp = 1 + accP * 4 // angular velocity increases

        for (const p of particles) {
          p.angle += p.orbitSpeed * 0.025 * speedUp
          p.orbitRadius = p.baseOrbitRadius * shrink

          p.x = cx + Math.cos(p.angle) * p.orbitRadius
          p.y = cy + Math.sin(p.angle) * p.orbitRadius

          const alpha = p.alpha * fadeIn
          const size = p.size * (1 - accP * 0.4)

          // Outer glow (bloom)
          if (size > 0.8) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${alpha * 0.08})`
            ctx.fill()
          }

          // Main particle
          ctx.beginPath()
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 85%, 70%, ${alpha})`
          ctx.fill()

          // Hot core
          if (size > 1) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, size * 0.35, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${p.hue}, 50%, 92%, ${alpha * 0.9})`
            ctx.fill()
          }
        }

        // Central glow grows
        const glowSize = 15 + easeInCubic(accP) * 200
        const glowAlpha = easeInCubic(accP) * 0.6
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
        glow.addColorStop(0, `rgba(0, 229, 255, ${glowAlpha})`)
        glow.addColorStop(0.3, `rgba(51, 136, 255, ${glowAlpha * 0.5})`)
        glow.addColorStop(0.7, `rgba(100, 80, 255, ${glowAlpha * 0.15})`)
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(0, 0, w, h)
      }

      // ==================================
      // PHASE 2: SINGULARITY (0.35–0.50)
      // ==================================
      if (progress >= 0.35 && progress < 0.50) {
        const singP = (progress - 0.35) / 0.15

        // Particles jitter at center
        for (const p of particles) {
          const jitter = (1 - easeInCubic(singP)) * 25
          p.x = cx + (Math.random() - 0.5) * jitter
          p.y = cy + (Math.random() - 0.5) * jitter

          const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(elapsed * 0.025 + p.angle * 3))
          const alpha = p.alpha * pulse
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * 0.25, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${alpha})`
          ctx.fill()
        }

        // Intense white-hot core
        const coreSize = 180 + singP * 280
        const coreAlpha = 0.5 + singP * 0.5
        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize)
        core.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`)
        core.addColorStop(0.08, `rgba(200, 240, 255, ${coreAlpha * 0.8})`)
        core.addColorStop(0.2, `rgba(0, 229, 255, ${coreAlpha * 0.4})`)
        core.addColorStop(0.5, `rgba(51, 136, 255, ${coreAlpha * 0.12})`)
        core.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = core
        ctx.fillRect(0, 0, w, h)

        // Energy rings pulse outward
        const ringCount = 4
        for (let r = 0; r < ringCount; r++) {
          const ringPhase = (singP * 2 + r * 0.25) % 1
          const ringRadius = ringPhase * maxDim * 0.35
          const ringAlpha = (1 - ringPhase) * 0.4
          if (ringAlpha > 0.01) {
            ctx.beginPath()
            ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(0, 229, 255, ${ringAlpha})`
            ctx.lineWidth = 2 + (1 - ringPhase) * 2
            ctx.stroke()
          }
        }
      }

      // ================================
      // PHASE 3: DETONATION (0.50–0.75)
      // ================================
      if (progress >= 0.50 && progress < 0.75) {
        const burstP = (progress - 0.50) / 0.25
        const burstEase = easeOutExpo(burstP)

        for (const p of particles) {
          const dist = burstEase * diag * 0.85 * p.burstSpeed
          p.x = cx + Math.cos(p.burstAngle) * dist
          p.y = cy + Math.sin(p.burstAngle) * dist

          const alpha = p.alpha * (1 - burstP * 0.6)
          const size = p.size * (0.8 + burstP * 3)

          // Long streaking trail (gradient line)
          const trailLen = burstEase * 60 * p.burstSpeed
          if (trailLen > 3) {
            const tx = p.x - Math.cos(p.burstAngle) * trailLen
            const ty = p.y - Math.sin(p.burstAngle) * trailLen
            const grad = ctx.createLinearGradient(tx, ty, p.x, p.y)
            grad.addColorStop(0, `hsla(${p.hue}, 80%, 70%, 0)`)
            grad.addColorStop(1, `hsla(${p.hue}, 80%, 70%, ${alpha * 0.7})`)
            ctx.beginPath()
            ctx.moveTo(tx, ty)
            ctx.lineTo(p.x, p.y)
            ctx.strokeStyle = grad
            ctx.lineWidth = size * 0.7
            ctx.lineCap = 'round'
            ctx.stroke()
          }

          // Particle head
          ctx.beginPath()
          ctx.arc(p.x, p.y, size, 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${p.hue}, 85%, 75%, ${alpha})`
          ctx.fill()

          // Bright core
          if (size > 1.5) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, size * 0.3, 0, Math.PI * 2)
            ctx.fillStyle = `hsla(${p.hue}, 40%, 95%, ${alpha * 0.7})`
            ctx.fill()
          }
        }

        // Central flash (peaks at start, fades)
        const flashAlpha = burstP < 0.15
          ? easeOutCubic(burstP / 0.15) * 0.9
          : 0.9 * (1 - easeInCubic((burstP - 0.15) / 0.85))
        if (flashAlpha > 0.01) {
          const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.5)
          flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`)
          flashGrad.addColorStop(0.15, `rgba(0, 229, 255, ${flashAlpha * 0.5})`)
          flashGrad.addColorStop(0.4, `rgba(51, 136, 255, ${flashAlpha * 0.15})`)
          flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = flashGrad
          ctx.fillRect(0, 0, w, h)
        }

        // Shockwave rings
        const shockCount = 3
        for (let s = 0; s < shockCount; s++) {
          const delay = s * 0.12
          const shockP = Math.max(0, burstP - delay)
          if (shockP > 0 && shockP < 0.8) {
            const radius = easeOutCubic(shockP / 0.8) * maxDim * 0.7
            const alpha = (1 - shockP / 0.8) * 0.5
            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`
            ctx.lineWidth = 3 * (1 - shockP / 0.8)
            ctx.stroke()
          }
        }
      }

      // Restore from screen shake
      if (progress >= 0.50 && progress < 0.70) {
        ctx.restore()
      }

      // ==============================
      // PHASE 4: WARP OUT (0.75–1.00)
      // ==============================
      if (progress >= 0.75) {
        const warpP = (progress - 0.75) / 0.25
        const warpEase = easeInExpo(warpP)

        // Remaining particles still flying outward (subtle)
        for (const p of particles) {
          const dist = diag * 0.85 * p.burstSpeed + warpP * diag * 0.3 * p.burstSpeed
          p.x = cx + Math.cos(p.burstAngle) * dist
          p.y = cy + Math.sin(p.burstAngle) * dist
          const alpha = p.alpha * (1 - warpP) * 0.3

          if (alpha > 0.01) {
            // Stretched warp lines
            const stretchLen = 30 + warpEase * 200 * p.burstSpeed
            const tx = p.x - Math.cos(p.burstAngle) * stretchLen
            const ty = p.y - Math.sin(p.burstAngle) * stretchLen
            ctx.beginPath()
            ctx.moveTo(tx, ty)
            ctx.lineTo(p.x, p.y)
            ctx.strokeStyle = `hsla(${p.hue}, 70%, 80%, ${alpha})`
            ctx.lineWidth = 1 + warpP * 1.5
            ctx.lineCap = 'round'
            ctx.stroke()
          }
        }

        // Dedicated warp speed lines
        const lineCount = 80
        for (let i = 0; i < lineCount; i++) {
          const angle = (i / lineCount) * Math.PI * 2 + elapsed * 0.0008
          const innerR = 3 + warpEase * 15
          const outerR = innerR + 40 + warpEase * maxDim * 0.9

          const x1 = cx + Math.cos(angle) * innerR
          const y1 = cy + Math.sin(angle) * innerR
          const x2 = cx + Math.cos(angle) * outerR
          const y2 = cy + Math.sin(angle) * outerR

          const lineAlpha = 0.15 + warpP * 0.6
          const grad = ctx.createLinearGradient(x1, y1, x2, y2)
          grad.addColorStop(0, `rgba(255, 255, 255, ${lineAlpha * 0.05})`)
          grad.addColorStop(0.3, `rgba(200, 235, 255, ${lineAlpha})`)
          grad.addColorStop(0.7, `rgba(150, 200, 255, ${lineAlpha * 0.5})`)
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)')

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = grad
          ctx.lineWidth = 0.8 + warpP * 2.5
          ctx.stroke()
        }

        // Central bright core during warp
        const coreSize = 30 + warpP * 60
        const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreSize)
        coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.6 + warpP * 0.4})`)
        coreGlow.addColorStop(0.3, `rgba(0, 229, 255, ${0.2 * (1 - warpP)})`)
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = coreGlow
        ctx.fillRect(0, 0, w, h)

        // Progressive white-out
        ctx.fillStyle = `rgba(255, 255, 255, ${easeInCubic(warpP)})`
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
  }, [isWarping])

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
            <canvas ref={canvasRef} className="absolute inset-0" />

            {/* "Entering Eternity" — appears during singularity, fades during detonation */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0, 0, 0, 1, 1, 0],
                scale: [0.8, 0.8, 0.8, 1, 1, 1.15],
              }}
              transition={{
                duration: DURATION / 1000,
                times: [0, 0.30, 0.38, 0.43, 0.52, 0.62],
                ease: 'easeOut',
              }}
            >
              <span
                className="text-xl md:text-3xl font-bold tracking-[0.35em] text-white uppercase select-none"
                style={{
                  textShadow: '0 0 40px rgba(0,229,255,0.9), 0 0 80px rgba(51,136,255,0.6), 0 0 120px rgba(100,80,255,0.3)',
                }}
              >
                Entering Eternity
              </span>
            </motion.div>
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
