# Crystal Holographic Landing Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the E-Y website landing page into a holographic crystal experience where content lives on individual crystal faces with HUD-style interactive elements.

**Architecture:** Single `CrystalLanding.tsx` orchestrator + 7 section components in `hud/sections/`. Three.js crystal mesh controlled via ref with camera dolly (z-position) for face zoom. HTML content overlaid at z-index 2 with CSS `clip-path` for triangular masking. Shared HUD utility components (typewriter text, scan-line, glow containers) in `hud/` directory.

**Tech Stack:** React 18, Three.js + @react-three/fiber + drei, Framer Motion, Tailwind CSS, Next.js (client-only via `ssr: false` dynamic import)

**Design doc:** `docs/plans/2026-02-17-crystal-holographic-landing-design.md`

---

## File Map

All paths relative to `apps/website/src/`:

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `app/globals.css` | Add HUD CSS classes (glow, scan-line, grid) |
| Modify | `components/CrystalLanding.tsx` | Rewrite orchestrator: new CrystalCtrl, transition, face routing |
| Create | `components/hud/TriangleContainer.tsx` | Triangular clip-path wrapper for face content |
| Create | `components/hud/HudText.tsx` | Typewriter text, glow title, count-up number |
| Create | `components/hud/HudCard.tsx` | Diamond/hex shaped card with glow border |
| Create | `components/hud/ScanLine.tsx` | Scan-line sweep effect on section enter |
| Create | `components/hud/sections/HeroSection.tsx` | Section 0: full crystal, title + CTA |
| Create | `components/hud/sections/ProblemSection.tsx` | Section 1: top face, 3 data blocks |
| Create | `components/hud/sections/SolutionSection.tsx` | Section 2: bottom face, 4 diamond blocks |
| Create | `components/hud/sections/FeaturesSection.tsx` | Section 3: top face, 3 mini-demos |
| Create | `components/hud/sections/BusinessSection.tsx` | Section 4: bottom face, orbiting data |
| Create | `components/hud/sections/RoadmapSection.tsx` | Section 5: top face, energy path timeline |
| Create | `components/hud/sections/CtaSection.tsx` | Section 6: full crystal, waitlist form |

---

## Task 1: HUD CSS System

Add holographic CSS classes to `globals.css`. These are used by all HUD components.

**Files:**
- Modify: `apps/website/src/app/globals.css` (append after existing content)

**Step 1: Add HUD CSS classes**

Append to `globals.css`:

```css
/* ===== Holographic HUD System ===== */

/* Glow text — cyan/blue text-shadow for titles */
.hud-glow {
  text-shadow:
    0 0 10px rgba(0, 229, 255, 0.5),
    0 0 30px rgba(51, 136, 255, 0.3),
    0 0 60px rgba(0, 229, 255, 0.15);
}

.dark .hud-glow {
  text-shadow:
    0 0 10px rgba(0, 229, 255, 0.7),
    0 0 40px rgba(51, 136, 255, 0.4),
    0 0 80px rgba(0, 229, 255, 0.2);
}

/* Subtle glow for body text */
.hud-glow-subtle {
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.2);
}

.dark .hud-glow-subtle {
  text-shadow: 0 0 12px rgba(0, 229, 255, 0.3);
}

/* Scan-line sweep keyframe — horizontal light bar */
@keyframes scanline {
  0% { transform: translateY(-100%); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(100vh); opacity: 0; }
}

.hud-scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent-cyan), transparent);
  box-shadow: 0 0 15px var(--accent-cyan), 0 0 30px var(--accent-blue);
  animation: scanline 1s ease-out forwards;
  pointer-events: none;
  z-index: 10;
}

/* Pulse border — animated glow border on cards */
@keyframes pulse-border {
  0%, 100% { border-color: rgba(0, 229, 255, 0.3); box-shadow: 0 0 8px rgba(0, 229, 255, 0.1); }
  50% { border-color: rgba(51, 136, 255, 0.6); box-shadow: 0 0 20px rgba(51, 136, 255, 0.2); }
}

.hud-pulse-border {
  border: 1px solid rgba(0, 229, 255, 0.3);
  animation: pulse-border 3s ease-in-out infinite;
}

/* Grid overlay for face surface */
.hud-grid {
  background-image:
    linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.03) 1px, transparent 1px);
  background-size: 30px 30px;
}

.dark .hud-grid {
  background-image:
    linear-gradient(rgba(0, 229, 255, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 229, 255, 0.06) 1px, transparent 1px);
  background-size: 30px 30px;
}

/* Diamond shape clip */
.clip-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

/* Hex badge */
.clip-hex {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

/* Triangle clips for crystal faces */
.clip-triangle-up {
  clip-path: polygon(50% 5%, 2% 98%, 98% 98%);
}

.clip-triangle-down {
  clip-path: polygon(2% 2%, 98% 2%, 50% 95%);
}

/* Typewriter cursor blink */
@keyframes blink-cursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hud-cursor {
  display: inline-block;
  width: 2px;
  height: 1.1em;
  background: var(--accent-cyan);
  margin-left: 2px;
  animation: blink-cursor 0.8s step-end infinite;
  vertical-align: text-bottom;
}

/* Hex character scramble — monospace for data */
.hud-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;
  letter-spacing: 0.05em;
}

/* Hover scan sweep on element */
@keyframes hover-scan {
  0% { left: -100%; }
  100% { left: 100%; }
}

.hud-hover-scan {
  position: relative;
  overflow: hidden;
}

.hud-hover-scan::after {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.1), transparent);
  pointer-events: none;
}

.hud-hover-scan:hover::after {
  animation: hover-scan 0.6s ease-out forwards;
}
```

**Step 2: Verify styles load**

Run: `cd apps/website && pnpm dev`
Open browser, confirm page loads without CSS errors.

**Step 3: Commit**

```bash
git add apps/website/src/app/globals.css
git commit -m "feat(website): add holographic HUD CSS system"
```

---

## Task 2: HUD Utility Components

Create the reusable building blocks: typewriter text, count-up numbers, glow titles, diamond cards, scan-line effect.

**Files:**
- Create: `apps/website/src/components/hud/HudText.tsx`
- Create: `apps/website/src/components/hud/HudCard.tsx`
- Create: `apps/website/src/components/hud/ScanLine.tsx`

