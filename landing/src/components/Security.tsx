'use client';

import { Shield, Lock, Key, Eye, Server, Fingerprint } from 'lucide-react';

const securityFeatures = [
  {
    icon: Key,
    title: 'Non-Custodial',
    description: 'Your private keys never leave your device. You have complete control over your funds.',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description: 'All data is encrypted using industry-standard AES-256 encryption.',
  },
  {
    icon: Fingerprint,
    title: 'Biometric Security',
    description: 'Protect your wallet with Face ID, Touch ID, or fingerprint authentication.',
  },
  {
    icon: Eye,
    title: 'Privacy First',
    description: 'No personal data collection. No tracking. Your transactions are your business.',
  },
  {
    icon: Server,
    title: 'Decentralized',
    description: 'Connect directly to blockchain nodes. No middlemen, no single point of failure.',
  },
  {
    icon: Shield,
    title: 'Open Source',
    description: 'Fully auditable code. Transparency builds trust.',
  },
];

export default function Security() {
  return (
    <section id="security" className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              Security That <span className="gradient-text">Never Sleeps</span>
            </h2>
            <p className="text-lg text-white/60 mb-8 leading-relaxed">
              Your security is our top priority. Eternity Wallet is built with multiple 
              layers of protection to keep your assets safe.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-6">
              {securityFeatures.map((feature, index) => (
                <div key={index} className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <feature.icon size={24} className="text-[#0098EA]" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-1">{feature.title}</h4>
                    <p className="text-white/50 text-sm">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Right - Shield Illustration */}
          <div className="relative flex justify-center">
            <div className="relative">
              {/* Main Shield */}
              <div className="w-64 h-80 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0098EA] to-[#7B61FF] rounded-[40px] opacity-20 blur-xl" />
                <div className="absolute inset-0 glass-card flex items-center justify-center">
                  <Shield size={120} className="text-[#0098EA]" />
                </div>
              </div>
              
              {/* Floating Badges */}
              <div className="absolute -top-4 -right-4 glass-card px-4 py-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-white text-sm">AES-256 Encryption</span>
              </div>
              <div className="absolute -bottom-4 -left-4 glass-card px-4 py-2 flex items-center gap-2">
                <Lock size={16} className="text-[#0098EA]" />
                <span className="text-white text-sm">Biometric + PIN Lock</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
