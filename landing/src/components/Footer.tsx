'use client';

import { Github, Twitter, MessageCircle } from 'lucide-react';

const socialLinks = [
  { icon: Twitter, href: 'https://twitter.com/eywallet', label: 'Twitter' },
  { icon: MessageCircle, href: 'https://t.me/eywallet', label: 'Telegram' },
  { icon: Github, href: 'https://github.com/Eternity-CORP/E-Y', label: 'GitHub' },
];

const footerLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Join Beta', href: '#beta' },
];

export default function Footer() {
  return (
    <footer className="relative py-16 px-6 border-t" style={{ borderColor: 'var(--card-border)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          {/* Logo */}
          <a href="#" className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
            E-Y
          </a>
          
          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-8">
            {footerLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="transition-colors text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {link.label}
              </a>
            ))}
          </nav>
          
          {/* Social */}
          <div className="flex gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: 'var(--text-muted)' }}
                aria-label={social.label}
              >
                <social.icon size={18} strokeWidth={1.5} />
              </a>
            ))}
          </div>
        </div>
        
        {/* Bottom */}
        <div className="text-center">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} E-Y Wallet
          </p>
        </div>
      </div>
    </footer>
  );
}
