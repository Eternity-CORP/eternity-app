# Premium Crystal Landing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign E-Y landing page with premium minimal aesthetic — one hero crystal, dot floor, Phantom-style scroll animations, phone-frame product demos.

**Architecture:** Replace scattered decorative elements with a single premium 3D crystal in hero section. Build a reusable ScrollReveal animation system for Phantom-style section entrances. Rewrite all 8 sections with new typography hierarchy and glass-card styling. Add phone-frame mockups for Solution and ComingSoon sections.

**Tech Stack:** Next.js 14, React Three Fiber, Three.js, Framer Motion, Tailwind CSS

**Design Doc:** `docs/plans/2026-02-18-landing-premium-crystal.md`

---

## Task 1: Design Tokens & Global CSS

**Files:**
- Modify: `apps/website/src/app/globals.css`

**Step 1: Replace design tokens**

Remove old theme toggle system (light/dark variables) and replace with dark-only premium tokens:

```css
:root {
  --bg: #000000;
  --text-primary: rgba(255,255,255, 1.0);
  --text-secondary: rgba(255,255,255, 0.7);
  --text-tertiary: rgba(255,255,255, 0.5);
  --text-quaternary: rgba(255,255,255, 0.3);
  --accent-blue: #3388FF;
  --accent-cyan: #00E5FF;
  --accent-red: #FF4444;
  --glass-bg: rgba(255,255,255, 0.03);
  --glass-border: rgba(255,255,255, 0.06);
  --glass-blur: 20px;
}
```

**Step 2: Add typography utility classes**

```css
.text-display { font-size: clamp(3rem, 6vw, 6rem); font-weight: 700; letter-spacing: -0.03em; line-height: 1.05; }
.text-heading { font-size: clamp(2.5rem, 4vw, 3.5rem); font-weight: 600; letter-spacing: -0.02em; line-height: 1.1; }
.text-body-lg { font-size: 1.25rem; font-weight: 400; line-height: 1.6; }
.text-body { font-size: 1rem; font-weight: 400; line-height: 1.6; }
.text-tag { font-size: 0.75rem; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; }
```

**Step 3: Add glass-card and background pattern**

```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  backdrop-filter: blur(var(--glass-blur));
}
.glass-card:hover {
  border-color: rgba(255,255,255, 0.12);
  transform: translateY(-4px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.bg-dots {
  background-image: radial-gradient(rgba(255,255,255, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

**Step 4: Remove old theme variables, .dark class, .light class, bg-grid**

Keep: `.text-gradient`, `.text-gradient-blue`, `.gradient-border`, `snap-*` utilities, `hide-scrollbar`, `.will-change-transform`, `.gpu-accelerated`, `prefers-reduced-motion` media query.

**Step 5: Verify build**

Run: `cd apps/website && npx next build`
Expected: Build succeeds (sections may look broken — that's fine, we're rewriting them)

**Step 6: Commit**

```
git add apps/website/src/app/globals.css
git commit -m "style(website): new premium dark design tokens + typography system"
```

---

## Task 2: ScrollReveal Animation System

**Files:**
- Create: `apps/website/src/components/animations/ScrollReveal.tsx`

**Step 1: Build the ScrollReveal component**

Replace the existing `SectionReveal` with a more flexible system supporting multiple entrance patterns:

```tsx
'use client'
import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

type RevealVariant = 'slide-up' | 'slide-left' | 'slide-right' | 'scale-up' | 'fade'

interface ScrollRevealProps {
  children: ReactNode
  variant?: RevealVariant
  delay?: number
  duration?: number
  className?: string
  once?: boolean
}

