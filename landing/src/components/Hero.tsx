'use client';

import { ArrowRight, Smartphone, Shield, Zap } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left Content */}
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-white/70">Beta Testing Now Open</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-white">Web3 for Everyone</span>
              <br />
              <span className="gradient-text">Hide Complexity, Keep Power</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/60 max-w-xl mb-8 leading-relaxed">
              Send crypto to @username instead of 0x addresses. Multi-chain support, 
              BLIK payment codes, and intelligent cross-chain routing — all in one self-custody wallet.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <a href="#beta" className="btn-primary inline-flex items-center justify-center gap-2">
                Join Beta Program
                <ArrowRight size={18} />
              </a>
              <a href="#features" className="btn-secondary inline-flex items-center justify-center gap-2">
                Learn More
              </a>
            </div>
            
            {/* Stats */}
            <div className="flex flex-wrap gap-8 mt-12 justify-center lg:justify-start">
              <div>
                <div className="text-3xl font-bold gradient-text">5 Chains</div>
                <div className="text-white/50 text-sm">ETH, Polygon, Arbitrum, OP, Base</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text">@username</div>
                <div className="text-white/50 text-sm">Send Without Addresses</div>
              </div>
              <div>
                <div className="text-3xl font-bold gradient-text">Self-Custody</div>
                <div className="text-white/50 text-sm">Your Keys, Your Crypto</div>
              </div>
            </div>
          </div>
          
          {/* Right Content - Phone Mockup */}
          <div className="flex-1 relative">
            <div className="relative w-[300px] h-[600px] mx-auto">
              {/* Phone Frame */}
              <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-[#1a1a2e] to-[#0a0a0f] border border-white/10 overflow-hidden glow-blue">
                {/* Screen Content */}
                <div className="absolute inset-4 rounded-[32px] bg-[#0a0a0f] overflow-hidden">
                  {/* Status Bar */}
                  <div className="flex justify-between items-center px-6 py-3">
                    <span className="text-white/50 text-xs">9:41</span>
                    <div className="flex gap-1">
                      <div className="w-4 h-2 rounded-sm bg-white/50" />
                    </div>
                  </div>
                  
                  {/* Wallet UI Mock */}
                  <div className="px-6 pt-4">
                    <div className="text-center mb-8">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0098EA] to-[#7B61FF] mx-auto mb-4 flex items-center justify-center">
                        <span className="text-2xl font-bold text-white">E</span>
                      </div>
                      <div className="text-white/50 text-sm">Total Balance</div>
                      <div className="text-3xl font-bold text-white mt-1">$12,458.32</div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center gap-8 mb-8">
                      {[
                        { icon: ArrowRight, label: 'Send', rotate: '-rotate-45' },
                        { icon: ArrowRight, label: 'Receive', rotate: 'rotate-135' },
                        { icon: Zap, label: 'Swap', rotate: '' },
                      ].map((action, i) => (
                        <div key={i} className="text-center">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                            <action.icon size={20} className={`text-[#0098EA] ${action.rotate}`} />
                          </div>
                          <span className="text-white/50 text-xs">{action.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Token List */}
                    <div className="space-y-3">
                      {[
                        { name: 'Ethereum', symbol: 'ETH', amount: '2.45', value: '$4,892', color: '#627EEA' },
                        { name: 'Polygon', symbol: 'MATIC', amount: '1,250', value: '$1,125', color: '#8247E5' },
                        { name: 'USDC', symbol: 'USDC', amount: '2,500', value: '$2,500', color: '#2775CA' },
                      ].map((token, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ background: token.color }}
                            >
                              {token.symbol[0]}
                            </div>
                            <div>
                              <div className="text-white font-medium text-sm">{token.name}</div>
                              <div className="text-white/50 text-xs">{token.amount} {token.symbol}</div>
                            </div>
                          </div>
                          <div className="text-white text-sm font-medium">{token.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -right-8 top-20 glass-card p-3 flex items-center gap-2 animate-pulse">
                <Shield size={16} className="text-green-400" />
                <span className="text-white text-xs">Self-Custody</span>
              </div>
              <div className="absolute -left-8 bottom-32 glass-card p-3 flex items-center gap-2">
                <Smartphone size={16} className="text-[#0098EA]" />
                <span className="text-white text-xs">@nickname</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
