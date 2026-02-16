// @ts-nocheck
'use client'

import { motion } from 'framer-motion'

interface ScanLineProps {
  visible: boolean
  delay?: number
}

export function ScanLine({ visible, delay = 0 }: ScanLineProps) {
  if (!visible) return null

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden pointer-events-none z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <div className="hud-scanline" />
    </motion.div>
  )
}
