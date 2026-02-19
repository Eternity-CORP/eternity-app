'use client'

import { useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useCanvasPerf } from '@/hooks/useCanvasPerf'

interface SpotlightGridProps {
  className?: string
}

/**
 * Cursor-reactive dot grid — Linear.app / Vercel style.
 * Dots glow and scale up near cursor. On mobile: auto-roaming spotlight.
 */
export function SpotlightGrid({ className = '' }: SpotlightGridProps) {
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
    const spacing = 32
    const influenceRadius = 180
    const baseRadius = 1.2
    const maxRadius = 3.5

    const mouse = { x: -1000, y: -1000, active: false }
    const autoSpot = { x: 0, y: 0 }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        mouse.x = mx
        mouse.y = my
        mouse.active = true
      } else {
        mouse.active = false
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const touch = e.touches[0]
      const mx = touch.clientX - rect.left
      const my = touch.clientY - rect.top
      if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
        mouse.x = mx
        mouse.y = my
        mouse.active = true
      }
    }

    const onTouchEnd = () => {
      mouse.active = false
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    window.addEventListener('resize', resize)

    const draw = (time: number) => {
      animId = requestAnimationFrame(draw)

      if (shouldSkipFrameRef.current(time)) return

      ctx.clearRect(0, 0, w, h)

      const t = time * 0.001
      const dark = isDarkRef.current
      const cols = Math.ceil(w / spacing) + 1
      const rows = Math.ceil(h / spacing) + 1

      if (!mouse.active) {
        autoSpot.x = w / 2 + Math.sin(t * 0.3) * w * 0.3 + Math.cos(t * 0.17) * w * 0.15
        autoSpot.y = h / 2 + Math.cos(t * 0.25) * h * 0.25 + Math.sin(t * 0.13) * h * 0.1
      }

      const spotX = mouse.active ? mouse.x : autoSpot.x
      const spotY = mouse.active ? mouse.y : autoSpot.y

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * spacing
          const y = row * spacing

          const dx = x - spotX
          const dy = y - spotY
          const dist = Math.sqrt(dx * dx + dy * dy)

          const proximity = Math.max(0, 1 - dist / influenceRadius)
          const proxSq = proximity * proximity

          const pulse = Math.sin(t * 1.5 + col * 0.3 + row * 0.2) * 0.5 + 0.5
          const radius = baseRadius + (maxRadius - baseRadius) * proxSq

          const baseAlpha = dark ? 0.08 + pulse * 0.04 : 0.06 + pulse * 0.03
          const spotAlpha = proxSq * (dark ? 0.6 : 0.4)
          const alpha = baseAlpha + spotAlpha

          if (alpha < 0.02) continue

          if (dark) {
            if (proxSq > 0.05) {
              const r = Math.round(51 + proxSq * 70)
              const g = Math.round(136 + proxSq * 50)
              ctx.fillStyle = `rgba(${r}, ${g}, 255, ${alpha})`
            } else {
              ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
            }
          } else {
            if (proxSq > 0.05) {
              ctx.fillStyle = `rgba(0, 80, 220, ${alpha})`
            } else {
              ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
            }
          }

          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      const glowRadius = influenceRadius * 1.2
      const glow = ctx.createRadialGradient(spotX, spotY, 0, spotX, spotY, glowRadius)
      if (dark) {
        glow.addColorStop(0, 'rgba(51, 136, 255, 0.06)')
        glow.addColorStop(0.5, 'rgba(51, 136, 255, 0.02)')
        glow.addColorStop(1, 'rgba(51, 136, 255, 0)')
      } else {
        glow.addColorStop(0, 'rgba(0, 80, 220, 0.04)')
        glow.addColorStop(0.5, 'rgba(0, 80, 220, 0.01)')
        glow.addColorStop(1, 'rgba(0, 80, 220, 0)')
      }
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(spotX, spotY, glowRadius, 0, Math.PI * 2)
      ctx.fill()
    }

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
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
        maskImage: 'linear-gradient(to bottom, transparent 3%, black 15%, black 85%, transparent 97%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 3%, black 15%, black 85%, transparent 97%)',
      }}
    />
  )
}
