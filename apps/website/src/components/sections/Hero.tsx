'use client'

import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useWarp } from '@/components/animations/WarpTransition'

const ShardScene = dynamic(
  () => import('@/components/3d/ShardScene').then((mod) => mod.ShardScene),
  { ssr: false }
)

export function Hero() {
  const { startWarp } = useWarp()

  return (
    <section id="hero" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background dot pattern */}
      <div className="absolute inset-0 bg-dots" />

      {/* Content — split layout */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full grid lg:grid-cols-5 gap-8 items-center pt-24">
        {/* Text — left 40% */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-tag text-white/30"
          >
            ETERNITY
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="text-display"
          >
            The{' '}
            <span className="text-gradient-blue">AI-Native</span>
            <br />
            Crypto Wallet
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-body-lg text-white/70 max-w-md"
          >
            Send crypto like a text message.
            <br />
            Just type a name and hit send.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-4 mt-2"
          >
            <button
              onClick={startWarp}
              className="px-7 py-3 text-base font-medium bg-white text-black rounded-full shimmer hover:bg-white/90 transition-colors"
            >
              Launch App
            </button>
            <a
              href="#cta"
              className="text-sm font-medium text-white/50 hover:text-white transition-colors flex items-center gap-1"
            >
              Join Waitlist
              <span aria-hidden>&rarr;</span>
            </a>
          </motion.div>
        </div>

        {/* Crystal — right 60% */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-3 h-[50vh] lg:h-[70vh] min-h-[400px]"
        >
          <ShardScene />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
      >
        <motion.button
          onClick={() => document.getElementById('problem')?.scrollIntoView({ behavior: 'smooth' })}
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </motion.button>
      </motion.div>
    </section>
  )
}
