# E-Y Landing Page Design Document

**Author:** Claude + Daniel
**Date:** 2026-01-18
**Version:** 1.0

---

## Overview

Landing page for E-Y crypto wallet — showcasing MVP features and future vision.

### Goals
- Present E-Y as "The Wallet for Everyone"
- Collect waitlist signups for early access
- Show working MVP features + coming soon roadmap
- Create "wow" effect with animations and 3D elements

---

## Technical Stack

```
apps/website/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx            # Main landing
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── press-kit/page.tsx
│   ├── components/
│   │   ├── sections/           # Hero, Problem, Solution, etc.
│   │   ├── ui/                 # Buttons, Cards, inputs
│   │   ├── 3d/                 # Three.js components (Shards, particles)
│   │   └── animations/         # Framer Motion wrappers
│   ├── lib/                    # Utils, constants
│   └── styles/                 # Global styles, fonts
├── public/                     # Assets, images
├── package.json
└── tailwind.config.ts
```

### Libraries

| Library | Purpose |
|---------|---------|
| **Next.js 14** | App Router, SSG |
| **Tailwind CSS** | Styling, dark theme |
| **Framer Motion** | Scroll animations, transitions |
| **Three.js + React Three Fiber** | 3D shards, particles |
| **GSAP ScrollTrigger** | Section-based scroll with timeline |

### Color Scheme

```
Background:  #000000 (black)
Surface:     #0A0A0A, #111111 (cards)
Primary:     #FFFFFF (white text)
Accent:      Gradient purple→blue→cyan (shards, highlights)
Muted:       #666666, #888888 (secondary text)
```

---

## Page Structure

| # | Section | Description |
|---|---------|-------------|
| 1 | **Hero** | Headline, CTA, floating shards |
| 2 | **Problem** | "Crypto scares people away" |
| 3 | **Solution** | 4 Pillars overview |
| 4 | **Features** | Available now (MVP) |
| 5 | **Coming Soon** | Levitating flip cards |
| 6 | **Roadmap** | Timeline with shard markers |
| 7 | **CTA / Footer** | Waitlist, socials |

### Additional Pages
- `/privacy` — Privacy Policy
- `/terms` — Terms of Service
- `/press-kit` — Logos, screenshots, brand assets

---

## Section 1: Hero

