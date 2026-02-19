'use client'

import { useEffect, useRef } from 'react'

const PARTICLE_COUNT = 300
const CURSOR_RADIUS = 35
const CURSOR_FORCE = 1.5

interface Particle {
  x: number
  y: number
  homeX: number
  homeY: number
  size: number
  hue: number
  alpha: number
  phase: number
}

function sampleSvgPoints(
  svgText: string,
  count: number,
  width: number,
  height: number
): { x: number; y: number }[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(svgText, 'image/svg+xml')
  const svg = doc.querySelector('svg')
  if (!svg) return []

  const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 730, 787]
  const vbW = viewBox[2]
  const vbH = viewBox[3]

  const paths = Array.from(doc.querySelectorAll('svg > path'))
    .filter((p) => {
      let parent = p.parentElement as Element | null
      while (parent && parent !== (svg as Element)) {
        const tag = parent.tagName.toLowerCase()
        if (tag === 'defs' || tag === 'clippath' || tag === 'filter') return false
        parent = parent.parentElement
      }
      return true
    })

  if (paths.length === 0) return []

  const pathLengths = paths.map((p) => (p as SVGPathElement).getTotalLength())
  const totalLength = pathLengths.reduce((a, b) => a + b, 0)

  const allPoints: { x: number; y: number }[] = []
  const samplesPerUnit = (count * 4) / totalLength

  paths.forEach((path, idx) => {
    const pathEl = path as SVGPathElement
    const len = pathLengths[idx]
    const samples = Math.max(5, Math.floor(len * samplesPerUnit))

    for (let i = 0; i < samples; i++) {
      const t = (i / samples) * len
      const pt = pathEl.getPointAtLength(t)
      const scale = Math.min((width * 0.7) / vbW, (height * 0.7) / vbH)
      const offsetX = (width - vbW * scale) / 2
      const offsetY = (height - vbH * scale) / 2
      allPoints.push({
        x: pt.x * scale + offsetX,
        y: pt.y * scale + offsetY,
      })
    }
  })

  const result: { x: number; y: number }[] = []
  for (let i = 0; i < count; i++) {
    result.push(
      allPoints[Math.floor(Math.random() * allPoints.length)] || {
        x: width / 2,
        y: height / 2,
      }
    )
  }
  return result
}

export default function MiniParticleBg() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const readyRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement
    if (!parent) return

    let w = 0
    let h = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
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

    // Load SVG and place particles at logo positions immediately
    fetch('/logo.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const points = sampleSvgPoints(svgText, PARTICLE_COUNT, w, h)
        const particles: Particle[] = []

        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const pt = points[i] || { x: w / 2, y: h / 2 }
          const hueRoll = Math.random()
          let hue: number
          if (hueRoll < 0.4) hue = 210
          else if (hueRoll < 0.7) hue = 195
          else hue = 265

          particles.push({
            x: pt.x,
            y: pt.y,
            homeX: pt.x,
            homeY: pt.y,
            size: 0.6 + Math.random() * 1.0,
            hue,
            alpha: 0.15 + Math.random() * 0.25,
            phase: Math.random() * Math.PI * 2,
          })
        }

        particlesRef.current = particles
        readyRef.current = true
      })
      .catch(() => {})

    // Mouse tracking
    const handleMouseMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }
    parent.addEventListener('pointermove', handleMouseMove)
    parent.addEventListener('pointerleave', handleMouseLeave)

    const animate = () => {
      ctx.clearRect(0, 0, w, h)

      if (!readyRef.current) {
        animRef.current = requestAnimationFrame(animate)
        return
      }

      const particles = particlesRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y
      const time = performance.now() * 0.001

      for (const p of particles) {
        // Target = home + tiny breathing offset
        let tx = p.homeX + Math.sin(time * 0.4 + p.phase) * 0.5
        let ty = p.homeY + Math.cos(time * 0.5 + p.phase) * 0.5

        // Cursor repulsion from target
        const dx = tx - mx
        const dy = ty - my
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < CURSOR_RADIUS && dist > 0.5) {
          const force = (1 - dist / CURSOR_RADIUS) * CURSOR_FORCE
          tx += (dx / dist) * force * CURSOR_RADIUS * 0.3
          ty += (dy / dist) * force * CURSOR_RADIUS * 0.3
        }

        // Smooth lerp to target (snaps back when cursor leaves)
        p.x += (tx - p.x) * 0.08
        p.y += (ty - p.y) * 0.08

        // Draw
        const alphaFinal = p.alpha + Math.sin(time * 0.8 + p.phase) * 0.05
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 70%, 70%, ${alphaFinal})`
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
      parent.removeEventListener('pointermove', handleMouseMove)
      parent.removeEventListener('pointerleave', handleMouseLeave)
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
