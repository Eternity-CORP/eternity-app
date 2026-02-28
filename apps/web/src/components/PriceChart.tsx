'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchPriceChartData, type PriceChartData } from '@e-y/shared'

type TimeRange = 1 | 7 | 30

interface PriceChartProps {
  symbol: string
}

function formatPrice(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value > 0) return `$${value.toFixed(4)}`
  return '$0.00'
}

function formatChartDate(ts: number, range: TimeRange): string {
  const d = new Date(ts)
  if (range === 1) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function PriceChart({ symbol }: PriceChartProps) {
  const [range, setRange] = useState<TimeRange>(1)
  const [data, setData] = useState<PriceChartData | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'succeeded' | 'failed'>('loading')
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetchPriceChartData(symbol, range).then((result) => {
      if (!cancelled) {
        setData(result)
        setStatus('succeeded')
      }
    })

    return () => { cancelled = true }
  }, [symbol, range])

  const { pathD, gradientD, viewBox, minPrice, maxPrice, points } = useMemo(() => {
    if (!data || data.prices.length < 2) {
      return { pathD: '', gradientD: '', viewBox: '0 0 400 160', minPrice: 0, maxPrice: 0, points: [] }
    }

    const prices = data.prices
    const w = 400
    const h = 160
    const padding = 4

    const min = Math.min(...prices.map((p) => p.price))
    const max = Math.max(...prices.map((p) => p.price))
    const range = max - min || 1

    const pts = prices.map((p, i) => ({
      x: padding + (i / (prices.length - 1)) * (w - padding * 2),
      y: padding + (1 - (p.price - min) / range) * (h - padding * 2),
      price: p.price,
      timestamp: p.timestamp,
    }))

    // Smooth SVG path using quadratic bezier
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cx = (pts[i - 1].x + pts[i].x) / 2
      d += ` Q ${pts[i - 1].x + (cx - pts[i - 1].x) * 0.5} ${pts[i - 1].y}, ${cx} ${(pts[i - 1].y + pts[i].y) / 2}`
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`

    // Gradient fill area
    const gd = `${d} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`

    return { pathD: d, gradientD: gd, viewBox: `0 0 ${w} ${h}`, minPrice: min, maxPrice: max, points: pts }
  }, [data])

  const isPositive = data ? data.priceChangePercentage24h >= 0 : true
  const lineColor = isPositive ? '#22c55e' : '#ef4444'

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!points.length) return
      const svg = e.currentTarget
      const rect = svg.getBoundingClientRect()
      const relX = (e.clientX - rect.left) / rect.width * 400

      let closest = 0
      let minDist = Infinity
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].x - relX)
        if (dist < minDist) {
          minDist = dist
          closest = i
        }
      }
      setHoveredIndex(closest)
    },
    [points],
  )

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null

  const rangeLabels: { value: TimeRange; label: string }[] = [
    { value: 1, label: '1D' },
    { value: 7, label: '7D' },
    { value: 30, label: '30D' },
  ]

  return (
    <div className="glass-card rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Price</h2>
        <div className="flex gap-1">
          {rangeLabels.map((r) => (
            <button
              key={r.value}
              onClick={() => { setRange(r.value); setHoveredIndex(null) }}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                range === r.value
                  ? 'bg-[var(--surface-hover)] text-[var(--foreground)]'
                  : 'text-[var(--foreground-subtle)] hover:text-[var(--foreground-muted)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Current Price / Hovered Price */}
      {status === 'loading' ? (
        <div className="h-8 w-32 bg-[var(--surface)] rounded-lg animate-pulse mb-4" />
      ) : data ? (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[var(--foreground)]">
              {formatPrice(hoveredPoint ? hoveredPoint.price : data.currentPrice)}
            </span>
            {!hoveredPoint && (
              <span className={`text-sm font-medium ${isPositive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {isPositive ? '+' : ''}{data.priceChangePercentage24h.toFixed(2)}%
              </span>
            )}
          </div>
          {hoveredPoint && (
            <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">{formatChartDate(hoveredPoint.timestamp, range)}</p>
          )}
          {!hoveredPoint && data.high24h > 0 && (
            <p className="text-xs text-[var(--foreground-subtle)] mt-0.5">
              H: {formatPrice(data.high24h)} / L: {formatPrice(data.low24h)}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--foreground-subtle)] mb-4">Price data unavailable</p>
      )}

      {/* Chart */}
      {status === 'loading' ? (
        <div className="h-40 rounded-xl bg-[var(--surface)] animate-pulse" />
      ) : pathD ? (
        <svg
          viewBox={viewBox}
          className="w-full h-40 cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Gradient fill */}
          <path d={gradientD} fill={`url(#grad-${symbol})`} />
          {/* Line */}
          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2" vectorEffect="non-scaling-stroke" />
          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              <line
                x1={hoveredPoint.x} y1={0} x2={hoveredPoint.x} y2={160}
                stroke="white" strokeOpacity="0.15" strokeWidth="1" vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={hoveredPoint.x} cy={hoveredPoint.y} r="4"
                fill={lineColor} stroke="white" strokeWidth="2" vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      ) : (
        <div className="h-40 rounded-xl bg-[var(--surface)] border border-[var(--border-light)] flex items-center justify-center">
          <p className="text-sm text-[var(--foreground-subtle)]">No chart data</p>
        </div>
      )}
    </div>
  )
}
