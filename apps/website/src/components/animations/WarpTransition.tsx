'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER, GLASS_PATHS, measurePathLength } from './logoPathData'

const APP_URL = 'https://e-y-app.vercel.app'
const DURATION = 4500

/* ---- Easings ---- */
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
function easeInCubic(t: number) {
  return t * t * t
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
    const logoW = LOGO_VIEWBOX.width * logoScale
    const logoH = LOGO_VIEWBOX.height * logoScale
    const logoX = cx - logoW / 2
    const logoY = cy - logoH / 2

    // Prepare Path2D objects and measure lengths
    const pathEntries = DRAW_ORDER.map((key) => {
      const d = LOGO_PATHS[key]
      return {
        key,
        path2d: new Path2D(d),
        length: measurePathLength(d),
        d,
      }
    })

    const glassPaths = GLASS_PATHS.map((key) => ({
      key,
      path2d: new Path2D(LOGO_PATHS[key]),
    }))

    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const dark = isDarkRef.current

      // Clear with theme background
      ctx.fillStyle = dark ? '#000000' : '#ffffff'
      ctx.fillRect(0, 0, w, h)

      // Set transform to position + scale logo
      ctx.save()
      ctx.translate(logoX, logoY)
      ctx.scale(logoScale, logoScale)

      /*
       * PHASES:
       * 0.00-0.27  DRAW      -- stroke-dashoffset reveals logo contour
       * 0.27-0.44  FILL      -- gradient wipe fills the interior
       * 0.44-0.71  BREATH    -- logo pulses, glow, text appears
       * 0.71-1.00  ZOOM      -- zoom into logo, dissolve, redirect
       */

      // ========================
      // PHASE 1: DRAW (0-0.27)
      // ========================
      if (progress < 0.27) {
        const drawP = progress / 0.27
        const eased = easeInOutCubic(drawP)

        // Each path draws sequentially with overlap
        const pathCount = pathEntries.length
        const overlapFactor = 0.3
        const segmentDuration = 1 / (pathCount * (1 - overlapFactor) + overlapFactor)

        for (let i = 0; i < pathCount; i++) {
          const entry = pathEntries[i]
          const segStart = i * segmentDuration * (1 - overlapFactor)
          const segEnd = segStart + segmentDuration
          const segP = Math.max(0, Math.min(1, (eased - segStart) / (segEnd - segStart)))

          if (segP <= 0) continue

          const revealLen = entry.length * segP
          const dashOffset = entry.length - revealLen

          ctx.save()
          ctx.setLineDash([entry.length])
          ctx.lineDashOffset = dashOffset

          // Neon glow (outer)
          ctx.strokeStyle = dark
            ? `rgba(51, 136, 255, ${0.3 * segP})`
            : `rgba(0, 80, 220, ${0.15 * segP})`
          ctx.lineWidth = 8
          ctx.filter = 'blur(6px)'
          ctx.stroke(entry.path2d)

          // Main stroke
          ctx.filter = 'none'
          const gradient = ctx.createLinearGradient(0, 0, LOGO_VIEWBOX.width, 0)
          gradient.addColorStop(0, '#3388FF')
          gradient.addColorStop(1, '#00E5FF')
          ctx.strokeStyle = gradient
          ctx.lineWidth = 2
          ctx.stroke(entry.path2d)

          ctx.restore()
        }
      }

      // ========================
      // PHASE 2: FILL (0.27-0.44)
      // ========================
      if (progress >= 0.27 && progress < 0.44) {
        const fillP = (progress - 0.27) / 0.17
        const eased = easeOutCubic(fillP)

        // Draw full stroke (fading out)
        const strokeAlpha = 1 - eased
        if (strokeAlpha > 0.01) {
          const gradient = ctx.createLinearGradient(0, 0, LOGO_VIEWBOX.width, 0)
          gradient.addColorStop(0, `rgba(51, 136, 255, ${strokeAlpha})`)
          gradient.addColorStop(1, `rgba(0, 229, 255, ${strokeAlpha})`)
          ctx.strokeStyle = gradient
          ctx.lineWidth = 2
          for (const entry of pathEntries) {
            ctx.stroke(entry.path2d)
          }
        }

        // Fill with clip mask (wipe from bottom to top)
        const wipeY = LOGO_VIEWBOX.height * (1 - eased)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, wipeY, LOGO_VIEWBOX.width, LOGO_VIEWBOX.height - wipeY)
        ctx.clip()

        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }

        // Glass overlays
        for (const glass of glassPaths) {
          ctx.fillStyle = dark
            ? 'rgba(177, 172, 172, 0.15)'
            : 'rgba(177, 172, 172, 0.2)'
          ctx.fill(glass.path2d)
        }

        ctx.restore()
      }

      // ========================
      // PHASE 3: BREATH (0.44-0.71)
      // ========================
      if (progress >= 0.44 && progress < 0.71) {
        const breathP = (progress - 0.44) / 0.27

        // Breath: scale pulse 1 -> 1.06 -> 1
        const breathCurve = Math.sin(breathP * Math.PI) * 0.06
        const scale = 1 + breathCurve

        ctx.save()
        // Apply breath scale around logo center
        const lcx = LOGO_VIEWBOX.width / 2
        const lcy = LOGO_VIEWBOX.height / 2
        ctx.translate(lcx, lcy)
        ctx.scale(scale, scale)
        ctx.translate(-lcx, -lcy)

        // Draw filled logo
        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }
        for (const glass of glassPaths) {
          ctx.fillStyle = dark
            ? 'rgba(177, 172, 172, 0.15)'
            : 'rgba(177, 172, 172, 0.2)'
          ctx.fill(glass.path2d)
        }

        ctx.restore()
      }

      // ========================
      // PHASE 4: ZOOM (0.71-1.00)
      // ========================
      if (progress >= 0.71) {
        const zoomP = (progress - 0.71) / 0.29
        const zoomEase = easeInCubic(zoomP)

        const zoomScale = 1 + zoomEase * 14 // 1 -> 15

        // Logo stays FULLY OPAQUE — no globalAlpha fade
        ctx.save()

        const lcx = LOGO_VIEWBOX.width / 2
        const lcy = LOGO_VIEWBOX.height / 2
        ctx.translate(lcx, lcy)
        ctx.scale(zoomScale, zoomScale)
        ctx.translate(-lcx, -lcy)

        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }

        ctx.restore()
      }

      // Restore from logo transform
      ctx.restore()

      // ---- Radial glow (below logo, in screen space) ----
      if (progress >= 0.20 && progress < 0.85) {
        let glowAlpha: number
        if (progress < 0.44) {
          glowAlpha = ((progress - 0.20) / 0.24) * 0.3 // fade in
        } else if (progress < 0.71) {
          const breathP = (progress - 0.44) / 0.27
          glowAlpha = 0.3 + Math.sin(breathP * Math.PI) * 0.2 // pulse
        } else {
          glowAlpha = 0.3 * (1 - (progress - 0.71) / 0.14) // fade out
        }
        glowAlpha = Math.max(0, Math.min(1, glowAlpha))

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

      // ---- Iris close: radial wipe from edges to center (0.82–1.00) ----
      if (progress >= 0.82) {
        const irisP = (progress - 0.82) / 0.18
        const irisEase = easeInOutCubic(irisP)
        // Shrink hole from full diagonal to 0
        const maxR = Math.sqrt(w * w + h * h) / 2
        const holeR = maxR * (1 - irisEase)

        const bgColor = dark ? '0, 0, 0' : '255, 255, 255'
        const irisGrad = ctx.createRadialGradient(cx, cy, Math.max(0, holeR - 40), cx, cy, holeR + 60)
        irisGrad.addColorStop(0, `rgba(${bgColor}, 0)`)
        irisGrad.addColorStop(0.4, `rgba(${bgColor}, 0.6)`)
        irisGrad.addColorStop(1, `rgba(${bgColor}, 1)`)
        ctx.fillStyle = irisGrad
        ctx.fillRect(0, 0, w, h)

        // Solid fill outside the gradient ring
        if (holeR < maxR) {
          ctx.fillStyle = `rgba(${bgColor}, 1)`
          ctx.beginPath()
          ctx.rect(0, 0, w, h)
          ctx.arc(cx, cy, holeR + 60, 0, Math.PI * 2, true)
          ctx.fill()
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

            {/* "ETERNITY" text -- appears during Breath phase */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: [0, 0, 0, 1, 1, 0],
                y: [10, 10, 10, 0, 0, 0],
              }}
              transition={{
                duration: DURATION / 1000,
                times: [0, 0.40, 0.48, 0.55, 0.68, 0.78],
                ease: 'easeOut',
              }}
            >
              {/* Position below logo center */}
              <span
                className="absolute text-sm md:text-base font-medium tracking-[0.3em] uppercase select-none"
                style={{
                  top: '50%',
                  marginTop: '120px',
                  color: isDarkRef.current
                    ? 'rgba(255, 255, 255, 0.5)'
                    : 'rgba(0, 0, 0, 0.35)',
                }}
              >
                ETERNITY
              </span>
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
