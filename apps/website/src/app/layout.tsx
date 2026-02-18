import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
})

export const metadata: Metadata = {
  title: 'Eternity | AI-Native Crypto Wallet',
  description: 'The first AI-native crypto wallet. Send crypto with 6-digit BLIK codes. No addresses, no fear.',
  keywords: ['crypto wallet', 'AI wallet', 'BLIK', 'cryptocurrency', 'ethereum', 'web3', 'AI-native'],
  authors: [{ name: 'Eternity Team' }],
  icons: {
    icon: { url: '/favicon.svg', type: 'image/svg+xml' },
    apple: '/images/loho_purple.svg',
  },
  openGraph: {
    title: 'Eternity | AI-Native Crypto Wallet',
    description: 'The first AI-native crypto wallet. BLIK codes, network abstraction, and zero fear.',
    url: 'https://eternity-wallet.vercel.app',
    siteName: 'Eternity',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Eternity Wallet',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eternity | AI-Native Crypto Wallet',
    description: 'The first AI-native crypto wallet.',
    images: ['/images/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`} suppressHydrationWarning>
      <body className="antialiased bg-black text-white">
        {children}
      </body>
    </html>
  )
}
