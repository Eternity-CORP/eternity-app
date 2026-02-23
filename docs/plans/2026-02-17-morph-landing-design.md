# Morph Landing Page Design

## Overview

Replace the crystal shard with a fluid Morph sphere — a glass/water entity that changes shape per section via simplex noise vertex displacement. Content overlays on top. "Morph" = adapt, fluid, alive.

## 3D Object — MorphSphere

- **Geometry:** `IcosahedronGeometry(1, 64)` (~40K vertices). Detail 32 on mobile.
- **Material:** `MeshPhysicalMaterial` — `transmission: 0.95`, `ior: 1.33`, `thickness: 0.5`, `roughness: 0.05`. Color tint changes per section.
- **Vertex Displacement:** Each frame: `vertex += normal * simplex3D(vertex * freq + time * speed) * amplitude`
- **Mouse Interaction:** Cursor pushes nearby vertices along normal (like touching water surface).
- **Internal Particles:** 30-50 small spheres floating inside, visible through transmission.

## Noise Parameters Per Section

| # | Section  | freq | amp  | speed | Color Tint | Character            |
|---|----------|------|------|-------|------------|----------------------|
| 0 | Hero     | 1.5  | 0.15 | 0.3   | cyan       | Calm breathing       |
| 1 | Problem  | 4.0  | 0.50 | 1.5   | red        | Chaotic, spiky       |
| 2 | Solution | 1.0  | 0.08 | 0.2   | green      | Silky smooth         |
| 3 | Features | 2.0  | 0.25 | 0.8   | blue       | Pulsing heartbeat    |
| 4 | Business | 2.5  | 0.20 | 0.4   | purple     | Semi-structured      |
| 5 | Roadmap  | 1.8  | 0.30 | 0.6   | orange     | Flowing forward      |
| 6 | CTA      | —    | —    | —     | white      | Burst into particles |

## CTA Burst Effect

All vertices fly outward along normals (random distance 3-8), creating particle cloud. Then reverse back to reform sphere. Switch from mesh to Points during burst.

## Section Content (HTML Overlay)

Reuse existing HUD section components (`HeroSection`, `ProblemSection`, etc.) with `face="full"` (no triangle clip-path). Content centered on screen, morph visible behind.

## Navigation

Same as current: sidebar (desktop), dot nav (mobile), wheel/touch/keyboard scroll, progress bar.

## Transition Between Sections (~800ms)

1. Fade out content (200ms)
2. Interpolate noise params + color tint (600ms, easeInOutCubic)
3. Fade in content (300ms)

Morph always visible — never disappears during transitions.

## Layout

- Desktop: morph ~60% viewport centered, content overlay on top
- Mobile: morph ~50%, reduced particle count and geometry detail

## Tech

- React Three Fiber + drei (Environment, useFrame)
- simplex-noise package (or inline 3D simplex)
- MeshPhysicalMaterial with transmission
- Framer Motion for content transitions
