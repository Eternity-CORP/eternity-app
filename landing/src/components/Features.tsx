'use client';

import { 
  Wallet, 
  Zap, 
  Globe, 
  Shield, 
  Smartphone, 
  ArrowRightLeft,
  QrCode,
  Clock,
  Users
} from 'lucide-react';

const features = [
  {
    icon: Users,
    title: 'Global Identity (@nickname)',
    description: 'Claim your unique @username or EY-ID. Send crypto without long addresses — just @alice.',
    gradient: 'from-[#0098EA] to-[#00D9FF]',
  },
  {
    icon: Globe,
    title: 'Multi-Chain Support',
    description: 'Manage assets across Ethereum, Polygon, Arbitrum, Optimism, and Base. One wallet for all EVM chains.',
    gradient: 'from-[#7B61FF] to-[#0098EA]',
  },
  {
    icon: QrCode,
    title: 'BLIK Payment Codes',
    description: 'Generate temporary payment codes to receive crypto without exposing your address. Like BLIK for Web3.',
    gradient: 'from-[#00D9FF] to-[#7B61FF]',
  },
  {
    icon: ArrowRightLeft,
    title: 'Intelligent Cross-Chain',
    description: 'System automatically finds the best route — same-chain, bridge, or swap. Powered by LiFi & Rango.',
    gradient: 'from-[#0098EA] to-[#7B61FF]',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    description: 'Send crypto to anyone in seconds. No waiting, no complicated addresses — just fast payments.',
    gradient: 'from-[#7B61FF] to-[#00D9FF]',
  },
  {
    icon: Clock,
    title: 'Scheduled Payments',
    description: 'Set up recurring payments for subscriptions, salaries, or regular transfers. Never miss a payment.',
    gradient: 'from-[#00D9FF] to-[#0098EA]',
  },
  {
    icon: Shield,
    title: 'Earn Shards',
    description: 'Complete actions to earn Shards — our gamification rewards. First transaction, BLIK use, referrals and more.',
    gradient: 'from-[#0098EA] to-[#7B61FF]',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Everything You Need in <span className="gradient-text">One Wallet</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Built for the multi-chain future. Eternity combines powerful features with 
            an intuitive interface.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="glass-card p-8 hover:bg-white/5 transition-all duration-300 group"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-white/60 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
