// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlowTitle } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface RoadmapSectionProps {
  visible: boolean
  face?: 'full' | 'top' | 'bottom'
}

const MILESTONES = [
  {
    quarter: 'Q1 2026',
    title: 'MVP + AI Agent',
    current: true,
    items: ['AI-powered transactions', 'BLIK codes', '@username sends', 'Multi-wallet support'],
  },
  {
    quarter: 'Q2 2026',
    title: 'Expansion',
    current: false,
    items: ['Multi-chain support', 'Fiat on-ramp', 'DeFi integrations', 'Mobile app launch'],
  },
  {
    quarter: 'Q3 2026',
    title: 'Identity',
    current: false,
    items: ['SHARD identity system', 'Reputation scores', 'Social recovery', 'ENS integration'],
  },
  {
    quarter: 'Q4 2026',
    title: 'Scale',
    current: false,
    items: ['DEX aggregation', 'Cross-chain bridges', 'Enterprise features', 'Governance token'],
  },
]

export function RoadmapSection({ visible, face }: RoadmapSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <TriangleContainer face={face ?? 'top'} visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      <div className="text-center mb-2">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase hud-glow-subtle"
          style={{ color: 'var(--accent-cyan)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          ROADMAP
        </motion.p>
      </div>

      {/* Energy path with milestones */}
      <div className="flex-1 flex flex-col items-center justify-center relative max-w-sm mx-auto w-full">
        {MILESTONES.map((milestone, i) => {
          const isHovered = hoveredIndex === i

          return (
            <div key={milestone.quarter} className="w-full relative">
              {/* Path line between nodes */}
              {i < MILESTONES.length - 1 && (
                <div className="absolute left-1/2 top-full w-px h-4 sm:h-6 -translate-x-1/2 z-0">
                  <motion.div
                    className="w-full h-full"
                    style={{
                      background: milestone.current
                        ? 'linear-gradient(to bottom, var(--accent-cyan), rgba(0, 229, 255, 0.2))'
                        : 'repeating-linear-gradient(to bottom, var(--foreground-light) 0px, var(--foreground-light) 3px, transparent 3px, transparent 7px)',
                    }}
                    initial={{ scaleY: 0 }}
                    animate={visible ? { scaleY: 1 } : { scaleY: 0 }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
                    style2={{ transformOrigin: 'top' }}
                  />
                </div>
              )}

              {/* Milestone node */}
              <motion.div
                className="relative z-10 flex items-center gap-3 py-2 px-3 rounded-lg cursor-default hud-hover-scan"
                style={{
                  background: isHovered ? 'rgba(0, 229, 255, 0.06)' : 'transparent',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                initial={{ opacity: 0, x: -20 }}
                animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: 0.2 + i * 0.15 }}
              >
                {/* Diamond indicator */}
                <div className="flex-shrink-0">
                  <motion.div
                    className="w-4 h-4 clip-diamond"
                    style={{
                      background: milestone.current ? 'var(--accent-cyan)' : 'var(--foreground-light)',
                      boxShadow: milestone.current ? '0 0 12px rgba(0, 229, 255, 0.5)' : 'none',
                    }}
                    animate={milestone.current ? { scale: [1, 1.2, 1] } : {}}
                    transition={milestone.current ? { duration: 2, repeat: Infinity } : {}}
                  />
                </div>

                {/* Quarter + title */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] hud-mono uppercase tracking-widest" style={{ color: milestone.current ? 'var(--accent-cyan)' : 'var(--foreground-light)' }}>
                    {milestone.quarter}
                  </div>
                  <div className="text-sm font-medium" style={{ color: milestone.current ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                    {milestone.title}
                  </div>
                </div>

                {/* Status */}
                {milestone.current && (
                  <span className="text-[8px] px-2 py-0.5 rounded-full hud-mono" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>
                    NOW
                  </span>
                )}
              </motion.div>

              {/* Expanded sub-items on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="pl-10 pr-3 overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-1 space-y-0.5">
                      {milestone.items.map((item, j) => (
                        <motion.div
                          key={item}
                          className="text-[10px] flex items-center gap-1.5"
                          style={{ color: 'var(--foreground-muted)' }}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.05 }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
                          {item}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </TriangleContainer>
  )
}
