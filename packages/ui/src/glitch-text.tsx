'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState, useEffect, useMemo, CSSProperties } from 'react'

interface GlitchTextProps {
  children: string
  className?: string
  style?: CSSProperties
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'
  delay?: number
  glitchDuration?: number
  glitchIntensity?: 'subtle' | 'medium' | 'intense'
  startOnView?: boolean
}

const glitchChars = '!@#$%^&*_+-=|;:<>?0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function ScrambleChar({
  char,
  delay,
  intensity,
  style,
}: {
  char: string
  delay: number
  intensity: 'subtle' | 'medium' | 'intense'
  style?: CSSProperties
}) {
  const [displayChar, setDisplayChar] = useState(' ')
  const iterationCount = intensity === 'subtle' ? 4 : intensity === 'medium' ? 6 : 10

  useEffect(() => {
    if (char === ' ') {
      setDisplayChar(' ')
      return
    }

    setDisplayChar(glitchChars[Math.floor(Math.random() * glitchChars.length)])

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
      style={{ display: 'inline-block', minWidth: char === ' ' ? '0.25em' : undefined, ...style }}
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
  startOnView = true,
}: GlitchTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const [hasStarted, setHasStarted] = useState(!startOnView)
  const [hoverKey, setHoverKey] = useState(0)

  const characters = useMemo(() => children.split(''), [children])
  const charDelay = glitchDuration / characters.length

  useEffect(() => {
    if (startOnView && isInView && !hasStarted) {
      const timer = setTimeout(() => setHasStarted(true), delay * 1000)
      return () => clearTimeout(timer)
    }
  }, [isInView, hasStarted, startOnView, delay])

  const handleMouseEnter = () => {
    if (hasStarted) setHoverKey(prev => prev + 1)
  }

  return (
    <motion.div
      ref={ref}
      className="relative inline-block cursor-pointer"
      onMouseEnter={handleMouseEnter}
      initial={{ opacity: 0 }}
      animate={{ opacity: hasStarted ? 1 : 0 }}
      transition={{ duration: 0.3 }}
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
        {!hasStarted && <span style={{ visibility: 'hidden' }}>{children}</span>}
      </Component>
    </motion.div>
  )
}
