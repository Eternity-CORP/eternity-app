'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'
import { SpotlightGrid } from '@/components/animations/SpotlightGrid'

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

type ShowcaseCategory = 'personal'

interface ShowcaseFeature {
  id: string
  category: ShowcaseCategory
  title: string
  description: string
  details: string[]
  visual: 'phone'
  phoneScreen?: { title: string; content: string; details: string[] }
}

/* ================================================================== */
/*  Data                                                               */
/* ================================================================== */

const personalFeatures: ShowcaseFeature[] = [
  {
    id: 'wallet',
    category: 'personal',
    title: 'Create & Import',
    description: 'Your keys, your crypto. Create a new wallet or import an existing one with secure seed phrase management.',
    details: ['Secure generation', 'Biometric protection', 'Multi-account support'],
    visual: 'phone',
    phoneScreen: { title: 'Create Wallet', content: 'Your 12-word recovery phrase', details: ['Secure generation', 'Biometric protection', 'Multi-account support'] },
  },
  {
    id: 'blik',
    category: 'personal',
    title: 'BLIK Codes',
    description: 'Share a 6-digit code and money arrives in seconds. No addresses needed.',
    details: ['2-minute expiry', 'Real-time matching', 'Zero mistakes'],
    visual: 'phone',
    phoneScreen: { title: 'BLIK Code', content: '847 291', details: ['2-minute expiry', 'Real-time matching', 'Zero mistakes'] },
  },
  {
    id: 'username',
    category: 'personal',
    title: '@username System',
    description: 'Send to @alex instead of long hex addresses like 0x7f3a...9b2c.',
    details: ['Human-readable', 'Instant lookup', 'Free to register'],
    visual: 'phone',
    phoneScreen: { title: 'Send to', content: '@alex', details: ['Human-readable', 'Instant lookup', 'Free to register'] },
  },
  {
    id: 'balances',
    category: 'personal',
    title: 'Token Balances',
    description: 'All your tokens in one place with real-time USD prices.',
    details: ['ETH, USDC, USDT', 'Live prices', 'Pull to refresh'],
    visual: 'phone',
    phoneScreen: { title: 'Portfolio', content: '$1,234.56', details: ['ETH, USDC, USDT', 'Live prices', 'Pull to refresh'] },
  },
  {
    id: 'contacts',
    category: 'personal',
    title: 'Contacts Book',
    description: 'Save frequent recipients and send again in one tap.',
    details: ['Quick select', 'Address + username', 'Quick access'],
    visual: 'phone',
    phoneScreen: { title: 'Contacts', content: '12 saved', details: ['Quick select', 'Address + username', 'Quick access'] },
  },
  {
    id: 'scheduled',
    category: 'personal',
    title: 'Scheduled Payments',
    description: 'Automate recurring payments. Set it once and forget about it.',
    details: ['Daily, weekly, monthly', 'Smart reminders', 'Notifications'],
    visual: 'phone',
    phoneScreen: { title: 'Scheduled', content: '3 active', details: ['Daily, weekly, monthly', 'Smart reminders', 'Notifications'] },
  },
  {
    id: 'ai',
    category: 'personal',
    title: 'AI Agent',
    description: 'Talk to your wallet in plain language. It understands context.',
    details: ['Natural language', 'Proactive suggestions', 'Full context awareness'],
    visual: 'phone',
    phoneScreen: { title: 'AI Chat', content: '"Send 0.01 ETH to @alex"', details: ['Natural language', 'Proactive suggestions', 'Full context awareness'] },
  },
  {
    id: 'split',
    category: 'personal',
    title: 'Split Bill',
    description: 'Dinner with friends? Split the bill fairly in one tap.',
    details: ['Equal or custom', 'Track payments', 'Push notifications'],
    visual: 'phone',
    phoneScreen: { title: 'Split Bill', content: '$45.00 / 3', details: ['Equal or custom', 'Track payments', 'Push notifications'] },
  },
  {
    id: 'swap',
    category: 'personal',
    title: 'Token Swap',
    description: 'Swap tokens across chains. Best rates from LI.FI aggregator.',
    details: ['Cross-chain', 'Best rates', '5 networks'],
    visual: 'phone',
    phoneScreen: { title: 'Token Swap', content: 'ETH → USDC', details: ['Cross-chain', 'Best rates', '5 networks'] },
  },
  {
    id: 'onramp',
    category: 'personal',
    title: 'Fiat On-Ramp',
    description: 'Buy crypto with your card. Multiple providers, best rates.',
    details: ['Card payments', 'Multiple providers', 'Instant'],
    visual: 'phone',
    phoneScreen: { title: 'Buy Crypto', content: '$100 → ETH', details: ['Card payments', 'Multiple providers', 'Instant'] },
  },
]

