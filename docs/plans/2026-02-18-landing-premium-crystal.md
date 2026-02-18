# Landing Page Redesign — Premium Crystal

**Date:** 2026-02-18
**Style:** Premium minimal (Linear/Vercel inspired)
**Status:** Approved

## Overview

Redesign the E-Y landing page with a premium minimal aesthetic: one hero crystal, typography-first layout, subtle scroll-driven animations, and cursor-reactive dot floor. Remove visual noise (floating shards), add restrained interactivity.

## Design Principles

1. **Substance over spectacle** — every animation serves a purpose
2. **Typography-first** — 4-level opacity hierarchy (100%, 70%, 50%, 30%)
3. **One hero object** — single premium crystal, not scattered decorations
4. **Restrained motion** — smooth, slow, intentional. No flashy effects.
5. **Cursor reactivity** — dot floor and crystal respond to mouse, creating connection

## Visual System

### Color Palette
- Background: `#000000` (pure black)
- Text primary: `rgba(255,255,255, 1.0)`
- Text secondary: `rgba(255,255,255, 0.7)`
- Text tertiary: `rgba(255,255,255, 0.5)`
- Text quaternary: `rgba(255,255,255, 0.3)`
- Accent blue: `#3388FF`
- Accent cyan: `#00E5FF`
- Accent red (problem section): `#FF4444` at 30% opacity
- Glass card: `rgba(255,255,255, 0.03)` + `backdrop-blur(20px)`
- Borders: `rgba(255,255,255, 0.06)`

### Typography
- Display (hero): 72-96px, font-weight 700, tracking -0.03em
- Section headings: 48-56px, font-weight 600, tracking -0.02em
- Body large: 20px, font-weight 400, line-height 1.6
- Body: 16px, font-weight 400, line-height 1.6
- Caption/tag: 12-14px, font-weight 500, tracking 0.1em, uppercase

### Background
- Subtle dot-grid pattern: 1px dots at 24px intervals, `rgba(255,255,255, 0.03)`
- No ambient glow orbs, no floating decorations

## 3D Crystal (Hero Only)

### Geometry
Complex faceted gemstone — "cathedral cut" shape inspired by the reference photo:
- Elongated vertical form (taller than wide, ~1:1.6 ratio)
- Multiple facet planes — NOT simple Ethereum diamond (4 sides)
- At least 12-16 distinct facets with varying angles
- Sharp edges, flat planes (flatShading: true)
- Pointed top, faceted bottom (not symmetrical — top is taller/sharper)

### Material (MeshPhysicalMaterial)
```
color: '#0a0a0a'
metalness: 0.0
roughness: 0.02
transmission: 0.95
thickness: 2.5
ior: 2.33
clearcoat: 1.0
clearcoatRoughness: 0.0
envMapIntensity: 3.0
attenuationColor: '#1a0a2e'
attenuationDistance: 3.0
iridescence: 0.5
iridescenceIOR: 1.3
iridescenceThicknessRange: [100, 600]
flatShading: true
side: DoubleSide
```

### Animation
- Slow Y rotation: 0.05 rad/s
- Subtle float bob: sin(t * 0.6) * 0.05
- Cursor tilt: mouse.x → rotation.z (0.12), mouse.y → rotation.x (0.2)
- Lerped smoothly (factor 0.04)
- One orbiting point light for dynamic caustics

### Lighting
- Ambient: low intensity (0.3)
- Directional: from top-right, warm white
- Orbiting point light: completes one orbit per 12s, creates moving reflections
- Environment map: 'night' preset for dark reflections

## Dot Floor (Hero Section)

### Grid
- 50x50 grid (2500 points) below the crystal at y=-2.2
- Spread: 14 world units
- Point size: 0.015 with sizeAttenuation
- Color: white, opacity 0.08

### Cursor Interaction
- Raycaster projects mouse position onto the floor plane
- Points within radius 2.5 of cursor get displaced:
  - Pushed outward (XZ) with quadratic falloff
  - Lifted upward (Y) with quadratic falloff
- Smooth lerp on cursor position (factor 0.15)

### Ambient Animation
- Calm breathing wave: `sin(x * 0.3 + t * 0.3) * 0.04`
- Very subtle — floor feels alive but doesn't distract from crystal

