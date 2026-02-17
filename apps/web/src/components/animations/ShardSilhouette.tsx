'use client'

/**
 * SVG Shard Silhouette — Faceted teardrop shape matching the E-Y brand shard.
 * Used as a building block for ShardMerge and ShardSeal animations.
 */

interface ShardSilhouetteProps {
  width?: number
  height?: number
  className?: string
  /** Fill color or gradient ID (e.g. "url(#grad)") */
  fill?: string
  /** Stroke color for facet edges */
  stroke?: string
  strokeWidth?: number
  style?: React.CSSProperties
  id?: string
}

/**
 * Faceted teardrop shard path.
 * ViewBox is 0 0 100 160. Top curves inward (referencing infinity logo),
 * bottom tapers to a point. Facet lines are drawn inside.
 */
const SHARD_OUTLINE =
  'M50 0 L72 18 L82 48 L78 85 L68 118 L50 160 L32 118 L22 85 L18 48 L28 18 Z'

const FACET_LINES = [
  // Internal facet edges
  'M50 0 L50 160',       // center vertical
  'M28 18 L72 18',       // top cross
  'M18 48 L82 48',       // upper cross
  'M22 85 L78 85',       // middle cross
  'M32 118 L68 118',     // lower cross
  // Diagonal facets
  'M50 0 L18 48',
  'M50 0 L82 48',
  'M28 18 L22 85',
  'M72 18 L78 85',
  'M18 48 L32 118',
  'M82 48 L68 118',
  'M22 85 L50 160',
  'M78 85 L50 160',
]

export default function ShardSilhouette({
  width = 100,
  height = 160,
  className = '',
  fill = 'none',
  stroke = '#7c3aed',
  strokeWidth = 1.5,
  style,
  id,
}: ShardSilhouetteProps) {
  return (
    <svg
      id={id}
      width={width}
      height={height}
      viewBox="0 0 100 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Outer shard shape */}
      <path
        d={SHARD_OUTLINE}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Facet edges */}
      {FACET_LINES.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth * 0.6}
          strokeOpacity={0.4}
          className="facet-line"
          data-index={i}
        />
      ))}
    </svg>
  )
}

/** Export the raw SVG path data for canvas-based animations */
export { SHARD_OUTLINE, FACET_LINES }
