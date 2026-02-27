'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/Button'
import { FadeIn } from '@/components/animations/FadeIn'
import { useWarp } from '@/components/animations/WarpTransition'

// Dynamic import for 3D scene to avoid SSR issues
const LogoParticles = dynamic(
  () => import('@/components/3d/LogoParticles').then((mod) => mod.LogoParticles),
  { ssr: false }
)

export function Hero() {
  const { startWarp } = useWarp()
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
    >
      {/* Background Grid — fades in from edges */}
      <div
        className="absolute inset-0 bg-grid opacity-80"
        style={{
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black, transparent)',
        }}
      />

      {/* Grid center glow — gradient-tinted grid fading out from center */}
      <div
        className="absolute inset-0 bg-grid"
        style={{
          maskImage: 'radial-gradient(ellipse 50% 40% at 50% 45%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 40% at 50% 45%, black, transparent)',
          backgroundImage: `
            linear-gradient(var(--accent-blue-grid) 1px, transparent 1px),
            linear-gradient(90deg, var(--accent-blue-grid) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          opacity: 0.6,
        }}
      />

      {/* 3D Logo Particles — z-10 so the mouse overlay covers the whole section */}
      <div className="absolute inset-0 z-10">
        <LogoParticles />
      </div>

      {/* Gradient Overlay - theme aware, semi-opaque center keeps text readable */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            var(--background) 0%,
            color-mix(in srgb, var(--background) 70%, transparent) 35%,
            color-mix(in srgb, var(--background) 60%, transparent) 50%,
            color-mix(in srgb, var(--background) 70%, transparent) 65%,
            var(--background) 100%
          )`
        }}
      />

      {/* Content — pointer-events-none so cursor reaches particles, auto on interactive elements */}
      <div className="relative z-30 container mx-auto px-6 text-center pt-20 pointer-events-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight" style={{ color: 'var(--foreground)' }}>
            The{' '}
            <span className="text-gradient-blue">AI-Native</span>
            <br />
            Crypto Wallet
          </h1>
        </motion.div>

        <FadeIn delay={0.4}>
          <p
            className="text-xl md:text-2xl max-w-2xl mx-auto mb-12 [text-wrap:balance]"
            style={{ color: 'var(--foreground-muted)' }}
          >
            Share a 6-digit code or type @username.
            <br className="hidden md:block" />
            {' '}Crypto without fear.
          </p>
        </FadeIn>

        <FadeIn delay={0.6}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-32">
            <Button
              variant="primary"
              size="lg"
              onClick={startWarp}
              className="pointer-events-auto"
            >
              Launch App
            </Button>
          </div>
        </FadeIn>
      </div>

      {/* Scroll Indicator - positioned lower and separated from buttons */}
      <FadeIn delay={1}>
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <button
            onClick={() => scrollToSection('problem')}
            className="flex flex-col items-center transition-colors"
            style={{ color: 'var(--foreground-light)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-light)'}
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
