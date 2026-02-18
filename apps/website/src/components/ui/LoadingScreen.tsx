'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'

// Logo variants — only 730x787 viewBox with consistent content size
const logoVariants = [
  '/images/logo_blue.svg',
  '/images/logo_light-green.svg',
  '/images/logo_breeze.svg',
  '/images/logo_light-blue.svg',
  '/images/logo_saladik.svg',
  '/images/logo_black-green.svg',
  '/images/logo_blue.svg',
  '/images/logo_breeze.svg',
  '/images/logo_light-blue.svg',
  '/images/logo_light-green.svg',
  '/images/logo_saladik.svg',
  '/images/logo_black-green.svg',
]

interface LoadingScreenProps {
  duration?: number
  onComplete?: () => void
}

export function LoadingScreen({
  duration = 3500,
  onComplete,
}: LoadingScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState<'cycling' | 'done'>('cycling')
  const [isComplete, setIsComplete] = useState(false)
  const [isDark, setIsDark] = useState(true)

  // Detect theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light') {
      setIsDark(false)
    } else if (savedTheme === 'dark') {
      setIsDark(true)
    } else {
      setIsDark(true)
    }
  }, [])

  // Preload all logo images
  useEffect(() => {
    logoVariants.forEach((src) => {
      const img = new window.Image()
      img.src = src
    })
  }, [])

  const finishLoading = useCallback(() => {
    setIsComplete(true)
    onComplete?.()
  }, [onComplete])

  // Phase 1: Rapid cycling (faster and faster)
  useEffect(() => {
    if (phase !== 'cycling') return

    // Start fast, get faster: 200ms -> 100ms -> 60ms
    const cycleTime = duration * 0.7 // 70% of time for cycling
    const startTime = Date.now()

    const tick = () => {
      const elapsed = Date.now() - startTime
      const progress = elapsed / cycleTime

      if (progress >= 1) {
        setPhase('done')
        return
      }

      // Speed increases over time: starts at 200ms intervals, ends at 60ms
      const interval = 200 - progress * 140
      setCurrentIndex((prev) => (prev + 1) % logoVariants.length)

      setTimeout(tick, interval)
    }

    const timer = setTimeout(tick, 200)
    return () => clearTimeout(timer)
  }, [phase, duration])

  // Phase 2: Done — hold final logo then fade out
  useEffect(() => {
    if (phase !== 'done') return

    const hideTimer = setTimeout(() => {
      finishLoading()
    }, duration * 0.2) // 20% of time for final hold

    return () => clearTimeout(hideTimer)
  }, [phase, duration, finishLoading])

  const finalLogo = isDark ? '/images/logo_white.svg' : '/images/logo_black.svg'

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.6, ease: 'easeInOut' },
          }}
        >
          {/* Cycling phase — rapid logo switching */}
          {phase === 'cycling' && (
            <motion.div
              className="relative"
              style={{ width: 180, height: 194 }}
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  transition={{ duration: 0.08 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={logoVariants[currentIndex]}
                    alt=""
                    fill
                    className="object-contain"
                    priority
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* Done phase — final logo reveal */}
          {phase === 'done' && (
            <motion.div
              className="relative"
              style={{ width: 180, height: 194 }}
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Image
                src={finalLogo}
                alt="Eternity"
                fill
                className="object-contain"
                priority
              />

              {/* Subtle glow behind final logo */}
              <motion.div
                className="absolute inset-0 -z-10"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.3, scale: 2 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  background: `radial-gradient(circle, ${isDark ? 'rgba(51,136,255,0.3)' : 'rgba(0,102,255,0.15)'}, transparent 70%)`,
                }}
              />
            </motion.div>
          )}

          {/* "ETERNITY" text appears with final logo */}
          {phase === 'done' && (
            <motion.p
              className="absolute bottom-[30%] text-sm font-medium tracking-[0.3em] uppercase"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              ETERNITY
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
