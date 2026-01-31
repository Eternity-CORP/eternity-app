'use client'

import { motion, useInView, useAnimationControls } from 'framer-motion'
import { useRef, useState, useEffect } from 'react'
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
  const [hoverCount, setHoverCount] = useState(0)
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false)

  const redControls = useAnimationControls()
  const cyanControls = useAnimationControls()
  const scanlineControls = useAnimationControls()

  // Intensity settings for RGB offset
  const intensityMap = {
    subtle: { x: 2, y: 1 },
    medium: { x: 4, y: 2 },
    intense: { x: 8, y: 3 },
  }
  const intensity = intensityMap[glitchIntensity]

  const runGlitchAnimation = async (withDelay: boolean) => {
    const animationDelay = withDelay ? delay : 0

    // Red channel animation
    redControls.start({
      opacity: [0, 0.8, 0.8, 0.4, 0],
      x: [-intensity.x * 3, -intensity.x, -intensity.x * 1.5, -intensity.x * 0.5, 0],
      transition: {
        duration: glitchDuration,
        delay: animationDelay,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.2, 0.5, 0.8, 1],
      },
    })

    // Cyan channel animation
    cyanControls.start({
      opacity: [0, 0.8, 0.8, 0.4, 0],
      x: [intensity.x * 3, intensity.x, intensity.x * 1.5, intensity.x * 0.5, 0],
      transition: {
        duration: glitchDuration,
        delay: animationDelay + 0.05,
        ease: [0.25, 0.1, 0.25, 1],
        times: [0, 0.2, 0.5, 0.8, 1],
      },
    })

    // Scanline animation
    scanlineControls.start({
      opacity: [0, 0.3, 0, 0.2, 0],
      transition: {
        duration: glitchDuration * 0.8,
        delay: animationDelay,
        times: [0, 0.3, 0.5, 0.7, 1],
      },
    })
  }

  // Trigger on first view (after loading complete)
  useEffect(() => {
    if (isLoaded && isInView && !hasAnimatedOnce) {
      setHasAnimatedOnce(true)
      runGlitchAnimation(true)
    }
  }, [isLoaded, isInView])

  // Trigger on hover
  const handleMouseEnter = () => {
    if (hasAnimatedOnce) {
      setHoverCount((c) => c + 1)
      runGlitchAnimation(false)
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
      {/* Base text layer */}
      <Component className={`relative ${className}`} style={style}>
        {children}
      </Component>

      {/* Dark channel (left offset) */}
      <motion.span
        className={`absolute inset-0 ${className}`}
        style={{
          ...style,
          color: 'transparent',
          textShadow: `${-intensity.x}px 0 rgba(80, 80, 80, 0.8)`,
          mixBlendMode: 'multiply',
        }}
        initial={{ opacity: 0, x: -intensity.x * 3 }}
        animate={redControls}
        aria-hidden
      >
        {children}
      </motion.span>

      {/* White channel (right offset) */}
      <motion.span
        className={`absolute inset-0 ${className}`}
        style={{
          ...style,
          color: 'transparent',
          textShadow: `${intensity.x}px 0 rgba(255, 255, 255, 0.7)`,
          mixBlendMode: 'screen',
        }}
        initial={{ opacity: 0, x: intensity.x * 3 }}
        animate={cyanControls}
        aria-hidden
      >
        {children}
      </motion.span>

      {/* Scanline flicker effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        initial={{ opacity: 0 }}
        animate={scanlineControls}
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
