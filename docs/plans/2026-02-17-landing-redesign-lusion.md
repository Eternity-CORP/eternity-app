# Landing Page Redesign — Lusion-Style

**Date:** 2026-02-17
**Inspiration:** exp-ion.lusion.co (ION X1)

## Overview

Redesign the E-Y shard landing page with diverse section effects, a persistent cursor-reactive dot floor, and bold tech-statement copy based on the PRD.

## Architecture: 3 Visual Layers

### Layer 1 — Dot Floor (persistent)
- 50x50 grid of particles (~2500 points) below the crystal
- Cursor interaction: points near projected cursor get displaced
- Behavior changes per section (calm, chaotic, waves, flow, hex, ascending, beacon)

### Layer 2 — Section Effects (unique per section)
Each section gets a completely different 3D effect type:
- **Hero**: Aurora mesh ribbon strips spiraling inward
- **Problem**: InstancedMesh glitch fragments (red, shaking)
- **Solution**: Torus scan rings passing through crystal
- **Features**: Radial concentric ripple particles
- **Business**: Network graph with animated data pulse spheres
- **Roadmap**: DNA double helix lines with traveling energy pulse
- **CTA**: Expanding shockwave torus rings

### Layer 3 — Crystal (Shard)
Unchanged — camera orbits per section, cursor tilts crystal.

## Section Copy (Bold Tech-Statements)

| # | Section   | Title                                    | Subtitle                                  |
|---|-----------|------------------------------------------|-------------------------------------------|
| 0 | Hero      | THE WALLET RE-ENGINEERED.                | AI-native crypto. Zero complexity.        |
| 1 | Problem   | 42 CHARACTERS. ONE MISTAKE. EVERYTHING LOST. | —                                     |
| 2 | Solution  | SIX DIGITS. MONEY ARRIVES.               | Share a code. Receive crypto. That simple.|
| 3 | Features  | YOUR WALLET SPEAKS HUMAN.                | AI agent. Invisible chains. @username.    |
| 4 | Business  | YOUR BUSINESS. ON-CHAIN.                 | Tokenized equity. Collective governance.  |
| 5 | Roadmap   | BUILDING THE FUTURE.                     | From MVP to global scale.                 |
| 6 | CTA       | JOIN THE WAITLIST.                        | Early access. Be first.                   |

## Dot Floor Behavior Per Section

| Section   | Behavior                                          |
|-----------|---------------------------------------------------|
| Hero      | Calm, subtle cursor ripple                        |
| Problem   | Chaotic distortion, red tint, broken grid         |
| Solution  | Concentric waves from center (BLIK ripple)        |
| Features  | Data flow — points flicker/stream like data       |
| Business  | Hexagonal node pattern                            |
| Roadmap   | Ascending particle streams                        |
| CTA       | Pulsing beacon — rings of dots expanding outward  |

## Implementation Files

- `apps/website/src/components/3d/DotFloor.tsx` — new component
- `apps/website/src/components/3d/SectionEffects.tsx` — rewrite (already started)
- `apps/website/src/components/ShardLanding.tsx` — update section data + text
- `apps/website/src/components/sections/SectionVisuals.tsx` — may remove (replaced by 3D effects)
