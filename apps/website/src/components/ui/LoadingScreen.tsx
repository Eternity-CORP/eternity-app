'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'

const darkThemeVariants = [
  '/images/logo_blue.svg',
  '/images/logo_light-green.svg',
  '/images/logo_breeze.svg',
  '/images/logo_light-blue.svg',
  '/images/logo_saladik.svg',
  '/images/logo_black-green.svg',
]

const lightThemeVariants = [
  '/images/logo_blue.svg',
  '/images/logo_black-green.svg',
  '/images/logo_blue.svg',
  '/images/logo_black-green.svg',
  '/images/logo_blue.svg',
  '/images/logo_black-green.svg',
]

interface LoadingScreenProps {
  duration?: number
  onComplete?: () => void
}

function preloadImages(srcs: string[]): Promise<void> {
  const unique = [...new Set(srcs)]
  return Promise.all(
    unique.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new window.Image()
          img.onload = () => resolve()
          img.onerror = () => resolve()
          img.src = src
        })
    )
  ).then(() => {})
}

export function LoadingScreen({
  duration = 2000,
  onComplete,
}: LoadingScreenProps) {
  const [phase, setPhase] = useState<'preloading' | 'cycling' | 'done'>('preloading')
  const [isComplete, setIsComplete] = useState(false)
  const { isDark } = useTheme()

  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (phase !== 'preloading') return

    let cancelled = false
    const variants = isDarkRef.current ? darkThemeVariants : lightThemeVariants

    preloadImages(variants).then(() => {
      if (!cancelled) {
        setPhase('cycling')
      }
    })

    const timeout = setTimeout(() => {
      if (!cancelled) {
        setPhase((prev) => (prev === 'preloading' ? 'cycling' : prev))
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [phase])

  const finishLoading = useCallback(() => {
    setIsComplete(true)
    onComplete?.()
  }, [onComplete])

  useLayoutEffect(() => {
    if (phase === 'cycling' && imgRef.current) {
      const variants = isDarkRef.current ? darkThemeVariants : lightThemeVariants
      imgRef.current.src = variants[0]
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'cycling') return

    let cancelled = false
    const cycleTime = duration * 0.7
    const startTime = performance.now()
    let index = 0
    let lastSwap = 0

    const tick = (now: number) => {
      if (cancelled) return

      const elapsed = now - startTime
      const progress = elapsed / cycleTime

      if (progress >= 1) {
        setPhase('done')
        return
      }

      const interval = 200 - progress * 120
      if (elapsed - lastSwap >= interval) {
        lastSwap = elapsed
        const variants = isDarkRef.current ? darkThemeVariants : lightThemeVariants
        index = (index + 1) % variants.length

        if (imgRef.current) {
          imgRef.current.src = variants[index]
        }
      }

      requestAnimationFrame(tick)
    }

    const startTimer = setTimeout(() => {
      requestAnimationFrame(tick)
    }, 50)

    return () => {
      cancelled = true
      clearTimeout(startTimer)
    }
  }, [phase, duration])

  useEffect(() => {
    if (phase !== 'done') return

    const hideTimer = setTimeout(() => {
      finishLoading()
    }, duration * 0.2)

    return () => clearTimeout(hideTimer)
  }, [phase, duration, finishLoading])

  const finalLogo = isDark ? '/images/logo_white.svg' : '/images/logo_black.svg'

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: isDark ? '#000000' : '#ffffff' }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: 'easeInOut' },
          }}
        >
          {(phase === 'preloading' || phase === 'cycling') && (
            <div
              className="relative"
              style={{ width: 180, height: 194 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                alt=""
                src={isDark ? darkThemeVariants[0] : lightThemeVariants[0]}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {phase === 'done' && (
            <motion.div
              className="relative"
              style={{ width: 180, height: 194 }}
              initial={{ opacity: 0, scale: 1.3 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.4,
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
              <motion.div
                className="absolute inset-0 -z-10"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 0.3, scale: 2 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{
                  background: `radial-gradient(circle, ${isDark ? 'rgba(51,136,255,0.3)' : 'rgba(0,102,255,0.15)'}, transparent 70%)`,
                }}
              />
            </motion.div>
          )}

          {phase === 'done' && (
            <motion.p
              className="absolute bottom-[30%] text-sm font-medium tracking-[0.3em] uppercase"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)' }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              ETERNITY
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
