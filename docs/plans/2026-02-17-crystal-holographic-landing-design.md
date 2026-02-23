# Crystal Holographic Landing Page Design

## Overview

Redesign the E-Y website landing page around a single 7-sided crystal shard. Each crystal face becomes a content surface with holographic HUD styling. Sections alternate between top and bottom faces, allowing the crystal to zoom in very close — maximizing content area.

No background shards. No phone mockups. No traditional cards or plain text. Everything lives ON the crystal.

## Core Mechanics

### Crystal Behavior

- **7 sections, 7 faces** (from the 14-face heptagonal crystal: 7 top + 7 bottom)
- **Alternating top/bottom**: sections switch between upper (triangle up) and lower (triangle down) faces
- **Zoom levels**: Hero and CTA show full crystal; other sections zoom the camera into a single face (~70% of viewport)
- **Transition**: content fades out -> crystal pulls back + rotates -> zooms into new face -> content fades in with scan-line reveal

### Section-to-Face Mapping

| # | Section  | Face     | Screen Position               |
|---|----------|----------|-------------------------------|
| 0 | Hero     | Full     | Crystal centered, medium dist |
| 1 | Problem  | Top ▲    | Triangle up, upper screen     |
| 2 | Solution | Bottom ▼ | Triangle down, lower screen   |
| 3 | Features | Top ▲    | Triangle up, upper screen     |
| 4 | Business | Bottom ▼ | Triangle down, lower screen   |
| 5 | Roadmap  | Top ▲    | Triangle up, upper screen     |
| 6 | CTA      | Full     | Crystal centered, pulls back  |

### Content Rendering

- HTML content clipped to **triangular shape** via CSS `clip-path` matching the crystal face:
  - Top face: `clip-path: polygon(50% 0%, 0% 100%, 100% 100%)`
  - Bottom face: `clip-path: polygon(0% 0%, 100% 0%, 50% 100%)`
- 3D crystal edges serve as glowing frame around content
- Content overlay at z-index above the Three.js canvas

## Holographic HUD Style System

### Typography
- Titles: glow `text-shadow` in cyan/blue, typewriter character-by-character animation
- Body text: clean sans-serif, subtle glow, fade-in from transparent
- Numbers/data: monospace, "count-up" animation on enter

### Containers
- **Diamond/hex shapes** instead of rectangles
- Glowing borders (animated gradient or pulse)
- Semi-transparent backgrounds with subtle grid overlay
- No solid backgrounds — everything feels translucent/holographic

### Interactions
- **Hover**: scan-line sweep effect across element, reveal additional info
- **Click**: element expands with holographic "flicker" transition
- **Active state**: glow intensifies, subtle particle emission

### Effects
- Scan-lines: horizontal light sweep on section enter
- Grid overlay: subtle dot/line grid on face surface
- Particle trails: small glowing particles near interactive elements
- Ambient glow: face edges pulse gently

## Section Details

### 0. Hero (Full Crystal, Distance)

Crystal flies in from far away (existing entry animation).

**Content overlay (centered on screen):**
- Tag: "WELCOME" with subtle glow
- Title: "The AI-Native Crypto Wallet" — large, holographic glow text-shadow
- Subtitle: typewriter animation, "Send crypto like a text message"
- CTA: "Launch App" button with pulse-glow border
- Hint: "Scroll to explore" with animated down arrow

### 1. Problem (Top Face ▲, Zoomed In)

Crystal rotates + camera zooms into top face. Triangle up, 70% of screen.

**Content inside triangle:**
- Vertex (narrow top): tag "THE PROBLEM" with glow
- Center: title "Built for Machines" — large, scan-reveal animation
- Base (wide bottom): **3 interactive data blocks** in a row:
  1. **Address block**: `0x7f3a8B2c...` with scrambling hex characters (intimidating). Hover -> "One wrong character = lost forever"
  2. **Network block**: dropdown that keeps expanding (Mainnet, Polygon, Arbitrum...). Hover -> "Which one is right?"
  3. **Gap counter**: "8,000,000,000 humans" vs "~500,000,000 users" — animated counting numbers. Hover -> "The gap is experience"

### 2. Solution (Bottom Face ▼, Zoomed In)

Crystal rotates, camera zooms into bottom face. Triangle down.

