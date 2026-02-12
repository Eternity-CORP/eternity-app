'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

const logos = [
  { name: 'Logo White', file: 'logo_white', formats: ['svg', 'png'] },
  { name: 'Logo Black', file: 'logo_black', formats: ['svg', 'png'] },
  { name: 'Logo Purple', file: 'loho_purple', formats: ['svg', 'png'] },
  { name: 'Logo Blue', file: 'logo_blue', formats: ['svg', 'png'] },
]

const colors = [
  { name: 'Background', hex: '#FFFFFF', rgb: '255, 255, 255' },
  { name: 'Foreground', hex: '#000000', rgb: '0, 0, 0' },
  { name: 'Blue', hex: '#0066FF', rgb: '0, 102, 255' },
  { name: 'Cyan', hex: '#00D4FF', rgb: '0, 212, 255' },
  { name: 'Muted', hex: '#666666', rgb: '102, 102, 102' },
  { name: 'Surface', hex: '#F8F8F8', rgb: '248, 248, 248' },
]

const facts = [
  { label: 'Founded', value: '2026' },
  { label: 'Category', value: 'Crypto Wallet' },
  { label: 'Key Feature', value: 'BLIK-style codes' },
  { label: 'Stage', value: 'MVP (Testnet)' },
  { label: 'Platform', value: 'iOS & Android' },
]

