// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, TypewriterText } from '../HudText'
import { HudCard } from '../HudCard'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface SolutionSectionProps {
  visible: boolean
  face?: 'full' | 'top' | 'bottom'
}

function BlikCode({ visible }: { visible: boolean }) {
  const [code, setCode] = useState('847291')
  const [timeLeft, setTimeLeft] = useState(120)

  useEffect(() => {
    if (!visible) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setCode(String(Math.floor(100000 + Math.random() * 900000))); return 120 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [visible])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="text-center">
      <div className="text-lg sm:text-xl font-bold hud-mono tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
        {code}
      </div>
      <div className="text-[9px] hud-mono mt-1" style={{ color: 'var(--foreground-muted)' }}>
        {mins}:{String(secs).padStart(2, '0')}
      </div>
    </div>
  )
}

export function SolutionSection({ visible, face }: SolutionSectionProps) {
  return (
    <TriangleContainer face={face ?? 'bottom'} visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Title at top (wide part of bottom triangle) */}
      <div className="text-center mb-3">
        <GlowTitle className="text-2xl sm:text-3xl lg:text-4xl mb-1" delay={0.1} visible={visible}>
          AI-Native by Design
        </GlowTitle>
        <motion.p
          className="text-xs sm:text-sm hud-glow-subtle"
          style={{ color: 'var(--foreground-muted)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.2 }}
        >
          Intelligence built into every layer
        </motion.p>
      </div>

      {/* 4 diamond blocks */}
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full max-w-2xl mx-auto">
          <HudCard label="BLIK Code" delay={0.3} visible={visible} expandContent="6-digit code, 2-minute window. Like bank transfers, but for crypto.">
            <BlikCode visible={visible} />
          </HudCard>

          <HudCard label="@username" delay={0.4} visible={visible} expandContent="Send by nickname. No addresses needed.">
            <div className="text-sm hud-mono" style={{ color: 'var(--accent-cyan)' }}>
              @alex<span className="hud-cursor" />
            </div>
          </HudCard>

          <HudCard label="Networks" delay={0.5} visible={visible} expandContent="See USDC, not 'USDC (Polygon)'. We handle routing.">
            <div className="text-xs" style={{ color: 'var(--foreground)' }}>
              See <span className="hud-mono" style={{ color: 'var(--accent-cyan)' }}>USDC</span>
              <br />
              <span className="text-[10px] line-through" style={{ color: 'var(--foreground-light)' }}>not USDC (Polygon)</span>
            </div>
          </HudCard>

          <HudCard label="AI Agent" delay={0.6} visible={visible} expandContent="Natural language commands. 'Send 0.01 ETH to @alex' — done.">
            <div className="text-[11px] hud-mono" style={{ color: 'var(--foreground-muted)' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>&gt;</span>{' '}
              <TypewriterText text="Send 0.01 ETH to @alex" speed={60} delay={800} visible={visible} />
            </div>
          </HudCard>
        </div>
      </div>

      {/* Narrow vertex bottom — empty, or subtle glow */}
    </TriangleContainer>
  )
}
