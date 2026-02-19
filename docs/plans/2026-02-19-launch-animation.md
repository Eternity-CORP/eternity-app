# Launch App Animation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current WarpTransition (particle explosion) with a premium logo-based "Stroke Reveal + Breath + Zoom-Through" animation when clicking "Launch App".

**Architecture:** Single-file rewrite of `WarpTransition.tsx`. Same `WarpProvider` / `useWarp()` API. Canvas 2D animation with 4 phases: stroke draw, fill, breath, zoom-through. Theme-aware (no white flashes). SVG path data extracted as constants for Canvas Path2D.

**Tech Stack:** Canvas 2D, Path2D API, framer-motion (for overlay + text), SVG path extraction

**Design doc:** `docs/plans/2026-02-19-launch-animation-design.md`

---

## Task 1: Extract Logo SVG Path Data

**Files:**
- Create: `apps/website/src/components/animations/logoPathData.ts`

**Step 1: Create the path data constants file**

Extract the 4 main visible paths from `logo_white.svg` (the white logo variant — its paths define the geometry). The logo has two "wings": left wing (paths 1-2) and right wing (paths 3-4). Each wing has an outer shape and an inner detail shape.

The SVG viewBox is `0 0 730 787`. We need the raw `d` attribute strings.

```typescript
// apps/website/src/components/animations/logoPathData.ts

/** Logo SVG viewBox dimensions */
export const LOGO_VIEWBOX = { width: 730, height: 787 }

/**
 * Main visible paths from logo_white.svg.
 * Order matters for draw sequence: outer shapes first, then detail shapes.
 */
export const LOGO_PATHS = {
  // Left wing — outer shape (solid fill)
  leftOuter: 'M223.268 183.233C238.003 182.563 ... Z',   // path 1 from logo_white.svg line 2
  // Left wing — inner detail (gradient outline)
  leftInner: 'M234.966 183.084C240.732 183.337 ... Z',   // path 2 from logo_white.svg line 3
  // Right wing — outer shape (solid fill)
  rightOuter: 'M502.995 588.644C488.263 589.39 ... Z',   // path 3 from logo_white.svg line 5
  // Right wing — inner detail (gradient outline)
  rightInner: 'M502.988 587.067C481.127 587.178 ... Z',  // path 4 from logo_white.svg line 6
  // Left glass overlay
  leftGlass: 'M223.267 496.572C245.503 496.572 ... Z',   // line 4
  // Right glass overlay
  rightGlass: 'M501.44 275.309C479.204 275.422 ... Z',   // line 7
}

/** Drawing order for stroke reveal: left→right, outer→inner */
export const DRAW_ORDER: (keyof typeof LOGO_PATHS)[] = [
  'leftOuter',
  'rightOuter',
  'leftInner',
  'rightInner',
]

/** Glass overlay paths (drawn after fill) */
export const GLASS_PATHS: (keyof typeof LOGO_PATHS)[] = [
  'leftGlass',
  'rightGlass',
]
```

> **IMPORTANT:** Copy the FULL `d="..."` attribute value from `apps/website/public/images/logo_white.svg` for each path. The `...` above are placeholders — the real paths are hundreds of characters long. Read the SVG file and extract exact values.

**Step 2: Verify the paths render correctly**

No automated test — will verify visually in Task 4. But to sanity-check, ensure each `d` string:
- Starts with `M` (moveTo)
- Ends with `Z` (closePath)
- Contains no line breaks inside the string

**Step 3: Commit**

```bash
git add apps/website/src/components/animations/logoPathData.ts
git commit -m "feat(website): extract logo SVG path data for launch animation"
```

---

## Task 2: Utility — Measure SVG Path Length in Canvas

**Files:**
- Add to: `apps/website/src/components/animations/logoPathData.ts`

**Step 1: Add path length measurement utility**

Canvas doesn't have a built-in `getTotalLength()` for Path2D. Use a temporary SVG element to measure.

```typescript
/**
 * Measure total length of an SVG path string.
 * Uses a temporary offscreen SVG element.
 */
export function measurePathLength(d: string): number {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  svg.style.position = 'absolute'
  svg.style.width = '0'
  svg.style.height = '0'
  document.body.appendChild(svg)
  const length = path.getTotalLength()
  document.body.removeChild(svg)
  return length
}
```

**Step 2: Commit**

```bash
git add apps/website/src/components/animations/logoPathData.ts
git commit -m "feat(website): add SVG path length measurement utility"
```

---

## Task 3: Rewrite WarpTransition Animation

