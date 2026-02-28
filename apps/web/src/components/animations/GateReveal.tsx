'use client'

import { useState, useEffect, useRef } from 'react'
import LogoReveal from './LogoReveal'

/**
 * GateReveal — fullscreen overlay shown after invite code validation.
 * Displays LogoReveal animation centered with "Welcome to Eternity" text below.
 * Fades to black → calls onComplete.
 */

interface GateRevealProps {
  onComplete: () => void
}

export default function GateReveal({ onComplete }: GateRevealProps) {
  const [animDone, setAnimDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (animDone) {
      // Brief pause after animation ends, then redirect
      timerRef.current = setTimeout(onComplete, 600)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [animDone, onComplete])

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
      {/* Logo animation container */}
      <div
        className="relative"
        style={{ width: 280, height: 320 }}
      >
        <LogoReveal active={!animDone} onComplete={() => setAnimDone(true)} />
      </div>

      {/* Text below logo */}
      <p
        className="mt-6 text-lg md:text-xl font-medium tracking-[0.2em] uppercase text-white/70 transition-opacity duration-700"
        style={{
          opacity: animDone ? 0 : 1,
          textShadow: '0 0 30px rgba(51, 136, 255, 0.4)',
        }}
      >
        Welcome to Eternity
      </p>

      {/* Fade to black overlay when animation completes */}
      <div
        className="absolute inset-0 bg-black pointer-events-none transition-opacity duration-500"
        style={{ opacity: animDone ? 1 : 0 }}
      />
    </div>
  )
}
