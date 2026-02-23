// @ts-nocheck
'use client'

import { motion } from 'framer-motion'

type FaceType = 'full' | 'top' | 'bottom'

interface TriangleContainerProps {
  face: FaceType
  children: React.ReactNode
  visible: boolean
  className?: string
}

/**
 * Wraps content in a triangular clip-path matching the crystal face.
 * - 'top' (triangle pointing up): vertex at top-center, wide base at bottom
 * - 'bottom' (triangle pointing down): wide top, vertex at bottom-center
 * - 'full': no clip, centered content (Hero/CTA)
 *
 * The container fills ~70% of viewport when zoomed to a face,
 * or centered for full-crystal sections.
 */
export function TriangleContainer({ face, children, visible, className = '' }: TriangleContainerProps) {
  if (face === 'full') {
    return (
      <motion.div
        className={`flex flex-col items-center justify-center text-center max-w-lg mx-auto px-6 ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    )
  }

  const isTop = face === 'top'

  return (
    <motion.div
      className={`relative w-full ${className}`}
      style={{
        /* Triangle covers ~70% of viewport height, centered */
        height: '75vh',
        maxHeight: '800px',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Clipped content area */}
      <div
        className={`absolute inset-0 hud-grid ${isTop ? 'clip-triangle-up' : 'clip-triangle-down'}`}
      >
        {/* Inner content with padding to stay away from narrow edges */}
        <div
          className="relative w-full h-full flex flex-col"
          style={{
            /* Inset content from the triangle edges */
            padding: isTop
              ? '18% 12% 8% 12%'   /* top-triangle: more top padding (vertex), less bottom (base) */
              : '8% 12% 18% 12%',  /* bottom-triangle: less top (base), more bottom (vertex) */
          }}
        >
          {children}
        </div>
      </div>

      {/* Glow edges matching triangle shape */}
      <div
        className={`absolute inset-0 pointer-events-none ${isTop ? 'clip-triangle-up' : 'clip-triangle-down'}`}
        style={{
          border: 'none',
          boxShadow: 'inset 0 0 30px rgba(0, 229, 255, 0.08)',
        }}
      />
    </motion.div>
  )
}
