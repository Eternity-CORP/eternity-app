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
       * 0.71-0.85  UN-FILL   -- reverse of FILL (wipe top→bottom, stroke reappears)
       * 0.85-0.96  UN-DRAW   -- reverse of DRAW (stroke retracts, glow fades)
       * 0.96-1.00  FADE      -- clean fade to background → redirect
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
      // PHASE 4a: UN-FILL (0.71-0.85) — reverse of Phase 2
      // ========================
      if (progress >= 0.71 && progress < 0.85) {
        const unfillP = (progress - 0.71) / 0.14
        const eased = easeInOutCubic(unfillP)

        // Fill shrinks from top to bottom (reverse of bottom→top)
        const wipeY = LOGO_VIEWBOX.height * eased
        if (wipeY < LOGO_VIEWBOX.height) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(0, wipeY, LOGO_VIEWBOX.width, LOGO_VIEWBOX.height - wipeY)
          ctx.clip()

          const fillColor = dark ? '#ffffff' : '#1a1a1a'
          for (const entry of pathEntries) {
            ctx.fillStyle = fillColor
            ctx.fill(entry.path2d)
          }

          // Glass overlays fade with fill
          for (const glass of glassPaths) {
            ctx.fillStyle = dark
              ? `rgba(177, 172, 172, ${0.15 * (1 - eased)})`
              : `rgba(177, 172, 172, ${0.2 * (1 - eased)})`
            ctx.fill(glass.path2d)
          }

          ctx.restore()
        }

        // Stroke reappears (reverse of fading out)
        const strokeAlpha = eased
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
      }

      // ========================
      // PHASE 4b: UN-DRAW (0.85-0.96) — reverse of Phase 1
      // ========================
      if (progress >= 0.85 && progress < 0.96) {
        const undrawP = (progress - 0.85) / 0.11
        const eased = easeInOutCubic(undrawP)

        // Paths retract in reverse order
        const pathCount = pathEntries.length
        const overlapFactor = 0.3
        const segmentDuration = 1 / (pathCount * (1 - overlapFactor) + overlapFactor)

        for (let i = 0; i < pathCount; i++) {
          // Reverse order: last path retracts first
          const ri = pathCount - 1 - i
          const entry = pathEntries[ri]
          const segStart = i * segmentDuration * (1 - overlapFactor)
          const segEnd = segStart + segmentDuration
          const segP = Math.max(0, Math.min(1, (eased - segStart) / (segEnd - segStart)))

          // segP goes 0→1, so reveal = 1→0 (retracting)
          const revealFraction = 1 - segP
          if (revealFraction <= 0) continue

          const revealLen = entry.length * revealFraction
          const dashOffset = entry.length - revealLen

          ctx.save()
          ctx.setLineDash([entry.length])
          ctx.lineDashOffset = dashOffset

          // Neon glow (fading with retraction)
          ctx.strokeStyle = dark
            ? `rgba(51, 136, 255, ${0.3 * revealFraction})`
            : `rgba(0, 80, 220, ${0.15 * revealFraction})`
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

      // Restore from logo transform
      ctx.restore()

      // ---- Radial glow (below logo, in screen space) ----
      if (progress >= 0.20 && progress < 0.90) {
        let glowAlpha: number
        if (progress < 0.44) {
          glowAlpha = ((progress - 0.20) / 0.24) * 0.3 // fade in
        } else if (progress < 0.71) {
          const breathP = (progress - 0.44) / 0.27
          glowAlpha = 0.3 + Math.sin(breathP * Math.PI) * 0.2 // pulse
        } else {
          // Fade out during reverse phases
          glowAlpha = 0.3 * (1 - (progress - 0.71) / 0.19)
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

      // ---- PHASE 4c: FADE (0.96-1.00) — clean fade to background ----
      if (progress >= 0.96) {
        const fadeP = (progress - 0.96) / 0.04
        ctx.fillStyle = dark
          ? `rgba(0, 0, 0, ${fadeP})`
          : `rgba(255, 255, 255, ${fadeP})`
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
                times: [0, 0.40, 0.48, 0.55, 0.68, 0.75],
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
