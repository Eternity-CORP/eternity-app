// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface HudCardProps {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
  expandContent?: React.ReactNode
  delay?: number
  visible?: boolean
  shape?: 'diamond' | 'hex' | 'rect'
  className?: string
}

export function HudCard({
  icon,
  label,
  children,
  expandContent,
  delay = 0,
  visible = true,
  shape = 'rect',
  className = '',
}: HudCardProps) {
  const [expanded, setExpanded] = useState(false)

  const shapeClass = shape === 'diamond' ? 'clip-diamond' : shape === 'hex' ? 'clip-hex' : ''
  const hasExpand = !!expandContent

  return (
    <motion.div
      className={`relative hud-hover-scan ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      onMouseEnter={hasExpand ? () => setExpanded(true) : undefined}
      onMouseLeave={hasExpand ? () => setExpanded(false) : undefined}
    >
      <div
        className={`hud-pulse-border hud-grid rounded-lg p-3 backdrop-blur-sm cursor-default ${shapeClass}`}
        style={{ background: 'rgba(0, 229, 255, 0.03)' }}
      >
        {icon && <div className="text-lg mb-1" style={{ color: 'var(--accent-cyan)' }}>{icon}</div>}
        <div className="text-[10px] uppercase tracking-widest mb-1 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>
          {label}
        </div>
        <div className="text-sm" style={{ color: 'var(--foreground)' }}>{children}</div>
      </div>

      <AnimatePresence>
        {expanded && expandContent && (
          <motion.div
            className="absolute left-0 right-0 top-full mt-1 z-20 hud-pulse-border rounded-lg p-3 backdrop-blur-md"
            style={{ background: 'rgba(10, 10, 10, 0.9)' }}
            initial={{ opacity: 0, y: -5, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -5, scaleY: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xs hud-glow-subtle" style={{ color: 'var(--foreground-muted)' }}>
              {expandContent}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
