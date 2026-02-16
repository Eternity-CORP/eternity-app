// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, CountUp } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'
import { Button } from '@/components/ui/Button'

interface CtaSectionProps {
  visible: boolean
}

const BADGES = ['AI Agent', 'SHARD Identity', 'Mobile App', 'Network Abstraction']

export function CtaSection({ visible }: CtaSectionProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !email.includes('@')) { setStatus('error'); return }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: '', isBetaTester: false }),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  return (
    <TriangleContainer face="full" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      <GlowTitle className="text-3xl sm:text-4xl lg:text-5xl mb-4 leading-tight" delay={0.1} visible={visible}>
        Experience AI-Native Crypto
      </GlowTitle>

      {status === 'success' ? (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center hud-pulse-border"
            style={{ background: 'rgba(0, 229, 255, 0.1)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--accent-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-lg font-bold hud-glow" style={{ color: 'var(--foreground)' }}>You're In!</p>
        </motion.div>
      ) : (
        <motion.form
          onSubmit={handleSubmit}
          className="flex flex-col sm:flex-row gap-2 max-w-sm mx-auto mb-4 w-full"
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
            placeholder="Enter your email"
            className="flex-1 px-4 py-2.5 rounded-xl outline-none text-sm backdrop-blur-sm"
            style={{
              background: 'rgba(0, 229, 255, 0.05)',
              border: status === 'error' ? '1px solid #EF4444' : '1px solid rgba(0, 229, 255, 0.2)',
              color: 'var(--foreground)',
            }}
          />
          <Button type="submit" variant="primary" size="sm" disabled={status === 'loading'} className="hud-pulse-border">
            {status === 'loading' ? '...' : 'Join'}
          </Button>
        </motion.form>
      )}

      <motion.div
        className="text-sm hud-mono mb-4"
        style={{ color: 'var(--accent-cyan)' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.5 }}
      >
        <CountUp target={4201} prefix="" suffix=" pioneers already joined" delay={600} visible={visible} />
      </motion.div>

      <motion.div
        className="flex flex-wrap justify-center gap-2"
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.7 }}
      >
        {BADGES.map((badge, i) => (
          <span
            key={badge}
            className="clip-hex text-[10px] sm:text-xs px-3 py-1.5 hud-glow-subtle"
            style={{
              background: 'rgba(0, 229, 255, 0.06)',
              color: 'var(--accent-cyan)',
            }}
          >
            {badge}
          </span>
        ))}
      </motion.div>
    </TriangleContainer>
  )
}
