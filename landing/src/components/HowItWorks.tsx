'use client';

import { Download, Wallet, Send, CheckCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Download,
    title: 'Download the App',
    description: 'Get E-Y Wallet from App Store or Google Play. Available on iOS and Android.',
  },
  {
    number: '02',
    icon: Wallet,
    title: 'Create Your Wallet',
    description: 'Generate a new wallet with biometric security or import existing with seed phrase.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Claim @nickname',
    description: 'Register your unique @username or use your EY-ID to receive crypto without sharing addresses.',
  },
  {
    number: '04',
    icon: Send,
    title: 'Send & Earn Shards',
    description: 'Send to @usernames, use BLIK codes, and earn Shards for every action.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Get Started in <span className="gradient-text">Minutes</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            No complicated setup. No technical knowledge required. 
            Just download, create, and start sending.
          </p>
        </div>
        
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0098EA] via-[#7B61FF] to-[#00D9FF] transform -translate-y-1/2" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="glass-card p-8 text-center h-full hover:bg-white/5 transition-all duration-300">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-[#0098EA] flex items-center justify-center text-white font-bold text-sm z-10">
                    {index + 1}
                  </div>
                  
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-6 mt-4">
                    <step.icon size={32} className="text-[#0098EA]" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-white/60">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