**Files:**
- Modify: `apps/website/src/components/animations/WarpTransition.tsx` (full rewrite of animation logic, keep Provider/Context/API)

This is the main task. Replace the particle warp with the 4-phase logo animation.

**Step 1: Plan the structure**

Keep:
- `WarpContext`, `useWarp()`, `WarpProvider` — same API
- `APP_URL`, `DURATION = 4500`
- Fullscreen canvas overlay via `AnimatePresence`
- Redirect via `setTimeout`

Replace:
- All particle logic → logo stroke/fill/breath/zoom animation
- "Entering Eternity" text → "ETERNITY" text (appears in Phase 3)
- White-out ending → theme-aware fade ending

**Step 2: Write the new WarpTransition.tsx**

```typescript
'use client'

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { LOGO_VIEWBOX, LOGO_PATHS, DRAW_ORDER, GLASS_PATHS, measurePathLength } from './logoPathData'

const APP_URL = 'https://e-y-app.vercel.app'
const DURATION = 4500

/* ---- Easings ---- */
function easeInOutCubic(t: number) { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2 }
function easeOutCubic(t: number) { return 1 - Math.pow(1-t, 3) }
function easeInCubic(t: number) { return t*t*t }

/* ---- Context ---- */
const WarpContext = createContext<{ startWarp: () => void }>({ startWarp: () => {} })
export function useWarp() { return useContext(WarpContext) }

/* ---- Provider ---- */
export function WarpProvider({ children }: { children: ReactNode }) {
  const [isWarping, setIsWarping] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)
  const { isDark } = useTheme()
  const isDarkRef = useRef(isDark)
  isDarkRef.current = isDark

  const startWarp = useCallback(() => {
    setIsWarping(true)
    setTimeout(() => { window.location.href = APP_URL }, DURATION)
  }, [])

  useEffect(() => {
    if (!isWarping || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)

    const cx = w / 2
    const cy = h / 2

    // Scale logo to fit ~180px wide, centered
    const logoScale = 180 / LOGO_VIEWBOX.width
    const logoW = LOGO_VIEWBOX.width * logoScale
    const logoH = LOGO_VIEWBOX.height * logoScale
    const logoX = cx - logoW / 2
    const logoY = cy - logoH / 2

    // Prepare Path2D objects and measure lengths
    const pathEntries = DRAW_ORDER.map(key => {
      const d = LOGO_PATHS[key]
      return {
        key,
        path2d: new Path2D(d),
        length: measurePathLength(d),
        d,
      }
    })

    const glassPaths = GLASS_PATHS.map(key => ({
      key,
      path2d: new Path2D(LOGO_PATHS[key]),
    }))

    startTimeRef.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / DURATION, 1)
      const dark = isDarkRef.current

      // Clear with theme background
      ctx.fillStyle = dark ? '#000000' : '#ffffff'
      ctx.fillRect(0, 0, w, h)

      // Set transform to position + scale logo
      ctx.save()
      ctx.translate(logoX, logoY)
      ctx.scale(logoScale, logoScale)

      /*
       * PHASES:
       * 0.00–0.27  DRAW      — stroke-dashoffset reveals logo contour
       * 0.27–0.44  FILL      — gradient wipe fills the interior
       * 0.44–0.71  BREATH    — logo pulses, glow, text appears
       * 0.71–1.00  ZOOM      — zoom into logo, dissolve, redirect
       */

      // ========================
      // PHASE 1: DRAW (0–0.27)
      // ========================
      if (progress < 0.27) {
        const drawP = progress / 0.27
        const eased = easeInOutCubic(drawP)

        // Each path draws sequentially with overlap
        const pathCount = pathEntries.length
        const overlapFactor = 0.3
        const segmentDuration = 1 / (pathCount * (1 - overlapFactor) + overlapFactor)

        for (let i = 0; i < pathCount; i++) {
          const entry = pathEntries[i]
          const segStart = i * segmentDuration * (1 - overlapFactor)
          const segEnd = segStart + segmentDuration
          const segP = Math.max(0, Math.min(1, (eased - segStart) / (segEnd - segStart)))

          if (segP <= 0) continue

          const revealLen = entry.length * segP
          const dashOffset = entry.length - revealLen

          ctx.save()
          ctx.setLineDash([entry.length])
          ctx.lineDashOffset = dashOffset

          // Neon glow (outer)
          ctx.strokeStyle = dark
            ? `rgba(51, 136, 255, ${0.3 * segP})`
            : `rgba(0, 80, 220, ${0.15 * segP})`
          ctx.lineWidth = 8
          ctx.filter = 'blur(6px)'
          ctx.stroke(entry.path2d)

          // Main stroke
          ctx.filter = 'none'
          const gradient = ctx.createLinearGradient(0, 0, LOGO_VIEWBOX.width, 0)
          gradient.addColorStop(0, '#3388FF')
          gradient.addColorStop(1, '#00E5FF')
          ctx.strokeStyle = gradient
          ctx.lineWidth = 2
          ctx.stroke(entry.path2d)

          ctx.restore()
        }
      }

      // ========================
      // PHASE 2: FILL (0.27–0.44)
      // ========================
      if (progress >= 0.27 && progress < 0.44) {
        const fillP = (progress - 0.27) / 0.17
        const eased = easeOutCubic(fillP)

        // Draw full stroke (fading out)
        const strokeAlpha = 1 - eased
        if (strokeAlpha > 0.01) {
          const gradient = ctx.createLinearGradient(0, 0, LOGO_VIEWBOX.width, 0)
          gradient.addColorStop(0, `rgba(51, 136, 255, ${strokeAlpha})`)
          gradient.addColorStop(1, `rgba(0, 229, 255, ${strokeAlpha})`)
          ctx.strokeStyle = gradient
          ctx.lineWidth = 2
          for (const entry of pathEntries) {
            ctx.stroke(entry.path2d)
          }
        }

        // Fill with clip mask (wipe from bottom to top)
        const wipeY = LOGO_VIEWBOX.height * (1 - eased)
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, wipeY, LOGO_VIEWBOX.width, LOGO_VIEWBOX.height - wipeY)
        ctx.clip()

        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }

        // Glass overlays
        for (const glass of glassPaths) {
          ctx.fillStyle = dark
            ? 'rgba(177, 172, 172, 0.15)'
            : 'rgba(177, 172, 172, 0.2)'
          ctx.fill(glass.path2d)
        }

        ctx.restore()
      }

      // ========================
      // PHASE 3: BREATH (0.44–0.71)
      // ========================
      if (progress >= 0.44 && progress < 0.71) {
        const breathP = (progress - 0.44) / 0.27

        // Breath: scale pulse 1 → 1.06 → 1
        const breathCurve = Math.sin(breathP * Math.PI) * 0.06
        const scale = 1 + breathCurve

        ctx.save()
        // Apply breath scale around logo center
        const lcx = LOGO_VIEWBOX.width / 2
        const lcy = LOGO_VIEWBOX.height / 2
        ctx.translate(lcx, lcy)
        ctx.scale(scale, scale)
        ctx.translate(-lcx, -lcy)

        // Draw filled logo
        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }
        for (const glass of glassPaths) {
          ctx.fillStyle = dark
            ? 'rgba(177, 172, 172, 0.15)'
            : 'rgba(177, 172, 172, 0.2)'
          ctx.fill(glass.path2d)
        }

        ctx.restore()
      }

      // ========================
      // PHASE 4: ZOOM (0.71–1.00)
      // ========================
      if (progress >= 0.71) {
        const zoomP = (progress - 0.71) / 0.29
        const zoomEase = easeInCubic(zoomP)

        const zoomScale = 1 + zoomEase * 14  // 1 → 15
        const opacity = 1 - easeOutCubic(zoomP)

        ctx.save()
        ctx.globalAlpha = Math.max(0, opacity)

        const lcx = LOGO_VIEWBOX.width / 2
        const lcy = LOGO_VIEWBOX.height / 2
        ctx.translate(lcx, lcy)
        ctx.scale(zoomScale, zoomScale)
        ctx.translate(-lcx, -lcy)

        const fillColor = dark ? '#ffffff' : '#1a1a1a'
        for (const entry of pathEntries) {
          ctx.fillStyle = fillColor
          ctx.fill(entry.path2d)
        }

        ctx.restore()
      }

      // Restore from logo transform
      ctx.restore()

      // ---- Radial glow (below logo, in screen space) ----
      if (progress >= 0.20 && progress < 0.85) {
        let glowAlpha: number
        if (progress < 0.44) {
          glowAlpha = ((progress - 0.20) / 0.24) * 0.3  // fade in
        } else if (progress < 0.71) {
          const breathP = (progress - 0.44) / 0.27
          glowAlpha = 0.3 + Math.sin(breathP * Math.PI) * 0.2  // pulse
        } else {
          glowAlpha = 0.3 * (1 - (progress - 0.71) / 0.14)  // fade out
        }
        glowAlpha = Math.max(0, Math.min(1, glowAlpha))

        if (glowAlpha > 0.01) {
          const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200)
          if (dark) {
            glowGrad.addColorStop(0, `rgba(51, 136, 255, ${glowAlpha})`)
            glowGrad.addColorStop(0.5, `rgba(0, 229, 255, ${glowAlpha * 0.3})`)
            glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          } else {
            glowGrad.addColorStop(0, `rgba(0, 80, 220, ${glowAlpha * 0.5})`)
            glowGrad.addColorStop(0.5, `rgba(0, 80, 220, ${glowAlpha * 0.15})`)
            glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)')
          }
          ctx.fillStyle = glowGrad
          ctx.beginPath()
          ctx.arc(cx, cy, 200, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ---- Final fade (last 0.3s = progress 0.93–1.00) ----
      if (progress >= 0.93) {
        const fadeP = (progress - 0.93) / 0.07
        ctx.fillStyle = dark
          ? `rgba(0, 0, 0, ${fadeP})`
          : `rgba(255, 255, 255, ${fadeP})`
        ctx.fillRect(0, 0, w, h)
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => { cancelAnimationFrame(animationRef.current) }
  }, [isWarping])

  return (
    <WarpContext.Provider value={{ startWarp }}>
      {children}

      <AnimatePresence>
        {isWarping && (
          <motion.div
            className="fixed inset-0 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <canvas ref={canvasRef} className="absolute inset-0" />

            {/* "ETERNITY" text — appears during Breath phase */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: [0, 0, 0, 1, 1, 0],
                y: [10, 10, 10, 0, 0, 0],
              }}
              transition={{
                duration: DURATION / 1000,
                times: [0, 0.40, 0.48, 0.55, 0.68, 0.78],
                ease: 'easeOut',
              }}
            >
              {/* Position below logo center */}
              <span
                className="absolute text-sm md:text-base font-medium tracking-[0.3em] uppercase select-none"
                style={{
                  top: '50%',
                  marginTop: '120px',
                  color: isDarkRef.current
                    ? 'rgba(255, 255, 255, 0.5)'
                    : 'rgba(0, 0, 0, 0.35)',
                }}
              >
                ETERNITY
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </WarpContext.Provider>
  )
}

/* ---- Exported button (unchanged API) ---- */
export function WarpTransition() {
  const { startWarp } = useWarp()

  return (
    <button
      onClick={startWarp}
      className="group relative inline-flex items-center justify-center gap-2 px-7 py-3 text-base font-medium rounded-full transition-all duration-300 bg-transparent border dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-black border-black text-black hover:bg-black hover:text-white"
    >
      <span className="relative z-10 flex items-center gap-2">
        Launch App
        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
    </button>
  )
}
```

