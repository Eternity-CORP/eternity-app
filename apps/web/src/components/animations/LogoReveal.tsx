'use client'

import { useEffect, useRef, useCallback } from 'react'
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER, GLASS_PATHS, measurePathLength } from './logoPathData'

/**
 * LogoReveal — Transaction success animation.
 *
 * Phases:
 *   0.00-0.27  DRAW      stroke-dashoffset reveals logo contour (neon blue)
 *   0.27-0.44  FILL      gradient wipe fills interior (white)
 *   0.44-0.71  BREATH    logo pulses gently
 *   0.71-0.85  UN-FILL   reverse wipe, stroke reappears
 *   0.85-0.96  UN-DRAW   stroke retracts
 *   0.96-1.00  FADE      clean fade out → onComplete
 *
 * Duration: ~3s. Pure canvas, no dependencies.
 */

interface LogoRevealProps {
  active: boolean
  onComplete?: () => void
}

const DURATION = 3000

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export default function LogoReveal({ active, onComplete }: LogoRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const completedRef = useRef(false)
  const pathCacheRef = useRef<{
    entries: Array<{ key: string; path2d: Path2D; length: number }>
    glass: Array<{ key: string; path2d: Path2D }>
  } | null>(null)

  const getPathCache = useCallback(() => {
    if (!pathCacheRef.current) {
      pathCacheRef.current = {
        entries: DRAW_ORDER.map((key) => {
          const d = LOGO_PATHS[key]
          return { key, path2d: new Path2D(d), length: measurePathLength(d) }
        }),
        glass: GLASS_PATHS.map((key) => ({
          key,
          path2d: new Path2D(LOGO_PATHS[key]),
        })),
      }
    }
    return pathCacheRef.current
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    const dpr = window.devicePixelRatio || 1
    const rect = parent.getBoundingClientRect()
    const w = rect.width
    const h = rect.height

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    if (!active) return

    const now = performance.now()
    if (startRef.current === 0) startRef.current = now
    const elapsed = now - startRef.current
    const progress = Math.min(elapsed / DURATION, 1)

    const cx = w / 2
    const cy = h / 2

    // Scale logo to fit container (~140px wide, max 60% of container)
    const maxLogoW = Math.min(w * 0.55, 160)
    const logoScale = maxLogoW / LOGO_VIEWBOX.width
    const logoW = LOGO_VIEWBOX.width * logoScale
    const logoH = LOGO_VIEWBOX.height * logoScale
    const logoX = cx - logoW / 2
    const logoY = cy - logoH / 2

    const { entries: pathEntries, glass: glassPaths } = getPathCache()

    // Position + scale logo
    ctx.save()
    ctx.translate(logoX, logoY)
    ctx.scale(logoScale, logoScale)

    // ========================
    // PHASE 1: DRAW (0-0.27)
    // ========================
    if (progress < 0.27) {
      const drawP = progress / 0.27
      const eased = easeInOutCubic(drawP)

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
        ctx.strokeStyle = `rgba(51, 136, 255, ${0.3 * segP})`
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

      // Stroke fading out
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

      // Fill wipe from bottom to top
      const wipeY = LOGO_VIEWBOX.height * (1 - eased)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, wipeY, LOGO_VIEWBOX.width, LOGO_VIEWBOX.height - wipeY)
      ctx.clip()

      for (const entry of pathEntries) {
        ctx.fillStyle = '#ffffff'
        ctx.fill(entry.path2d)
      }

      // Glass overlays
      for (const glass of glassPaths) {
        ctx.fillStyle = 'rgba(177, 172, 172, 0.15)'
        ctx.fill(glass.path2d)
      }

      ctx.restore()
    }

    // ========================
    // PHASE 3: BREATH (0.44-0.71)
    // ========================
    if (progress >= 0.44 && progress < 0.71) {
      const breathP = (progress - 0.44) / 0.27
      const breathCurve = Math.sin(breathP * Math.PI) * 0.06
      const scale = 1 + breathCurve

      ctx.save()
      const lcx = LOGO_VIEWBOX.width / 2
      const lcy = LOGO_VIEWBOX.height / 2
      ctx.translate(lcx, lcy)
      ctx.scale(scale, scale)
      ctx.translate(-lcx, -lcy)

      for (const entry of pathEntries) {
        ctx.fillStyle = '#ffffff'
        ctx.fill(entry.path2d)
      }
      for (const glass of glassPaths) {
        ctx.fillStyle = 'rgba(177, 172, 172, 0.15)'
        ctx.fill(glass.path2d)
      }

      ctx.restore()
    }

    // ========================
    // PHASE 4a: UN-FILL (0.71-0.85)
    // ========================
    if (progress >= 0.71 && progress < 0.85) {
      const unfillP = (progress - 0.71) / 0.14
      const eased = easeInOutCubic(unfillP)

      // Fill shrinks top→bottom
      const wipeY = LOGO_VIEWBOX.height * eased
      if (wipeY < LOGO_VIEWBOX.height) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, wipeY, LOGO_VIEWBOX.width, LOGO_VIEWBOX.height - wipeY)
        ctx.clip()

        for (const entry of pathEntries) {
          ctx.fillStyle = '#ffffff'
          ctx.fill(entry.path2d)
        }
        for (const glass of glassPaths) {
          ctx.fillStyle = `rgba(177, 172, 172, ${0.15 * (1 - eased)})`
          ctx.fill(glass.path2d)
        }

        ctx.restore()
      }

      // Stroke reappears
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
    // PHASE 4b: UN-DRAW (0.85-0.96)
    // ========================
    if (progress >= 0.85 && progress < 0.96) {
      const undrawP = (progress - 0.85) / 0.11
      const eased = easeInOutCubic(undrawP)

      const pathCount = pathEntries.length
      const overlapFactor = 0.3
      const segmentDuration = 1 / (pathCount * (1 - overlapFactor) + overlapFactor)

      for (let i = 0; i < pathCount; i++) {
        const ri = pathCount - 1 - i
        const entry = pathEntries[ri]
        const segStart = i * segmentDuration * (1 - overlapFactor)
        const segEnd = segStart + segmentDuration
        const segP = Math.max(0, Math.min(1, (eased - segStart) / (segEnd - segStart)))

        const revealFraction = 1 - segP
        if (revealFraction <= 0) continue

        const revealLen = entry.length * revealFraction
        const dashOffset = entry.length - revealLen

        ctx.save()
        ctx.setLineDash([entry.length])
        ctx.lineDashOffset = dashOffset

        // Neon glow fading
        ctx.strokeStyle = `rgba(51, 136, 255, ${0.3 * revealFraction})`
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

    // ---- Radial glow (screen space) ----
    if (progress >= 0.20 && progress < 0.90) {
      let glowAlpha: number
      if (progress < 0.44) {
        glowAlpha = ((progress - 0.20) / 0.24) * 0.25
      } else if (progress < 0.71) {
        const breathP = (progress - 0.44) / 0.27
        glowAlpha = 0.25 + Math.sin(breathP * Math.PI) * 0.15
      } else {
        glowAlpha = 0.25 * (1 - (progress - 0.71) / 0.19)
      }
      glowAlpha = Math.max(0, Math.min(1, glowAlpha))

      if (glowAlpha > 0.01) {
        const glowRadius = Math.min(w, h) * 0.45
        const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius)
        glowGrad.addColorStop(0, `rgba(51, 136, 255, ${glowAlpha})`)
        glowGrad.addColorStop(0.5, `rgba(0, 229, 255, ${glowAlpha * 0.3})`)
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = glowGrad
        ctx.beginPath()
        ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    if (progress < 1) {
      animRef.current = requestAnimationFrame(render)
    } else if (!completedRef.current) {
      completedRef.current = true
      // Clear canvas before calling onComplete
      ctx.clearRect(0, 0, w, h)
      onComplete?.()
    }
  }, [active, onComplete, getPathCache])

  useEffect(() => {
    if (active) {
      startRef.current = 0
      completedRef.current = false
      animRef.current = requestAnimationFrame(render)
    } else {
      cancelAnimationFrame(animRef.current)
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    return () => cancelAnimationFrame(animRef.current)
  }, [active, render])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 rounded-2xl pointer-events-none"
    />
  )
}
