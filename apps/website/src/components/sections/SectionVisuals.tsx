'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

/* ------------------------------------------------------------------ */
/*  Shared styles                                                      */
/* ------------------------------------------------------------------ */

const glassCard: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 16,
}

const glassCardSubtle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.07)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  borderRadius: 12,
}

/* ------------------------------------------------------------------ */
/*  1. ProblemVisual                                                    */
/* ------------------------------------------------------------------ */

export function ProblemVisual({ isActive }: { isActive: boolean }) {
  const cards = [
    {
      content: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
            0x7f3a...9b2c
          </span>
          <span
            style={{
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#f87171',
              fontSize: 10,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 6,
              letterSpacing: 0.5,
            }}
          >
            Invalid
          </span>
        </div>
      ),
      rotation: -3,
      shakeIndex: 0,
    },
    {
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Gas: 0.0847 ETH</span>
          <span style={{ fontSize: 16 }} role="img" aria-label="confused">
            &#x1F615;
          </span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Which network?</span>
        </div>
      ),
      rotation: 2,
      shakeIndex: 1,
    },
    {
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              color: '#fbbf24',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            &#9888;
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#f87171' }}>$2,400 Lost</span>
        </div>
      ),
      rotation: -1.5,
      shakeIndex: 2,
    },
  ]

  return (
    <div style={{ width: 300, position: 'relative', height: 220 }}>
      {cards.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 60, rotate: card.rotation * 2 }}
          animate={
            isActive
              ? {
                  opacity: 1,
                  x: 0,
                  rotate: card.rotation,
                }
              : { opacity: 0, x: 60, rotate: card.rotation * 2 }
          }
          transition={{
            duration: 0.5,
            delay: isActive ? 0.1 + i * 0.12 : 0,
            ease: 'easeOut',
          }}
          style={{
            ...glassCard,
            padding: '14px 18px',
            position: 'absolute',
            top: i * 66,
            left: i * 8,
            right: 0,
            transformOrigin: 'center center',
          }}
        >
          {/* Shake animation on the first "error" card */}
          {i === 0 ? (
            <motion.div
              animate={
                isActive
                  ? {
                      x: [0, -3, 3, -2, 2, 0],
                    }
                  : {}
              }
              transition={{
                duration: 0.5,
                delay: 0.8,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            >
              {card.content}
            </motion.div>
          ) : (
            card.content
          )}
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  2. SolutionVisual                                                   */
/* ------------------------------------------------------------------ */

export function SolutionVisual({ isActive }: { isActive: boolean }) {
  const tiles = [
    {
      label: 'BLIK',
      visual: (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 4,
            color: 'white',
          }}
        >
          847 291
        </span>
      ),
      gradient: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(59,130,246,0.1))',
    },
    {
      label: 'Networks',
      visual: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
          {/* Chain icons connected by lines */}
          {['E', 'P', 'A'].map((letter, idx) => (
            <div key={letter} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white',
                  background:
                    idx === 0
                      ? 'rgba(124,58,237,0.3)'
                      : idx === 1
                        ? 'rgba(139,92,246,0.3)'
                        : 'rgba(59,130,246,0.3)',
                }}
              >
                {letter}
              </div>
              {idx < 2 && (
                <div
                  style={{
                    width: 12,
                    height: 1,
                    background: 'rgba(255,255,255,0.2)',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ),
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.1))',
    },
    {
      label: 'Identity',
      visual: (
        <div
          style={{
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: '4px 12px',
            fontSize: 15,
            fontWeight: 600,
            color: '#a78bfa',
          }}
        >
          @username
        </div>
      ),
      gradient: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(124,58,237,0.1))',
    },
    {
      label: 'AI',
      visual: (
        <div
          style={{
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '6px 12px',
            fontSize: 12,
            color: 'rgba(255,255,255,0.7)',
            fontStyle: 'italic',
          }}
        >
          &quot;Send 0.01 ETH&quot;
        </div>
      ),
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(124,58,237,0.1))',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        width: 300,
      }}
    >
      {tiles.map((tile, i) => (
        <motion.div
          key={tile.label}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={
            isActive
              ? { opacity: 1, scale: 1 }
              : { opacity: 0, scale: 0.7 }
          }
          transition={{
            duration: 0.4,
            delay: isActive ? 0.1 + i * 0.1 : 0,
            ease: 'easeOut',
          }}
          style={{
            ...glassCard,
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            background: tile.gradient,
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {tile.visual}
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, textTransform: 'uppercase' }}>
            {tile.label}
          </span>
        </motion.div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  3. FeaturesVisual                                                   */
/* ------------------------------------------------------------------ */

export function FeaturesVisual({ isActive }: { isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={
        isActive
          ? { opacity: 1, y: 0, rotateX: 0 }
          : { opacity: 0, y: 40, rotateX: 8 }
      }
      transition={{ duration: 0.6, ease: 'easeOut' }}
      style={{ perspective: 800, width: 240 }}
    >
      {/* Phone mockup frame */}
      <motion.div
        animate={isActive ? { y: [0, -6, 0] } : {}}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          borderRadius: 32,
          border: '3px solid rgba(255, 255, 255, 0.15)',
          background: 'rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Notch */}
        <div
          style={{
            width: 80,
            height: 24,
            background: '#000',
            borderRadius: '0 0 16px 16px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 5,
          }}
        />

        {/* Screen content */}
        <div style={{ padding: '8px 16px 20px' }}>
          {/* Header bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>E-Y Wallet</span>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              }}
            />
          </div>

          {/* Balance */}
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Total Balance</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: 'white', letterSpacing: -0.5 }}>$1,284.50</div>
          </div>

          {/* Token rows */}
          {[
            { symbol: 'ETH', amount: '0.52', usd: '$1,084.00', color: '#627eea' },
            { symbol: 'USDC', amount: '200.50', usd: '$200.50', color: '#2775ca' },
          ].map((token) => (
            <div
              key={token.symbol}
              style={{
                ...glassCardSubtle,
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: token.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'white',
                  }}
                >
                  {token.symbol[0]}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'white' }}>{token.symbol}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{token.amount}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{token.usd}</span>
            </div>
          ))}

          {/* Bottom nav dots */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 6,
              marginTop: 14,
              paddingBottom: 4,
            }}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: i === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Glass reflection stripe */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(255,255,255,0.03) 100%)',
            pointerEvents: 'none',
            borderRadius: 32,
          }}
        />
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  4. BusinessVisual                                                   */
/* ------------------------------------------------------------------ */

