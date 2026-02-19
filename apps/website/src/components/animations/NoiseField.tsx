'use client'

import { useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useCanvasPerf } from '@/hooks/useCanvasPerf'

interface NoiseFieldProps {
  className?: string
}

/**
 * Chaotic flickering dots — static/noise effect.
 * Represents "broken" UX for the Problem section.
 */
export function NoiseField({ className = '' }: NoiseFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const { dpr, isVisible, shouldSkipFrame, observerRef } = useCanvasPerf()
  const isVisibleRef = useRef(isVisible)
  isVisibleRef.current = isVisible
  const shouldSkipFrameRef = useRef(shouldSkipFrame)
  shouldSkipFrameRef.current = shouldSkipFrame

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let w = 0
    let h = 0
    const spacing = 24
    const dotRadius = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const glitchSeeds: number[] = []
    for (let i = 0; i < 200; i++) {
      glitchSeeds.push(Math.random())
    }

    const draw = (time: number) => {
      animId = requestAnimationFrame(draw)

      if (shouldSkipFrameRef.current(time)) return

      ctx.clearRect(0, 0, w, h)

      const cols = Math.ceil(w / spacing) + 1
      const rows = Math.ceil(h / spacing) + 1
      const t = time * 0.001
      const dark = isDarkRef.current

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = (row * cols + col) % glitchSeeds.length
          const seed = glitchSeeds[idx]

          let x = col * spacing
          let y = row * spacing

          const glitchPhase = Math.sin(t * 3 + seed * 100)
          if (glitchPhase > 0.92) {
            x += (seed - 0.5) * 12
            y += (glitchSeeds[(idx + 7) % glitchSeeds.length] - 0.5) * 12
          }

          const flicker1 = Math.sin(t * 2.5 + seed * 50) * 0.5 + 0.5
          const flicker2 = Math.sin(t * 4.1 + seed * 80 + col * 0.3) * 0.5 + 0.5
          const alpha = flicker1 * flicker2 * 0.35

          if (alpha < 0.03) continue

          if (dark) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
          } else {
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(0.5, alpha * 1.6)})`
          }

          const r = dark ? dotRadius : dotRadius * 1.3
          ctx.beginPath()
          ctx.arc(x, y, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [dpr])

  return (
    <canvas
      ref={(el) => {
        (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el
        ;(observerRef as React.MutableRefObject<HTMLElement | null>).current = el
      }}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{
        maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
      }}
    />
  )
}
