'use client'

import Link from 'next/link'
import Image from 'next/image'

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

  return (
    <footer className="relative py-16 border-t border-black/5 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image
                src="/images/logo.svg"
                alt="Eternity"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <span className="text-xl font-bold text-black">Eternity</span>
            </Link>
            <p className="text-muted text-sm mb-4">The Wallet for Everyone</p>
            <p className="text-muted text-xs">
              Send crypto like you send a text.
              <br />
              No addresses. No fear. Just 6 digits.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold text-black mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted hover:text-black transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="font-semibold text-black mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-muted hover:text-black transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-muted text-sm">
            © {currentYear} Eternity. All rights reserved.
          </p>

          <p className="text-muted text-sm">
            Built for the future of crypto
          </p>
        </div>
      </div>
    </footer>
  )
}
