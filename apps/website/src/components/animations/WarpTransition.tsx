'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const APP_URL = 'https://e-y-app.vercel.app'
const STAR_COUNT = 400
const ANIMATION_DURATION = 6500

// Animation phases (normalized 0-1)
const PHASE = {
  CHARGE_END: 0.15,    // 0–1s: stars appear, subtle drift
  ENGAGE_END: 0.35,    // 1–2.3s: sudden acceleration
  CRUISE_END: 0.80,    // 2.3–5.2s: full hyperspace tunnel
  BURST_START: 0.82,   // 5.3s: blue burst begins
}

interface Star {
  id: number
  x: number
  y: number
  angle: number
  speed: number
  size: number
  delay: number
  hue: number
  layer: number
}

function generateStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 0.4 + 0.03
    const layer = i < 120 ? 0 : i < 280 ? 1 : 2
    // Color palette: cyan, teal, blue, purple accents
    const hueRoll = Math.random()
    let hue: number
    if (hueRoll < 0.35) hue = 190 + Math.random() * 20       // cyan/teal
    else if (hueRoll < 0.65) hue = 210 + Math.random() * 20   // blue
    else if (hueRoll < 0.85) hue = 170 + Math.random() * 15   // aqua
    else hue = 260 + Math.random() * 30                        // purple accent

    return {
      id: i,
      x: 50 + Math.cos(angle) * distance * 50,
      y: 50 + Math.sin(angle) * distance * 50,
      angle,
      speed: (Math.random() * 0.5 + 0.5) * (0.6 + layer * 0.3),
      size: (Math.random() * 1.5 + 0.5) * (0.7 + layer * 0.3),
      delay: Math.random() * 300 * (1 - layer * 0.3),
      hue,
      layer,
    }
  })
}

