// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, CountUp } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface FeaturesSectionProps {
  visible: boolean
}

/* ---- BLIK Demo ---- */
function BlikDemo({ visible }: { visible: boolean }) {
  const [code, setCode] = useState('384729')
  const [timeLeft, setTimeLeft] = useState(120)

  useEffect(() => {
    if (!visible) { setTimeLeft(120); return }
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setCode(String(Math.floor(100000 + Math.random() * 900000))); return 120 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [visible])

  const generate = () => { setCode(String(Math.floor(100000 + Math.random() * 900000))); setTimeLeft(120) }
  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="hud-pulse-border hud-grid rounded-lg p-3 text-center" style={{ background: 'rgba(0, 229, 255, 0.03)' }}>
      <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>BLIK Live</div>
      <div className="text-2xl sm:text-3xl font-bold hud-mono tracking-[0.4em] hud-glow" style={{ color: 'var(--foreground)' }}>{code}</div>
      <div className="text-xs hud-mono mt-1 mb-2" style={{ color: 'var(--foreground-muted)' }}>{mins}:{String(secs).padStart(2, '0')}</div>
      <button onClick={generate} className="text-[10px] px-3 py-1 rounded-full hud-pulse-border hud-hover-scan" style={{ color: 'var(--accent-cyan)', background: 'rgba(0, 229, 255, 0.05)' }}>
        Generate New
      </button>
    </div>
  )
}

/* ---- AI Input Demo ---- */
function AiInputDemo({ visible }: { visible: boolean }) {
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [phase, setPhase] = useState<'idle' | 'typing' | 'processing' | 'done'>('idle')

  useEffect(() => {
    if (!visible) { setInput(''); setResponse(''); setPhase('idle'); return }
    // Auto-demo after 1s
    const timer = setTimeout(() => {
      setPhase('typing')
      const cmd = 'Send 0.01 ETH to alex.eth'
      let i = 0
      const typeTimer = setInterval(() => {
        i++
        setInput(cmd.slice(0, i))
        if (i >= cmd.length) {
          clearInterval(typeTimer)
          setPhase('processing')
          setTimeout(() => { setResponse('Sending 0.01 ETH to alex.eth... Done ✓'); setPhase('done') }, 1200)
        }
      }, 50)
      return () => clearInterval(typeTimer)
    }, 1000)
    return () => clearTimeout(timer)
  }, [visible])

  return (
    <div className="hud-pulse-border hud-grid rounded-lg p-3" style={{ background: 'rgba(0, 229, 255, 0.03)' }}>
      <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>AI Agent</div>
      <div className="text-xs hud-mono p-2 rounded" style={{ background: 'rgba(0, 0, 0, 0.3)', color: 'var(--foreground-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>&gt;</span> {input}
        {phase === 'typing' && <span className="hud-cursor" />}
      </div>
      {response && (
        <motion.div
          className="text-[10px] hud-mono mt-2 hud-glow-subtle"
          style={{ color: '#22C55E' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {response}
        </motion.div>
      )}
    </div>
  )
}

/* ---- Balance Dashboard ---- */
function BalanceDashboard({ visible }: { visible: boolean }) {
  const tokens = [
    { symbol: 'ETH', value: 2.847, change: +3.2 },
    { symbol: 'USDC', value: 1420.0, change: 0.0 },
    { symbol: 'USDT', value: 580.5, change: -0.1 },
  ]

  return (
    <div className="hud-pulse-border hud-grid rounded-lg p-3" style={{ background: 'rgba(0, 229, 255, 0.03)' }}>
      <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Balances</div>
      <div className="space-y-1.5">
        {tokens.map((token, i) => (
          <div key={token.symbol} className="flex items-center justify-between text-xs">
            <span className="hud-mono font-medium" style={{ color: 'var(--foreground)' }}>{token.symbol}</span>
            <div className="flex items-center gap-2">
              <span className="hud-mono" style={{ color: 'var(--foreground)' }}>
                <CountUp target={token.value * 100} duration={1500} delay={300 + i * 200} visible={visible} separator={false} />
              </span>
              <span className="text-[9px]" style={{ color: token.change > 0 ? '#22C55E' : token.change < 0 ? '#EF4444' : 'var(--foreground-muted)' }}>
                {token.change > 0 ? '+' : ''}{token.change}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FeaturesSection({ visible }: FeaturesSectionProps) {
  return (
    <TriangleContainer face="top" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      <div className="text-center mb-2">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase hud-glow-subtle"
          style={{ color: 'var(--accent-cyan)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          AVAILABLE NOW
        </motion.p>
      </div>

      <div className="text-center mb-3">
        <GlowTitle className="text-xl sm:text-2xl lg:text-4xl" delay={0.15} visible={visible}>
          Try It Live
        </GlowTitle>
      </div>

      <div className="flex-1 grid grid-rows-3 gap-2 sm:gap-3 max-w-md mx-auto w-full">
        <motion.div animate={{ opacity: visible ? 1 : 0 }} transition={{ delay: 0.3 }}>
          <BlikDemo visible={visible} />
        </motion.div>
        <motion.div animate={{ opacity: visible ? 1 : 0 }} transition={{ delay: 0.45 }}>
          <AiInputDemo visible={visible} />
        </motion.div>
        <motion.div animate={{ opacity: visible ? 1 : 0 }} transition={{ delay: 0.6 }}>
          <BalanceDashboard visible={visible} />
        </motion.div>
      </div>
    </TriangleContainer>
  )
}
