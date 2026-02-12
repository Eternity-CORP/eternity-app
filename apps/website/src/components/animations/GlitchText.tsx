'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useMemo } from 'react'
import { useLoading } from '@/context/LoadingContext'

interface GlitchTextProps {
  children: string
  className?: string
  style?: React.CSSProperties
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'
  delay?: number
  glitchDuration?: number
  glitchIntensity?: 'subtle' | 'medium' | 'intense'
}

// Characters to use for scramble effect
const glitchChars = '!@#$%^&*_+-=|;:<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Single character with scramble effect
function ScrambleChar({
  char,
  delay,
  intensity,
  style,
}: {
  char: string
  delay: number
  intensity: 'subtle' | 'medium' | 'intense'
  style?: React.CSSProperties
}) {
  const [displayChar, setDisplayChar] = useState(' ')

  const iterationCount = intensity === 'subtle' ? 4 : intensity === 'medium' ? 6 : 10

  useEffect(() => {
    if (char === ' ') {
      setDisplayChar(' ')
      return
    }

    // Start with random character
    setDisplayChar(glitchChars[Math.floor(Math.random() * glitchChars.length)])

    // Start scramble after delay
    const startTimeout = setTimeout(() => {
      let iteration = 0
      const scrambleInterval = setInterval(() => {
        if (iteration < iterationCount) {
          setDisplayChar(glitchChars[Math.floor(Math.random() * glitchChars.length)])
          iteration++
        } else {
          setDisplayChar(char)
          clearInterval(scrambleInterval)
        }
      }, 40)

      return () => clearInterval(scrambleInterval)
    }, delay * 1000)

    return () => clearTimeout(startTimeout)
  }, [char, delay, iterationCount])

  return (
    <motion.span
      style={{
        display: 'inline-block',
        minWidth: char === ' ' ? '0.25em' : undefined,
        ...style,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.1, delay }}
    >
      {displayChar}
    </motion.span>
  )
}

export function GlitchText({
  children,
  className = '',
  style,
  as: Component = 'span',
  delay = 0,
  glitchDuration = 1.2,
  glitchIntensity = 'medium',
}: GlitchTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const { isLoaded } = useLoading()
  const [hasStarted, setHasStarted] = useState(false)
  const [hoverKey, setHoverKey] = useState(0)

  // Split text into characters
  const characters = useMemo(() => children.split(''), [children])

  // Calculate delay per character based on total duration
  const charDelay = glitchDuration / characters.length

  // Start animation when in view and loaded
  useEffect(() => {
    if (isLoaded && isInView && !hasStarted) {
      setHasStarted(true)
    }
  }, [isLoaded, isInView, hasStarted])

  // Handle hover to replay animation
  const handleMouseEnter = () => {
    if (hasStarted) {
      setHoverKey(prev => prev + 1)
    }
  }

  return (
    <motion.div
      ref={ref}
      className="relative inline-block cursor-pointer"
      onMouseEnter={handleMouseEnter}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded && isInView ? 1 : 0 }}
      transition={{ duration: 0.3, delay: isLoaded ? delay : 0 }}
    >
      <Component className={`relative ${className}`} style={style}>
        {hasStarted && characters.map((char, index) => (
          <ScrambleChar
            key={`${index}-${hoverKey}`}
            char={char}
            delay={index * charDelay}
            intensity={glitchIntensity}
            style={style}
          />
        ))}
        {/* Invisible text for layout */}
        {!hasStarted && (
          <span style={{ visibility: 'hidden' }}>{children}</span>
        )}
      </Component>
    </motion.div>
  )
}
