'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import { ScrollReveal, Stagger, StaggerItem } from '@/components/animations/ScrollReveal'
import { PhoneFrame } from '@/components/ui/PhoneFrame'

const pills = ['No addresses', '60-second codes', 'Works cross-chain']

function BlikScreen() {
  const digits = '847291'
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    let i = 0
    const interval = setInterval(() => {
      i++
      setVisibleCount(i)
      if (i >= 6) clearInterval(interval)
    }, 150)
    return () => clearInterval(interval)
  }, [isInView])

  return (
    <div ref={ref} className="flex flex-col items-center justify-center h-full px-6 py-8">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-6">Your BLIK Code</p>

      <div className="flex gap-2 mb-6">
        {digits.split('').map((d, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={i < visibleCount ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="w-10 h-12 rounded-lg flex items-center justify-center text-xl font-bold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: i < 3 ? 'var(--accent-blue)' : 'var(--accent-cyan)',
            }}
          >
            {i < visibleCount ? d : ''}
          </motion.div>
        ))}
      </div>

      {/* Timer bar */}
      <div className="w-full max-w-[180px] h-1 rounded-full overflow-hidden bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
          initial={{ width: '100%' }}
          animate={isInView ? { width: '0%' } : {}}
          transition={{ duration: 60, ease: 'linear' }}
        />
      </div>
      <p className="text-[10px] text-white/30 mt-2">Expires in 60s</p>
    </div>
  )
}

export function Solution() {
  return (
    <section id="solution" className="relative min-h-screen flex items-center py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Text — left */}
          <div>
            <ScrollReveal variant="slide-right">
              <p className="text-tag text-white/30 mb-6">BLIK CODES</p>
            </ScrollReveal>

            <ScrollReveal variant="slide-right" delay={0.1}>
              <h2 className="text-heading mb-6">
                Six digits.
                <br />
                Money <span className="text-gradient-blue">arrives.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal variant="slide-right" delay={0.2}>
              <p className="text-body-lg text-white/70 mb-8 max-w-md">
                Share a 6-digit code. Your friend enters it. Crypto sent — no addresses, no mistakes.
              </p>
            </ScrollReveal>

            <Stagger staggerDelay={0.1} className="flex flex-wrap gap-3">
              {pills.map((pill) => (
                <StaggerItem key={pill}>
                  <span className="px-4 py-2 rounded-full text-sm text-white/70 glass-card">
                    {pill}
                  </span>
                </StaggerItem>
              ))}
            </Stagger>
          </div>

          {/* Phone — right */}
          <ScrollReveal variant="slide-left" delay={0.2}>
            <PhoneFrame>
              <BlikScreen />
            </PhoneFrame>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
