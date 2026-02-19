'use client'

import { useRef, useEffect } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { useCanvasPerf } from '@/hooks/useCanvasPerf'

interface IsometricBoxesProps {
  className?: string
}

/**
 * Spline-style isometric cubes.
 * IDLE: collapsed to 4 tiny colored dots (diamond corners). No animation.
 * HOVER: cubes rise into big 3D boxes with dark faces, neon gradient edges,
 * and colored floor glow. Purple -> blue -> cyan gradient by x-position.
 */
export function IsometricBoxes({ className = '' }: IsometricBoxesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { isDark } = useTheme()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const { dpr, isVisible, shouldSkipFrame, observerRef, reducedMotion } = useCanvasPerf()
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

    const tileW = 100
    const tileH = 58
    const cubeHW = 44
    const cubeHH = 25
    const maxLift = 56
    const influenceRadius = 280

    const mouse = { x: -1000, y: -1000, active: false }
    const autoSpot = { x: -9999, y: -9999 }

    let cubeHeights: Float32Array = new Float32Array(0)
    let cols = 0
    let rows = 0

    function edgeColor(sx: number, alpha: number): string {
      const t = Math.max(0, Math.min(1, sx / w))
      let r: number, g: number, b: number
      if (t < 0.5) {
        const p = t * 2
        r = Math.round(180 * (1 - p) + 80 * p)
        g = Math.round(0 * (1 - p) + 120 * p)
        b = 255
      } else {
        const p = (t - 0.5) * 2
        r = Math.round(80 * (1 - p) + 0 * p)
        g = Math.round(120 * (1 - p) + 220 * p)
        b = 255
      }
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

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

      cols = Math.ceil(w / tileW) + 4
      rows = Math.ceil(h / tileH) + 4
      cubeHeights = new Float32Array(cols * rows)
    }

    resize()
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    window.addEventListener('resize', resize)

    function isoToScreen(col: number, row: number): [number, number] {
      const sx = col * tileW + (row % 2 === 1 ? tileW / 2 : 0)
      const sy = row * tileH
      return [sx, sy]
    }

    function drawCollapsedDots(sx: number, sy: number, dark: boolean) {
      const dotR = 1.3
      const hw = cubeHW * 0.35
      const hh = cubeHH * 0.35
      const color = dark
        ? edgeColor(sx, 0.35)
        : `rgba(170, 180, 200, 0.4)`

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(sx, sy - hh, dotR, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(sx + hw, sy, dotR, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(sx, sy + hh, dotR, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(sx - hw, sy, dotR, 0, Math.PI * 2)
      ctx.fill()
    }

    function drawCube(sx: number, sy: number, lift: number, dark: boolean) {
      const ch = lift
      const hw = cubeHW
      const hh = cubeHH
      const liftFraction = Math.min(lift / maxLift, 1)

      const topFill = dark ? 'rgba(14, 14, 22, 0.95)' : 'rgba(255, 255, 255, 0.95)'
      const leftFill = dark ? 'rgba(8, 8, 14, 0.95)' : 'rgba(235, 238, 245, 0.9)'
      const rightFill = dark ? 'rgba(11, 11, 18, 0.95)' : 'rgba(225, 230, 240, 0.9)'

      const edgeAlpha = dark
        ? 0.3 + liftFraction * 0.5
        : 0.15 + liftFraction * 0.3
      const ec = dark ? edgeColor(sx, edgeAlpha) : `rgba(180, 190, 210, ${0.4 + liftFraction * 0.4})`

      {
        const glowAlpha = dark ? liftFraction * 0.35 : liftFraction * 0.12
        const glowW = hw * 2.5
        const glowH = hh * 1.6
        const grad = ctx.createRadialGradient(sx, sy + hh + 3, 0, sx, sy + hh + 3, glowW)
        if (dark) {
          grad.addColorStop(0, edgeColor(sx, glowAlpha))
          grad.addColorStop(0.5, edgeColor(sx, glowAlpha * 0.25))
        } else {
          grad.addColorStop(0, `rgba(120, 140, 180, ${glowAlpha})`)
          grad.addColorStop(0.5, `rgba(120, 140, 180, ${glowAlpha * 0.2})`)
        }
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.ellipse(sx, sy + hh + 3, glowW, glowH, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.beginPath()
      ctx.moveTo(sx, sy - ch - hh)
      ctx.lineTo(sx + hw, sy - ch)
      ctx.lineTo(sx, sy - ch + hh)
      ctx.lineTo(sx - hw, sy - ch)
      ctx.closePath()
      ctx.fillStyle = topFill
      ctx.fill()
      ctx.strokeStyle = ec
      ctx.lineWidth = dark ? 1.3 : 0.8
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(sx - hw, sy - ch)
      ctx.lineTo(sx, sy - ch + hh)
      ctx.lineTo(sx, sy + hh)
      ctx.lineTo(sx - hw, sy)
      ctx.closePath()
      ctx.fillStyle = leftFill
      ctx.fill()
      ctx.strokeStyle = ec
      ctx.lineWidth = dark ? 1 : 0.6
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(sx + hw, sy - ch)
      ctx.lineTo(sx, sy - ch + hh)
      ctx.lineTo(sx, sy + hh)
      ctx.lineTo(sx + hw, sy)
      ctx.closePath()
      ctx.fillStyle = rightFill
      ctx.fill()
      ctx.strokeStyle = ec
      ctx.lineWidth = dark ? 1 : 0.6
      ctx.stroke()

      if (liftFraction > 0.2) {
        ctx.strokeStyle = dark
          ? edgeColor(sx, liftFraction * 0.8)
          : `rgba(100, 130, 200, ${liftFraction * 0.35})`
        ctx.lineWidth = dark ? 1.8 : 1.2
        ctx.beginPath()
        ctx.moveTo(sx, sy - ch - hh)
        ctx.lineTo(sx + hw, sy - ch)
        ctx.lineTo(sx, sy - ch + hh)
        ctx.lineTo(sx - hw, sy - ch)
        ctx.closePath()
        ctx.stroke()
      }
    }

    let drewStaticOnce = false

    const draw = (time: number) => {
      animId = requestAnimationFrame(draw)

      if (!isVisibleRef.current) {
        if (!drewStaticOnce) {
          ctx.clearRect(0, 0, w, h)
          const dark = isDarkRef.current
          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              const [sx, sy] = isoToScreen(col, row)
              drawCollapsedDots(sx, sy, dark)
            }
          }
          drewStaticOnce = true
        }
        return
      }
      drewStaticOnce = false

      ctx.clearRect(0, 0, w, h)

      const t = time * 0.001
      const dark = isDarkRef.current

      if (!mouse.active) {
        // Lissajous figure-8 pattern — always visible when no cursor
        autoSpot.x = w / 2 + Math.sin(t * 0.18) * w * 0.28
        autoSpot.y = h / 2 + Math.sin(t * 0.24) * h * 0.22
      }

      const spotX = mouse.active ? mouse.x : autoSpot.x
      const spotY = mouse.active ? mouse.y : autoSpot.y

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const [sx, sy] = isoToScreen(col, row)
          const dx = sx - spotX
          const dy = sy - spotY
          const dist = Math.sqrt(dx * dx + dy * dy)
          const proximity = Math.max(0, 1 - dist / influenceRadius)
          const targetLift = proximity * proximity * maxLift
          const idx = row * cols + col
          const speed = targetLift > cubeHeights[idx] ? 0.1 : 0.06
          cubeHeights[idx] += (targetLift - cubeHeights[idx]) * speed
          if (cubeHeights[idx] < 0.5) cubeHeights[idx] = 0
        }
      }

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const [sx, sy] = isoToScreen(col, row)
          const idx = row * cols + col
          const lift = cubeHeights[idx]

          if (lift < 1) {
            drawCollapsedDots(sx, sy, dark)
          } else {
            drawCube(sx, sy, lift, dark)
          }
        }
      }
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
