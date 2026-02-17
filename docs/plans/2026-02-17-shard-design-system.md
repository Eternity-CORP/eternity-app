# Shard Design System

## The Object: Shard

**Shape:** Faceted Drop — a teardrop form with flat crystal facets. Top is slightly curved inward (referencing the infinity logo). Bottom tapers to a point. Not symmetric — organic + geometric.

**Material:** Dark obsidian with labradorescence — base color is black, but angles reveal purple/blue flashes. High metalness, low roughness, environment reflections.

**Brand Connection:**
- One shard = one loop of the infinity (∞) logo
- Two shards mirrored = ∞ = Eternity
- "A fragment of eternity" — each user holds a piece

**Color Palette:**
- Base: black (#000000 - #1a1a2e)
- Glow: purple (#7c3aed), blue (#3b82f6), cyan (#06b6d4)
- Accents: violet (#8b5cf6), indigo (#6366f1)

---

## Animation System

### 1. Landing Page — "Journey Into the Shard"

Scroll-driven camera movement. User travels from outside the shard, through its surface, into the void inside, and out the other side.

| Scroll % | Camera | Scene | Content |
|----------|--------|-------|---------|
| 0-15% | Far, shard visible whole | Shard floats in void, orbital particles | Hero: title + CTA |
| 15-30% | Approaching surface | Surface detail visible, facets fill screen | Problem: text on/near facets |
| 30-45% | Passing through surface | Particle burst on entry | Solution: inside energy |
| 45-65% | Inside void | Purple vortex, floating energy | Features: cards in void |
| 65-80% | Moving toward exit | Energy shifts color | Business: data streams |
| 80-90% | Approaching exit light | Light ahead, timeline path | Roadmap |
| 90-100% | Exit, see shard behind | Two shards form ∞ | CTA: waitlist |

**Mouse interaction:** Cursor affects particles and surface distortion at every stage.

**Tech:** React Three Fiber + drei + GSAP ScrollTrigger for scroll-to-camera binding.

### 2. Launch App Transition — "Shard Pull"

Replaces current star-field warp.

1. Shard pulses on click
2. Screen distorts radially toward center (gravitational pull)
3. Particles accelerate toward shard
4. Chromatic aberration on edges
5. Everything collapses to a point
6. Fade to black → web app appears

**Duration:** 1.2-1.5s
**Tech:** Post-processing effects (radial distortion shader) + particle acceleration.

### 3. Transaction Confirmation — "Shard Merge"

Replaces current star-field fly-through.

1. One shard appears (sender), pulsing
2. Second shard appears opposite (receiver)
3. Both fly toward each other
4. They connect → briefly form ∞
5. Purple light flash
6. ∞ dissolves softly
7. "Transaction Confirmed" appears

**Duration:** 2-3s
**Tech:** Lottie or CSS/canvas animation for lightweight rendering in web app.

### 4. Signature Confirmation — "Shard Seal"

Replaces current star-field.

1. Dark shard appears
2. Facets light up one by one (like a progress indicator on a 3D object)
3. All facets lit → flash
4. Shard shrinks to a point
5. "Signed" confirmation

**Duration:** 1.5-2s
**Tech:** CSS animation or lightweight canvas.

### 5. Error State — "Shard Crack"

1. Shard appears, starts glowing
2. Crack appears, red light leaks through
3. Shard fractures into pieces
4. Pieces float away and dissolve
5. "Transaction Failed" appears

**Duration:** 1.5s

---

## Unified Visual Language

| Action | Animation | Meaning |
|--------|-----------|---------|
| Browse (landing) | Journey through shard | "Dive into Eternity" |
| Launch App | Shard pulls you in | "Enter the void" |
| Send transaction | Two shards → ∞ → dissolve | "Connection created" |
| Sign/approve | Facets light up → seal | "Sealed forever" |
| Receive | Shard flies toward you | "A piece of eternity is yours" |
| Error | Shard cracks, red shards | "Connection failed" |

---

## Implementation Priority

1. **Shard 3D geometry** — Create the faceted drop mesh (Three.js)
2. **Landing page** — Scroll-driven journey with shard
3. **Launch App transition** — Replace warp with Shard Pull
4. **Transaction confirmation** — Replace stars with Shard Merge
5. **Signature animation** — Replace stars with Shard Seal

---

## References

- [Ferrofluid WebGL](https://robert-leitl.medium.com/ferrofluid-7fd5cb55bc8d) — liquid metal surface behavior
- [Black Hole Three.js](https://vlwkaos-three-js-blackhole.netlify.app/) — void/gravitational effects
- [Black Hole WebGL](https://oseiskar.github.io/black-hole/) — gravitational lensing
- [Apple AirPods scroll](https://www.awwwards.com/inspiration/product-scroll-triggered-animation-apple-airpods-pro) — scroll-driven 3D reveal
- [Family wallet](https://family.co/) — crypto micro-interactions benchmark
- [Awwwards WebGL](https://www.awwwards.com/awwwards/collections/webgl/) — experimental WebGL sites
- [Codrops scroll WebGL](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/) — GSAP + Three.js scroll techniques
