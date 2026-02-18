'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, type ReactNode } from 'react'

type RevealVariant = 'slide-up' | 'slide-left' | 'slide-right' | 'scale-up' | 'fade'

interface ScrollRevealProps {
  children: ReactNode
  variant?: RevealVariant
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}

const variants = {
  'slide-up': { hidden: { y: 60, opacity: 0 }, visible: { y: 0, opacity: 1 } },
  'slide-left': { hidden: { x: 80, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  'slide-right': { hidden: { x: -80, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  'scale-up': { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1 } },
  'fade': { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}

export function ScrollReveal({
  children,
  variant = 'slide-up',
  delay = 0,
  duration = 0.7,
  className,
  once = true,
}: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[variant]}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface StaggerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function Stagger({ children, staggerDelay = 0.1, className }: StaggerProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
