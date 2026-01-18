import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Eternity | The Wallet for Everyone',
  description: 'Send crypto like you send a text. The first wallet with BLIK-style codes, network abstraction, and zero fear.',
  keywords: ['crypto wallet', 'BLIK', 'cryptocurrency', 'ethereum', 'web3', 'defi'],
  authors: [{ name: 'Eternity Team' }],
  openGraph: {
    title: 'Eternity | The Wallet for Everyone',
    description: 'Send crypto like you send a text. The first wallet with BLIK-style codes.',
    url: 'https://eternity.app',
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
    title: 'Eternity | The Wallet for Everyone',
    description: 'Send crypto like you send a text.',
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
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-black antialiased">
        {children}
      </body>
    </html>
  )
}