export function BusinessVisual({ isActive }: { isActive: boolean }) {
  const [voteProgress, setVoteProgress] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setVoteProgress(0)
      return
    }
    const timer = setTimeout(() => setVoteProgress(67), 600)
    return () => clearTimeout(timer)
  }, [isActive])

  // Pie chart data
  const slices = [
    { label: 'Founder', pct: 40, color: '#7c3aed' },
    { label: 'Investor', pct: 35, color: '#3b82f6' },
    { label: 'Team', pct: 25, color: '#06b6d4' },
  ]

  // Build conic-gradient string
  let conicStops = ''
  let cumulative = 0
  slices.forEach((s, i) => {
    const start = cumulative
    cumulative += s.pct
    conicStops += `${s.color} ${start}% ${cumulative}%`
    if (i < slices.length - 1) conicStops += ', '
  })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={
        isActive
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.85 }
      }
      transition={{ duration: 0.5, ease: 'easeOut' }}
      style={{
        ...glassCard,
        padding: '20px',
        width: 300,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Acme Inc</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: '#22c55e',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            padding: '2px 8px',
            borderRadius: 6,
          }}
        >
          Active
        </span>
      </div>

      {/* Pie chart + legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        {/* CSS conic-gradient pie chart */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `conic-gradient(${conicStops})`,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {/* Center hole for donut effect */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(0, 0, 0, 0.8)',
            }}
          />
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slices.map((s) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                {s.label} {s.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 14 }} />

      {/* Proposal */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>
            Proposal #3 — Hire CTO
          </span>
        </div>

        {/* Progress bar */}
        <div
          style={{
            height: 6,
            borderRadius: 3,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            marginBottom: 6,
          }}
        >
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${voteProgress}%` }}
            transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 3,
              background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>3/5 votes</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>67%</span>
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/*  5. RoadmapVisual                                                    */
/* ------------------------------------------------------------------ */

export function RoadmapVisual({ isActive }: { isActive: boolean }) {
  const milestones = [
    { quarter: 'Q1', label: 'MVP Launch', status: 'completed' as const, color: '#22c55e' },
    { quarter: 'Q2', label: 'Expansion', status: 'current' as const, color: '#3b82f6' },
    { quarter: 'Q3', label: 'Identity', status: 'future' as const, color: 'rgba(255,255,255,0.2)' },
    { quarter: 'Q4', label: 'Scale', status: 'future' as const, color: 'rgba(255,255,255,0.2)' },
  ]

  return (
    <div style={{ width: 200, position: 'relative' }}>
      {/* Vertical gradient line */}
      <motion.div
        initial={{ height: 0 }}
        animate={isActive ? { height: '100%' } : { height: 0 }}
        transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: 11,
          top: 0,
          width: 2,
          background: 'linear-gradient(180deg, #22c55e 0%, #3b82f6 40%, rgba(255,255,255,0.1) 100%)',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      />

      {/* Milestones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {milestones.map((m, i) => (
          <motion.div
            key={m.quarter}
            initial={{ opacity: 0, x: -15 }}
            animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: -15 }}
            transition={{
              duration: 0.4,
              delay: isActive ? 0.3 + i * 0.15 : 0,
              ease: 'easeOut',
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              position: 'relative',
            }}
          >
            {/* Dot */}
            <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: m.color,
                  position: 'absolute',
                  top: 6,
                  left: 6,
                }}
              />
              {/* Pulse ring for current */}
              {m.status === 'current' && isActive && (
                <motion.div
                  animate={{
                    scale: [1, 2, 1],
                    opacity: [0.6, 0, 0.6],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    border: `2px solid ${m.color}`,
                  }}
                />
              )}
            </div>

            {/* Text */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: m.status === 'future' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.5)',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 2,
                }}
              >
                {m.quarter} 2026
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color:
                    m.status === 'completed'
                      ? 'rgba(255,255,255,0.9)'
                      : m.status === 'current'
                        ? 'white'
                        : 'rgba(255,255,255,0.3)',
                }}
              >
                {m.label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main router component                                               */
/* ------------------------------------------------------------------ */

export function SectionVisual({ sectionId, isActive }: { sectionId: string; isActive: boolean }) {
  switch (sectionId) {
    case 'problem':
      return <ProblemVisual isActive={isActive} />
    case 'solution':
      return <SolutionVisual isActive={isActive} />
    case 'features':
      return <FeaturesVisual isActive={isActive} />
    case 'business':
      return <BusinessVisual isActive={isActive} />
    case 'roadmap':
      return <RoadmapVisual isActive={isActive} />
    default:
      return null
  }
}
