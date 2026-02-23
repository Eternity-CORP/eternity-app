'use client'

import { useEffect, useRef, useCallback } from 'react'
import { SHARD_OUTLINE } from './ShardSilhouette'

/**
 * ShardMerge — Transaction confirmation animation.
 *
 * Two dark shard silhouettes fly toward each other from left/right,
 * connect forming an infinity (∞) shape, purple flash, dissolve.
 * Duration: ~2.5s total.
 *
 * Lightweight: pure canvas, no Three.js.
 */

interface ShardMergeProps {
  /** If true, animation is actively running */
  active: boolean
  /** Called when the animation fully completes */
  onComplete?: () => void
}

const DURATION = 2500

// Parse the SVG path string into point pairs for canvas drawing
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

function drawShardPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  flipX: boolean,
  alpha: number,
  glowColor: string,
  fillColor: string,
) {
  const points = parseSVGPath(SHARD_OUTLINE)
  if (points.length < 3) return

  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(flipX ? -scale : scale, scale)
  // Center the shard (viewBox 0 0 100 160)
  ctx.translate(-50, -80)

  // Glow
  ctx.shadowColor = glowColor
  ctx.shadowBlur = 20 * (1 / scale)
  ctx.globalAlpha = alpha

  ctx.beginPath()
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1])
  }
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
  ctx.strokeStyle = glowColor
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.shadowBlur = 0

  // Draw facet lines
  const facets = [
    [[50, 0], [50, 160]],
    [[28, 18], [72, 18]],
    [[18, 48], [82, 48]],
    [[22, 85], [78, 85]],
    [[32, 118], [68, 118]],
    [[50, 0], [18, 48]],
    [[50, 0], [82, 48]],
    [[28, 18], [22, 85]],
    [[72, 18], [78, 85]],
    [[18, 48], [32, 118]],
    [[82, 48], [68, 118]],
    [[22, 85], [50, 160]],
    [[78, 85], [50, 160]],
  ]

  ctx.globalAlpha = alpha * 0.35
  ctx.strokeStyle = glowColor
  ctx.lineWidth = 1
  for (const [a, b] of facets) {
    ctx.beginPath()
    ctx.moveTo(a[0], a[1])
    ctx.lineTo(b[0], b[1])
    ctx.stroke()
  }

  ctx.restore()
}

function drawInfinity(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha: number,
  glowIntensity: number,
) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#8b5cf6'
  ctx.lineWidth = 3
  ctx.shadowColor = '#7c3aed'
  ctx.shadowBlur = 30 * glowIntensity
  ctx.lineCap = 'round'

  // Draw infinity as two bezier loops
  const w = size
  const h = size * 0.4

  ctx.beginPath()
  // Left loop
  ctx.moveTo(cx, cy)
  ctx.bezierCurveTo(cx - w * 0.1, cy - h, cx - w, cy - h, cx - w * 0.5, cy)
  ctx.bezierCurveTo(cx - w * 0.0, cy + h, cx - w * 0.1, cy + h, cx, cy)
  // Right loop
  ctx.bezierCurveTo(cx + w * 0.1, cy - h, cx + w, cy - h, cx + w * 0.5, cy)
  ctx.bezierCurveTo(cx + w * 0.0, cy + h, cx + w * 0.1, cy + h, cx, cy)
  ctx.stroke()

  ctx.restore()
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function easeOutQuart(t: number) {
  return 1 - Math.pow(1 - t, 4)
}

export default function ShardMerge({ active, onComplete }: ShardMergeProps) {
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
    const shardScale = Math.min(w, h) / 500

    // Phase timing
    // 0.00 - 0.40: Shards fly in from sides
    // 0.40 - 0.60: Shards merge, form infinity
    // 0.60 - 0.75: Infinity glows
    // 0.75 - 1.00: Flash and dissolve

    if (progress < 0.40) {
      // Phase 1: Shards fly in
      const p = easeInOutCubic(progress / 0.40)
      const startOffsetX = w * 0.45
      const leftX = cx - startOffsetX + startOffsetX * p
      const rightX = cx + startOffsetX - startOffsetX * p
      const shardAlpha = Math.min(progress / 0.08, 1)

      // Floating particles
      drawParticles(ctx, cx, cy, w, h, progress, 0)

      drawShardPath(ctx, leftX, cy, shardScale, false, shardAlpha, '#7c3aed', 'rgba(30, 15, 60, 0.9)')
      drawShardPath(ctx, rightX, cy, shardScale, true, shardAlpha, '#3b82f6', 'rgba(15, 25, 60, 0.9)')

    } else if (progress < 0.60) {
      // Phase 2: Shards merging into infinity
      const p = easeOutQuart((progress - 0.40) / 0.20)

      // Shards fade out while shrinking toward center
      const shardAlpha = 1 - p
      const offset = (1 - p) * 10 * shardScale
      drawShardPath(ctx, cx - offset, cy, shardScale * (1 - p * 0.5), false, shardAlpha, '#7c3aed', 'rgba(30, 15, 60, 0.9)')
      drawShardPath(ctx, cx + offset, cy, shardScale * (1 - p * 0.5), true, shardAlpha, '#3b82f6', 'rgba(15, 25, 60, 0.9)')

      // Infinity fades in
      const infSize = Math.min(w * 0.25, 80)
      drawInfinity(ctx, cx, cy, infSize, p, 1 + p)
      drawParticles(ctx, cx, cy, w, h, progress, p)

    } else if (progress < 0.75) {
      // Phase 3: Infinity symbol glows
      const p = (progress - 0.60) / 0.15
      const infSize = Math.min(w * 0.25, 80)
      const pulse = 1 + Math.sin(p * Math.PI * 3) * 0.15
      drawInfinity(ctx, cx, cy, infSize * pulse, 1, 2 + p * 3)
      drawParticles(ctx, cx, cy, w, h, progress, 1)

    } else {
      // Phase 4: Flash and dissolve
      const p = easeOutQuart((progress - 0.75) / 0.25)
      const infSize = Math.min(w * 0.25, 80)

      // Infinity fades out
      drawInfinity(ctx, cx, cy, infSize * (1 + p * 0.3), 1 - p, 5 * (1 - p))

      // Purple/blue flash
      const flashAlpha = p < 0.3 ? easeOutQuart(p / 0.3) * 0.4 : 0.4 * (1 - easeOutQuart((p - 0.3) / 0.7))
      const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5)
      flashGrad.addColorStop(0, `rgba(124, 58, 237, ${flashAlpha})`)
      flashGrad.addColorStop(0.4, `rgba(59, 130, 246, ${flashAlpha * 0.5})`)
      flashGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = flashGrad
      ctx.fillRect(0, 0, w, h)

      drawParticles(ctx, cx, cy, w, h, progress, 1 - p)
    }

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
      // Clear canvas when not active
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

/** Draw floating purple/blue particles around center */
function drawParticles(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  progress: number,
  intensity: number,
) {
  const count = 20
  const time = progress * 10

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + time * 0.5
    const dist = 30 + Math.sin(time + i * 1.5) * 20 + i * 3
    const x = cx + Math.cos(angle) * dist
    const y = cy + Math.sin(angle) * dist * 0.6

    if (x < 0 || x > w || y < 0 || y > h) continue

    const size = 1 + Math.sin(time * 2 + i) * 0.5
    const alpha = intensity * 0.4 * (0.5 + Math.sin(time + i * 0.8) * 0.5)

    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fillStyle = i % 2 === 0
      ? `rgba(124, 58, 237, ${alpha})`
      : `rgba(59, 130, 246, ${alpha})`
    ctx.fill()
  }
}
