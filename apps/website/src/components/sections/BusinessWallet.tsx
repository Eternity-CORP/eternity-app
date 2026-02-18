'use client'

import { ScrollReveal, Stagger, StaggerItem } from '@/components/animations/ScrollReveal'

const cards = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9.5c0-1.38-1.34-2.5-3-2.5S9 8.12 9 9.5c0 1.38 1.34 2.5 3 2.5s3 1.12 3 2.5c0 1.38-1.34 2.5-3 2.5s-3-1.12-3-2.5" strokeLinecap="round" />
        <path d="M12 6v1M12 17v1" strokeLinecap="round" />
      </svg>
    ),
    title: 'Equity',
    description: 'Issue tokens to co-founders. Track ownership on-chain.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <path d="M4 21V5a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 15l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    title: 'Governance',
    description: 'Propose and vote. Every decision recorded.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
        <rect x="3" y="8" width="18" height="12" rx="2" />
        <path d="M7 8V6a5 5 0 0 1 10 0v2" />
        <circle cx="12" cy="14" r="2" />
      </svg>
    ),
    title: 'Treasury',
    description: 'Shared wallet. Multi-sig security. Dividend distribution.',
  },
]

export function BusinessWallet() {
  return (
    <section id="business-wallet" className="relative py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <p className="text-tag text-white/30 text-center mb-4">FOR BUSINESS</p>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <h2 className="text-heading text-center mb-4">
            Your business.
            <br />
            <span className="text-gradient-blue">On-chain.</span>
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <p className="text-body-lg text-white/50 text-center mb-16 max-w-lg mx-auto">
            Tokenized equity. Collective governance. Transparent treasury.
          </p>
        </ScrollReveal>

        <Stagger staggerDelay={0.2} className="grid md:grid-cols-3 gap-6">
          {cards.map((card) => (
            <StaggerItem key={card.title}>
              <div className="glass-card glass-card-hover p-8 h-full transition-all duration-300">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-6 text-white/70" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {card.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{card.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{card.description}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <ScrollReveal delay={0.5}>
          <div className="text-center mt-12">
            <a
              href="https://e-y-app.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-7 py-3 text-sm font-medium bg-white text-black rounded-full shimmer hover:bg-white/90 transition-colors"
            >
              Try Business Wallet
            </a>
            <p className="text-xs text-white/30 mt-3">Available on Sepolia testnet. Zero cost.</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