## Section Structure & Animations

### Scroll-Driven Motion System

Instead of simple fade-in reveals, sections use Phantom-style parallax motion:

**Entrance patterns (vary per section):**
- `slide-up`: translateY(60px) → 0, opacity 0 → 1 (default)
- `slide-left`: translateX(80px) → 0 for right-side elements
- `slide-right`: translateX(-80px) → 0 for left-side elements
- `scale-up`: scale(0.95) → 1.0 for cards/grids
- `stagger`: children animate sequentially with 100ms delay

**Parallax layers:**
- Background elements scroll at 0.8x speed (slower)
- Foreground elements scroll at 1.0x (normal)
- Creates depth without 3D

**Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (smooth decelerate)
**Duration:** 600-800ms per element
**Trigger:** IntersectionObserver at 15% visibility threshold

---

### Section 0 — Hero

**Layout:** Split — text left (40%), crystal right (60%)
**Crystal:** Large, centered in right half, ~60% viewport height
**Dot floor:** Visible below crystal, cursor-reactive
**Text:**
- Tag: "ETERNITY" (uppercase, tracking 0.1em, opacity 50%)
- Title: "The AI-Native\nCrypto Wallet" (72-96px, gradient text on "AI-Native")
- Subtitle: "Send crypto like a text message.\nJust type a name and hit send." (opacity 70%)
- CTA: "Launch App" button (white bg, shimmer hover)
- Secondary: "Join Waitlist →" link

**Animation:**
- Crystal fades in with scale(0.9→1.0) over 1.2s on page load
- Text slides up with stagger (title → subtitle → CTA, 150ms delay)
- Dot floor fades in after 0.5s delay

**Interactivity:**
- Crystal tilts with cursor
- Dot floor reacts to cursor
- CTA triggers Warp transition

---

### Section 1 — Problem

**Layout:** Centered text, no visual elements
**Background:** Subtle red tint — `radial-gradient(ellipse at center, rgba(255,68,68,0.04) 0%, transparent 70%)`

**Text:**
- Tag: "THE PROBLEM"
- Stat line: "$ 5.9 Billion" (huge, 80-96px, gradient red-to-white)
- Body: "lost to crypto scams and errors in 2023 alone."
- Supporting: "42-character addresses. One wrong digit. Everything gone."

**Animation:**
- Stat number animates (count up from 0 to 5.9B) on scroll-in
- Text slides up with stagger
- Red radial gradient fades in on section enter, fades out on leave

---

### Section 2 — Solution (BLIK)

**Layout:** Split — text left, phone-frame right
**Phone frame:** CSS mockup showing BLIK code screen from the app

**Text:**
- Tag: "BLIK CODES"
- Title: "Six digits.\nMoney arrives." (gradient on "arrives")
- Body: "Share a 6-digit code. Your friend enters it. Crypto sent — no addresses, no mistakes."
- Feature pills: "No addresses" / "60-second codes" / "Works cross-chain"

**Animation:**
- Text slides in from left (`slide-right`)
- Phone slides in from right (`slide-left`)
- Feature pills stagger in after text (100ms each)
- Inside phone: BLIK code digits appear one by one (typewriter effect)

---

### Section 3 — Features

**Layout:** Bento grid — 2 columns, 3 rows (or 3 columns on wide screens)
**Cards:** Glass card with icon, title, short description

**Features:**
1. **AI Agent** — "Your wallet speaks human. Ask it anything."
2. **@username** — "Send to @alice, not 0x7f3a..."
3. **Multi-chain** — "One wallet. Every network. Zero switching."
4. **Smart Contacts** — "Your address book, auto-synced."
5. **Real-time Rates** — "Live prices. Smart swap suggestions."
6. **Security** — "Your keys. Your crypto. Always."

**Animation:**
- Cards scale-up with stagger (150ms between cards)
- On hover: card lifts (translateY -4px), border brightens
- Icons have subtle idle animation (pulse or rotate)

---

### Section 4 — Coming Soon

**Layout:** Split — phone-frame left, feature list right
**Phone frame:** Shows Smart Splits UI

**Text:**
- Tag: "COMING SOON"
- Title: "And we're just\ngetting started." (gradient on "started")
- Feature list:
  - "Smart Splits — Split bills with friends, on-chain"
  - "Token Swap — Best rates, one tap"
  - "Scheduled Payments — Set it and forget it"

