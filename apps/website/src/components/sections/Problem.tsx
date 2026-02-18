'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ScrollReveal } from '@/components/animations/ScrollReveal'

function CountUp({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (!isInView) return
    const start = performance.now()
    const animate = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isInView, target, duration])

  return <span ref={ref}>{value.toFixed(1)}</span>
}

export function Problem() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: false, amount: 0.3 })

  return (
    <section
      id="problem"
      ref={sectionRef}
      className="relative min-h-screen flex items-center py-32 overflow-hidden"
    >
      {/* Red radial gradient background — fades in/out with section */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.8 }}
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,68,68,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
        <ScrollReveal>
          <p className="text-tag text-white/30 mb-6">THE PROBLEM</p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <p className="text-display text-gradient-red mb-4">
            $ <CountUp target={5.9} /> Billion
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-body-lg text-white/70 mb-8">
            lost to crypto scams and errors in 2023 alone.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <p className="text-body text-white/50 max-w-lg mx-auto">
            42-character addresses. One wrong digit. Everything gone.
            <br />
            No undo button. No customer support.
          </p>
        </ScrollReveal>
      </div>
    </section>
  )
}
