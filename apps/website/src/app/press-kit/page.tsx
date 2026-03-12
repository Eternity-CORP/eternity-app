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
  { name: 'Background', hex: '#FFFFFF', darkHex: '#000000' },
  { name: 'Foreground', hex: '#000000', darkHex: '#FFFFFF' },
  { name: 'Blue', hex: '#0066FF', darkHex: '#3388FF' },
  { name: 'Cyan', hex: '#00D4FF', darkHex: '#00E5FF' },
  { name: 'Muted', hex: '#666666', darkHex: '#A0A0A0' },
  { name: 'Surface', hex: '#F5F5F5', darkHex: '#0A0A0A' },
]

const facts = [
  { label: 'Founded', value: '2026' },
  { label: 'Category', value: 'AI-Native Crypto Wallet' },
  { label: 'Key Features', value: 'BLIK codes, AI Agent, @username system' },
  { label: 'Stage', value: 'Active Development (Testnet + Mainnet)' },
  { label: 'Platform', value: 'Web, iOS & Android' },
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
                  <div className="flex gap-2 mb-4">
                    <div
                      className="flex-1 h-16 rounded-lg"
                      style={{ backgroundColor: color.hex, border: '1px solid var(--border)' }}
                    />
                    <div
                      className="flex-1 h-16 rounded-lg"
                      style={{ backgroundColor: color.darkHex, border: '1px solid var(--border)' }}
                    />
                  </div>
                  <h3 className="font-medium" style={{ color: 'var(--foreground)' }}>{color.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
                    Light: {color.hex} &middot; Dark: {color.darkHex}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section className="mb-16">
            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--foreground)' }}>About Eternity</h2>
            <div className="p-6 rounded-2xl" style={{ background: 'var(--surface-light)', border: '1px solid var(--border-light)' }}>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                Eternity is an AI-native cryptocurrency wallet designed to make
                crypto accessible to everyone. By introducing BLIK-style 6-digit
                codes for transfers, an AI Agent that speaks your language, and
                @username-based transfers — Eternity eliminates
                the complexity that prevents mainstream adoption.
              </p>
              <p className="leading-relaxed mb-4" style={{ color: 'var(--foreground-muted)' }}>
                Instead of sharing long wallet addresses, users share a
                6-digit code that expires in 2 minutes, or simply send to @usernames.
                The AI Agent handles the rest — from transaction preparation to
                contextual suggestions.
              </p>
              <p className="leading-relaxed" style={{ color: 'var(--foreground-muted)' }}>
                With scheduled payments, split bills, cross-chain swaps, and fiat
                on-ramp — Eternity covers every daily crypto need from a single wallet.
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
                &ldquo;Eternity is an AI-native crypto wallet with BLIK-style codes,
                enabling anyone to send and receive cryptocurrency using just 6 digits
                or an @username. With a built-in AI Agent,
                Eternity makes crypto as simple as sending a text message.&rdquo;
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    'Eternity is an AI-native crypto wallet with BLIK-style codes, enabling anyone to send and receive cryptocurrency using just 6 digits or an @username. With a built-in AI Agent, Eternity makes crypto as simple as sending a text message.'
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
                For press inquiries, interviews, or additional assets, contact us at{' '}
                <a href="mailto:eternity.shard.business@gmail.com" className="underline" style={{ color: 'var(--foreground)' }}>
                  eternity.shard.business@gmail.com
                </a>.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