export default function PressKitPage() {
  return (
    <main className="min-h-screen theme-transition" style={{ background: 'var(--background)' }}>
      <div className="container mx-auto px-6 py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 transition-colors mb-8"
          style={{ color: 'var(--foreground-muted)' }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Home
        </Link>

        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--foreground)' }}>Press Kit</h1>
          <p className="text-xl mb-12" style={{ color: 'var(--foreground-muted)' }}>
            Everything you need to write about Eternity
          </p>

          {/* Logo Downloads */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Logos</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {logos.map((logo) => (
                <motion.div
                  key={logo.name}
                  className="p-6 rounded-2xl text-center"
                  style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Image
                      src={`/images/${logo.file}.svg`}
                      alt={logo.name}
                      width={64}
                      height={64}
                      className="max-w-full max-h-full"
                    />
                  </div>
                  <h3 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>{logo.name}</h3>
                  <div className="flex gap-2 justify-center">
                    {logo.formats.map((format) => (
                      <a
                        key={format}
                        href={`/images/${logo.file}.${format}`}
                        download
                        className="px-3 py-1 text-xs rounded-full transition-colors"
                        style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
                      >
                        {format.toUpperCase()}
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Colors */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Brand Colors</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {colors.map((color) => (
                <div
                  key={color.name}
                  className="p-4 rounded-2xl"
                  style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}
                >
                  <div
                    className="w-full h-16 rounded-lg mb-4"
                    style={{ backgroundColor: color.hex, border: '1px solid var(--border)' }}
                  />
                  <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>{color.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{color.hex}</p>
                  <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>RGB: {color.rgb}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Eternity Shard */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Eternity Shard</h2>
            <div className="p-6 rounded-2xl mb-6" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Shard Visual */}
                <div className="w-full md:w-1/3 flex justify-center">
                  <div className="relative w-32 h-48">
                    <svg viewBox="0 0 100 150" className="w-full h-full">
                      <defs>
                        <linearGradient id="shardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#333" />
                          <stop offset="50%" stopColor="#666" />
                          <stop offset="100%" stopColor="#333" />
                        </linearGradient>
                      </defs>
                      <polygon points="50,5 85,55 50,55" fill="#555" stroke="#000" strokeWidth="0.5" />
                      <polygon points="50,5 50,55 15,55" fill="#444" stroke="#000" strokeWidth="0.5" />
                      <polygon points="50,55 85,55 50,140" fill="#666" stroke="#000" strokeWidth="0.5" />
                      <polygon points="50,55 50,140 15,55" fill="#555" stroke="#000" strokeWidth="0.5" />
                      <line x1="50" y1="5" x2="50" y2="140" stroke="#000" strokeWidth="1" />
                      <line x1="15" y1="55" x2="85" y2="55" stroke="#000" strokeWidth="1" />
                    </svg>
                  </div>
                </div>

                {/* Description */}
                <div className="w-full md:w-2/3">
                  <h3 className="font-semibold text-lg mb-3" style={{ color: 'var(--foreground)' }}>Brand Symbol</h3>
                  <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                    The Eternity Shard is our unique brand symbol — a stylized crystal that represents
                    the core values of our project: transparency, stability, and timelessness.
                  </p>
                  <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                    The shard symbolizes "shards" or fragments of value that users exchange through
                    our platform, as well as the crystal clarity of our mission to make crypto simple.
                  </p>
                </div>
              </div>
            </div>

            {/* Differences from Ethereum */}
            <div className="p-6 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <h3 className="font-semibold text-lg mb-4" style={{ color: 'var(--foreground)' }}>
                Design Specifications & Differences
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
                While inspired by the blockchain aesthetic, the Eternity Shard has distinct differences
                from other crypto symbols:
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl" style={{ background: 'var(--surface-light)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>Eternity Shard</h4>
                  <ul className="text-sm space-y-1" style={{ color: 'var(--foreground-muted)' }}>
                    <li>• Asymmetric proportions (60/40 top/bottom)</li>
                    <li>• 4 vertices at middle ring</li>
                    <li>• Glass/chrome material finish</li>
                    <li>• Floating animation with rotation</li>
                    <li>• Black and blue/cyan color palette</li>
                  </ul>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'var(--surface-light)' }}>
                  <h4 className="font-medium mb-2" style={{ color: 'var(--foreground)' }}>vs. Ethereum Logo</h4>
                  <ul className="text-sm space-y-1" style={{ color: 'var(--foreground-muted)' }}>
                    <li>• Ethereum uses stacked triangles (flat 2D)</li>
                    <li>• Eternity uses 3D volumetric crystal</li>
                    <li>• Different vertex positioning</li>
                    <li>• Animated vs. static presentation</li>
                    <li>• Unique color scheme (not Ethereum purple)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--surface-light)' }}>
                <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                  <strong style={{ color: 'var(--foreground)' }}>Usage:</strong> The Eternity Shard should always be
                  presented with proper spacing. Do not stretch, rotate beyond animation bounds,
                  or alter the proportions. Use approved color variations only.
                </p>
              </div>
            </div>
          </section>

          {/* About */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>About Eternity</h2>
            <div className="p-6 rounded-2xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                Eternity is a next-generation cryptocurrency wallet designed to make
                crypto accessible to everyone. By introducing BLIK-style 6-digit
                codes for transfers, Eternity eliminates the fear and complexity that
                prevents mainstream adoption.
              </p>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                Instead of sharing long wallet addresses, users simply share a
                6-digit code that expires in 2 minutes. The recipient enters the
                code, and funds transfer instantly. No wrong addresses, no lost
                funds, no fear.
              </p>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                Eternity also features @username support, allowing users to send crypto
                to human-readable names like @alex instead of cryptic addresses.
              </p>
            </div>
          </section>

          {/* Key Facts */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Key Facts</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="p-4 rounded-2xl"
                  style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}
                >
                  <p className="text-sm mb-1" style={{ color: 'var(--foreground-muted)' }}>{fact.label}</p>
                  <p className="font-semibold" style={{ color: 'var(--foreground)' }}>{fact.value}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Boilerplate */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>
              Boilerplate (Copy-Ready)
            </h2>
            <div className="p-6 rounded-2xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              <p className="leading-relaxed italic" style={{ color: 'var(--foreground-muted)' }}>
                "Eternity is the first crypto wallet with BLIK-style codes, enabling
                anyone to send and receive cryptocurrency using just 6 digits. By
                eliminating complex addresses and network confusion, Eternity makes
                crypto as simple as sending a text message. The wallet for
                everyone."
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    'Eternity is the first crypto wallet with BLIK-style codes, enabling anyone to send and receive cryptocurrency using just 6 digits. By eliminating complex addresses and network confusion, Eternity makes crypto as simple as sending a text message. The wallet for everyone.'
                  )
                }}
                className="mt-4 text-sm hover:underline"
                style={{ color: 'var(--accent-blue)' }}
              >
                Copy to clipboard
              </button>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>Press Contact</h2>
            <div className="p-6 rounded-2xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              <p style={{ color: 'var(--foreground-muted)' }}>
                For press inquiries, interviews, or additional assets, please use our
                waitlist form on the homepage and mention that you are from the press.
                We will get back to you as soon as possible.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
