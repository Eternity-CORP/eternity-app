'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER, GLASS_PATHS, samplePathPoints } from './logoPathData'

const APP_URL = 'https://e-y-app.vercel.app'
const DURATION = 4500

/* ---- Easings ---- */
function easeInCubic(t: number) {
  return t * t * t
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

/* ---- Particle type ---- */
interface Particle {
  x: number
  y: number
  targetX: number
  targetY: number
  vx: number
  vy: number
  hue: number
  size: number
  alpha: number
  arrived: boolean
  // Trail positions (last N positions for fading line)
  trail: Array<{ x: number; y: number }>
  // Phase for gentle oscillation once arrived
  oscillatePhase: number
  oscillateAmp: number
}

/* ---- Helpers ---- */
function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickHue(): number {
  const r = Math.random()
  if (r < 0.5) return randomRange(200, 220) // blue
  if (r < 0.85) return randomRange(178, 200) // cyan
  return randomRange(255, 290) // purple
}

/* ---- Context ---- */
const WarpContext = createContext<{ startWarp: () => void }>({ startWarp: () => {} })

export function useWarp() {
  return useContext(WarpContext)
}

/* ---- Provider ---- */
export function WarpProvider({ children }: { children: ReactNode }) {
  const [isWarping, setIsWarping] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const pathEntriesRef = useRef<Array<{ key: string; path2d: Path2D }>>([])
  const glassPathsRef = useRef<Array<{ key: string; path2d: Path2D }>>([])
  const { isDark } = useTheme()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

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

    // Scale logo to fit ~180px wide, centered
    const logoScale = 180 / LOGO_VIEWBOX.width
    const logoX = cx - (LOGO_VIEWBOX.width * logoScale) / 2
    const logoY = cy - (LOGO_VIEWBOX.height * logoScale) / 2

    // Prepare Path2D objects for crystallize phase
    pathEntriesRef.current = DRAW_ORDER.map((key) => ({
      key,
      path2d: new Path2D(LOGO_PATHS[key]),
    }))
    glassPathsRef.current = GLASS_PATHS.map((key) => ({
      key,
      path2d: new Path2D(LOGO_PATHS[key]),
    }))

    // Sample target points from all DRAW_ORDER paths
    const POINTS_PER_PATH = 68
    const allTargets: Array<{ x: number; y: number }> = []

    for (const key of DRAW_ORDER) {
      const pathD = LOGO_PATHS[key]
      const points = samplePathPoints(pathD, POINTS_PER_PATH)
      for (const pt of points) {
        // Transform from SVG viewBox coords to screen coords
        allTargets.push({
          x: logoX + pt.x * logoScale,
          y: logoY + pt.y * logoScale,
        })
      }
    }

    // Create particles (one per target point)
    const particles: Particle[] = allTargets.map((target) => ({
      // Start at random position on screen
      x: randomRange(0, w),
      y: randomRange(0, h),
      targetX: target.x,
      targetY: target.y,
      vx: randomRange(-0.5, 0.5),
      vy: randomRange(-0.5, 0.5),
      hue: pickHue(),
      size: randomRange(1, 3),
      alpha: randomRange(0.3, 0.8),
      arrived: false,
      trail: [],
      oscillatePhase: randomRange(0, Math.PI * 2),
      oscillateAmp: randomRange(1, 3),
    }))

    particlesRef.current = particles

    startTimeRef.current = performance.now()

    const TRAIL_MAX = 8

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const dark = isDarkRef.current

      // Clear with theme background
      ctx.fillStyle = dark ? '#000000' : '#ffffff'
      ctx.fillRect(0, 0, w, h)

      // ================================================================
      // PHASE 1: CHAOS (0 - 0.33)
      // Particles float randomly like stars
      // ================================================================
      if (progress < 0.33) {
        const chaosP = progress / 0.33

        for (const p of particles) {
          // Gentle random drift
          p.x += p.vx
          p.y += p.vy

          // Soft random perturbation
          p.vx += randomRange(-0.02, 0.02)
          p.vy += randomRange(-0.02, 0.02)

          // Dampen velocity
          p.vx *= 0.99
          p.vy *= 0.99

          // Wrap around screen edges
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10
          if (p.y < -10) p.y = h + 10
          if (p.y > h + 10) p.y = -10

          // Draw particle
          const fadeIn = Math.min(1, chaosP * 3) // fade in during first third of chaos
          const a = p.alpha * fadeIn
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = dark
            ? `hsla(${p.hue}, 80%, 65%, ${a})`
            : `hsla(${p.hue}, 60%, 45%, ${a * 0.7})`
          ctx.fill()
        }
      }

      // ================================================================
      // PHASE 2: ASSEMBLY (0.33 - 0.62)
      // Particles attracted to logo positions with trailing lines
      // ================================================================
      if (progress >= 0.33 && progress < 0.62) {
        const assemblyP = (progress - 0.33) / 0.29
        // easeInCubic makes attraction accelerate: slow start, fast end
        const attraction = easeInCubic(assemblyP)

        for (const p of particles) {
          // Store trail position
          p.trail.push({ x: p.x, y: p.y })
          if (p.trail.length > TRAIL_MAX) {
            p.trail.shift()
          }

          // Calculate direction to target
          const dx = p.targetX - p.x
          const dy = p.targetY - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          // Arrival threshold
          if (dist < 2) {
            p.arrived = true
          }

          if (p.arrived) {
            // Gently oscillate at target position
            const osc = Math.sin(performance.now() * 0.003 + p.oscillatePhase) * p.oscillateAmp * (1 - attraction)
            p.x = p.targetX + osc
            p.y = p.targetY + osc * 0.5
          } else {
            // Mix: some random drift + increasing attraction to target
            const attractForce = attraction * 0.15 + 0.01
            p.vx += (dx / dist) * attractForce * dist * 0.01
            p.vy += (dy / dist) * attractForce * dist * 0.01

            // Dampen
            p.vx *= 0.92
            p.vy *= 0.92

            // Clamp velocity for stability
            const maxVel = 12 + attraction * 20
            const vel = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
            if (vel > maxVel) {
              p.vx = (p.vx / vel) * maxVel
              p.vy = (p.vy / vel) * maxVel
            }

            p.x += p.vx
            p.y += p.vy
          }

          // Draw trail (fading line behind particle)
          if (p.trail.length > 1) {
            const trailAlpha = (1 - attraction * 0.5) * 0.4
            for (let i = 1; i < p.trail.length; i++) {
              const segAlpha = (i / p.trail.length) * trailAlpha
              ctx.beginPath()
              ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y)
              ctx.lineTo(p.trail[i].x, p.trail[i].y)
              ctx.strokeStyle = dark
                ? `hsla(${p.hue}, 80%, 65%, ${segAlpha})`
                : `hsla(${p.hue}, 60%, 45%, ${segAlpha * 0.6})`
              ctx.lineWidth = p.size * 0.5
              ctx.stroke()
            }
          }

          // Draw particle
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = dark
            ? `hsla(${p.hue}, 80%, 65%, ${p.alpha})`
            : `hsla(${p.hue}, 60%, 45%, ${p.alpha * 0.7})`
          ctx.fill()
        }
      }

      // ================================================================
      // PHASE 3: CRYSTALLIZE (0.62 - 0.78)
      // Particles lock, SVG fills fade in, text appears
      // ================================================================
      if (progress >= 0.62 && progress < 0.78) {
        const crystP = (progress - 0.62) / 0.16
        const eased = easeOutCubic(crystP)

        // Particles shrink and fade as solid logo appears
        const particleScale = 1 - eased * 0.8
        const particleAlpha = 1 - eased

        for (const p of particles) {
          // Snap particles to their target (they should already be close)
          const snapStrength = Math.min(1, crystP * 3)
          p.x = p.x + (p.targetX - p.x) * snapStrength
          p.y = p.y + (p.targetY - p.y) * snapStrength

          if (particleAlpha > 0.01) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.size * particleScale, 0, Math.PI * 2)
            ctx.fillStyle = dark
              ? `hsla(${p.hue}, 80%, 65%, ${p.alpha * particleAlpha})`
              : `hsla(${p.hue}, 60%, 45%, ${p.alpha * particleAlpha * 0.7})`
            ctx.fill()
          }
        }

        // Fade in the solid logo SVG paths
        ctx.save()
        ctx.translate(logoX, logoY)
        ctx.scale(logoScale, logoScale)
        ctx.globalAlpha = eased

        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntriesRef.current) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }
        for (const glass of glassPathsRef.current) {
          ctx.fillStyle = dark
            ? 'rgba(177, 172, 172, 0.15)'
            : 'rgba(177, 172, 172, 0.2)'
          ctx.fill(glass.path2d)
        }

        ctx.restore()

        // Soft radial glow beneath the logo (builds up)
        const glowAlpha = eased * 0.35
        if (glowAlpha > 0.01) {
          const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200)
          if (dark) {
            glowGrad.addColorStop(0, `rgba(51, 136, 255, ${glowAlpha})`)
            glowGrad.addColorStop(0.5, `rgba(0, 229, 255, ${glowAlpha * 0.3})`)
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          } else {
            glowGrad.addColorStop(0, `rgba(0, 80, 220, ${glowAlpha * 0.5})`)
            glowGrad.addColorStop(0.5, `rgba(0, 80, 220, ${glowAlpha * 0.15})`)
            glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          }
          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(cx, cy, 200, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ================================================================
      // PHASE 4: PORTAL (0.78 - 1.00)
      // Gradient ring expands from center, everything fades
      // ================================================================
      if (progress >= 0.78) {
        const portalP = (progress - 0.78) / 0.22
        const ringEased = easeOutCubic(portalP)

        // Draw the solid logo (fading out in last 10%)
        const logoFadeStart = 0.9 // logo starts fading at 90% of portal phase
        let logoAlpha = 1
        if (portalP > logoFadeStart) {
          logoAlpha = 1 - (portalP - logoFadeStart) / (1 - logoFadeStart)
        }

        if (logoAlpha > 0.01) {
          ctx.save()
          ctx.translate(logoX, logoY)
          ctx.scale(logoScale, logoScale)
          ctx.globalAlpha = logoAlpha

          const fillColor = dark ? '#ffffff' : '#1a1a1a'
          for (const entry of pathEntriesRef.current) {
            ctx.fillStyle = fillColor
            ctx.fill(entry.path2d)
          }
          for (const glass of glassPathsRef.current) {
            ctx.fillStyle = dark
              ? 'rgba(177, 172, 172, 0.15)'
              : 'rgba(177, 172, 172, 0.2)'
            ctx.fill(glass.path2d)
          }

          ctx.restore()
        }

        // Soft radial glow (fading out)
        const glowFade = 1 - easeOutCubic(Math.min(1, portalP * 2))
        if (glowFade > 0.01) {
          const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200)
          const ga = 0.35 * glowFade
          if (dark) {
            glowGrad.addColorStop(0, `rgba(51, 136, 255, ${ga})`)
            glowGrad.addColorStop(0.5, `rgba(0, 229, 255, ${ga * 0.3})`)
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          } else {
            glowGrad.addColorStop(0, `rgba(0, 80, 220, ${ga * 0.5})`)
            glowGrad.addColorStop(0.5, `rgba(0, 80, 220, ${ga * 0.15})`)
            glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          }
          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(cx, cy, 200, 0, Math.PI * 2)
          ctx.fill()
        }

        // Expanding gradient ring
        const maxRadius = Math.sqrt(cx * cx + cy * cy) * 1.2 // reach corners
        const ringRadius = ringEased * maxRadius
        const ringThickness = 80 + ringEased * 120

        if (ringRadius > 0) {
          const innerR = Math.max(0, ringRadius - ringThickness)
          const outerR = ringRadius

          // The ring itself is a soft gradient donut
          // We draw it as a radial gradient from inner to outer
          const ringGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR)
          if (dark) {
            ringGrad.addColorStop(0, 'rgba(51, 136, 255, 0)')
            ringGrad.addColorStop(0.3, `rgba(51, 136, 255, ${0.08 * (1 - portalP)})`)
            ringGrad.addColorStop(0.5, `rgba(0, 229, 255, ${0.12 * (1 - portalP)})`)
            ringGrad.addColorStop(0.7, `rgba(51, 136, 255, ${0.08 * (1 - portalP)})`)
            ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          } else {
            ringGrad.addColorStop(0, 'rgba(0, 80, 220, 0)')
            ringGrad.addColorStop(0.3, `rgba(0, 80, 220, ${0.06 * (1 - portalP)})`)
            ringGrad.addColorStop(0.5, `rgba(51, 136, 255, ${0.08 * (1 - portalP)})`)
            ringGrad.addColorStop(0.7, `rgba(0, 80, 220, ${0.06 * (1 - portalP)})`)
            ringGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          }

          ctx.fillStyle = ringGrad
          ctx.beginPath()
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
          ctx.fill()

          // Fade everything behind the ring's leading edge
          // As ring passes, area behind it smoothly fades to background
          const fadeRadius = Math.max(0, ringRadius - ringThickness * 0.5)
          if (fadeRadius > 5) {
            const fadeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, fadeRadius)
            const fadeBg = dark ? '0, 0, 0' : '255, 255, 255'
            const fadeStrength = easeInCubic(portalP) * 0.6
            fadeGrad.addColorStop(0, `rgba(${fadeBg}, ${fadeStrength})`)
            fadeGrad.addColorStop(0.7, `rgba(${fadeBg}, ${fadeStrength * 0.8})`)
            fadeGrad.addColorStop(1, `rgba(${fadeBg}, 0)`)

            ctx.fillStyle = fadeGrad
            ctx.beginPath()
            ctx.arc(cx, cy, fadeRadius, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Final smooth fade (last ~7% of total progress)
        if (progress >= 0.93) {
          const fadeP = (progress - 0.93) / 0.07
          ctx.fillStyle = dark
            ? `rgba(0, 0, 0, ${fadeP})`
            : `rgba(255, 255, 255, ${fadeP})`
          ctx.fillRect(0, 0, w, h)
        }
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

            {/* "ETERNITY" text -- appears during Crystallize phase */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: [0, 0, 0, 1, 1, 0],
                y: [10, 10, 10, 0, 0, 0],
              }}
              transition={{
                duration: DURATION / 1000,
                times: [0, 0.58, 0.65, 0.72, 0.80, 0.90],
                ease: 'easeOut',
              }}
            >
              {/* Letter-spacing animation via keyframes */}
              <motion.span
                className="absolute text-sm md:text-base font-medium uppercase select-none"
                style={{
                  top: '50%',
                  marginTop: '120px',
                  color: isDarkRef.current
                    ? 'rgba(255, 255, 255, 0.5)'
                    : 'rgba(0, 0, 0, 0.35)',
                }}
                animate={{
                  letterSpacing: ['0.5em', '0.3em', '0.3em'],
                }}
                transition={{
                  duration: DURATION / 1000,
                  times: [0.65, 0.75, 1],
                  ease: 'easeOut',
                }}
              >
                ETERNITY
              </motion.span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </WarpContext.Provider>
  )
}

/* ---- Exported button (unchanged API) ---- */
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
