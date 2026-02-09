'use client'

import { useEffect, useRef } from 'react'

const STAR_COUNT = 350
const ANIMATION_DURATION = 4500

const PHASE = {
  CHARGE_END: 0.12,
  ENGAGE_END: 0.30,
  CRUISE_END: 0.78,
  BURST_START: 0.80,
}

interface Star {
  x: number; y: number; angle: number; speed: number
  size: number; delay: number; hue: number; layer: number; id: number
}

function generateStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const angle = Math.random() * Math.PI * 2
    const distance = Math.random() * 0.4 + 0.03
    const layer = i < 100 ? 0 : i < 240 ? 1 : 2
    const hueRoll = Math.random()
    let hue: number
    if (hueRoll < 0.35) hue = 190 + Math.random() * 20
    else if (hueRoll < 0.65) hue = 210 + Math.random() * 20
    else if (hueRoll < 0.85) hue = 170 + Math.random() * 15
    else hue = 260 + Math.random() * 30

    return {
      id: i, x: 50 + Math.cos(angle) * distance * 50,
      y: 50 + Math.sin(angle) * distance * 50, angle,
      speed: (Math.random() * 0.5 + 0.5) * (0.6 + layer * 0.3),
      size: (Math.random() * 1.5 + 0.5) * (0.7 + layer * 0.3),
      delay: Math.random() * 250 * (1 - layer * 0.3), hue, layer,
    }
  })
}

function easeInCubic(t: number) { return t * t * t }
function easeInQuart(t: number) { return t * t * t * t }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

function phaseProgress(progress: number, start: number, end: number) {
  if (progress < start) return 0
  if (progress > end) return 1
  return (progress - start) / (end - start)
}

interface WarpEffectProps {
  onComplete: () => void
  text?: string
}

