'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/animations/FadeIn'

// Dynamic import for 3D scene to avoid SSR issues
const ShardScene = dynamic(
  () => import('@/components/3d/ShardScene').then((mod) => mod.ShardScene),
  { ssr: false }
)

export function Hero() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid opacity-50" />

      {/* 3D Shards Scene */}
      <div className="absolute inset-0 z-0">
        <ShardScene />
      </div>

      {/* Gradient Overlay - from white edges to transparent center */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white z-10 pointer-events-none" />

      {/* Content */}
      <div className="relative z-20 container mx-auto px-6 text-center pt-20">
        <FadeIn delay={0.2}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              <span className="text-black">The Wallet</span>
              <br />
              <span className="text-gradient">for Everyone</span>
            </h1>
          </motion.div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <p className="text-xl md:text-2xl text-muted max-w-2xl mx-auto mb-12">
            Send crypto like you send a text.
            <br className="hidden md:block" />
            No addresses. No fear. Just 6 digits.
          </p>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-32">
            <Button
              variant="primary"
              size="lg"
              onClick={() => scrollToSection('cta')}
            >
              Get Early Access
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => scrollToSection('features')}
            >
              <span className="flex items-center gap-2">
                See Features
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* Scroll Indicator - positioned lower and separated from buttons */}
      <FadeIn delay={1}>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <button
            onClick={() => scrollToSection('problem')}
            className="flex flex-col items-center text-muted-light hover:text-black transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        </motion.div>
      </FadeIn>
    </section>
  )
}
