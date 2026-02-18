'use client'

import { ScrollReveal, Stagger, StaggerItem } from '@/components/animations/ScrollReveal'

const features = [
  {
    icon: '🤖',
    title: 'AI Agent',
    description: 'Your wallet speaks human. Ask it anything.',
  },
  {
    icon: '@',
    title: '@username',
    description: 'Send to @alice, not 0x7f3a...',
  },
  {
    icon: '🔗',
    title: 'Multi-chain',
    description: 'One wallet. Every network. Zero switching.',
  },
  {
    icon: '📇',
    title: 'Smart Contacts',
    description: 'Your address book, auto-synced.',
  },
  {
    icon: '📊',
    title: 'Real-time Rates',
    description: 'Live prices. Smart swap suggestions.',
  },
  {
    icon: '🔒',
    title: 'Security',
    description: 'Your keys. Your crypto. Always.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <p className="text-tag text-white/30 text-center mb-4">FEATURES</p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-heading text-center mb-6">
            Everything you need.
            <br />
            <span className="text-gradient-blue">Nothing you don&apos;t.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-body-lg text-white/50 text-center mb-16 max-w-xl mx-auto">
            Built for simplicity. Powered by intelligence.
          </p>
        </ScrollReveal>

        <Stagger staggerDelay={0.15} className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <StaggerItem key={feature.title}>
              <div className="glass-card glass-card-hover p-6 h-full transition-all duration-300 cursor-default">
                <div className="text-2xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
