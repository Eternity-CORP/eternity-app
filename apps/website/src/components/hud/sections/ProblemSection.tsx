// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, HexScramble, CountUp } from '../HudText'
import { HudCard } from '../HudCard'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface ProblemSectionProps {
  visible: boolean
  face?: 'full' | 'top' | 'bottom'
}

const NETWORKS = ['Mainnet', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'zkSync', 'Avalanche', 'BSC']

export function ProblemSection({ visible, face }: ProblemSectionProps) {
  const [expandedNetwork, setExpandedNetwork] = useState(3)

  return (
    <TriangleContainer face={face ?? 'top'} visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Tag at vertex (narrow top) */}
      <div className="text-center mb-2">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase hud-glow-subtle"
          style={{ color: 'var(--accent-cyan)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          THE PROBLEM
        </motion.p>
      </div>

      {/* Title in center */}
      <div className="text-center flex-1 flex flex-col justify-center">
        <GlowTitle className="text-2xl sm:text-3xl lg:text-5xl mb-2" delay={0.2} visible={visible}>
          Built for Machines
        </GlowTitle>
        <motion.p
          className="text-xs sm:text-sm mb-4 hud-glow-subtle"
          style={{ color: 'var(--foreground-muted)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          Complex addresses, gas fees, network selection — every step is a mistake waiting to happen.
        </motion.p>
      </div>

      {/* 3 data blocks at base (wide bottom) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Address block */}
        <HudCard
          label="Address"
          delay={0.35}
          visible={visible}
          expandContent="One wrong character = funds lost forever"
        >
          <div className="text-xs sm:text-sm text-[var(--accent-cyan)] truncate">
            <HexScramble text="0x7f3a8B2c..." visible={visible} scrambleDuration={2500} />
          </div>
        </HudCard>

        {/* Network block */}
        <HudCard
          label="Network"
          delay={0.45}
          visible={visible}
          expandContent="Which one is right?"
        >
          <div className="space-y-0.5 max-h-16 overflow-hidden">
            {NETWORKS.slice(0, expandedNetwork).map((net, i) => (
              <motion.div
                key={net}
                className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded"
                style={{ background: i === 0 ? 'rgba(0, 229, 255, 0.1)' : 'transparent', color: 'var(--foreground-muted)' }}
                initial={{ opacity: 0, height: 0 }}
                animate={visible ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
              >
                {net}
              </motion.div>
            ))}
          </div>
        </HudCard>

        {/* Gap counter */}
        <HudCard
          label="The Gap"
          delay={0.55}
          visible={visible}
          expandContent="The gap is experience"
        >
          <div className="text-[10px] sm:text-xs space-y-1">
            <div style={{ color: 'var(--foreground)' }}>
              <CountUp target={8000000000} suffix="" visible={visible} delay={600} duration={2000} />
              <span className="block text-[8px]" style={{ color: 'var(--foreground-muted)' }}>humans</span>
            </div>
            <div style={{ color: 'var(--accent-cyan)' }}>
              ~<CountUp target={500000000} visible={visible} delay={800} duration={2000} />
              <span className="block text-[8px]" style={{ color: 'var(--foreground-muted)' }}>crypto users</span>
            </div>
          </div>
        </HudCard>
      </div>
    </TriangleContainer>
  )
}