### Visual Composition

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo: E-Y]                    [Menu: Features │ Roadmap]  │
│                                                             │
│                    ◆ ◇ ◆                                   │
│               (floating shards)                             │
│                  ◇     ◆                                   │
│                                                             │
│            THE WALLET FOR EVERYONE                          │
│         Send crypto like you send a text                    │
│                                                             │
│      [Get Early Access]     [Watch Demo ▶]                 │
│                                                             │
│                    ↓ Scroll                                 │
└─────────────────────────────────────────────────────────────┘
```

### 3D Shards
- 5-7 crystals, different sizes, slow rotation and levitation
- Semi-transparent with gradient (purple → cyan)
- Soft glow effect
- React to mouse movement (parallax)
- Mobile: simplified 2D CSS animation

### Animations
1. Fade in background (grid appears)
2. Shards "fly in" from edges (0.5s stagger)
3. Text fade up with blur (headline → subheadline → buttons)
4. Subtle pulse on "Get Early Access"

### Timeline Indicator (right side)
```
●─── Hero          (active)
○─── Problem
○─── Solution
○─── Features
○─── Coming Soon
○─── Roadmap
```
Fixed position, follows scroll, dots highlight on section change.

---

## Section 2: Problem

### Concept
Dark, slightly "anxious" section — showing user pain. Chaos transforms to clarity on scroll.

### Visual Composition

```
┌─────────────────────────────────────────────────────────────┐
│              CRYPTO SCARES PEOPLE AWAY                      │
│                                                             │
│    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│    │   FEAR      │  │  CONFUSION  │  │  EXCLUSION  │       │
│    │             │  │             │  │             │       │
│    │  "Wrong     │  │  "What's    │  │  "Crypto    │       │
│    │  network =  │  │   gas?"     │  │   isn't     │       │
│    │  lost       │  │             │  │   for me"   │       │
│    │  forever"   │  │  "Which     │  │             │       │
│    │             │  │   chain?"   │  │             │       │
│    └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                             │
│   "Mass adoption isn't blocked by technology —              │
│    it's blocked by experience"                              │
└─────────────────────────────────────────────────────────────┘
```

### Pain Cards
1. **Fear** — "Send to wrong network = funds lost forever"
2. **Confusion** — "Gas fees? Chains? Bridges? What?"
3. **Exclusion** — "This technology isn't for people like me"

### Animations
| Element | Effect |
|---------|--------|
| Background | Glitch grid, flickering red dots (chaos) |
| Cards | Appear with shake effect, light vibration |
| Quotes | Typewriter effect |
| Transition | Chaos "dissolves", light appears |

---

## Section 3: Solution (4 Pillars)

### Concept
Contrast with Problem — brightens, shards appear, feeling of "emerging from darkness".

### 4 Pillar Cards

| Pillar | Title | Description |
|--------|-------|-------------|
| 1 | **BLIK Codes** | 6 digits instead of 42 characters. Share code → receive money. |
| 2 | **Network Abstraction** | See "USDC", not "USDC (Polygon)". We handle complexity. |
| 3 | **SHARD Identity** | Your passport becomes your crypto identity. |
| 4 | **AI Agent** | Proactive assistant that speaks your language. |

### Animations
| Element | Effect |
|---------|--------|
| Section entry | Gradient sweep dark → light |
| Shard above | "Falls" and hovers, pulses |
| Cards | Appear one by one on scroll (stagger 0.2s) |
| Hover | Lift up + glow + inner shard rotates |

### Problem → Solution Connection
```
Fear       →  BLIK (no wrong address possible)
Confusion  →  Network Abstraction (no chains to think about)
Exclusion  →  SHARD + AI (accessible identity + helper)
```

---

## Section 4: Features (Available Now)

### Concept
Show real product — app screenshots/mockups with interactive elements.

### Interactive Phone Mockup
Click feature on left → phone shows corresponding screen:

| Feature | Screen |
|---------|--------|
| **Create Wallet** | Seed phrase screen |
| **BLIK Codes** | 6-digit code with animated countdown |
| **@username** | Registration / lookup |
| **Balances** | Home with tokens and USD |
| **Transactions** | History with statuses |
| **Contacts** | Contact book |
| **Scheduled** | Recurring payment setup |
| **Split Bill** | Split creation |

### Animations
| Element | Effect |
|---------|--------|
| Phone mockup | Floating, subtle rotation on mouse move |
| Screen transitions | Slide + fade on feature change |
| Feature list | Hover → highlight + phone switches |
| BLIK demo | Real countdown 2:00 → 0:00 (loop) |

### Text
**Headline:** "Available Now"
**Subheadline:** "Already working. Ready to try."

---

## Section 5: Coming Soon

### Concept
Most "wow" section — levitating flip cards, glowing, magical feeling.

### Cards (3D Flip)

| Card | Front | Back |
|------|-------|------|
| **Network Abstraction** | "One Token, Any Chain" | "Send USDC anywhere. We find the best route." |
| **SHARD Identity** | "Your Passport, Your ID" | "NFC scan from home. Unique crypto identity." |
| **Proof of Personhood** | "Prove You're Human" | "1.4B+ passports supported. Privacy-preserving." |
| **AI Agent** | "Your Crypto Companion" | "Proactive alerts. Natural conversations." |
| **Fiat Ramp** | "Cash In, Cash Out" | "Buy and sell crypto directly." |

### Animations
| Element | Effect |
|---------|--------|
| Cards | Constant levitation (float 10px, 3s loop) |
| Hover | Card flips 180° showing back, glow intensifies |
| Rotation | Subtle Y-axis ±5° on mouse move |
| Shards between | Random trajectories with trails |
| Glow | Gradient border pulse (purple → cyan) |
| Appearance | Cards "fly in" from different corners |

### Parallax Layers
```
Layer 1 (back):    Grid background, slow parallax
Layer 2 (mid):     Shards, medium speed
Layer 3 (front):   Cards, fast mouse response
```

---

## Section 6: Roadmap

### Concept
Vertical timeline with shards as stage markers. Shards "light up" when reached.

### Timeline Milestones

| Quarter | Name | Items | Status |
|---------|------|-------|--------|
| **Q1 2026** | MVP Launch | Core wallet, BLIK, @username | ✅ Completed |
| **Q2 2026** | Expansion | Network Abstraction, Fiat ramp | 🔄 Next |
| **Q3 2026** | Identity | SHARD Identity, Proof of Personhood | ⏳ Upcoming |
| **Q4 2026** | Intelligence | AI Agent, Smart notifications | 🔮 Future |

### Animations
| Element | Effect |
|---------|--------|
| Timeline line | Draw-in on scroll (SVG stroke) |
| Completed shard | Solid glow, rotating, particles |
| Next shard | Pulsing glow, "breathing" scale |
| Upcoming shards | Dim, subtle float, brighten on hover |
| Milestone cards | Slide in from alternating sides |

### Scroll Progression
```
0%   → Q1 appears, shard glows
25%  → Q2 slides in, line draws
50%  → Q3 appears
75%  → Q4 fades in
100% → "THE FUTURE" shard pulses, particle burst
```

---

## Section 7: CTA / Footer

### CTA Block

```
┌─────────────────────────────────────────────────────────────┐
│         (all shards converge to center)                     │
│                                                             │
│              READY TO TRY THE FUTURE?                       │
│         Join the waitlist for early access                  │
│                                                             │
│         ┌─────────────────────────────────┐                │
│         │  Enter your email               │                │
│         └─────────────────────────────────┘                │
│              [Get Early Access]                             │
│         ☐ I want to be a beta tester                       │
│                                                             │
│                    — or —                                   │
│              [Watch Demo ▶]                                 │
└─────────────────────────────────────────────────────────────┘
```

### Footer

```
┌─────────────────────────────────────────────────────────────┐
│  E-Y                                                        │
│  The Wallet for Everyone              [𝕏] [GitHub] [📧]     │
│                                                             │
│  Product       Legal         Connect                        │
│  Features      Privacy       Twitter                        │
│  Roadmap       Terms         GitHub                         │
│  Download      Press Kit     Email                          │
│                                                             │
│  © 2026 E-Y. All rights reserved.                          │
│  Built with ◆ for the future of crypto                     │
└─────────────────────────────────────────────────────────────┘
```

### Animations
| Element | Effect |
|---------|--------|
| Shards converge | All 5-7 fly to center, merge into one large |
| Big shard | Pulses, emits light rings |
| Form | Scale up from center + blur clear |
| Button hover | Gradient shift + lift + shadow |
| Submit success | Button → checkmark morph, confetti |

---

## Secondary Pages

### Common Style
Minimalist, same dark theme, no heavy animations. Focus on content.

### /privacy — Privacy Policy
- What data we collect (email, public addresses)
- What we DON'T collect (private keys, seed phrases)
- Third parties (Alchemy, CoinGecko)
- User rights (delete, export)
- Contact: privacy@e-y.app

### /terms — Terms of Service
- Service description (self-custody wallet, testnet)
- User responsibilities (secure your seed phrase)
- Disclaimers (not financial advice)
- Limitation of liability

### /press-kit — Press Kit
- Downloadable logos (SVG, PNG)
- Color palette
- Screenshots in device frames
- Boilerplate text for journalists
- Contact: press@e-y.app

---

## Content Summary

### Available Now (MVP)
- ✅ Create & Import Wallet
- ✅ BLIK Codes (send & receive)
- ✅ @username System
- ✅ Token Balances + USD
- ✅ Transaction History
- ✅ Contacts Book
- ✅ Scheduled Payments
- ✅ Split Bill

### Coming Soon
- 🔮 Network Abstraction
- 🔮 SHARD Identity
- 🔮 Proof of Personhood
- 🔮 AI Financial Agent
- 🔮 Fiat On/Off Ramp

---

## Key Copy (English)

**Hero Headline:** "The Wallet for Everyone"
**Hero Subheadline:** "Send crypto like you send a text"

**Problem Headline:** "Crypto Scares People Away"
**Problem Quote:** "Mass adoption isn't blocked by technology — it's blocked by experience"

**Solution Headline:** "We Built E-Y to Fix This"
**Solution Subheadline:** "Four pillars. Zero fear."

**Features Headline:** "Available Now"
**Features Subheadline:** "Already working. Ready to try."

**Coming Soon Headline:** "Coming Soon"
**Coming Soon Subheadline:** "The future we're building"

**Roadmap Headline:** "Roadmap"
**Roadmap Subheadline:** "Our journey ahead"

**CTA Headline:** "Ready to Try the Future?"
**CTA Subheadline:** "Join the waitlist for early access"

**Footer Tagline:** "Built with ◆ for the future of crypto"