**Animation:**
- Phone slides in from left (`slide-right`)
- Feature list items slide in from right with stagger
- Each feature has a small → arrow that slides in on hover

---

### Section 5 — Business Wallet

**Layout:** Centered heading + 3-column card grid below
**Cards:** Glass cards for Tokenized Equity, Governance, Treasury

**Text:**
- Tag: "FOR BUSINESS"
- Title: "Your business.\nOn-chain." (gradient on "On-chain")
- Subtitle: "Tokenized equity. Collective governance. Transparent treasury."

**Cards:**
1. **Equity** — "Issue tokens to co-founders. Track ownership on-chain."
2. **Governance** — "Propose and vote. Every decision recorded."
3. **Treasury** — "Shared wallet. Multi-sig security. Dividend distribution."

**Animation:**
- Title slides up
- Cards slide up with stagger (200ms)
- Cards have parallax depth (background layer at 0.85x scroll speed)

---

### Section 6 — Roadmap

**Layout:** Horizontal timeline, centered
**Visual:** Connected dots with phase labels

**Phases:**
- Q1 2026: "MVP — Wallet + BLIK + AI Agent" (marked as current)
- Q2 2026: "Splits, Swap, Scheduled"
- Q3 2026: "Business Wallets + Governance"
- Q4 2026: "Multi-chain mainnet + Mobile app"

**Animation:**
- Timeline line draws from left to right on scroll-in (stroke-dashoffset animation)
- Phase dots appear sequentially (200ms stagger)
- Current phase pulses subtly
- Past phases are full opacity, future phases are 50%

---

### Section 7 — CTA (Waitlist)

**Layout:** Centered, minimal
**Visual:** Small crystal returns (scaled down, subtle glow) or just ambient dot particles

**Text:**
- Title: "Join the waitlist." (48px)
- Subtitle: "Early access. Be first." (opacity 70%)
- Email input + "Get Access" button
- Small text: "No spam. Just launch updates."

**Animation:**
- Simple slide-up
- Input has focus glow animation (border-color transition)
- Button has shimmer on hover

---

## Removed Components

- **FloatingShards** — removed entirely (visual noise)
- **TimelineIndicator** — replaced by cleaner scroll progress (thin line on right edge or removed)
- **LoadingScreen** — keep but simplify (faster, 1.5s max)
- **3D crystals scattered in background** — replaced by single hero crystal

## Performance

- Crystal: only rendered in hero viewport (IntersectionObserver)
- Dot floor: only active in hero viewport
- Phone frames: static images or CSS, not iframes
- Scroll animations: CSS-driven via IntersectionObserver, not JS per-frame
- `will-change: transform` on animated elements, removed after animation
- `prefers-reduced-motion`: disable all motion, show static layout
- Hardware detection: if `navigator.hardwareConcurrency < 4`, skip 3D, show static crystal image

## Implementation Files

### Modify
- `apps/website/src/app/page.tsx` — restructure sections
- `apps/website/src/app/globals.css` — new design tokens, remove old
- `apps/website/src/components/3d/ShardScene.tsx` — rewrite: one crystal + dot floor
- `apps/website/src/components/3d/Shard.tsx` — new geometry (cathedral cut)

### Create
- `apps/website/src/components/3d/DotFloor.tsx` — cursor-reactive particle floor
- `apps/website/src/components/3d/CrystalGem.tsx` — new complex crystal geometry
- `apps/website/src/components/ui/PhoneFrame.tsx` — CSS phone mockup
- `apps/website/src/components/ui/BentoGrid.tsx` — feature card grid
- `apps/website/src/components/animations/ScrollReveal.tsx` — new scroll animation system (slide-up, slide-left, slide-right, scale-up, stagger)

### Remove
- `apps/website/src/components/FloatingShards.tsx`
- Old section components that get rewritten

## Reference
- Crystal style: user-provided photo (clear glass, prismatic, complex faceting)
- Motion style: phantom.com (elements slide in from sides on scroll)
- Typography: linear.app (4-level opacity, large headings)
- Layout: vercel.com (clean dark, glass cards, minimal decoration)
