'use client'

import { useEffect, useRef } from 'react'
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER } from '@e-y/shared'

const DRAW_DURATION = 2000 // ms
const BREATH_PERIOD = 3000 // ms for one breath cycle
const BREATH_MIN = 0.25
const BREATH_MAX = 0.4
const BASE_OPACITY = 0.35

/** Cubic ease-in-out */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

/**
 * Measure total length of an SVG path string using an offscreen SVG element.
 */
function measurePathLength(d: string): number {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  svg.style.position = 'absolute'
  svg.style.width = '0'
  svg.style.height = '0'
  document.body.appendChild(svg)
  const length = path.getTotalLength()
  document.body.removeChild(svg)
  return length
}

/**
 * LogoStrokeDraw -- Canvas 2D component that draws the E-Y logo contour
 * with a neon stroke effect. Used as a subtle background for confirmation modals.
 *
 * Phase 1: Sequential stroke reveal with dashoffset animation (~2s)
 * Phase 2: Strokes stay visible with gentle alpha breathing
 */
export default function LogoStrokeDraw() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    let w = 0
    let h = 0

    // Use half DPR for performance (background effect)
    const resize = () => {
      const dpr = Math.max(1, (window.devicePixelRatio || 1) * 0.5)
      const rect = parent.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    // Prepare path data
    const pathEntries = DRAW_ORDER.map((key) => {
      const d = LOGO_PATHS[key]
      return {
        key,
        path2d: new Path2D(d),
        length: measurePathLength(d),
        d,
      }
    })

    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      ctx.clearRect(0, 0, w, h)

      // Scale logo to ~65% of container width, centered
      const targetW = w * 0.65
      const logoScale = targetW / LOGO_VIEWBOX.width
      const logoW = LOGO_VIEWBOX.width * logoScale
      const logoH = LOGO_VIEWBOX.height * logoScale
      const logoX = (w - logoW) / 2
      const logoY = (h - logoH) / 2

      ctx.save()
      ctx.translate(logoX, logoY)
      ctx.scale(logoScale, logoScale)

      // Compute global opacity (breathing after draw completes)
      let globalAlpha: number
      if (elapsed < DRAW_DURATION) {
        globalAlpha = BASE_OPACITY
      } else {
        // Breathing: oscillate between BREATH_MIN and BREATH_MAX
        const breathT = ((elapsed - DRAW_DURATION) % BREATH_PERIOD) / BREATH_PERIOD
        const breathCurve = (Math.sin(breathT * Math.PI * 2 - Math.PI / 2) + 1) / 2
        globalAlpha = BREATH_MIN + (BREATH_MAX - BREATH_MIN) * breathCurve
      }

      const drawProgress = Math.min(elapsed / DRAW_DURATION, 1)
      const eased = easeInOutCubic(drawProgress)

      // Sequential drawing with overlap
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

        // Neon glow (outer, blurred)
        ctx.strokeStyle = `rgba(51, 136, 255, ${0.3 * segP * globalAlpha})`
        ctx.lineWidth = 8
        ctx.filter = 'blur(6px)'
        ctx.stroke(entry.path2d)

        // Secondary glow (cyan)
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.15 * segP * globalAlpha})`
        ctx.lineWidth = 5
        ctx.filter = 'blur(4px)'
        ctx.stroke(entry.path2d)

        // Main stroke with gradient
        ctx.filter = 'none'
        const gradient = ctx.createLinearGradient(0, 0, LOGO_VIEWBOX.width, 0)
        gradient.addColorStop(0, '#3388FF')
        gradient.addColorStop(1, '#00E5FF')
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.5
        ctx.globalAlpha = segP * globalAlpha
        ctx.stroke(entry.path2d)

        ctx.restore()
      }

      ctx.restore()

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 rounded-2xl pointer-events-none"
    />
  )
}
