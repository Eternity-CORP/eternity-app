// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/* ---- Glow Title ---- */
interface GlowTitleProps {
  children: string
  className?: string
  delay?: number
  visible?: boolean
}

export function GlowTitle({ children, className = '', delay = 0, visible = true }: GlowTitleProps) {
  return (
    <motion.h2
      className={`hud-glow font-bold ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.h2>
  )
}

/* ---- Typewriter Text ---- */
interface TypewriterProps {
  text: string
  className?: string
  speed?: number
  delay?: number
  visible?: boolean
  onComplete?: () => void
}

export function TypewriterText({ text, className = '', speed = 40, delay = 0, visible = true, onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!visible) { setDisplayed(''); setStarted(false); return }
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [visible, delay])

  useEffect(() => {
    if (!started) return
    if (displayed.length >= text.length) { onComplete?.(); return }
    const timer = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed)
    return () => clearTimeout(timer)
  }, [started, displayed, text, speed, onComplete])

  return (
    <span className={`hud-glow-subtle ${className}`}>
      {displayed}
      {started && displayed.length < text.length && <span className="hud-cursor" />}
    </span>
  )
}

/* ---- Count-Up Number ---- */
interface CountUpProps {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  delay?: number
  visible?: boolean
  separator?: boolean
}

export function CountUp({ target, duration = 1500, prefix = '', suffix = '', className = '', delay = 0, visible = true, separator = true }: CountUpProps) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!visible) { setValue(0); return }
    const startTime = performance.now() + delay
    const animate = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < 0) { frameRef.current = requestAnimationFrame(animate); return }
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [visible, target, duration, delay])

  const formatted = separator ? value.toLocaleString() : String(value)

  return (
    <span className={`hud-mono ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

/* ---- Hex Scramble (for addresses) ---- */
interface HexScrambleProps {
  text: string
  className?: string
  visible?: boolean
  scrambleDuration?: number
}

const HEX_CHARS = '0123456789abcdef'

export function HexScramble({ text, className = '', visible = true, scrambleDuration = 2000 }: HexScrambleProps) {
  const [displayed, setDisplayed] = useState(text)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!visible) { setDisplayed(text); return }
    const startTime = performance.now()
    const chars = text.split('')

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / scrambleDuration, 1)
      const settled = Math.floor(progress * chars.length)

      const result = chars.map((ch, i) => {
        if (i < settled) return ch
        if (ch === 'x' || ch === '.' || ch === '0' && i < 2) return ch
        return HEX_CHARS[Math.floor(Math.random() * 16)]
      })

      setDisplayed(result.join(''))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [visible, text, scrambleDuration])

  return <span className={`hud-mono ${className}`}>{displayed}</span>
}