const variants = {
  'slide-up': { hidden: { y: 60, opacity: 0 }, visible: { y: 0, opacity: 1 } },
  'slide-left': { hidden: { x: 80, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  'slide-right': { hidden: { x: -80, opacity: 0 }, visible: { x: 0, opacity: 1 } },
  'scale-up': { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1 } },
  'fade': { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}

export function ScrollReveal({ children, variant = 'slide-up', delay = 0, duration = 0.7, className, once = true }: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants[variant]}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger container — wraps children that should animate sequentially
interface StaggerProps {
  children: ReactNode
  staggerDelay?: number
  className?: string
}

export function Stagger({ children, staggerDelay = 0.1, className }: StaggerProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, amount: 0.15 })

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: staggerDelay } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { y: 40, opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

**Step 2: Verify build**

Run: `cd apps/website && npx next build`

**Step 3: Commit**

```
git add apps/website/src/components/animations/ScrollReveal.tsx
git commit -m "feat(website): add ScrollReveal animation system (slide, scale, stagger)"
```

---

## Task 3: Crystal Gem Geometry

**Files:**
- Create: `apps/website/src/components/3d/CrystalGem.tsx`

**Step 1: Create the complex faceted crystal geometry**

Build a cathedral-cut gemstone using THREE.BufferGeometry with manually defined vertices and faces. The shape should have:
- 6-8 faceted panels on the upper crown (taller, pointed)
- 6-8 faceted panels on the lower pavilion (shorter)
- A girdle (widest point) roughly 40% from bottom
- Total ~24-32 triangular faces for rich light interaction with flatShading

Use the `MeshPhysicalMaterial` settings from the design doc. Add cursor tilt, slow rotation, float bob, and orbiting point light — all in `useFrame`.

**Step 2: Verify build**

Run: `cd apps/website && npx next build`

**Step 3: Commit**

```
git add apps/website/src/components/3d/CrystalGem.tsx
git commit -m "feat(website): add premium crystal gem with complex faceting"
```

---

## Task 4: Dot Floor

**Files:**
- Create: `apps/website/src/components/3d/DotFloor.tsx`

**Step 1: Create cursor-reactive particle floor**

50x50 grid of white points at y=-2.2. Use raycaster to project mouse onto floor plane. Points within radius 2.5 get displaced outward (XZ) and lifted (Y) with quadratic falloff. Ambient breathing wave: `sin(x * 0.3 + t * 0.3) * 0.04`. Color white, opacity 0.08.

Reference the DotFloor from the previous session (was in the git history) but simplify — hero-only behavior, no section-switching needed.

**Step 2: Verify build**

**Step 3: Commit**

```
git add apps/website/src/components/3d/DotFloor.tsx
git commit -m "feat(website): add cursor-reactive dot floor for hero section"
```

---

## Task 5: Hero Scene (Crystal + Dot Floor)

**Files:**
- Modify: `apps/website/src/components/3d/ShardScene.tsx` — full rewrite

**Step 1: Rewrite ShardScene to render single crystal + dot floor**

Replace the 8-shard scene with:
- One `CrystalGem` centered at origin
- One `DotFloor` below
- Lighting: ambient (0.3), directional from top-right, Environment preset 'night'
- Camera: positioned to show crystal at ~60% viewport height
- Use `IntersectionObserver` pattern (already in current code) for lazy mounting

Export as `HeroCrystalScene` (dynamic import with ssr: false in page.tsx).

**Step 2: Verify build and visual test**

Run: `cd apps/website && npx next dev` — check hero visually

**Step 3: Commit**

```
git add apps/website/src/components/3d/ShardScene.tsx
git commit -m "feat(website): rewrite hero scene — single crystal + dot floor"
```

---

## Task 6: Phone Frame Component

**Files:**
- Create: `apps/website/src/components/ui/PhoneFrame.tsx`

**Step 1: Build CSS-only phone mockup**

A phone-shaped container (border-radius, notch, bezel) that accepts children or an image src. Responsive — scales with container width. Dark chrome finish.

```tsx
interface PhoneFrameProps {
  children?: ReactNode
  imageSrc?: string
  className?: string
}
```

Approximate structure:
- Outer: rounded-[40px], border 2px rgba(255,255,255,0.1), bg-black, aspect-[9/19.5], padding 8px
- Screen: rounded-[32px], overflow-hidden, bg-[#111], full size
- Notch: absolute top center, small pill shape

**Step 2: Verify build**

**Step 3: Commit**

```
git add apps/website/src/components/ui/PhoneFrame.tsx
git commit -m "feat(website): add PhoneFrame CSS component for product demos"
```

---

## Task 7: Rewrite Page Layout + Header

**Files:**
- Modify: `apps/website/src/app/page.tsx`
- Modify: `apps/website/src/components/ui/Header.tsx`

**Step 1: Update page.tsx**

Remove: `FloatingShards`, `TimelineIndicator`, `SlidePresentation`, `GlobalShardScene` (if imported).

New structure:
```tsx
<PageWrapper>
  <WarpProvider>
    <Header />
    <main>
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <ComingSoon />
      <BusinessWallet />
      <Roadmap />
      <CTA />
    </main>
    <Footer />
  </WarpProvider>
</PageWrapper>
```

Each section is a `<section>` with `min-h-screen` (or appropriate height), max-w-6xl mx-auto px-6.

**Step 2: Simplify Header**

- Remove ThemeToggle (dark-only now)
- Keep: logo, nav links, "Launch App" CTA, mobile menu
- Force dark styling: white text on transparent bg, glass on scroll

**Step 3: Verify build**

**Step 4: Commit**

```
git add apps/website/src/app/page.tsx apps/website/src/components/ui/Header.tsx
git commit -m "refactor(website): restructure page layout, remove floating shards"
```

---

## Task 8: Hero Section

**Files:**
- Modify: `apps/website/src/components/sections/Hero.tsx`

**Step 1: Rewrite Hero**

Split layout: text left (40%), crystal scene right (60%).

Left side (text):
- Tag: "ETERNITY" (text-tag, text-quaternary)
- Title: "The AI-Native\nCrypto Wallet" (text-display, gradient on "AI-Native")
- Subtitle (text-body-lg, text-secondary)
- "Launch App" button + "Join Waitlist →" link

Right side:
- Dynamic import `HeroCrystalScene` (ssr: false)
- Full height of section

Animation: staggered slide-up for text elements, crystal fades in with scale.

**Step 2: Verify visually with dev server**

**Step 3: Commit**

```
git add apps/website/src/components/sections/Hero.tsx
git commit -m "feat(website): rewrite hero — split layout, premium crystal"
```

---

## Task 9: Problem Section

**Files:**
- Modify: `apps/website/src/components/sections/Problem.tsx`

**Step 1: Rewrite Problem**

Centered layout, text-only. Subtle red radial gradient background.

- Tag: "THE PROBLEM" (text-tag)
- Stat: "$5.9 Billion" (text-display, red-to-white gradient)
- Body: "lost to crypto scams and errors in 2023 alone."
- Supporting text with the 42-character address pain point

Animation: Stat number count-up on scroll-in. Text stagger slide-up.

**Step 2: Commit**

```
git add apps/website/src/components/sections/Problem.tsx
git commit -m "feat(website): rewrite problem section — stat counter, minimal"
```

---

## Task 10: Solution Section (BLIK)

**Files:**
- Modify: `apps/website/src/components/sections/Solution.tsx`

**Step 1: Rewrite Solution**

Split layout: text left + PhoneFrame right (showing BLIK code UI).

- Tag: "BLIK CODES"
- Title: "Six digits.\nMoney arrives." (gradient on "arrives")
- Body text + feature pills row
- PhoneFrame with stylized BLIK screen (colored digits on dark bg)

Animation: text slide-right, phone slide-left, pills stagger in.

Inside phone: BLIK code digits appear one by one when in view (typewriter effect using staggered opacity).

**Step 2: Commit**

```
git add apps/website/src/components/sections/Solution.tsx
git commit -m "feat(website): rewrite solution section — BLIK + phone frame"
```

---

## Task 11: Features Section (Bento Grid)

**Files:**
- Modify: `apps/website/src/components/sections/Features.tsx`

**Step 1: Rewrite Features**

Centered heading + bento grid of 6 glass cards (2 cols, 3 rows; or 3 cols on lg).

Each card: icon (emoji or SVG), title, one-line description. Glass card styling. Hover: lift + border brighten.

Six features: AI Agent, @username, Multi-chain, Smart Contacts, Real-time Rates, Security.

Animation: cards scale-up with stagger.

**Step 2: Commit**

```
git add apps/website/src/components/sections/Features.tsx
git commit -m "feat(website): rewrite features section — bento grid glass cards"
```

---

## Task 12: ComingSoon Section

**Files:**
- Modify: `apps/website/src/components/sections/ComingSoon.tsx`

**Step 1: Rewrite ComingSoon**

Split layout: PhoneFrame left (Smart Splits UI) + feature list right.

Three upcoming features with descriptions and → arrows.

Animation: phone slide-right, list items stagger slide-left.

**Step 2: Commit**

```
git add apps/website/src/components/sections/ComingSoon.tsx
git commit -m "feat(website): rewrite coming soon section — phone frame + feature list"
```

---

## Task 13: Business Wallet Section

**Files:**
- Modify: `apps/website/src/components/sections/BusinessWallet.tsx`

**Step 1: Rewrite BusinessWallet**

Centered heading + 3-column card grid. Remove all animated visualizations (pie chart, token flow, governance demo). Simplify to text + glass cards.

Three cards: Equity, Governance, Treasury. Each with icon, title, description.

Animation: title slide-up, cards stagger slide-up with parallax depth.

**Step 2: Commit**

```
git add apps/website/src/components/sections/BusinessWallet.tsx
git commit -m "feat(website): rewrite business wallet section — minimal glass cards"
```

---

## Task 14: Roadmap Section

**Files:**
- Modify: `apps/website/src/components/sections/Roadmap.tsx`

**Step 1: Rewrite Roadmap**

Horizontal timeline with 4 phases (Q1-Q4 2026). Connected by a thin line with dots. Current phase highlighted and pulsing.

Animation: line draws left-to-right (stroke-dashoffset), dots stagger in, current phase pulses.

Keep responsive — stack vertically on mobile.

**Step 2: Commit**

```
git add apps/website/src/components/sections/Roadmap.tsx
git commit -m "feat(website): rewrite roadmap — horizontal timeline"
```

---

## Task 15: CTA Section

**Files:**
- Modify: `apps/website/src/components/sections/CTA.tsx`

**Step 1: Rewrite CTA**

Centered, minimal. Keep the existing waitlist form functionality (email POST to /api/waitlist, success state). Update styling to match new design tokens.

- Title: "Join the waitlist." (text-heading)
- Subtitle (text-secondary)
- Email input with focus glow + "Get Access" button with shimmer
- Keep success animation (checkmark SVG)

Animation: simple slide-up.

**Step 2: Commit**

```
git add apps/website/src/components/sections/CTA.tsx
git commit -m "feat(website): rewrite CTA section — minimal waitlist"
```

---

## Task 16: Cleanup & Remove Old Files

**Files:**
- Delete: `apps/website/src/components/animations/FloatingShards.tsx`
- Delete: `apps/website/src/components/animations/SectionReveal.tsx` (replaced by ScrollReveal)
- Remove unused imports from all files
- Delete: `apps/website/src/components/3d/Shard.tsx` (replaced by CrystalGem)

**Step 1: Remove files and fix imports**

Grep for any remaining imports of removed components and clean them up.

**Step 2: Full build verification**

Run: `cd apps/website && npx next build`
Expected: Clean build, no errors

**Step 3: Commit**

```
git add -A
git commit -m "chore(website): remove old floating shards, section reveal, shard geometry"
```

---

## Task 17: Performance & Reduced Motion

**Files:**
- Modify: `apps/website/src/components/3d/ShardScene.tsx`
- Modify: `apps/website/src/app/globals.css`

**Step 1: Add hardware detection**

In `ShardScene.tsx`, check `navigator.hardwareConcurrency`. If < 4, render a static crystal image (CSS fallback) instead of the R3F Canvas.

**Step 2: Verify prefers-reduced-motion**

Ensure `globals.css` still has `prefers-reduced-motion` media query that disables animations. Verify ScrollReveal respects it (Framer Motion does by default).

**Step 3: Commit**

```
git add -A
git commit -m "perf(website): hardware detection fallback, reduced-motion support"
```

---

## Task 18: Build, Test, Deploy

**Step 1: Full build**

Run: `cd apps/website && npx next build`
Expected: Clean build

**Step 2: Visual test with dev server**

Run: `cd apps/website && npx next dev`
Check all 8 sections, scroll animations, crystal, dot floor, phone frames, hover states.

**Step 3: Deploy to Vercel**

Run: `cd apps/website && vercel --prod`
Expected: Deployed to https://eternity-wallet.vercel.app

**Step 4: Final commit if any fixes needed**

---

## Execution Order Summary

| # | Task | Dependencies | Est. Complexity |
|---|------|-------------|-----------------|
| 1 | Design tokens + CSS | None | Small |
| 2 | ScrollReveal system | None | Small |
| 3 | Crystal geometry | None | Medium |
| 4 | Dot floor | None | Medium |
| 5 | Hero scene (crystal + floor) | 3, 4 | Small |
| 6 | Phone frame component | None | Small |
| 7 | Page layout + Header | None | Small |
| 8 | Hero section | 2, 5 | Medium |
| 9 | Problem section | 2 | Small |
| 10 | Solution section | 2, 6 | Medium |
| 11 | Features section | 2 | Medium |
| 12 | ComingSoon section | 2, 6 | Small |
| 13 | Business Wallet section | 2 | Small |
| 14 | Roadmap section | 2 | Medium |
| 15 | CTA section | 2 | Small |
| 16 | Cleanup old files | 7-15 | Small |
| 17 | Performance | 5 | Small |
| 18 | Build + Deploy | All | Small |

**Parallelizable:** Tasks 1-4, 6 can all run in parallel (no dependencies). Tasks 8-15 can run in parallel after 2+7 are done.
