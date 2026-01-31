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
const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

// Single character with particle assembly effect
function GlitchChar({
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
  const [displayChar, setDisplayChar] = useState(char === ' ' ? ' ' : glitchChars[Math.floor(Math.random() * glitchChars.length)])
  const [isRevealed, setIsRevealed] = useState(false)
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number }>>([])

  const iterationCount = intensity === 'subtle' ? 3 : intensity === 'medium' ? 5 : 8
  const particleCount = intensity === 'subtle' ? 2 : intensity === 'medium' ? 4 : 6

  useEffect(() => {
    if (char === ' ') {
      setIsRevealed(true)
      return
    }

    // Generate particles
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 60,
      y: (Math.random() - 0.5) * 60,
    }))
    setParticles(newParticles)

    // Start scramble after delay
    const startTimeout = setTimeout(() => {
      let iteration = 0
      const scrambleInterval = setInterval(() => {
        if (iteration < iterationCount) {
          setDisplayChar(glitchChars[Math.floor(Math.random() * glitchChars.length)])
          iteration++
        } else {
          setDisplayChar(char)
          setIsRevealed(true)
          clearInterval(scrambleInterval)
        }
      }, 50)

      return () => clearInterval(scrambleInterval)
    }, delay * 1000)

    return () => clearTimeout(startTimeout)
  }, [char, delay, iterationCount, particleCount])

  return (
    <span className="relative inline-block" style={style}>
      {/* Particles */}
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute top-1/2 left-1/2 w-1 h-1 pointer-events-none"
          style={{ backgroundColor: style?.color || 'currentColor' }}
          initial={{
            x: particle.x,
            y: particle.y,
            opacity: 0.8,
            scale: 1,
          }}
          animate={{
            x: 0,
            y: 0,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 0.4,
            delay: delay + 0.1,
            ease: 'easeOut',
          }}
        />
      ))}

      {/* Character with glitch effect */}
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.2,
          delay: delay,
        }}
        style={{
          display: 'inline-block',
          minWidth: char === ' ' ? '0.3em' : undefined,
        }}
      >
        {displayChar}
      </motion.span>

      {/* Glitch overlay on reveal */}
      {!isRevealed && (
        <motion.span
          className="absolute inset-0 pointer-events-none"
          style={{
            ...style,
            textShadow: '2px 0 rgba(255,255,255,0.3), -2px 0 rgba(100,100,100,0.3)',
          }}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 0.8, 0.3, 0.6, 0] }}
          transition={{ duration: 0.3, delay }}
        >
          {displayChar}
        </motion.span>
      )}
    </span>
  )
}

export function GlitchText({
  children,
  className = '',
  style,
  as: Component = 'span',
  delay = 0,
  glitchDuration = 0.8,
  glitchIntensity = 'medium',
}: GlitchTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const { isLoaded } = useLoading()
  const [hasStarted, setHasStarted] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
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
      setIsHovering(true)
    }
  }

  const handleMouseLeave = () => {
    setIsHovering(false)
  }

  return (
    <motion.div
      ref={ref}
      className="relative inline-block cursor-pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded && isInView ? 1 : 0 }}
      transition={{ duration: 0.3, delay: isLoaded ? delay : 0 }}
    >
      <Component className={`relative ${className}`} style={style}>
        {hasStarted && characters.map((char, index) => (
          <GlitchChar
            key={`${index}-${hoverKey}`}
            char={char}
            delay={delay + index * charDelay}
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
