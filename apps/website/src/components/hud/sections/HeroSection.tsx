// @ts-nocheck
'use client'

import { motion } from 'framer-motion'
import { GlowTitle, TypewriterText } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'
import { Button } from '@/components/ui/Button'

interface HeroSectionProps {
  visible: boolean
  onLaunch: () => void
}

export function HeroSection({ visible, onLaunch }: HeroSectionProps) {
  return (
    <TriangleContainer face="full" visible={visible}>
      <ScanLine visible={visible} delay={0.2} />

      <motion.p
        className="text-xs font-medium tracking-[0.3em] uppercase mb-3 hud-glow-subtle"
        style={{ color: 'var(--accent-cyan)' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.1 }}
      >
        WELCOME
      </motion.p>

      <GlowTitle className="text-3xl sm:text-4xl lg:text-6xl mb-4 leading-tight" delay={0.15} visible={visible}>
        The AI-Native Crypto Wallet
      </GlowTitle>

      <motion.div
        className="text-base sm:text-lg lg:text-xl mb-6"
        style={{ color: 'var(--foreground-muted)' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.3 }}
      >
        <TypewriterText text="Send crypto like a text message" delay={400} visible={visible} />
      </motion.div>

      <motion.div
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
        transition={{ delay: 0.6 }}
      >
        <Button variant="primary" size="lg" onClick={onLaunch} className="hud-pulse-border">
          Launch App
        </Button>
      </motion.div>

      <motion.div
        className="mt-8 flex flex-col items-center gap-1"
        animate={{ opacity: visible ? 0.6 : 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--foreground-light)' }}>
          Scroll to explore
        </span>
        <motion.svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: 'var(--foreground-light)' }}
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      </motion.div>
    </TriangleContainer>
  )
}
