'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, useState } from 'react'

interface GlitchTextProps {
  children: string
  className?: string
  style?: React.CSSProperties
  as?: 'h1' | 'h2' | 'h3' | 'span' | 'p'
  delay?: number
  glitchDuration?: number
  glitchIntensity?: 'subtle' | 'medium' | 'intense'
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
  const [isHovered, setIsHovered] = useState(false)

  // Intensity settings for RGB offset
  const intensityMap = {
    subtle: { x: 2, y: 1 },
    medium: { x: 4, y: 2 },
    intense: { x: 8, y: 3 },
  }
  const intensity = intensityMap[glitchIntensity]

  const shouldGlitch = isInView || isHovered

  return (
    <motion.div
      ref={ref}
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: isInView ? 1 : 0 }}
      transition={{ duration: 0.3, delay }}
    >
      {/* Base text layer */}
      <Component className={`relative ${className}`} style={style}>
        {children}
      </Component>

      {/* Red channel (left offset) */}
      <motion.span
        className={`absolute inset-0 ${className}`}
        style={{
          color: 'transparent',
          textShadow: `${-intensity.x}px 0 rgba(255, 0, 0, 0.7)`,
          mixBlendMode: 'screen',
        }}
        initial={{ opacity: 0, x: -intensity.x * 3 }}
        animate={shouldGlitch ? {
          opacity: [0, 0.8, 0.8, 0.4, 0],
          x: [-intensity.x * 3, -intensity.x, -intensity.x * 1.5, -intensity.x * 0.5, 0],
        } : { opacity: 0 }}
        transition={{
          duration: glitchDuration,
          delay: isHovered ? 0 : delay,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.2, 0.5, 0.8, 1],
        }}
        aria-hidden
      >
        {children}
      </motion.span>

      {/* Cyan/Blue channel (right offset) */}
      <motion.span
        className={`absolute inset-0 ${className}`}
        style={{
          color: 'transparent',
          textShadow: `${intensity.x}px 0 rgba(0, 255, 255, 0.7)`,
          mixBlendMode: 'screen',
        }}
        initial={{ opacity: 0, x: intensity.x * 3 }}
        animate={shouldGlitch ? {
          opacity: [0, 0.8, 0.8, 0.4, 0],
          x: [intensity.x * 3, intensity.x, intensity.x * 1.5, intensity.x * 0.5, 0],
        } : { opacity: 0 }}
        transition={{
          duration: glitchDuration,
          delay: isHovered ? 0 : delay + 0.05,
          ease: [0.25, 0.1, 0.25, 1],
          times: [0, 0.2, 0.5, 0.8, 1],
        }}
        aria-hidden
      >
        {children}
      </motion.span>

      {/* Scanline flicker effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={shouldGlitch ? {
          opacity: [0, 0.3, 0, 0.2, 0],
        } : { opacity: 0 }}
        transition={{
          duration: glitchDuration * 0.8,
          delay: isHovered ? 0 : delay,
          times: [0, 0.3, 0.5, 0.7, 1],
        }}
        aria-hidden
      >
        <div
          className="w-full h-full"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
