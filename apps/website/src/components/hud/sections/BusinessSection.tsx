// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, CountUp } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface BusinessSectionProps {
  visible: boolean
}

const SHAREHOLDERS = [
  { name: '@daniel', share: 50, color: '#3388FF' },
  { name: '@alex', share: 30, color: '#00E5FF' },
  { name: '@maria', share: 20, color: '#22C55E' },
]

const PROPOSALS = [
  { title: 'Hire Developer', votes: { for: 2, against: 0 }, status: 'active' },
  { title: 'Marketing Budget', votes: { for: 1, against: 1 }, status: 'active' },
  { title: 'New Product Line', votes: { for: 0, against: 0 }, status: 'pending' },
]

export function BusinessSection({ visible }: BusinessSectionProps) {
  const [hoveredShareholder, setHoveredShareholder] = useState<number | null>(null)

  return (
    <TriangleContainer face="bottom" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Title at top (wide) */}
      <div className="text-center mb-3">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase mb-1"
          style={{ color: '#22C55E' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          NEW FEATURE
        </motion.p>
        <GlowTitle className="text-2xl sm:text-3xl lg:text-4xl" delay={0.15} visible={visible}>
          Your Business, On-Chain
        </GlowTitle>
      </div>

      {/* Content grid */}
      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto w-full">
        {/* Treasury */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3 text-center flex flex-col justify-center"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Treasury</div>
          <div className="text-xl sm:text-2xl font-bold hud-mono hud-glow" style={{ color: 'var(--foreground)' }}>
            <CountUp target={250} prefix="" suffix="" visible={visible} delay={400} duration={1500} separator={false} />
          </div>
          <div className="text-[10px] hud-mono" style={{ color: 'var(--accent-cyan)' }}>ETH</div>
        </motion.div>

        {/* Shareholders */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Shareholders</div>
          <div className="space-y-1.5">
            {SHAREHOLDERS.map((sh, i) => (
              <div
                key={sh.name}
                className="relative cursor-default"
                onMouseEnter={() => setHoveredShareholder(i)}
                onMouseLeave={() => setHoveredShareholder(null)}
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="hud-mono" style={{ color: sh.color }}>{sh.name}</span>
                  <span className="hud-mono" style={{ color: 'var(--foreground-muted)' }}>{sh.share}%</span>
                </div>
                {/* Share bar */}
                <div className="h-1 mt-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: sh.color }}
                    initial={{ width: 0 }}
                    animate={visible ? { width: `${sh.share}%` } : { width: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Governance */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Governance</div>
          <div className="space-y-1.5">
            {PROPOSALS.map((p, i) => (
              <div key={p.title} className="text-[10px]">
                <div className="flex items-center gap-1 mb-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: p.status === 'active' ? '#22C55E' : 'var(--foreground-light)' }}
                  />
                  <span className="truncate" style={{ color: 'var(--foreground)' }}>{p.title}</span>
                </div>
                <div className="flex gap-1">
                  <div className="flex items-center gap-0.5 text-[8px] hud-mono" style={{ color: '#22C55E' }}>
                    ▲{p.votes.for}
                  </div>
                  <div className="flex items-center gap-0.5 text-[8px] hud-mono" style={{ color: '#EF4444' }}>
                    ▼{p.votes.against}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </TriangleContainer>
  )
}
