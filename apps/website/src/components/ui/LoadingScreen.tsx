'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

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
          style={{ backgroundColor: '#0a0a0a' }}
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            transition: { duration: 0.5, ease: 'easeInOut' }
          }}
        >
          {/* Progress counter */}
          {/* Logo */}
          <div className="absolute top-8 left-8">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
              <polygon points="50,5 85,55 50,55" fill="#666" />
              <polygon points="50,5 50,55 15,55" fill="#555" />
              <polygon points="50,55 85,55 50,95" fill="#888" />
              <polygon points="50,55 50,95 15,55" fill="#777" />
            </svg>
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
              style={{ color: '#ffffff' }}
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
