'use client'

import { ScrollReveal, Stagger, StaggerItem } from '@/components/animations/ScrollReveal'
import { PhoneFrame } from '@/components/ui/PhoneFrame'

const upcomingFeatures = [
  {
    title: 'Smart Splits',
    description: 'Split bills with friends, on-chain',
  },
  {
    title: 'Token Swap',
    description: 'Best rates, one tap',
  },
  {
    title: 'Scheduled Payments',
    description: 'Set it and forget it',
  },
]

function SplitsScreen() {
  return (
    <div className="flex flex-col h-full px-5 py-8">
      <p className="text-xs text-white/30 uppercase tracking-widest mb-4 text-center">Smart Splits</p>

      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/70">Dinner at Joe&apos;s</span>
          <span className="text-sm font-semibold text-white">$45.00</span>
        </div>
        <div className="h-px bg-white/10 mb-3" />
        <div className="space-y-2">
          {['@alice', '@bob', '@you'].map((name) => (
            <div key={name} className="flex items-center justify-between">
              <span className="text-xs text-white/50">{name}</span>
              <span className="text-xs text-white/70">$15.00</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto">
        <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium bg-white/10 text-white/70">
          Send Reminders
        </div>
      </div>
    </div>
  )
}

export function ComingSoon() {
  return (
    <section id="coming-soon" className="relative min-h-screen flex items-center py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Phone — left */}
          <ScrollReveal variant="slide-right">
            <PhoneFrame>
              <SplitsScreen />
            </PhoneFrame>
          </ScrollReveal>

          {/* Text — right */}
          <div>
            <ScrollReveal variant="slide-left">
              <p className="text-tag text-white/30 mb-6">COMING SOON</p>
            </ScrollReveal>

            <ScrollReveal variant="slide-left" delay={0.1}>
              <h2 className="text-heading mb-10">
                And we&apos;re just
                <br />
                getting <span className="text-gradient-blue">started.</span>
              </h2>
            </ScrollReveal>

            <Stagger staggerDelay={0.15} className="space-y-6">
              {upcomingFeatures.map((feature) => (
                <StaggerItem key={feature.title}>
                  <div className="group flex items-start gap-4 cursor-default">
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                        {feature.title}
                        <span className="text-white/0 group-hover:text-white/50 transition-colors">&rarr;</span>
                      </h3>
                      <p className="text-sm text-white/50">{feature.description}</p>
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </div>
      </div>
    </section>
  )
}
