'use client'

import { useEffect, useRef } from 'react'

const STAR_COUNT = 80

interface Star {
  angle: number
  dist: number
  speed: number
  size: number
  hue: number
  opacity: number
}

function createStar(): Star {
  const hueRoll = Math.random()
  let hue: number
  if (hueRoll < 0.4) hue = 200 + Math.random() * 15
  else if (hueRoll < 0.7) hue = 215 + Math.random() * 15
  else hue = 260 + Math.random() * 20

  return {
    angle: Math.random() * Math.PI * 2,
    dist: Math.random() * 0.15,
    speed: 0.12 + Math.random() * 0.18,
    size: 0.4 + Math.random() * 1.0,
    hue,
    opacity: 0.15 + Math.random() * 0.35,
  }
}

export default function MiniWarpBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const starsRef = useRef<Star[]>(Array.from({ length: STAR_COUNT }, createStar))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = parent.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)
    }
    resize()

    const observer = new ResizeObserver(resize)
    observer.observe(parent)

    const stars = starsRef.current

    const animate = () => {
      const rect = parent.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const cx = w / 2
      const cy = h / 2
      const maxDim = Math.max(w, h)

      ctx.clearRect(0, 0, w, h)

      // Subtle central glow
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.45)
      glowGrad.addColorStop(0, 'rgba(51, 136, 255, 0.06)')
      glowGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.02)')
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(0, 0, w, h)

      for (const star of stars) {
        star.dist += star.speed * 0.003

        // Reset star when it exits the card
        if (star.dist > 0.7) {
          star.dist = Math.random() * 0.05
          star.angle = Math.random() * Math.PI * 2
          star.speed = 0.12 + Math.random() * 0.18
        }

        const x = cx + Math.cos(star.angle) * star.dist * maxDim
        const y = cy + Math.sin(star.angle) * star.dist * maxDim

        // Streak trail
        const trailLen = star.dist * 12 + 2
        const tx = x - Math.cos(star.angle) * trailLen
        const ty = y - Math.sin(star.angle) * trailLen

        const fadeIn = Math.min(star.dist / 0.08, 1)
        const fadeOut = 1 - Math.max((star.dist - 0.5) / 0.2, 0)
        const alpha = star.opacity * fadeIn * fadeOut

        const grad = ctx.createLinearGradient(tx, ty, x, y)
        grad.addColorStop(0, 'rgba(0,0,0,0)')
        grad.addColorStop(1, `hsla(${star.hue}, 70%, 70%, ${alpha})`)

        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(x, y)
        ctx.strokeStyle = grad
        ctx.lineWidth = star.size
        ctx.lineCap = 'round'
        ctx.stroke()

        // Bright head dot
        ctx.beginPath()
        ctx.arc(x, y, star.size * 0.5, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${star.hue}, 80%, 85%, ${alpha * 0.8})`
        ctx.fill()
      }

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
      style={{ opacity: 0.6 }}
    />
  )
}