export default function WarpEffect({ onComplete, text = 'Welcome to Eternity' }: WarpEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[]>(generateStars())
  const animRef = useRef<number>(0)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.scale(dpr, dpr)

    const w = window.innerWidth
    const h = window.innerHeight
    const cx = w / 2
    const cy = h / 2
    const maxDim = Math.max(w, h)
    const mobileScale = Math.min(w / 1000, 1)
    const stars = starsRef.current
    const startTime = performance.now()

    const timer = setTimeout(onComplete, ANIMATION_DURATION)

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1)

      const chargeP = phaseProgress(progress, 0, PHASE.CHARGE_END)
      const engageP = phaseProgress(progress, PHASE.CHARGE_END, PHASE.ENGAGE_END)
      const cruiseP = phaseProgress(progress, PHASE.ENGAGE_END, PHASE.CRUISE_END)
      const burstP = phaseProgress(progress, PHASE.BURST_START, 1)

      const speedMult =
        chargeP < 1 ? easeInCubic(chargeP) * 0.05 :
        engageP < 1 ? 0.05 + easeInQuart(engageP) * 0.95 : 1.0

      const shakeAmount = engageP > 0 && engageP < 1 ? Math.sin(elapsed * 0.05) * 3 * engageP * (1 - engageP) : 0
      ctx.save()
      ctx.translate(shakeAmount * Math.cos(elapsed * 0.03), shakeAmount * Math.sin(elapsed * 0.04))

      const bgBlue = cruiseP > 0 ? Math.floor(10 * easeOutCubic(cruiseP)) : 0
      ctx.fillStyle = `rgb(0, 0, ${bgBlue})`
      ctx.fillRect(-10, -10, w + 20, h + 20)

      // Tunnel rings
      if (cruiseP > 0) {
        const ringAlpha = 0.04 * easeOutCubic(cruiseP)
        for (let r = 0; r < 8; r++) {
          const ringPhase = ((elapsed * 0.001 + r * 0.12) % 1)
          const ringRadius = ringPhase * maxDim * 0.8
          ctx.beginPath()
          ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = `hsla(${r % 2 === 0 ? 190 : 220}, 80%, 60%, ${(1 - ringPhase) * ringAlpha})`
          ctx.lineWidth = 1.5
          ctx.stroke()
        }
      }

      // Stars
      for (const star of stars) {
        if (elapsed < star.delay) continue
        const starElapsed = elapsed - star.delay

        const startX = (star.x / 100) * w
        const startY = (star.y / 100) * h
        const dx = startX - cx
        const dy = startY - cy
        const dist = Math.sqrt(dx * dx + dy * dy)
        const normX = dist > 0 ? dx / dist : 0
        const normY = dist > 0 ? dy / dist : 0

        const starSpeed = speedMult * star.speed
        const stretch = starSpeed * maxDim * 1.5 * (0.4 + mobileScale * 0.6)
        const tailMult = speedMult > 0.5 ? 0.6 + speedMult * 0.4 : speedMult * 1.2
        const tailLength = Math.min(stretch * tailMult, 500 * mobileScale)

        const endX = startX + normX * stretch
        const endY = startY + normY * stretch
        const tailX = endX - normX * tailLength
        const tailY = endY - normY * tailLength

        const fadeIn = Math.min(starElapsed / 200, 1)
        const fadeOut = 1 - burstP * 0.8
        const layerBrightness = 0.5 + star.layer * 0.25
        const alpha = fadeIn * fadeOut * layerBrightness * (0.3 + speedMult * 0.7)
        const lineWidth = star.size * (1 + speedMult * 3) * (0.6 + mobileScale * 0.4)

        const saturation = Math.max(20, 100 - speedMult * 50)
        const lightness = 65 + speedMult * 25

        if (speedMult < 0.02) {
          const twinkle = 0.5 + 0.5 * Math.sin(starElapsed * 0.01 + star.id)
          ctx.beginPath()
          ctx.arc(startX, startY, star.size * (0.5 + twinkle * 0.5), 0, Math.PI * 2)
          ctx.fillStyle = `hsla(${star.hue}, 80%, 80%, ${alpha * twinkle})`
          ctx.fill()
        } else {
          const gradient = ctx.createLinearGradient(tailX, tailY, endX, endY)
          gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
          gradient.addColorStop(0.2, `hsla(${star.hue}, ${Math.min(saturation + 20, 100)}%, ${lightness - 10}%, ${alpha * 0.5})`)
          gradient.addColorStop(1, `hsla(${star.hue}, ${saturation}%, ${lightness}%, ${alpha})`)
          ctx.beginPath()
          ctx.moveTo(tailX, tailY)
          ctx.lineTo(endX, endY)
          ctx.strokeStyle = gradient
          ctx.lineWidth = lineWidth
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }

      // Central glow
      const glowSize = (30 + speedMult * 350 + (cruiseP > 0 ? Math.sin(elapsed * 0.005) * 30 : 0)) * (0.5 + mobileScale * 0.5)
      const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize)
      glowGrad.addColorStop(0, `rgba(0, 229, 255, ${0.4 * speedMult})`)
      glowGrad.addColorStop(0.3, `rgba(51, 136, 255, ${0.2 * speedMult})`)
      glowGrad.addColorStop(0.6, `rgba(80, 120, 255, ${0.08 * speedMult})`)
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = glowGrad
      ctx.fillRect(-10, -10, w + 20, h + 20)

      // Vignette
      if (cruiseP > 0) {
        const vGrad = ctx.createRadialGradient(cx, cy, maxDim * 0.2, cx, cy, maxDim * 0.7)
        vGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
        vGrad.addColorStop(1, `rgba(0, 0, 0, ${0.6 * easeOutCubic(cruiseP)})`)
        ctx.fillStyle = vGrad
        ctx.fillRect(-10, -10, w + 20, h + 20)
      }

      // Final burst
      if (burstP > 0) {
        const burstEase = easeOutCubic(burstP)
        const burstRadius = burstEase * maxDim * 0.6
        const burstAlpha = burstP < 0.4 ? easeInCubic(burstP / 0.4) * 0.7 : 0.7 * (1 - easeOutCubic((burstP - 0.4) / 0.6))
        const burstGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, burstRadius + 100)
        burstGrad.addColorStop(0, `rgba(0, 229, 255, ${burstAlpha})`)
        burstGrad.addColorStop(0.3, `rgba(51, 136, 255, ${burstAlpha * 0.6})`)
        burstGrad.addColorStop(0.6, `rgba(30, 60, 180, ${burstAlpha * 0.3})`)
        burstGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = burstGrad
        ctx.fillRect(-10, -10, w + 20, h + 20)

        if (burstP > 0.5) {
          ctx.fillStyle = `rgba(0, 0, 0, ${easeInCubic((burstP - 0.5) / 0.5)})`
          ctx.fillRect(-10, -10, w + 20, h + 20)
        }
      }

      // Text opacity (visible ~1.5s in the middle)
      if (textRef.current) {
        let textAlpha = 0
        if (progress > 0.30 && progress < 0.38) textAlpha = easeOutCubic((progress - 0.30) / 0.08)
        else if (progress >= 0.38 && progress < 0.65) textAlpha = 0.9
        else if (progress >= 0.65 && progress < 0.78) textAlpha = 0.9 * (1 - easeInCubic((progress - 0.65) / 0.13))
        textRef.current.style.opacity = String(textAlpha)
      }

      ctx.restore()
      if (progress < 1) animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animRef.current)
      clearTimeout(timer)
    }
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black" />
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
        <span
          ref={textRef}
          className="text-xl md:text-4xl font-bold tracking-[0.15em] md:tracking-[0.3em] text-white/90 uppercase opacity-0 text-center w-full"
          style={{ textShadow: '0 0 40px rgba(0,229,255,0.8), 0 0 80px rgba(51,136,255,0.5), 0 0 120px rgba(0,229,255,0.3)' }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
