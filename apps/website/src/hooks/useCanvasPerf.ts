'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface CanvasPerfOptions {
  /** Target FPS on mobile (default 30) */
  mobileFps?: number
  /** Max DPR to use (default 1.5) */
  maxDpr?: number
  /** Root margin for IntersectionObserver (default '200px') */
  rootMargin?: string
}

interface CanvasPerfResult {
  /** Whether the canvas is currently visible in the viewport */
  isVisible: boolean
  /** Whether reduced motion is preferred */
  reducedMotion: boolean
  /** Whether the device is mobile/touch */
  isMobile: boolean
  /** Capped device pixel ratio */
  dpr: number
  /** Frame interval in ms (use to throttle rAF) */
  frameInterval: number
  /** Ref to attach to the canvas or container element for visibility tracking */
  observerRef: React.RefObject<HTMLElement | null>
  /** Helper: should this frame be skipped? Call with timestamp from rAF */
  shouldSkipFrame: (timestamp: number) => boolean
}

/**
 * Shared performance hook for canvas animations.
 * - IntersectionObserver to pause when off-screen
 * - DPR capping
 * - Mobile detection + frame throttling
 * - prefers-reduced-motion support
 */
export function useCanvasPerf(options: CanvasPerfOptions = {}): CanvasPerfResult {
  const {
    mobileFps = 30,
    maxDpr = 1.5,
    rootMargin = '200px',
  } = options

  const observerRef = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const lastFrameRef = useRef(0)

  // Detect mobile
  const [isMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      'ontouchstart' in window ||
      window.matchMedia('(hover: none)').matches ||
      window.innerWidth < 768
    )
  })

  // Detect reduced motion
  const [reducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  // Cap DPR
  const [dpr] = useState(() => {
    if (typeof window === 'undefined') return 1
    return Math.min(window.devicePixelRatio || 1, maxDpr)
  })

  // Frame interval
  const frameInterval = isMobile ? 1000 / mobileFps : 0 // 0 = no throttle on desktop

  // IntersectionObserver
  useEffect(() => {
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [rootMargin])

  // Frame skip helper
  const shouldSkipFrame = useCallback(
    (timestamp: number): boolean => {
      if (!isVisible) return true
      if (reducedMotion) return true
      if (frameInterval > 0) {
        if (timestamp - lastFrameRef.current < frameInterval) return true
        lastFrameRef.current = timestamp
      }
      return false
    },
    [isVisible, reducedMotion, frameInterval]
  )

  return {
    isVisible,
    reducedMotion,
    isMobile,
    dpr,
    frameInterval,
    observerRef,
    shouldSkipFrame,
  }
}