### Step 1: Create HudText.tsx

Three text components: `GlowTitle` (large title with glow), `TypewriterText` (character-by-character reveal), `CountUp` (animated number counter).

```tsx
// @ts-nocheck
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/* ---- Glow Title ---- */
interface GlowTitleProps {
  children: string
  className?: string
  delay?: number
  visible?: boolean
}

export function GlowTitle({ children, className = '', delay = 0, visible = true }: GlowTitleProps) {
  return (
    <motion.h2
      className={`hud-glow font-bold ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.h2>
  )
}

/* ---- Typewriter Text ---- */
interface TypewriterProps {
  text: string
  className?: string
  speed?: number
  delay?: number
  visible?: boolean
  onComplete?: () => void
}

export function TypewriterText({ text, className = '', speed = 40, delay = 0, visible = true, onComplete }: TypewriterProps) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (!visible) { setDisplayed(''); setStarted(false); return }
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [visible, delay])

  useEffect(() => {
    if (!started) return
    if (displayed.length >= text.length) { onComplete?.(); return }
    const timer = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), speed)
    return () => clearTimeout(timer)
  }, [started, displayed, text, speed, onComplete])

  return (
    <span className={`hud-glow-subtle ${className}`}>
      {displayed}
      {started && displayed.length < text.length && <span className="hud-cursor" />}
    </span>
  )
}

/* ---- Count-Up Number ---- */
interface CountUpProps {
  target: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
  delay?: number
  visible?: boolean
  separator?: boolean
}

