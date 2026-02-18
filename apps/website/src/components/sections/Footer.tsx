'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTheme } from '@/context/ThemeContext'

const footerLinks = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Roadmap', href: '#roadmap' },
    { label: 'Coming Soon', href: '#coming-soon' },
  ],
  legal: [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Press Kit', href: '/press-kit' },
  ],
}

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { isDark } = useTheme()

  return (
    <footer
      className="relative py-16 theme-transition"
      style={{ background: 'var(--background)', borderTop: '1px solid var(--border-light)' }}
    >
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src={isDark ? '/images/logo_white.svg' : '/images/logo.svg'}
                alt="Eternity"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Eternity</span>
            </Link>
            <p className="text-sm mb-4 text-gradient-blue font-medium">AI-Native Crypto Wallet</p>
            <p className="text-xs mb-4" style={{ color: 'var(--foreground-muted)' }}>
              Intelligence meets simplicity.
              <br />
              Your AI-powered crypto companion.
            </p>
            <a
              href="mailto:eternity.shard.business@gmail.com"
              className="text-xs transition-colors"
              style={{ color: 'var(--foreground-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}
            >
              eternity.shard.business@gmail.com
            </a>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--foreground-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--foreground-muted)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--foreground)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--foreground-muted)'}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div
          className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--border-light)' }}
        >
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            © {currentYear} Eternity. All rights reserved.
          </p>

          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            Powered by AI. Built for humans.
          </p>
        </div>
      </div>
    </footer>
  )
}
