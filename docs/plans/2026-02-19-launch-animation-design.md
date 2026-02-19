# Launch App Animation — Design

**Date**: 2026-02-19
**Replaces**: `WarpTransition` (particle warp on "Launch App" click)
**Duration**: 4.5 seconds
**Approach**: A — Stroke Reveal + Breath + Zoom-Through
**Fallback**: B — Particle Constellation + Crystallize (documented below)

---

## Constraints

- Theme-aware: dark bg + colored glow (dark) / light bg + subtle glow (light)
- No white flashes or blinding effects — comfortable at night
- Premium / elegant feel (Apple product reveal style)
- Logo-centric: E-Y geometric logo is the star
- Same API surface as current WarpTransition: `startWarp()` → fullscreen overlay → redirect

## Approach A: Stroke Reveal + Breath + Zoom-Through (Primary)

### Phase 1: DRAW (0–1.2s)

- Background: theme color (black / white)
- Logo SVG path draws via stroke-dashoffset animation
- Stroke: gradient from `#3388FF` (accent-blue) → `#00E5FF` (accent-cyan)
- Stroke width: 2px with soft blur-glow shadow — "neon laser" effect
- Easing: easeInOutCubic
- Logo centered, ~180×194px

### Phase 2: FILL (1.2–2.0s)

- Contour complete. Interior fills with gradient wipe (bottom → top)
- Fill color: white (dark theme) / black (light theme) — matches final logo
- Soft radial glow grows beneath logo (radius ~200px, opacity 0→0.3)
- Stroke glow fades (opacity 1→0.4) — accent shifts to filled shape

### Phase 3: BREATH (2.0–3.2s)

- Logo complete. One smooth "breath": scale 1 → 1.06 → 1
- Radial glow pulses in sync (opacity 0.3 → 0.5 → 0.3)
- "ETERNITY" text fades in below logo:
  - opacity: 0→1
  - letter-spacing: 0.1em → 0.3em
  - y: +10px → 0
- Text color: foreground at 50% opacity

### Phase 4: ZOOM-THROUGH (3.2–4.5s)

- Logo + text scale up: 1 → 15 ("flying into" the logo)
- Simultaneously opacity: 1 → 0
- Glow expands and fades
- Background stays theme color (no white-out)
- Last 0.3s: soft screen fade
- At 4.5s: `window.location.href = APP_URL`

### Technical Details

- **Rendering**: Canvas 2D (consistent with existing approach)
- **SVG Path**: extract path data from `logo.svg`, use for stroke-dasharray/dashoffset + fill in canvas
- **Component**: replace animation logic inside `WarpProvider`, keep same `startWarp()` API
- **File**: `apps/website/src/components/animations/WarpTransition.tsx`

---

## Approach B: Particle Constellation + Crystallize (Fallback)

### Phase 1: CHAOS (0–1.5s)
- 100–200 small dots float randomly on dark background like stars

### Phase 2: ASSEMBLY (1.5–2.8s)
- Dots attract toward logo shape, each leaving a thin trail

### Phase 3: CRYSTALLIZE (2.8–3.5s)
- Logo "crystallizes" — edges appear, light glass/metallic effect, soft glow

### Phase 4: PORTAL (3.5–4.5s)
- Radial gradient ring expands from logo center to screen edges → redirect

### Technical Notes
- Requires extracting SVG path points as particle target positions
- More complex than A but visually impressive
- Use if Approach A stroke animation doesn't feel impactful enough
