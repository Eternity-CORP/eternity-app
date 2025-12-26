'use client';

import { Github, Twitter, MessageCircle, Mail } from 'lucide-react';

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/eywallet', label: 'Twitter' },
  { icon: MessageCircle, href: 'https://t.me/eywallet', label: 'Telegram' },
  { icon: Github, href: 'https://github.com/Eternity-CORP/E-Y', label: 'GitHub' },
  { icon: Mail, href: 'mailto:hello@ey.wallet', label: 'Email' },
];

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'Security', href: '#security' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Join Beta', href: '#beta' },
  ],
  'Supported Chains': [
    { label: 'Ethereum', href: '#' },
    { label: 'Polygon', href: '#' },
    { label: 'Arbitrum', href: '#' },
    { label: 'Optimism & Base', href: '#' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Contact', href: '#beta' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
  ],
};

export default function Footer() {
  return (
    <footer className="relative pt-24 pb-8 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-2">
            <a href="#" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0098EA] to-[#7B61FF] flex items-center justify-center">
                <span className="text-white font-bold text-lg">E-Y</span>
              </div>
              <span className="text-xl font-bold text-white">E-Y Wallet</span>
            </a>
            <p className="text-white/50 mb-6 max-w-xs">
              Web3 for Everyone. Send crypto to @usernames, use BLIK codes, 
              and earn Shards — all in one self-custody wallet.
            </p>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-[#0098EA]/20 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon size={18} className="text-white/70" />
                </a>
              ))}
            </div>
          </div>
          
          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link.href}
                      className="text-white/50 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        {/* Bottom */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} E-Y Wallet. All rights reserved.
          </p>
          <p className="text-white/40 text-sm flex items-center gap-2">
            Built with ❤️ for the Web3 community
          </p>
        </div>
      </div>
    </footer>
  );
}
