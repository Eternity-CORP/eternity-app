'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'
import { GlitchText } from '@/components/animations/GlitchText'

const features = [
  {
    id: 'wallet',
    title: 'Create & Import Wallet',
    description: 'Your keys, your crypto. Create new or import existing.',
    screen: {
      title: 'Create Wallet',
      content: 'Your 12-word recovery phrase',
      details: ['Secure generation', 'Biometric protection', 'Multi-account support'],
    },
  },
  {
    id: 'blik',
    title: 'BLIK Codes',
    description: 'Share 6 digits. Money arrives in seconds.',
    screen: {
      title: 'BLIK Code',
      content: '847 291',
      details: ['2-minute expiry', 'Real-time matching', 'Zero mistakes'],
    },
  },
  {
    id: 'username',
    title: '@username System',
    description: 'Send to @alex instead of 0x7f3a...9b2c',
    screen: {
      title: 'Send to',
      content: '@alex',
      details: ['Human-readable', 'Instant lookup', 'Free to register'],
    },
  },
  {
    id: 'balances',
    title: 'Token Balances',
    description: 'All tokens. Real-time USD value.',
    screen: {
      title: 'Portfolio',
      content: '$1,234.56',
      details: ['ETH, USDC, USDT', 'Live prices', 'Pull to refresh'],
    },
  },
  {
    id: 'contacts',
    title: 'Contacts Book',
    description: 'Save frequent recipients.',
    screen: {
      title: 'Contacts',
      content: '12 saved',
      details: ['Quick select', 'Address + username', 'Import suggestions'],
    },
  },
  {
    id: 'scheduled',
    title: 'Scheduled Payments',
    description: 'Set it and forget it.',
    screen: {
      title: 'Scheduled',
      content: '3 active',
      details: ['Daily, weekly, monthly', 'Auto-execute', 'Notifications'],
    },
  },
  {
    id: 'ai',
    title: 'AI Agent',
    description: 'Your wallet that thinks with you.',
    screen: {
      title: 'AI Chat',
      content: '"Send 0.01 ETH to @alex"',
      details: ['Natural language', 'Proactive suggestions', 'Full context awareness'],
    },
  },
  {
    id: 'split',
    title: 'Split Bill',
    description: 'Dinner with friends? Split it fairly.',
    screen: {
      title: 'Split Bill',
      content: '$45.00 / 3',
      details: ['Equal or custom', 'Track payments', 'Send reminders'],
    },
  },
]

function IPhoneMockup({ activeFeature }: { activeFeature: typeof features[0] }) {
  return (
    <motion.div
      className="relative mx-auto"
      style={{ width: 300, height: 612 }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* Phone outer frame */}
      <div className="absolute inset-0 rounded-[50px] bg-gradient-to-b from-gray-800 to-gray-900 p-[3px]">
        {/* Inner bezel */}
        <div className="w-full h-full rounded-[47px] bg-gradient-to-b from-gray-700 to-gray-800 p-[2px]">
          {/* Screen area */}
          <div className="w-full h-full rounded-[45px] overflow-hidden relative bg-black">
            {/* Dynamic Island / Notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <div className="w-28 h-8 rounded-full flex items-center justify-center gap-2 bg-black">
                <div className="w-2 h-2 rounded-full bg-gray-800" />
                <div className="w-10 h-4 rounded-full bg-gray-900" />
              </div>
            </div>

            {/* Screen content - always light background for phone UI */}
            <div className="w-full h-full rounded-[45px] overflow-hidden bg-white">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex flex-col"
                >
                  {/* App header */}
                  <div className="px-6 py-4 pt-14 border-b border-gray-100">
                    <h4 className="text-xl font-bold text-center text-black">
                      {activeFeature.screen.title}
                    </h4>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 p-6 flex flex-col">
                    {/* Content card */}
                    <div className="rounded-2xl p-6 mb-6 bg-gray-50">
                      <div className="text-3xl font-bold text-center text-black">
                        {activeFeature.screen.content}
                      </div>
                      {activeFeature.id === 'blik' && (
                        <div className="mt-4">
                          <div className="h-1.5 rounded-full overflow-hidden bg-gray-200">
                            <motion.div
                              className="h-full rounded-full bg-black"
                              animate={{ width: ['100%', '0%'] }}
                              transition={{ duration: 120, ease: 'linear', repeat: Infinity }}
                            />
                          </div>
                          <p className="text-xs text-center mt-2 text-gray-500">Expires in 2:00</p>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      {activeFeature.screen.details.map((detail, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * i }}
                          className="flex items-center gap-3 text-sm rounded-xl p-3 text-gray-600 bg-white border border-gray-100"
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-black" />
                          {detail}
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Home indicator */}
                  <div className="pb-2 pt-2">
                    <div className="w-32 h-1 mx-auto rounded-full bg-black" />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute -left-[2px] top-28 w-[3px] h-8 bg-gray-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-40 w-[3px] h-8 bg-gray-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-36 w-[3px] h-16 bg-gray-700 rounded-r-sm" />

      {/* Reflection */}
      <div className="absolute inset-0 rounded-[50px] bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

      {/* Shadow */}
      <div className="absolute -inset-6 bg-black/15 rounded-[60px] blur-3xl -z-10" />
    </motion.div>
  )
}

export function Features() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section
      id="features"
      className="relative min-h-screen flex items-center py-32 overflow-hidden theme-transition"
      style={{ background: 'var(--background)' }}
    >
      <div className="absolute inset-0 bg-grid opacity-50" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest uppercase mb-4 text-center" style={{ color: 'var(--foreground-muted)' }}>
            Features
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6">
            <GlitchText
              delay={0.3}
              glitchIntensity="medium"
              style={{ color: 'var(--foreground)' }}
            >
              Available Now
            </GlitchText>
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-center text-lg md:text-xl mb-16" style={{ color: 'var(--foreground-muted)' }}>
            Already working. Ready to try.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Phone mockup */}
          <FadeIn delay={0.3} className="order-2 lg:order-1">
            <IPhoneMockup activeFeature={features[activeIndex]} />
          </FadeIn>

          {/* Feature list */}
          <div className="order-1 lg:order-2">
            <StaggerContainer className="grid grid-cols-2 gap-3">
              {features.map((feature, index) => (
                <StaggerItem key={feature.id}>
                  <motion.button
                    className="w-full p-4 rounded-xl text-left transition-all duration-300"
                    style={{
                      background: activeIndex === index ? 'var(--foreground)' : 'var(--surface-light)',
                      border: activeIndex === index ? 'none' : '1px solid var(--border-light)',
                    }}
                    onClick={() => setActiveIndex(index)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span
                      className="text-sm font-semibold block mb-1"
                      style={{ color: activeIndex === index ? 'var(--background)' : 'var(--foreground)' }}
                    >
                      {feature.title}
                    </span>
                    <p
                      className="text-xs line-clamp-2"
                      style={{
                        color: activeIndex === index ? 'var(--background)' : 'var(--foreground-muted)',
                        opacity: activeIndex === index ? 0.7 : 1
                      }}
                    >
                      {feature.description}
                    </p>
                  </motion.button>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </div>
      </div>
    </section>
  )
}
