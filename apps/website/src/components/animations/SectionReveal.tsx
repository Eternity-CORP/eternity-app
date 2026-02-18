'use client'

import { useRef, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'

interface SectionRevealProps {
  children: ReactNode
  className?: string
  /** Parallax speed for the section content (0 = no parallax, 0.1 = subtle) */
  parallax?: number
  /** Whether to apply the card-stack effect (scale + slight rotation) */
  cardEffect?: boolean
}

/**
 * Wraps a section with scroll-driven reveal animations:
 * - Scale from 0.92 → 1.0 as it enters viewport
 * - Opacity from 0 → 1
 * - Optional subtle parallax
 * - 3D card-stack perspective tilt
 */
export function SectionReveal({
  children,
  className = '',
  parallax = 0,
  cardEffect = true,
}: SectionRevealProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  // Entrance progress: 0 when section bottom hits viewport top, 1 when fully in
  const entryProgress = useTransform(scrollYProgress, [0, 0.25], [0, 1])
  const exitProgress = useTransform(scrollYProgress, [0.75, 1], [1, 0])

  // Smooth springs for organic feel
  const smoothEntry = useSpring(entryProgress, { stiffness: 80, damping: 25 })

  // Scale: 0.92 → 1.0
  const scale = useTransform(smoothEntry, [0, 1], cardEffect ? [0.92, 1] : [1, 1])

  // Opacity
  const opacity = useTransform(smoothEntry, [0, 1], [0, 1])

  // Subtle rotation on entry (card tilt)
  const rotateX = useTransform(smoothEntry, [0, 1], cardEffect ? [3, 0] : [0, 0])

  // Parallax Y offset
  const yParallax = useTransform(scrollYProgress, [0, 1], [parallax * 100, -parallax * 100])
  const y = useSpring(yParallax, { stiffness: 50, damping: 20 })

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        scale,
        opacity,
        rotateX,
        y: parallax > 0 ? y : undefined,
        transformPerspective: 1200,
        transformOrigin: 'center bottom',
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </motion.div>
  )
}

/**
 * Parallax wrapper for background elements within a section.
 * Moves slower/faster than scroll to create depth.
 */
interface ParallaxLayerProps {
  children: ReactNode
  speed?: number // -1 to 1, negative = moves opposite
  className?: string
}

export function ParallaxLayer({ children, speed = 0.1, className = '' }: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const y = useTransform(scrollYProgress, [0, 1], [speed * 150, -speed * 150])
  const smoothY = useSpring(y, { stiffness: 40, damping: 20 })

  return (
    <motion.div ref={ref} className={className} style={{ y: smoothY, willChange: 'transform' }}>
      {children}
    </motion.div>
  )
}
