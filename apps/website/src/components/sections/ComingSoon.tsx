'use client'

import { motion } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/animations/FadeIn'

const comingSoonFeatures = [
  {
    id: 'abstraction',
    title: 'Network Abstraction',
    description: 'Send USDC anywhere. We find the best route automatically. No more chain confusion.',
    status: 'Q2 2026',
  },
  {
    id: 'shard',
    title: 'SHARD Identity',
    description: 'NFC passport scan from home. Your unique crypto identity in seconds. Privacy-preserving.',
    status: 'Q2 2026',
  },
  {
    id: 'personhood',
    title: 'Proof of Personhood',
    description: '1.4B+ passports supported worldwide. One identity, infinite possibilities.',
    status: 'Q3 2026',
  },
  {
    id: 'ai',
    title: 'AI Agent',
    description: 'Proactive alerts. Natural conversations. Understands your financial goals.',
    status: 'Q3 2026',
  },
  {
    id: 'fiat',
    title: 'Fiat Ramp',
    description: 'Buy and sell crypto directly in the app. No external exchanges needed.',
    status: 'Q4 2026',
  },
]

function FeatureCard({ feature, index }: { feature: typeof comingSoonFeatures[0]; index: number }) {
  return (
    <motion.div
      className="group relative"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <div className="relative p-8 bg-white border border-black/5 rounded-2xl transition-all duration-300 hover:border-black/20 hover:shadow-subtle">
        {/* Status badge */}
        <div className="absolute top-6 right-6">
          <span className="text-xs font-mono text-muted-light tracking-wider">
            {feature.status}
          </span>
        </div>

        {/* Number */}
        <div className="text-sm font-mono text-muted-light mb-6">
          0{index + 1}
        </div>

        {/* Content */}
        <h3 className="text-xl font-semibold text-black mb-3 group-hover:text-gradient-blue transition-all duration-300">
          {feature.title}
        </h3>
        <p className="text-muted text-sm leading-relaxed">
          {feature.description}
        </p>

        {/* Hover indicator */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent-blue to-accent-cyan rounded-b-2xl"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
          style={{ originX: 0 }}
        />
      </div>
    </motion.div>
  )
}

export function ComingSoon() {
  return (
    <section
      id="coming-soon"
      className="relative min-h-screen flex items-center py-32 overflow-hidden bg-surface-light"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-dots opacity-30" />

      <div className="container mx-auto px-6 relative z-10">
        <FadeIn>
          <p className="text-sm font-medium tracking-widest text-muted uppercase mb-4 text-center">
            Roadmap
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-center mb-6 text-black">
            Coming Soon
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-muted text-center text-lg md:text-xl max-w-2xl mx-auto mb-16">
            The future we're building
          </p>
        </FadeIn>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {comingSoonFeatures.slice(0, 3).map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-6">
          {comingSoonFeatures.slice(3).map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index + 3} />
          ))}
        </div>

        {/* Bottom note */}
        <FadeIn delay={0.5}>
          <p className="text-center text-muted-light text-sm mt-16">
            Dates are estimates and subject to change based on development progress.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
