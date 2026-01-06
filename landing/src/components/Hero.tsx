'use client';

import { ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-40 pb-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-8" style={{ borderColor: 'var(--card-border)' }}>
          <span className="w-1.5 h-1.5 rounded-full pulse-subtle" style={{ background: 'var(--text-secondary)' }} />
          <span className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-secondary)' }}>BETA NOW OPEN</span>
        </div>
        
        {/* Main Headline - Bittensor style */}
        <h1 className="text-display mb-6" style={{ color: 'var(--text-primary)' }}>
          The intelligent
          <br />
          <span className="gradient-text">crypto wallet</span>
        </h1>
        
        <p className="text-body max-w-2xl mx-auto mb-10">
          AI-powered self-custody wallet. Send crypto to @usernames instead of addresses.
          Intelligent cross-chain routing. BLIK payment codes. Your keys, your crypto.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <a href="#beta" className="btn-primary inline-flex items-center justify-center gap-2">
            JOIN BETA
            <ArrowRight size={16} />
          </a>
          <a href="#features" className="btn-secondary inline-flex items-center justify-center gap-2">
            LEARN MORE
          </a>
        </div>
        
        {/* Stats - Minimal style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>AI</div>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Powered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>@user</div>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Send to nicknames</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>100%</div>
            <div className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Self-custody</div>
          </div>
        </div>
      </div>
      
      {/* Divider */}
      <div className="divider mt-32 max-w-4xl mx-auto" />
    </section>
  );
}