**Content inside triangle:**
- Top (wide): "AI-Native by Design" + subtitle
- **4 diamond-shaped blocks** in a row:
  1. **BLIK**: animated 6-digit code with countdown timer
  2. **@username**: blinking cursor, "send by nickname"
  3. **Network abstraction**: "See USDC, not USDC (Polygon)"
  4. **AI Agent**: command line `> Send 0.01 ETH to @alex`
- Hover on diamond -> expands with details + glow border

### 3. Features (Top Face ▲, Zoomed In)

Most interactive section — live demos.

**Content inside triangle:**
- Tag: "AVAILABLE NOW"
- **3 mini-demos** arranged vertex-to-base:
  1. **BLIK Live**: real 6-digit code + 2-minute countdown, "Generate New" button
  2. **AI Input**: text field, user types command -> animated response "Sending 0.01 ETH to alex.eth... Done"
  3. **Balance Dashboard**: 3 tokens (ETH, USDC, USDT) with animated numbers and sparkline mini-charts

### 4. Business (Bottom Face ▼, Zoomed In)

**Content inside triangle:**
- Top (wide): "Your Business, On-Chain" + tag "NEW FEATURE"
- **Mini crystal visualization** in center with orbiting data:
  - **Treasury**: large neon counter "2.5 ETH" with pulse
  - **Shareholders**: 3 hex badges orbiting: `@daniel 50%`, `@alex 30%`, `@maria 20%` with glowing share segments
  - **Governance**: "3 Active Proposals" with voting indicators
- Hover on shareholder -> filled bar showing their share
- Hover on governance -> mini for/against visualization with neon colors

### 5. Roadmap (Top Face ▲, Zoomed In)

Timeline as "energy path" from vertex to base.

**Content inside triangle:**
- **Glowing path** from top vertex down toward base
- **4 diamond-shaped milestone nodes** on the path:
  1. **Q1 2026** "MVP + AI Agent" — PULSING green glow (current milestone)
  2. **Q2 2026** "Expansion" — dim, subtle glow
  3. **Q3 2026** "Identity" — dim
  4. **Q4 2026** "Scale" — dim
- Hover on milestone -> node expands, shows 3-4 sub-items with scan-line reveal
- Path between completed milestones = solid bright line; future = dashed with particle flow

### 6. CTA (Full Crystal, Pulls Back)

Crystal pulls back, visible fully again. Content overlaid at center.

**Content:**
- Title: "Experience AI-Native Crypto" — maximum glow effect
- **Waitlist input**: holographic style — transparent bg, glow border, border pulses on focus
- **"Join" button**: hover causes crystal behind to pulse subtly
- **Counter**: "4,201 pioneers already joined" — animated
- **4 small hex badges**: "AI Agent", "SHARD Identity", "Mobile App", "Network Abstraction"

## Technical Architecture

### Three.js Layer (z-index: 1)
- Single heptagonal crystal (existing `createHeptagonalCrystal()` geometry)
- Controlled via ref: `rotationY`, `rotationX`, `scale`, `cameraZ`
- Camera dolly for zoom (move camera z closer/farther)
- Crystal material: semi-transparent glass with `flatShading`, edge lines
- Particles for ambient atmosphere

### HTML Layer (z-index: 2)
- Full-screen overlay, `pointer-events: none` on container, `pointer-events: auto` on interactive elements
- Triangular clip-path matching current face orientation
- All content is HTML/CSS (no canvas textures) for crisp text and full interactivity
- Framer Motion for content transitions and micro-animations

### Animation Orchestration
1. **Fade out** content (200ms)
2. **Pull back** crystal: scale 0.6, camera z +3 (200ms)
3. **Rotate** crystal to next face (400ms, eased)
4. **Push in** crystal: scale 1.0, camera z close (200ms)
5. **Fade in** content with scan-line sweep (300ms)
Total transition: ~1100ms

### Responsive
- Desktop (lg+): full triangle content + sidebar navigation
- Tablet: triangle content, smaller text, dot nav
- Mobile: triangle content with compact layout, dot nav, touch swipe

## Navigation
- Desktop: sidebar (existing, left side)
- Mobile: dot navigation (existing, bottom)
- Keyboard: arrow keys
- Touch: swipe up/down
- Progress bar at bottom (existing)