const allFeatures: Record<ShowcaseCategory, ShowcaseFeature[]> = {
  personal: personalFeatures,
}

/* ================================================================== */
/*  IPhoneMockup                                                       */
/* ================================================================== */

function IPhoneMockup({ screen }: { screen: { title: string; content: string; details: string[] } }) {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: 280, height: 572 }}
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Phone outer frame */}
      <div className="absolute inset-0 rounded-[46px] bg-gradient-to-b from-gray-800 to-gray-900 p-[3px]">
        <div className="w-full h-full rounded-[43px] bg-gradient-to-b from-gray-700 to-gray-800 p-[2px]">
          <div className="w-full h-full rounded-[41px] overflow-hidden relative bg-black">
            {/* Dynamic Island */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <div className="w-24 h-7 rounded-full flex items-center justify-center gap-2 bg-black">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <div className="w-8 h-3.5 rounded-full bg-gray-900" />
              </div>
            </div>

            {/* Screen content */}
            <div className="w-full h-full rounded-[41px] overflow-hidden bg-white">
              <div className="h-full flex flex-col">
                {/* App header */}
                <div className="px-5 py-3 pt-13 border-b border-gray-100">
                  <h4 className="text-lg font-bold text-center text-black">
                    {screen.title}
                  </h4>
                </div>

                {/* Main content */}
                <div className="flex-1 p-5 flex flex-col">
                  <div className="rounded-2xl p-5 mb-5 bg-gray-50">
                    <div className="text-2xl font-bold text-center text-black">
                      {screen.content}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {screen.details.map((detail, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="flex items-center gap-3 text-sm rounded-xl p-2.5 text-gray-600 bg-white border border-gray-100"
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-black" />
                        {detail}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Home indicator */}
                <div className="pb-2 pt-2">
                  <div className="w-28 h-1 mx-auto rounded-full bg-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute -left-[2px] top-24 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-36 w-[3px] h-7 bg-gray-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-32 w-[3px] h-14 bg-gray-700 rounded-r-sm" />

      {/* Reflection + Shadow */}
      <div className="absolute inset-0 rounded-[46px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -inset-6 bg-black/15 rounded-[56px] blur-3xl -z-10" />
    </motion.div>
  )
}

/* ================================================================== */
/*  FeatureVisual — renders the right visual for each feature          */
/* ================================================================== */

function FeatureVisual({ feature }: { feature: ShowcaseFeature }) {
  return feature.phoneScreen ? (
    <IPhoneMockup screen={feature.phoneScreen} />
  ) : null
}

/* ================================================================== */
/*  SlideNavigation — dots + arrows + progress bar                     */
/* ================================================================== */

function SlideNavigation({
  total,
  activeIndex,
  onPrev,
  onNext,
  onDot,
  progress,
}: {
  total: number
  activeIndex: number
  onPrev: () => void
  onNext: () => void
  onDot: (i: number) => void
  progress: number
}) {
  return (
    <div className="flex flex-col gap-3 mt-8">
      {/* Dots + arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => onDot(i)}
              className="relative p-1"
              aria-label={`Go to slide ${i + 1}`}
            >
              <div
                className="w-2 h-2 rounded-full transition-all duration-300"
                style={{
                  background: i === activeIndex ? 'var(--foreground)' : 'var(--border)',
                  transform: i === activeIndex ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onPrev}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 3L5 7L9 11" />
            </svg>
          </button>
          <button
            onClick={onNext}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200"
            style={{ border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
            aria-label="Next slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M5 3L9 7L5 11" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

/* ================================================================== */
/*  Main Showcase Component                                            */
/* ================================================================== */

const SLIDE_DURATION = 5000 // 5 seconds per slide

export function Showcase() {
  const [category, setCategory] = useState<ShowcaseCategory>('personal')
  const [activeIndex, setActiveIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [slideDirection, setSlideDirection] = useState(1) // 1 = forward, -1 = backward
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(Date.now())

  const features = allFeatures[category]
  const activeFeature = features[activeIndex]

  // Auto-advance timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    startTimeRef.current = Date.now()
    setProgress(0)

    timerRef.current = setInterval(() => {
      if (isPaused) return
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / SLIDE_DURATION) * 100, 100)
      setProgress(pct)

      if (pct >= 100) {
        setSlideDirection(1)
        setActiveIndex((prev) => (prev + 1) % features.length)
        startTimeRef.current = Date.now()
        setProgress(0)
      }
    }, 50)
  }, [isPaused, features.length])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  // When paused, stop the timer progress
  useEffect(() => {
    if (!isPaused) {
      startTimeRef.current = Date.now() - (progress / 100) * SLIDE_DURATION
    }
  }, [isPaused, progress])


  const goToSlide = (index: number) => {
    setSlideDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const goPrev = () => {
    setSlideDirection(-1)
    setActiveIndex((prev) => (prev - 1 + features.length) % features.length)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const goNext = () => {
    setSlideDirection(1)
    setActiveIndex((prev) => (prev + 1) % features.length)
    startTimeRef.current = Date.now()
    setProgress(0)
  }

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 80 : -80,
      opacity: 0,
      scale: 0.97,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -80 : 80,
      opacity: 0,
      scale: 0.97,
    }),
  }

  return (
    <section
      id="showcase"
      className="relative min-h-screen flex items-center py-24 lg:py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      <SpotlightGrid />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            Features
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-4">
            <GlitchText delay={0.3} glitchIntensity="medium" style={{ color: 'var(--foreground)' }}>
              Everything You Need
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-12 [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
            Everything you need in one app.
          </p>
        </FadeIn>

        <div className="mb-12 lg:mb-16" />

        {/* Slide Content */}
        <div className="relative max-w-6xl mx-auto">
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={`${category}-${activeIndex}`}
              custom={slideDirection}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
              className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
            >
              {/* Left: Text content */}
              <div className="order-2 lg:order-1">
                <div className="mb-2">
                  <span className="text-xs font-mono tracking-wider" style={{ color: 'var(--accent-blue)' }}>
                    {String(activeIndex + 1).padStart(2, '0')} / {String(features.length).padStart(2, '0')}
                  </span>
                </div>

                <h3 className="text-3xl lg:text-4xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>
                  {activeFeature.title}
                </h3>

                <p className="text-base lg:text-lg mb-8 leading-relaxed [text-wrap:balance]" style={{ color: 'var(--foreground-muted)' }}>
                  {activeFeature.description}
                </p>

                {/* Detail bullets */}
                <div className="space-y-3">
                  {activeFeature.details.map((detail, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-blue)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                        {detail}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right: Visual */}
              <div className="order-1 lg:order-2 flex justify-center">
                <FeatureVisual feature={activeFeature} />
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <SlideNavigation
            total={features.length}
            activeIndex={activeIndex}
            onPrev={goPrev}
            onNext={goNext}
            onDot={goToSlide}
            progress={progress}
          />
        </div>
      </div>
    </section>
  )
}