**Step 3: Commit**

```bash
git add apps/website/src/components/animations/WarpTransition.tsx
git commit -m "feat(website): replace warp particle with logo stroke reveal animation"
```

---

## Task 4: Visual QA + Tuning

**Files:**
- May modify: `apps/website/src/components/animations/WarpTransition.tsx`
- May modify: `apps/website/src/components/animations/logoPathData.ts`

**Step 1: Run dev server and test**

```bash
cd apps/website && pnpm dev
```

Open `http://localhost:3000` and click "Launch App".

**Step 2: Verify each phase**

Check:
- [ ] Phase 1 (DRAW): Logo contour draws smoothly with neon glow, ~1.2s
- [ ] Phase 2 (FILL): Interior fills bottom-to-top, stroke fades
- [ ] Phase 3 (BREATH): Logo pulses gently, "ETERNITY" text appears
- [ ] Phase 4 (ZOOM): Smooth zoom-through, logo dissolves, no white flash
- [ ] Dark theme: dark bg, colored glow, white logo fill
- [ ] Light theme: light bg, subtle glow, dark logo fill
- [ ] Redirect to app works after 4.5s
- [ ] Mobile: comfortable to watch, no blinding

**Step 3: Tune timings if needed**

Adjust phase boundaries, easing curves, glow intensities as needed.

**Step 4: Commit fixes**

```bash
git add -A && git commit -m "fix(website): tune launch animation timings and effects"
```

---

## Task 5: Deploy

**Step 1: Deploy to Vercel**

```bash
cd apps/website && vercel --prod --yes
```

**Step 2: Verify on production**

Open https://eternity-wallet.vercel.app, click "Launch App", verify animation plays correctly.

**Step 3: Commit if any final fixes needed**
