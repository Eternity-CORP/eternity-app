'use client';

import { 
  Zap, 
  Globe, 
  Shield, 
  ArrowRightLeft,
  QrCode,
  Clock,
  Users,
  Brain,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered',
    description: 'First wallet with built-in AI. Smart insights and automatic route optimization.',
  },
  {
    icon: Users,
    title: '@username',
    description: 'Send crypto to @alice instead of 0x742d35Cc6634C0532925a3b844Bc...',
  },
  {
    icon: Globe,
    title: 'Multi-Chain',
    description: 'Ethereum, Polygon, Arbitrum, Optimism, Base. One wallet for all.',
  },
  {
    icon: QrCode,
    title: 'BLIK Codes',
    description: 'Generate temporary payment codes. Like BLIK for Web3.',
  },
  {
    icon: ArrowRightLeft,
    title: 'Cross-Chain',
    description: 'Automatic best route — same-chain, bridge, or swap.',
  },
  {
    icon: Clock,
    title: 'Scheduled',
    description: 'Set up recurring payments. Never miss a transfer.',
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>FEATURES</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Built for the future
          </h2>
          <p className="text-body max-w-xl mx-auto">
            E-Y combines AI intelligence with powerful features and intuitive interface.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--card-border)' }}>
          {features.map((feature, index) => (
            <div 
              key={index}
              className="p-8 transition-colors"
              style={{ background: 'var(--background)' }}
            >
              <feature.icon size={20} className="mb-4" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="divider mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