export function CountUp({ target, duration = 1500, prefix = '', suffix = '', className = '', delay = 0, visible = true, separator = true }: CountUpProps) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!visible) { setValue(0); return }
    const startTime = performance.now() + delay
    const animate = (now: number) => {
      const elapsed = now - startTime
      if (elapsed < 0) { frameRef.current = requestAnimationFrame(animate); return }
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [visible, target, duration, delay])

  const formatted = separator ? value.toLocaleString() : String(value)

  return (
    <span className={`hud-mono ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

/* ---- Hex Scramble (for addresses) ---- */
interface HexScrambleProps {
  text: string
  className?: string
  visible?: boolean
  scrambleDuration?: number
}

const HEX_CHARS = '0123456789abcdef'

export function HexScramble({ text, className = '', visible = true, scrambleDuration = 2000 }: HexScrambleProps) {
  const [displayed, setDisplayed] = useState(text)
  const frameRef = useRef<number>(0)

  useEffect(() => {
    if (!visible) { setDisplayed(text); return }
    const startTime = performance.now()
    const chars = text.split('')

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / scrambleDuration, 1)
      const settled = Math.floor(progress * chars.length)

      const result = chars.map((ch, i) => {
        if (i < settled) return ch
        if (ch === 'x' || ch === '.' || ch === '0' && i < 2) return ch
        return HEX_CHARS[Math.floor(Math.random() * 16)]
      })

      setDisplayed(result.join(''))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [visible, text, scrambleDuration])

  return <span className={`hud-mono ${className}`}>{displayed}</span>
}
```

### Step 2: Create HudCard.tsx

Diamond-shaped interactive card with glow border, hover scan effect, expandable content.

```tsx
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
```

### Step 3: Create ScanLine.tsx

Horizontal light sweep triggered on section enter.

```tsx
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
```

### Step 4: Verify components build

Run: `cd apps/website && pnpm build`
Expected: build succeeds (components are not imported yet, so they won't be tree-shaken in but should have no syntax errors).

### Step 5: Commit

```bash
git add apps/website/src/components/hud/
git commit -m "feat(website): add HUD utility components (text, card, scanline)"
```

---

## Task 3: Triangle Container Component

The key layout component that clips content to a triangular shape matching the crystal face orientation.

**Files:**
- Create: `apps/website/src/components/hud/TriangleContainer.tsx`

### Step 1: Create TriangleContainer.tsx

```tsx
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
 * - 'top' (▲): vertex at top-center, wide base at bottom
 * - 'bottom' (▼): wide top, vertex at bottom-center
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
```

### Step 2: Commit

```bash
git add apps/website/src/components/hud/TriangleContainer.tsx
git commit -m "feat(website): add triangular content container for crystal faces"
```

---

## Task 4: Section Components — Hero & CTA

The two "full crystal" sections. Simpler content, no triangular clipping.

**Files:**
- Create: `apps/website/src/components/hud/sections/HeroSection.tsx`
- Create: `apps/website/src/components/hud/sections/CtaSection.tsx`

### Step 1: Create HeroSection.tsx

```tsx
// @ts-nocheck
'use client'

import { motion } from 'framer-motion'
import { GlowTitle, TypewriterText } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'
import { Button } from '@/components/ui/Button'

interface HeroSectionProps {
  visible: boolean
  onLaunch: () => void
}

export function HeroSection({ visible, onLaunch }: HeroSectionProps) {
  return (
    <TriangleContainer face="full" visible={visible}>
      <ScanLine visible={visible} delay={0.2} />

      <motion.p
        className="text-xs font-medium tracking-[0.3em] uppercase mb-3 hud-glow-subtle"
        style={{ color: 'var(--accent-cyan)' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.1 }}
      >
        WELCOME
      </motion.p>

      <GlowTitle className="text-3xl sm:text-4xl lg:text-6xl mb-4 leading-tight" delay={0.15} visible={visible}>
        The AI-Native Crypto Wallet
      </GlowTitle>

      <motion.div
        className="text-base sm:text-lg lg:text-xl mb-6"
        style={{ color: 'var(--foreground-muted)' }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ delay: 0.3 }}
      >
        <TypewriterText text="Send crypto like a text message" delay={400} visible={visible} />
      </motion.div>

      <motion.div
        animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 10 }}
        transition={{ delay: 0.6 }}
      >
        <Button variant="primary" size="lg" onClick={onLaunch} className="hud-pulse-border">
          Launch App
        </Button>
      </motion.div>

      <motion.div
        className="mt-8 flex flex-col items-center gap-1"
        animate={{ opacity: visible ? 0.6 : 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[10px] tracking-widest uppercase" style={{ color: 'var(--foreground-light)' }}>
          Scroll to explore
        </span>
        <motion.svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: 'var(--foreground-light)' }}
          animate={{ y: [0, 4, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </motion.svg>
      </motion.div>
    </TriangleContainer>
  )
}
```

### Step 2: Create CtaSection.tsx

```tsx
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
```

### Step 3: Commit

```bash
git add apps/website/src/components/hud/sections/HeroSection.tsx apps/website/src/components/hud/sections/CtaSection.tsx
git commit -m "feat(website): add Hero and CTA holographic sections"
```

---

## Task 5: Section Components — Problem & Solution

The first pair of face-zoom sections (top ▲ and bottom ▼).

**Files:**
- Create: `apps/website/src/components/hud/sections/ProblemSection.tsx`
- Create: `apps/website/src/components/hud/sections/SolutionSection.tsx`

### Step 1: Create ProblemSection.tsx

Top face ▲. Three interactive data blocks: hex address scramble, network dropdown, gap counter.

```tsx
// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, HexScramble, CountUp } from '../HudText'
import { HudCard } from '../HudCard'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface ProblemSectionProps {
  visible: boolean
}

const NETWORKS = ['Mainnet', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'zkSync', 'Avalanche', 'BSC']

export function ProblemSection({ visible }: ProblemSectionProps) {
  const [expandedNetwork, setExpandedNetwork] = useState(3)

  return (
    <TriangleContainer face="top" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Tag at vertex (narrow top) */}
      <div className="text-center mb-2">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase hud-glow-subtle"
          style={{ color: 'var(--accent-cyan)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          THE PROBLEM
        </motion.p>
      </div>

      {/* Title in center */}
      <div className="text-center flex-1 flex flex-col justify-center">
        <GlowTitle className="text-2xl sm:text-3xl lg:text-5xl mb-2" delay={0.2} visible={visible}>
          Built for Machines
        </GlowTitle>
        <motion.p
          className="text-xs sm:text-sm mb-4 hud-glow-subtle"
          style={{ color: 'var(--foreground-muted)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          Complex addresses, gas fees, network selection — every step is a mistake waiting to happen.
        </motion.p>
      </div>

      {/* 3 data blocks at base (wide bottom) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* Address block */}
        <HudCard
          label="Address"
          delay={0.35}
          visible={visible}
          expandContent="One wrong character = funds lost forever"
        >
          <div className="text-xs sm:text-sm text-[var(--accent-cyan)] truncate">
            <HexScramble text="0x7f3a8B2c..." visible={visible} scrambleDuration={2500} />
          </div>
        </HudCard>

        {/* Network block */}
        <HudCard
          label="Network"
          delay={0.45}
          visible={visible}
          expandContent="Which one is right?"
        >
          <div className="space-y-0.5 max-h-16 overflow-hidden">
            {NETWORKS.slice(0, expandedNetwork).map((net, i) => (
              <motion.div
                key={net}
                className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded"
                style={{ background: i === 0 ? 'rgba(0, 229, 255, 0.1)' : 'transparent', color: 'var(--foreground-muted)' }}
                initial={{ opacity: 0, height: 0 }}
                animate={visible ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
              >
                {net}
              </motion.div>
            ))}
          </div>
        </HudCard>

        {/* Gap counter */}
        <HudCard
          label="The Gap"
          delay={0.55}
          visible={visible}
          expandContent="The gap is experience"
        >
          <div className="text-[10px] sm:text-xs space-y-1">
            <div style={{ color: 'var(--foreground)' }}>
              <CountUp target={8000000000} suffix="" visible={visible} delay={600} duration={2000} />
              <span className="block text-[8px]" style={{ color: 'var(--foreground-muted)' }}>humans</span>
            </div>
            <div style={{ color: 'var(--accent-cyan)' }}>
              ~<CountUp target={500000000} visible={visible} delay={800} duration={2000} />
              <span className="block text-[8px]" style={{ color: 'var(--foreground-muted)' }}>crypto users</span>
            </div>
          </div>
        </HudCard>
      </div>
    </TriangleContainer>
  )
}
```

### Step 2: Create SolutionSection.tsx

Bottom face ▼. Four diamond-shaped feature blocks.

```tsx
// @ts-nocheck
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, TypewriterText } from '../HudText'
import { HudCard } from '../HudCard'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface SolutionSectionProps {
  visible: boolean
}

function BlikCode({ visible }: { visible: boolean }) {
  const [code, setCode] = useState('847291')
  const [timeLeft, setTimeLeft] = useState(120)

  useEffect(() => {
    if (!visible) return
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setCode(String(Math.floor(100000 + Math.random() * 900000))); return 120 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [visible])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="text-center">
      <div className="text-lg sm:text-xl font-bold hud-mono tracking-[0.3em]" style={{ color: 'var(--accent-cyan)' }}>
        {code}
      </div>
      <div className="text-[9px] hud-mono mt-1" style={{ color: 'var(--foreground-muted)' }}>
        {mins}:{String(secs).padStart(2, '0')}
      </div>
    </div>
  )
}

export function SolutionSection({ visible }: SolutionSectionProps) {
  return (
    <TriangleContainer face="bottom" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Title at top (wide part of bottom triangle) */}
      <div className="text-center mb-3">
        <GlowTitle className="text-2xl sm:text-3xl lg:text-4xl mb-1" delay={0.1} visible={visible}>
          AI-Native by Design
        </GlowTitle>
        <motion.p
          className="text-xs sm:text-sm hud-glow-subtle"
          style={{ color: 'var(--foreground-muted)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.2 }}
        >
          Intelligence built into every layer
        </motion.p>
      </div>

      {/* 4 diamond blocks */}
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full max-w-2xl mx-auto">
          <HudCard label="BLIK Code" delay={0.3} visible={visible} expandContent="6-digit code, 2-minute window. Like bank transfers, but for crypto.">
            <BlikCode visible={visible} />
          </HudCard>

          <HudCard label="@username" delay={0.4} visible={visible} expandContent="Send by nickname. No addresses needed.">
            <div className="text-sm hud-mono" style={{ color: 'var(--accent-cyan)' }}>
              @alex<span className="hud-cursor" />
            </div>
          </HudCard>

          <HudCard label="Networks" delay={0.5} visible={visible} expandContent="See USDC, not 'USDC (Polygon)'. We handle routing.">
            <div className="text-xs" style={{ color: 'var(--foreground)' }}>
              See <span className="hud-mono" style={{ color: 'var(--accent-cyan)' }}>USDC</span>
              <br />
              <span className="text-[10px] line-through" style={{ color: 'var(--foreground-light)' }}>not USDC (Polygon)</span>
            </div>
          </HudCard>

          <HudCard label="AI Agent" delay={0.6} visible={visible} expandContent="Natural language commands. 'Send 0.01 ETH to @alex' — done.">
            <div className="text-[11px] hud-mono" style={{ color: 'var(--foreground-muted)' }}>
              <span style={{ color: 'var(--accent-cyan)' }}>&gt;</span>{' '}
              <TypewriterText text="Send 0.01 ETH to @alex" speed={60} delay={800} visible={visible} />
            </div>
          </HudCard>
        </div>
      </div>

      {/* Narrow vertex bottom — empty, or subtle glow */}
    </TriangleContainer>
  )
}
```

### Step 3: Commit

```bash
git add apps/website/src/components/hud/sections/ProblemSection.tsx apps/website/src/components/hud/sections/SolutionSection.tsx
git commit -m "feat(website): add Problem and Solution holographic sections"
```

---

## Task 6: Section Components — Features & Business

**Files:**
- Create: `apps/website/src/components/hud/sections/FeaturesSection.tsx`
- Create: `apps/website/src/components/hud/sections/BusinessSection.tsx`

### Step 1: Create FeaturesSection.tsx

Top face ▲. Three mini-demos: BLIK live code, AI command input, balance dashboard.

```tsx
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
```

### Step 2: Create BusinessSection.tsx

Bottom face ▼. Treasury counter, shareholders, governance display.

```tsx
// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GlowTitle, CountUp } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface BusinessSectionProps {
  visible: boolean
}

const SHAREHOLDERS = [
  { name: '@daniel', share: 50, color: '#3388FF' },
  { name: '@alex', share: 30, color: '#00E5FF' },
  { name: '@maria', share: 20, color: '#22C55E' },
]

const PROPOSALS = [
  { title: 'Hire Developer', votes: { for: 2, against: 0 }, status: 'active' },
  { title: 'Marketing Budget', votes: { for: 1, against: 1 }, status: 'active' },
  { title: 'New Product Line', votes: { for: 0, against: 0 }, status: 'pending' },
]

export function BusinessSection({ visible }: BusinessSectionProps) {
  const [hoveredShareholder, setHoveredShareholder] = useState<number | null>(null)

  return (
    <TriangleContainer face="bottom" visible={visible}>
      <ScanLine visible={visible} delay={0.1} />

      {/* Title at top (wide) */}
      <div className="text-center mb-3">
        <motion.p
          className="text-[10px] sm:text-xs font-medium tracking-[0.3em] uppercase mb-1"
          style={{ color: '#22C55E' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.1 }}
        >
          NEW FEATURE
        </motion.p>
        <GlowTitle className="text-2xl sm:text-3xl lg:text-4xl" delay={0.15} visible={visible}>
          Your Business, On-Chain
        </GlowTitle>
      </div>

      {/* Content grid */}
      <div className="flex-1 grid grid-cols-3 gap-2 sm:gap-3 max-w-2xl mx-auto w-full">
        {/* Treasury */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3 text-center flex flex-col justify-center"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Treasury</div>
          <div className="text-xl sm:text-2xl font-bold hud-mono hud-glow" style={{ color: 'var(--foreground)' }}>
            <CountUp target={250} prefix="" suffix="" visible={visible} delay={400} duration={1500} separator={false} />
          </div>
          <div className="text-[10px] hud-mono" style={{ color: 'var(--accent-cyan)' }}>ETH</div>
        </motion.div>

        {/* Shareholders */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Shareholders</div>
          <div className="space-y-1.5">
            {SHAREHOLDERS.map((sh, i) => (
              <div
                key={sh.name}
                className="relative cursor-default"
                onMouseEnter={() => setHoveredShareholder(i)}
                onMouseLeave={() => setHoveredShareholder(null)}
              >
                <div className="flex items-center justify-between text-[10px] sm:text-xs">
                  <span className="hud-mono" style={{ color: sh.color }}>{sh.name}</span>
                  <span className="hud-mono" style={{ color: 'var(--foreground-muted)' }}>{sh.share}%</span>
                </div>
                {/* Share bar */}
                <div className="h-1 mt-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: sh.color }}
                    initial={{ width: 0 }}
                    animate={visible ? { width: `${sh.share}%` } : { width: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.8 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Governance */}
        <motion.div
          className="hud-pulse-border hud-grid rounded-lg p-3"
          style={{ background: 'rgba(0, 229, 255, 0.03)' }}
          animate={{ opacity: visible ? 1 : 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="text-[9px] uppercase tracking-widest mb-2 hud-glow-subtle" style={{ color: 'var(--accent-cyan)' }}>Governance</div>
          <div className="space-y-1.5">
            {PROPOSALS.map((p, i) => (
              <div key={p.title} className="text-[10px]">
                <div className="flex items-center gap-1 mb-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: p.status === 'active' ? '#22C55E' : 'var(--foreground-light)' }}
                  />
                  <span className="truncate" style={{ color: 'var(--foreground)' }}>{p.title}</span>
                </div>
                <div className="flex gap-1">
                  <div className="flex items-center gap-0.5 text-[8px] hud-mono" style={{ color: '#22C55E' }}>
                    ▲{p.votes.for}
                  </div>
                  <div className="flex items-center gap-0.5 text-[8px] hud-mono" style={{ color: '#EF4444' }}>
                    ▼{p.votes.against}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </TriangleContainer>
  )
}
```

### Step 3: Commit

```bash
git add apps/website/src/components/hud/sections/FeaturesSection.tsx apps/website/src/components/hud/sections/BusinessSection.tsx
git commit -m "feat(website): add Features and Business holographic sections"
```

---

## Task 7: Section Component — Roadmap

**Files:**
- Create: `apps/website/src/components/hud/sections/RoadmapSection.tsx`

### Step 1: Create RoadmapSection.tsx

Top face ▲. Energy path from vertex to base with 4 diamond milestone nodes.

```tsx
// @ts-nocheck
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlowTitle } from '../HudText'
import { TriangleContainer } from '../TriangleContainer'
import { ScanLine } from '../ScanLine'

interface RoadmapSectionProps {
  visible: boolean
}

const MILESTONES = [
  {
    quarter: 'Q1 2026',
    title: 'MVP + AI Agent',
    current: true,
    items: ['AI-powered transactions', 'BLIK codes', '@username sends', 'Multi-wallet support'],
  },
  {
    quarter: 'Q2 2026',
    title: 'Expansion',
    current: false,
    items: ['Multi-chain support', 'Fiat on-ramp', 'Business wallets v2', 'Mobile app launch'],
  },
  {
    quarter: 'Q3 2026',
    title: 'Identity',
    current: false,
    items: ['SHARD identity system', 'Reputation scores', 'Social recovery', 'ENS integration'],
  },
  {
    quarter: 'Q4 2026',
    title: 'Scale',
    current: false,
    items: ['DEX aggregation', 'Cross-chain bridges', 'Enterprise features', 'Governance token'],
  },
]

export function RoadmapSection({ visible }: RoadmapSectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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
          ROADMAP
        </motion.p>
      </div>

      {/* Energy path with milestones */}
      <div className="flex-1 flex flex-col items-center justify-center relative max-w-sm mx-auto w-full">
        {MILESTONES.map((milestone, i) => {
          const isHovered = hoveredIndex === i

          return (
            <div key={milestone.quarter} className="w-full relative">
              {/* Path line between nodes */}
              {i < MILESTONES.length - 1 && (
                <div className="absolute left-1/2 top-full w-px h-4 sm:h-6 -translate-x-1/2 z-0">
                  <motion.div
                    className="w-full h-full"
                    style={{
                      background: milestone.current
                        ? 'linear-gradient(to bottom, var(--accent-cyan), rgba(0, 229, 255, 0.2))'
                        : 'repeating-linear-gradient(to bottom, var(--foreground-light) 0px, var(--foreground-light) 3px, transparent 3px, transparent 7px)',
                    }}
                    initial={{ scaleY: 0 }}
                    animate={visible ? { scaleY: 1 } : { scaleY: 0 }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
                    style2={{ transformOrigin: 'top' }}
                  />
                </div>
              )}

              {/* Milestone node */}
              <motion.div
                className="relative z-10 flex items-center gap-3 py-2 px-3 rounded-lg cursor-default hud-hover-scan"
                style={{
                  background: isHovered ? 'rgba(0, 229, 255, 0.06)' : 'transparent',
                }}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                initial={{ opacity: 0, x: -20 }}
                animate={visible ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                transition={{ delay: 0.2 + i * 0.15 }}
              >
                {/* Diamond indicator */}
                <div className="flex-shrink-0">
                  <motion.div
                    className="w-4 h-4 clip-diamond"
                    style={{
                      background: milestone.current ? 'var(--accent-cyan)' : 'var(--foreground-light)',
                      boxShadow: milestone.current ? '0 0 12px rgba(0, 229, 255, 0.5)' : 'none',
                    }}
                    animate={milestone.current ? { scale: [1, 1.2, 1] } : {}}
                    transition={milestone.current ? { duration: 2, repeat: Infinity } : {}}
                  />
                </div>

                {/* Quarter + title */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] hud-mono uppercase tracking-widest" style={{ color: milestone.current ? 'var(--accent-cyan)' : 'var(--foreground-light)' }}>
                    {milestone.quarter}
                  </div>
                  <div className="text-sm font-medium" style={{ color: milestone.current ? 'var(--foreground)' : 'var(--foreground-muted)' }}>
                    {milestone.title}
                  </div>
                </div>

                {/* Status */}
                {milestone.current && (
                  <span className="text-[8px] px-2 py-0.5 rounded-full hud-mono" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22C55E' }}>
                    NOW
                  </span>
                )}
              </motion.div>

              {/* Expanded sub-items on hover */}
              <AnimatePresence>
                {isHovered && (
                  <motion.div
                    className="pl-10 pr-3 overflow-hidden"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="py-1 space-y-0.5">
                      {milestone.items.map((item, j) => (
                        <motion.div
                          key={item}
                          className="text-[10px] flex items-center gap-1.5"
                          style={{ color: 'var(--foreground-muted)' }}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: j * 0.05 }}
                        >
                          <span className="w-1 h-1 rounded-full" style={{ background: 'var(--accent-cyan)' }} />
                          {item}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </TriangleContainer>
  )
}
```

### Step 2: Commit

```bash
git add apps/website/src/components/hud/sections/RoadmapSection.tsx
git commit -m "feat(website): add Roadmap holographic section with energy path"
```

---

## Task 8: Rewrite CrystalLanding.tsx — Crystal Controller & Transitions

The core orchestration rewrite. Updates the `CrystalCtrl` interface to support camera dolly (z-position for zoom), face-specific camera positioning, and the new 5-phase transition sequence. Routes active section to the correct section component.

**Files:**
- Modify: `apps/website/src/components/CrystalLanding.tsx` (full rewrite)

### Step 1: Rewrite CrystalLanding.tsx

Replace the entire file content. Key changes:
1. `CrystalCtrl` now includes `cameraZ` and `rotationX` for face-targeting
2. `Crystal` component reads `cameraZ` for dolly zoom
3. `navigateTo` implements 5-phase transition (fade out → pull back → rotate → push in → fade in)
4. Section rendering uses face-specific components instead of generic `SlideContent`
5. Face mapping: Hero/CTA = full crystal, odd sections = top face, even sections = bottom face

```tsx
// @ts-nocheck
'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import Image from 'next/image'
import Link from 'next/link'
import * as THREE from 'three'
import { Button } from '@/components/ui/Button'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useWarp } from '@/components/animations/WarpTransition'
import { useTheme } from '@/context/ThemeContext'
import { createHeptagonalCrystal } from '@/components/3d/Shard'

// Section components
import { HeroSection } from '@/components/hud/sections/HeroSection'
import { ProblemSection } from '@/components/hud/sections/ProblemSection'
import { SolutionSection } from '@/components/hud/sections/SolutionSection'
import { FeaturesSection } from '@/components/hud/sections/FeaturesSection'
import { BusinessSection } from '@/components/hud/sections/BusinessSection'
import { RoadmapSection } from '@/components/hud/sections/RoadmapSection'
import { CtaSection } from '@/components/hud/sections/CtaSection'

/* ---------------------------------------------------------- */
/*  Constants                                                  */
/* ---------------------------------------------------------- */

const SECTIONS = 7
const ROTATION_PER_FACE = (Math.PI * 2) / SECTIONS
const TRANSITION_MS = 1100
const WHEEL_THRESHOLD = 30

/** Face configuration per section */
interface FaceConfig {
  type: 'full' | 'top' | 'bottom'
  cameraZ: number      // camera z-position (closer = more zoom)
  rotationX: number    // tilt crystal to show top or bottom face
}

const FACE_MAP: FaceConfig[] = [
  { type: 'full',   cameraZ: 8,   rotationX: 0 },        // 0: Hero
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 1: Problem — tilt forward to show top face
  { type: 'bottom', cameraZ: 4.5, rotationX: 0.4 },      // 2: Solution — tilt back to show bottom face
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 3: Features
  { type: 'bottom', cameraZ: 4.5, rotationX: 0.4 },      // 4: Business
  { type: 'top',    cameraZ: 4.5, rotationX: -0.4 },     // 5: Roadmap
  { type: 'full',   cameraZ: 8,   rotationX: 0 },        // 6: CTA
]

const SECTION_LABELS = ['Home', 'Problem', 'Solution', 'Features', 'Business', 'Roadmap', 'Join Us']

/* ---------------------------------------------------------- */
/*  Helpers                                                    */
/* ---------------------------------------------------------- */

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - Math.min(1, t), 3)
}

/* ---------------------------------------------------------- */
/*  Three.js — Crystal mesh                                    */
/* ---------------------------------------------------------- */

interface CrystalCtrl {
  rotationY: number
  rotationX: number
  scale: number
  cameraZ: number
  entered: boolean
}

function Crystal({ ctrl, isDark }: { ctrl: React.MutableRefObject<CrystalCtrl>; isDark: boolean }) {
  const grp = useRef<THREE.Group>(null)
  const geo = useMemo(() => createHeptagonalCrystal(), [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 15), [geo])
  const { camera, viewport } = useThree()

  const cur = useRef({ rotY: 0, rotX: 0, scale: 0, z: -50, camZ: 8, entryT: 0 })
  const color = isDark ? '#FFFFFF' : '#000000'
  const accent = isDark ? '#3388FF' : '#0066FF'

  useFrame((state, delta) => {
    if (!grp.current) return
    const c = ctrl.current
    const t = state.clock.elapsedTime
    const s = cur.current
    const baseScale = Math.min(3.0, Math.max(1.3, viewport.width * 0.40))

    if (!c.entered) {
      s.entryT = Math.min(1, s.entryT + delta * 0.55)
      const e = easeOutCubic(s.entryT)
      s.z = lerp(-50, 0, e)
      s.scale = lerp(0, baseScale, e)
      s.rotY = e * Math.PI * 4

      grp.current.position.set(0, 0, s.z)
      grp.current.scale.setScalar(s.scale)
      grp.current.rotation.y = s.rotY
      grp.current.rotation.x = Math.sin(e * Math.PI) * 0.3

      if (s.entryT >= 1) {
        c.entered = true
        s.rotY = 0
        s.rotX = 0
        s.scale = baseScale
        s.camZ = c.cameraZ
      }
      return
    }

    // Target values from controller
    const tgtRotY = c.rotationY + state.mouse.x * 0.04
    const tgtRotX = c.rotationX + (-state.mouse.y * 0.02) + Math.sin(t * 0.3) * 0.01
    const tgtScale = c.scale * baseScale
    const tgtCamZ = c.cameraZ

    // Smooth interpolation
    s.rotY = lerp(s.rotY, tgtRotY, 0.07)
    s.rotX = lerp(s.rotX, tgtRotX, 0.06)
    s.scale = lerp(s.scale, tgtScale, 0.09)
    s.camZ = lerp(s.camZ, tgtCamZ, 0.06)

    grp.current.rotation.y = s.rotY
    grp.current.rotation.x = s.rotX
    grp.current.scale.setScalar(s.scale)
    grp.current.position.y = Math.sin(t * 0.5) * 0.04
    grp.current.position.z = 0

    // Camera dolly for zoom
    camera.position.z = s.camZ
  })

  return (
    <group ref={grp}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.92}
          roughness={0.04}
          transparent
          opacity={isDark ? 0.45 : 0.3}
          reflectivity={1}
          clearcoat={1}
          clearcoatRoughness={0.04}
          flatShading
          side={THREE.DoubleSide}
          envMapIntensity={2.5}
        />
      </mesh>
      <mesh geometry={geo} scale={1.02}>
        <meshPhysicalMaterial
          color={accent}
          metalness={0.3}
          roughness={0.5}
          transparent
          opacity={0.08}
          flatShading
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color={color} transparent opacity={isDark ? 0.5 : 0.35} />
      </lineSegments>
    </group>
  )
}

/* ---------------------------------------------------------- */
/*  Three.js — Particles                                       */
/* ---------------------------------------------------------- */

function Particles({ count = 50, isDark = false }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      a[i * 3] = (Math.random() - 0.5) * 25
      a[i * 3 + 1] = (Math.random() - 0.5) * 25
      a[i * 3 + 2] = (Math.random() - 0.5) * 12
    }
    return a
  }, [count])

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.006
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.012}
        color={isDark ? '#fff' : '#000'}
        transparent
        opacity={isDark ? 0.25 : 0.15}
        sizeAttenuation
      />
    </points>
  )
}

/* ---------------------------------------------------------- */
/*  Three.js — Canvas wrapper                                  */
/* ---------------------------------------------------------- */

function CrystalCanvas({ ctrl, isDark }: { ctrl: React.MutableRefObject<CrystalCtrl>; isDark: boolean }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={null}>
        <Environment preset={isDark ? 'night' : 'city'} />
        <ambientLight intensity={isDark ? 0.3 : 0.4} />
        <directionalLight position={[10, 10, 5]} intensity={isDark ? 0.8 : 1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.4} />
        <pointLight position={[0, 5, 3]} intensity={0.5} color={isDark ? '#3388FF' : '#0066FF'} />
        <Crystal ctrl={ctrl} isDark={isDark} />
        <Particles count={50} isDark={isDark} />
      </Suspense>
    </Canvas>
  )
}

/* ---------------------------------------------------------- */
/*  Sidebar (desktop)                                          */
/* ---------------------------------------------------------- */

function Sidebar({ activeIndex, onNavigate }: { activeIndex: number; onNavigate: (i: number) => void }) {
  return (
    <nav className="hidden lg:flex flex-col justify-center gap-1 fixed left-0 top-0 bottom-0 w-48 pl-6 z-20">
      {SECTION_LABELS.map((label, i) => {
        const active = i === activeIndex
        const past = i < activeIndex
        return (
          <motion.button
            key={label}
            onClick={() => onNavigate(i)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer"
            style={{ background: active ? 'var(--foreground)' : 'transparent' }}
            whileHover={!active ? { x: 4 } : undefined}
            transition={{ duration: 0.2 }}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300"
              style={{ background: active ? 'var(--background)' : past ? 'var(--foreground)' : 'var(--border)' }}
            />
            <span
              className="text-sm font-medium transition-colors duration-300"
              style={{ color: active ? 'var(--background)' : past ? 'var(--foreground)' : 'var(--foreground-muted)' }}
            >
              {label}
            </span>
          </motion.button>
        )
      })}
    </nav>
  )
}

/* ---------------------------------------------------------- */
/*  Dot nav (mobile)                                           */
/* ---------------------------------------------------------- */

function DotNav({ activeIndex, onNavigate }: { activeIndex: number; onNavigate: (i: number) => void }) {
  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full glass">
      {SECTION_LABELS.map((_, i) => (
        <button key={i} onClick={() => onNavigate(i)} className="p-1">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ background: i === activeIndex ? 'var(--foreground)' : 'var(--border)' }}
            animate={i === activeIndex ? { scale: [1, 1.3, 1] } : { scale: 1 }}
            transition={i === activeIndex ? { duration: 1.5, repeat: Infinity } : {}}
          />
        </button>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Progress bar                                               */
/* ---------------------------------------------------------- */

function SlideProgress({ activeIndex }: { activeIndex: number }) {
  const pct = ((activeIndex + 1) / SECTIONS) * 100
  return (
    <div className="fixed bottom-0 left-0 right-0 h-[2px] z-50" style={{ background: 'var(--border-light)' }}>
      <motion.div
        className="h-full"
        style={{ background: 'linear-gradient(90deg, var(--accent-blue), var(--accent-cyan))' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ---------------------------------------------------------- */
/*  Section router                                             */
/* ---------------------------------------------------------- */

function SectionContent({ index, visible }: { index: number; visible: boolean }) {
  const { startWarp } = useWarp()

  switch (index) {
    case 0: return <HeroSection visible={visible} onLaunch={startWarp} />
    case 1: return <ProblemSection visible={visible} />
    case 2: return <SolutionSection visible={visible} />
    case 3: return <FeaturesSection visible={visible} />
    case 4: return <BusinessSection visible={visible} />
    case 5: return <RoadmapSection visible={visible} />
    case 6: return <CtaSection visible={visible} />
    default: return null
  }
}

/* ---------------------------------------------------------- */
/*  Main component                                             */
/* ---------------------------------------------------------- */

export function CrystalLanding() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [contentVisible, setContentVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const isTransitioning = useRef(false)
  const touchStartY = useRef(0)
  const { isDark } = useTheme()
  const { startWarp } = useWarp()

  const crystalCtrl = useRef<CrystalCtrl>({
    rotationY: 0,
    rotationX: 0,
    scale: 1,
    cameraZ: FACE_MAP[0].cameraZ,
    entered: false,
  })

  useEffect(() => { setMounted(true) }, [])

  // Show content after crystal entry animation (~2s)
  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 2100)
    return () => clearTimeout(timer)
  }, [])

  const navigateTo = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= SECTIONS) return
    if (isTransitioning.current || !crystalCtrl.current.entered) return
    isTransitioning.current = true

    const face = FACE_MAP[index]

    // Phase 1: Fade out content (0-200ms)
    setContentVisible(false)

    // Phase 2: Pull back crystal (200-400ms)
    setTimeout(() => {
      crystalCtrl.current.scale = 0.6
      crystalCtrl.current.cameraZ = 10
    }, 200)

    // Phase 3: Rotate to new face (400-800ms)
    setTimeout(() => {
      crystalCtrl.current.rotationY = -index * ROTATION_PER_FACE
      crystalCtrl.current.rotationX = face.rotationX
      setActiveIndex(index)
    }, 400)

    // Phase 4: Push in / zoom to face (800-1000ms)
    setTimeout(() => {
      crystalCtrl.current.scale = 1
      crystalCtrl.current.cameraZ = face.cameraZ
    }, 800)

    // Phase 5: Fade in content (800-1100ms)
    setTimeout(() => {
      setContentVisible(true)
    }, 850)

    setTimeout(() => { isTransitioning.current = false }, TRANSITION_MS)
  }, [activeIndex])

  // Wheel
  useEffect(() => {
    const h = (e: WheelEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') return
      e.preventDefault()
      if (isTransitioning.current || !crystalCtrl.current.entered) return
      if (Math.abs(e.deltaY) < WHEEL_THRESHOLD) return
      navigateTo(e.deltaY > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('wheel', h, { passive: false })
    return () => window.removeEventListener('wheel', h)
  }, [activeIndex, navigateTo])

  // Touch
  useEffect(() => {
    const start = (e: TouchEvent) => { touchStartY.current = e.touches[0].clientY }
    const end = (e: TouchEvent) => {
      const d = touchStartY.current - e.changedTouches[0].clientY
      if (Math.abs(d) < 50) return
      navigateTo(d > 0 ? activeIndex + 1 : activeIndex - 1)
    }
    window.addEventListener('touchstart', start, { passive: true })
    window.addEventListener('touchend', end, { passive: true })
    return () => { window.removeEventListener('touchstart', start); window.removeEventListener('touchend', end) }
  }, [activeIndex, navigateTo])

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); navigateTo(activeIndex + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); navigateTo(activeIndex - 1) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeIndex, navigateTo])

  // Determine content positioning based on face type
  const currentFace = FACE_MAP[activeIndex]
  const contentPosition = currentFace.type === 'top'
    ? 'items-start pt-4'
    : currentFace.type === 'bottom'
      ? 'items-end pb-4'
      : 'items-center'

  return (
    <div className="h-screen w-screen overflow-hidden relative" style={{ background: 'var(--background)' }}>
      {/* Crystal canvas */}
      {mounted && (
        <div className="absolute inset-0 z-[1]">
          <CrystalCanvas ctrl={crystalCtrl} isDark={isDark} />
        </div>
      )}

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={isDark ? '/images/logo_white.svg' : '/images/logo.svg'}
            alt="Eternity"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold" style={{ color: 'var(--foreground)' }}>Eternity</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button variant="primary" size="sm" onClick={startWarp} className="hidden sm:inline-flex">
            Launch App
          </Button>
        </div>
      </header>

      {/* Content overlay — positioned based on face type */}
      <div className={`absolute inset-0 z-[2] flex justify-center pointer-events-none ${contentPosition}`}>
        <div className="pointer-events-auto w-full max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <SectionContent index={activeIndex} visible={contentVisible} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Sidebar + nav */}
      <div className="transition-opacity duration-700" style={{ opacity: contentVisible ? 1 : 0 }}>
        <Sidebar activeIndex={activeIndex} onNavigate={navigateTo} />
        <DotNav activeIndex={activeIndex} onNavigate={navigateTo} />
        <SlideProgress activeIndex={activeIndex} />

        <div className="absolute bottom-4 right-6 z-40 hidden lg:block">
          <span className="text-xs font-mono hud-glow-subtle" style={{ color: 'var(--foreground-light)' }}>
            {String(activeIndex + 1).padStart(2, '0')} / {String(SECTIONS).padStart(2, '0')}
          </span>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Verify build

Run: `cd apps/website && pnpm build`
Expected: build succeeds.

### Step 3: Visual verification

Run: `cd apps/website && pnpm dev`
Open in browser:
- Scroll through all 7 sections
- Verify crystal zooms in for face sections (1-5) and stays distant for Hero/CTA (0, 6)
- Verify top-face sections (1, 3, 5) tilt crystal forward, bottom-face sections (2, 4) tilt back
- Verify content appears with holographic styling
- Verify interactive elements work (BLIK counter, AI demo, hover effects)
- Test mobile touch navigation
- Test keyboard navigation (arrow keys)

### Step 4: Commit

```bash
git add apps/website/src/components/CrystalLanding.tsx
git commit -m "feat(website): rewrite CrystalLanding with holographic HUD sections and face zoom"
```

---

## Task 9: Polish & Responsive Tweaks

Fine-tune spacing, font sizes, and triangle clip-path values for mobile vs desktop.

**Files:**
- Modify: `apps/website/src/components/hud/TriangleContainer.tsx` (responsive padding)
- Modify: various section files as needed for mobile text sizing

### Step 1: Adjust TriangleContainer padding for mobile

In `TriangleContainer.tsx`, add responsive padding that works on smaller screens where the triangle is tighter.

The triangle container uses percentage-based padding which naturally scales, but on very narrow screens (<640px), the vertex area becomes too narrow for content. Add a media query approach using Tailwind responsive classes or adjust the clip-path inset percentages.

Check the rendering on mobile viewport (375px wide) and adjust:
- If text overflows the triangle edges, increase padding percentages
- If content is too compressed, consider slightly relaxing the clip-path polygon values

### Step 2: Visual test on multiple viewports

Test at:
- Mobile: 375x812 (iPhone)
- Tablet: 768x1024 (iPad)
- Desktop: 1440x900

Ensure:
- All content stays within triangle boundaries
- Text is readable at all sizes
- Interactive elements (buttons, hover cards) are usable on touch
- Sidebar shows on desktop, dot nav on mobile

### Step 3: Commit

```bash
git add -A apps/website/src/components/hud/
git commit -m "fix(website): responsive adjustments for holographic crystal sections"
```

---

## Task 10: Build, Deploy, Verify

**Files:** No new files — build + deploy workflow.

### Step 1: Type-check

Run: `npx tsc --noEmit` from monorepo root.
Fix any TypeScript errors (files use `@ts-nocheck` but verify no import issues).

### Step 2: Build

Run: `cd apps/website && pnpm build`
Expected: build succeeds with no errors.

### Step 3: Commit any remaining changes

```bash
git add -A
git commit -m "chore(website): final build fixes for holographic landing"
```

### Step 4: Push

```bash
git push origin develop
```

### Step 5: Deploy

Run from `apps/website/`:
```bash
vercel --prod
```

Expected: deployment to https://eternity-wallet.vercel.app

### Step 6: Verify live

Open https://eternity-wallet.vercel.app and test:
- Crystal entry animation
- All 7 sections render correctly
- Scroll/touch/keyboard navigation
- Interactive elements (BLIK, AI input, hover cards)
- Mobile layout
- Dark/light theme toggle

---

## Summary of Commits

| # | Message |
|---|---------|
| 1 | `feat(website): add holographic HUD CSS system` |
| 2 | `feat(website): add HUD utility components (text, card, scanline)` |
| 3 | `feat(website): add triangular content container for crystal faces` |
| 4 | `feat(website): add Hero and CTA holographic sections` |
| 5 | `feat(website): add Problem and Solution holographic sections` |
| 6 | `feat(website): add Features and Business holographic sections` |
| 7 | `feat(website): add Roadmap holographic section with energy path` |
| 8 | `feat(website): rewrite CrystalLanding with holographic HUD sections and face zoom` |
| 9 | `fix(website): responsive adjustments for holographic crystal sections` |
| 10 | `chore(website): final build fixes for holographic landing` |
