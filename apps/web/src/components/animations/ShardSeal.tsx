'use client'

import { useEffect, useRef, useCallback } from 'react'
import { SHARD_OUTLINE, FACET_LINES } from './ShardSilhouette'

/**
 * ShardSeal — Signature/approval confirmation animation.
 *
 * Dark shard appears in center, facet edges light up sequentially
 * (like a progress indicator), all lit -> flash, shard shrinks to point.
 * Duration: ~1.8s total.
 *
 * Lightweight: pure canvas, no Three.js.
 */

interface ShardSealProps {
  /** If true, animation is actively running */
  active: boolean
  /** Called when the animation fully completes */
  onComplete?: () => void
}

const DURATION = 1800

function parseSVGPath(d: string): Array<[number, number]> {
  const points: Array<[number, number]> = []
  const commands = d.match(/[ML]\s*[\d.]+\s+[\d.]+/g)
  if (!commands) return points
  for (const cmd of commands) {
    const nums = cmd.match(/[\d.]+/g)
    if (nums && nums.length >= 2) {
      points.push([parseFloat(nums[0]), parseFloat(nums[1])])
    }
  }
  return points
}

function parseLine(d: string): [[number, number], [number, number]] | null {
  const points = parseSVGPath(d)
  if (points.length < 2) return null
  return [points[0], points[1]]
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

function easeInCubic(t: number) {
  return t * t * t
}

export default function ShardSeal({ active, onComplete }: ShardSealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const startRef = useRef<number>(0)
  const completedRef = useRef(false)

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
    const scale = Math.min(w, h) / 450

    // Phase timing
    // 0.00 - 0.15: Shard fades in
    // 0.15 - 0.65: Facet edges light up one by one
    // 0.65 - 0.80: All lit — flash
    // 0.80 - 1.00: Shard shrinks to point

    // Calculate shard transform for shrink phase
    let shardScale = scale
    let shardAlpha = 1
    let glowIntensity = 0

    if (progress < 0.15) {
      // Fade in
      shardAlpha = easeOutQuart(progress / 0.15)
    } else if (progress < 0.65) {
      // Facets lighting up
      shardAlpha = 1
      const facetP = (progress - 0.15) / 0.50
      glowIntensity = facetP
    } else if (progress < 0.80) {
      // All lit — flash
      shardAlpha = 1
      glowIntensity = 1
    } else {
      // Shrink to point
      const p = easeInCubic((progress - 0.80) / 0.20)
      shardScale = scale * (1 - p)
      shardAlpha = 1 - p
      glowIntensity = 1 - p
    }

    // Draw shard body
    const outlinePoints = parseSVGPath(SHARD_OUTLINE)
    if (outlinePoints.length >= 3) {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(shardScale, shardScale)
      ctx.translate(-50, -80)
      ctx.globalAlpha = shardAlpha

      // Glow behind shard
      ctx.shadowColor = '#7c3aed'
      ctx.shadowBlur = 15 + glowIntensity * 25

      // Fill
      ctx.beginPath()
      ctx.moveTo(outlinePoints[0][0], outlinePoints[0][1])
      for (let i = 1; i < outlinePoints.length; i++) {
        ctx.lineTo(outlinePoints[i][0], outlinePoints[i][1])
      }
      ctx.closePath()
      ctx.fillStyle = `rgba(20, 10, 40, ${0.85 + glowIntensity * 0.1})`
      ctx.fill()

      // Outline with progressive glow
      ctx.strokeStyle = `rgba(124, 58, 237, ${0.5 + glowIntensity * 0.5})`
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.shadowBlur = 0

      // Draw facet lines with sequential lighting
      const totalFacets = FACET_LINES.length
      const litCount = progress >= 0.15 && progress < 0.80
        ? Math.floor(((progress - 0.15) / 0.50) * totalFacets)
        : progress >= 0.80
          ? totalFacets
          : 0

      for (let i = 0; i < totalFacets; i++) {
        const line = parseLine(FACET_LINES[i])
        if (!line) continue

        const isLit = i < litCount
        const isLighting = i === litCount && progress >= 0.15 && progress < 0.65
        const facetAlpha = isLit ? 0.8 : isLighting ? 0.5 : 0.15

        ctx.beginPath()
        ctx.moveTo(line[0][0], line[0][1])
        ctx.lineTo(line[1][0], line[1][1])

        if (isLit || isLighting) {
          ctx.shadowColor = '#8b5cf6'
          ctx.shadowBlur = isLighting ? 8 : 12
          ctx.strokeStyle = isLighting
            ? `rgba(139, 92, 246, ${facetAlpha})`
            : `rgba(139, 92, 246, ${facetAlpha})`
        } else {
          ctx.shadowBlur = 0
          ctx.strokeStyle = `rgba(124, 58, 237, ${facetAlpha})`
        }

        ctx.lineWidth = isLit ? 1.8 : 1
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      ctx.restore()
    }

    // Flash when all facets are lit
    if (progress >= 0.65 && progress < 0.80) {
      const flashP = (progress - 0.65) / 0.15
      const flashAlpha = flashP < 0.4
        ? easeOutQuart(flashP / 0.4) * 0.35
        : 0.35 * (1 - easeOutQuart((flashP - 0.4) / 0.6))

      const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.4)
      flashGrad.addColorStop(0, `rgba(139, 92, 246, ${flashAlpha})`)
      flashGrad.addColorStop(0.3, `rgba(124, 58, 237, ${flashAlpha * 0.6})`)
      flashGrad.addColorStop(0.6, `rgba(59, 130, 246, ${flashAlpha * 0.3})`)
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = flashGrad
      ctx.fillRect(0, 0, w, h)
    }

    // Ambient particles
    drawSealParticles(ctx, cx, cy, w, h, progress, glowIntensity)

    if (progress < 1) {
      animRef.current = requestAnimationFrame(render)
    } else if (!completedRef.current) {
      completedRef.current = true
      onComplete?.()
    }
  }, [active, onComplete])

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
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
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

function drawSealParticles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  progress: number,
  intensity: number,
) {
  const count = 12
  const time = progress * 8

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time * 0.3
    const dist = 25 + Math.sin(time * 1.5 + i * 2) * 15 + i * 2
    const x = cx + Math.cos(angle) * dist
    const y = cy + Math.sin(angle) * dist * 0.7

    if (x < 0 || x > w || y < 0 || y > h) continue

    const size = 0.8 + Math.sin(time * 2.5 + i * 1.3) * 0.4
    const alpha = intensity * 0.35 * (0.4 + Math.sin(time + i) * 0.6)

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(139, 92, 246, ${Math.max(0, alpha)})`
    ctx.fill()
  }
}