// Easing helpers
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
  const [stars] = useState<Star[]>(generateStars)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const startWarp = useCallback(() => {
    setIsWarping(true)
    setTimeout(() => {
      window.location.href = APP_URL
    }, ANIMATION_DURATION)
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
    const maxDim = Math.max(w, h)
    // Scale down streaks on narrow screens so they don't fill everything
    const mobileScale = Math.min(w / 1000, 1) // 1.0 on desktop, ~0.39 on iPhone
    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

      // Phase-based acceleration curve
      const chargeP = phaseProgress(progress, 0, PHASE.CHARGE_END)
      const engageP = phaseProgress(progress, PHASE.CHARGE_END, PHASE.ENGAGE_END)
      const cruiseP = phaseProgress(progress, PHASE.ENGAGE_END, PHASE.CRUISE_END)
      const burstP = phaseProgress(progress, PHASE.BURST_START, 1)

      // Overall speed multiplier
      const speedMult =
        chargeP < 1 ? easeInCubic(chargeP) * 0.05 :
        engageP < 1 ? 0.05 + easeInQuart(engageP) * 0.95 :
        1.0

      // Screen shake during engage phase
      const shakeAmount = engageP > 0 && engageP < 1 ? Math.sin(elapsed * 0.05) * 3 * engageP * (1 - engageP) : 0
      const shakeX = shakeAmount * Math.cos(elapsed * 0.03)
      const shakeY = shakeAmount * Math.sin(elapsed * 0.04)

      ctx.save()
      ctx.translate(shakeX, shakeY)

      // Black background with slight deep blue tint during cruise
      const bgBlue = cruiseP > 0 ? Math.floor(10 * easeOutCubic(cruiseP)) : 0
      ctx.fillStyle = `rgb(0, 0, ${bgBlue})`
      ctx.fillRect(-10, -10, w + 20, h + 20)

      // --- Draw tunnel rings during cruise ---
      if (cruiseP > 0) {
        const ringAlpha = 0.04 * easeOutCubic(cruiseP)
        const ringCount = 8
        for (let r = 0; r < ringCount; r++) {
          const ringPhase = ((elapsed * 0.001 + r * 0.12) % 1)
          const ringRadius = ringPhase * maxDim * 0.8
          const ringFade = (1 - ringPhase) * ringAlpha
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
          // Alternating cyan and blue rings
          const ringHue = r % 2 === 0 ? 190 : 220
          ctx.strokeStyle = `hsla(${ringHue}, 80%, 60%, ${ringFade})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // --- Draw stars ---
      for (const star of stars) {
        if (elapsed < star.delay) continue

        const starElapsed = elapsed - star.delay
        const starMaxDur = ANIMATION_DURATION - star.delay
        const starProgress = Math.min(starElapsed / starMaxDur, 1)

        const starSpeed = speedMult * star.speed

        const startX = (star.x / 100) * w
        const startY = (star.y / 100) * h

        const dx = startX - cx
        const dy = startY - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const normX = dist > 0 ? dx / dist : 0
        const normY = dist > 0 ? dy / dist : 0

        const stretch = starSpeed * maxDim * 1.5 * (0.4 + mobileScale * 0.6)

        const tailMult = speedMult > 0.5 ? 0.6 + speedMult * 0.4 : speedMult * 1.2
        const tailLength = Math.min(stretch * tailMult, 500 * mobileScale)

        const endX = startX + normX * stretch
        const endY = startY + normY * stretch
        const tailX = endX - normX * tailLength
        const tailY = endY - normY * tailLength

        // Brightness: dim during charge, bright during engage, dim in burst
        const fadeIn = Math.min(starElapsed / 200, 1)
        const fadeOut = 1 - burstP * 0.8
        const layerBrightness = 0.5 + star.layer * 0.25
        const alpha = fadeIn * fadeOut * layerBrightness * (0.3 + speedMult * 0.7)
        const width = star.size * (1 + speedMult * 3) * (0.6 + mobileScale * 0.4)

        // Color: more saturated, shift toward white at high speed
        const saturation = Math.max(20, 100 - speedMult * 50)
        const lightness = 65 + speedMult * 25
        const headColor = `hsla(${star.hue}, ${saturation}%, ${lightness}%, ${alpha})`
        const midColor = `hsla(${star.hue}, ${Math.min(saturation + 20, 100)}%, ${lightness - 10}%, ${alpha * 0.5})`

        if (speedMult < 0.02) {
          // Charge phase: twinkling dots
          const twinkle = 0.5 + 0.5 * Math.sin(starElapsed * 0.01 + star.id)
          ctx.beginPath()
          ctx.arc(startX, startY, star.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${star.hue}, 80%, 80%, ${alpha * twinkle})`
          ctx.fill()
        } else {
          // Streak
          const gradient = ctx.createLinearGradient(tailX, tailY, endX, endY)
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
          gradient.addColorStop(0.2, midColor)
          gradient.addColorStop(1, headColor)

          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(endX, endY)
          ctx.strokeStyle = gradient
          ctx.lineWidth = width
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      // --- Central glow: engine core (cyan/blue) ---
      const glowIntensity = speedMult
      const glowSize = (30 + glowIntensity * 350 + (cruiseP > 0 ? Math.sin(elapsed * 0.005) * 30 : 0)) * (0.5 + mobileScale * 0.5)
      const glowGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
      glowGradient.addColorStop(0, `rgba(0, 229, 255, ${0.4 * glowIntensity})`)
      glowGradient.addColorStop(0.3, `rgba(51, 136, 255, ${0.2 * glowIntensity})`)
      glowGradient.addColorStop(0.6, `rgba(80, 120, 255, ${0.08 * glowIntensity})`)
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glowGradient
      ctx.fillRect(-10, -10, w + 20, h + 20)

      // --- Vignette: darkened edges during cruise ---
      if (cruiseP > 0) {
        const vignetteAlpha = 0.6 * easeOutCubic(cruiseP)
        const vGrad = ctx.createRadialGradient(cx, cy, maxDim * 0.2, cx, cy, maxDim * 0.7)
        vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
        vGrad.addColorStop(1, `rgba(0, 0, 0, ${vignetteAlpha})`)
        ctx.fillStyle = vGrad
        ctx.fillRect(-10, -10, w + 20, h + 20)
      }

      // --- Final burst: blue/cyan radial light from center → fade to black ---
      if (burstP > 0) {
        // Bright radial glow from center
        const burstEase = easeOutCubic(burstP)
        const burstRadius = burstEase * maxDim * 0.6
        const burstAlpha = burstP < 0.4 ? easeInCubic(burstP / 0.4) * 0.7 : 0.7 * (1 - easeOutCubic((burstP - 0.4) / 0.6))

        const burstGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, burstRadius + 100)
        burstGrad.addColorStop(0, `rgba(0, 229, 255, ${burstAlpha})`)
        burstGrad.addColorStop(0.3, `rgba(51, 136, 255, ${burstAlpha * 0.6})`)
        burstGrad.addColorStop(0.6, `rgba(30, 60, 180, ${burstAlpha * 0.3})`)
        burstGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = burstGrad
        ctx.fillRect(-10, -10, w + 20, h + 20)

        // Black fade-in on top (last 50% of burst)
        if (burstP > 0.5) {
          const blackFade = easeInCubic((burstP - 0.5) / 0.5)
          ctx.fillStyle = `rgba(0, 0, 0, ${blackFade})`
          ctx.fillRect(-10, -10, w + 20, h + 20)
        }
      }

      ctx.restore()

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationRef.current)
    }
  }, [isWarping, stars])

  return (
    <WarpContext.Provider value={{ startWarp }}>
      {children}

      <AnimatePresence>
        {isWarping && (
          <motion.div
            className="fixed inset-0 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Black backdrop */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
            />

            {/* Star field canvas */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0"
            />

            {/* "ENTERING ETERNITY" text — appears longer */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0, 0.9, 0.9, 0] }}
              transition={{
                duration: ANIMATION_DURATION / 1000,
                times: [0, 0.35, 0.42, 0.52, 0.72, 0.82],
              }}
            >
              <span className="text-2xl md:text-4xl font-bold tracking-[0.3em] text-white/90 uppercase"
                style={{ textShadow: '0 0 40px rgba(0,229,255,0.8), 0 0 80px rgba(51,136,255,0.5), 0 0 120px rgba(0,229,255,0.3)' }}>
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
