'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import Image from 'next/image'

interface LoadingScreenProps {
  duration?: number // in milliseconds
  onComplete?: () => void
}

export function LoadingScreen({
  duration = 2500,
  onComplete
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [isDark, setIsDark] = useState(true) // Default to dark

  // Check theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'light') {
      setIsDark(false)
    } else if (savedTheme === 'dark') {
      setIsDark(true)
    } else {
      // Check system preference, default to dark
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark || true) // Default dark if no preference
    }
  }, [])

  useEffect(() => {
    const startTime = Date.now()
    const interval = 16 // ~60fps

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = Math.min((elapsed / duration) * 100, 100)

      setProgress(Math.floor(newProgress))

      if (newProgress >= 100) {
        clearInterval(timer)
        // Small delay before hiding
        setTimeout(() => {
          setIsComplete(true)
          onComplete?.()
        }, 200)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [duration, onComplete])

  return (
    <AnimatePresence>
      {!isComplete && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-end"
          style={{ backgroundColor: isDark ? '#0a0a0a' : '#ffffff' }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: 'easeInOut' }
          }}
        >
          {/* Logo */}
          <div className="absolute top-8 left-8">
            <Image
              src={isDark ? '/images/logo_white.svg' : '/images/logo.svg'}
              alt="Eternity"
              width={48}
              height={48}
              priority
            />
          </div>

          {/* Progress counter */}
          <motion.div
            className="p-8 md:p-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <span
              className="font-mono text-6xl md:text-9xl font-light tracking-tighter"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              {progress}
              <span className="text-4xl md:text-6xl opacity-50">%</span>
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
