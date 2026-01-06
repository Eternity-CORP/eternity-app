'use client';

import { Key, Lock, Fingerprint, Eye, Server, Shield } from 'lucide-react';

const securityFeatures = [
  {
    icon: Key,
    title: 'Non-Custodial',
    description: 'Your keys never leave your device.',
  },
  {
    icon: Lock,
    title: 'AES-256',
    description: 'Industry-standard encryption.',
  },
  {
    icon: Fingerprint,
    title: 'Biometric',
    description: 'Face ID, Touch ID, fingerprint.',
  },
  {
    icon: Eye,
    title: 'Privacy First',
    description: 'No tracking. No data collection.',
  },
  {
    icon: Server,
    title: 'Decentralized',
    description: 'Direct blockchain connection.',
  },
  {
    icon: Shield,
    title: 'Open Source',
    description: 'Fully auditable code.',
  },
];

export default function Security() {
  return (
    <section id="security" className="relative py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>SECURITY</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Your keys, your crypto
          </h2>
          <p className="text-body max-w-xl mx-auto">
            Built with multiple layers of protection to keep your assets safe.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px rounded-lg overflow-hidden" style={{ background: 'var(--card-border)' }}>
          {securityFeatures.map((feature, index) => (
            <div 
              key={index}
              className="p-8 transition-colors"
              style={{ background: 'var(--background)' }}
            >
              <feature.icon size={20} className="mb-4" style={{ color: 'var(--text-secondary)' }} strokeWidth={1.5} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{feature.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Divider */}
      <div className="divider mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
