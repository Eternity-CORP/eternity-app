// @ts-nocheck
'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/* ---------------------------------------------------------- */
/*  Inline 3D Perlin Noise                                     */
/* ---------------------------------------------------------- */

function createNoise3D() {
  const perm = new Uint8Array(512)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = p[i]; p[i] = p[j]; p[j] = tmp
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]

  const G = [1,1,0, -1,1,0, 1,-1,0, -1,-1,0, 1,0,1, -1,0,1, 1,0,-1, -1,0,-1, 0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1]
  const dot = (gi: number, x: number, y: number, z: number) => G[gi * 3] * x + G[gi * 3 + 1] * y + G[gi * 3 + 2] * z
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
  const mix = (a: number, b: number, t: number) => a + t * (b - a)

  return (x: number, y: number, z: number): number => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z)
    const u = fade(x), v = fade(y), w = fade(z)
    const A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z
    const B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z
    return mix(
      mix(mix(dot(perm[AA] % 12, x, y, z), dot(perm[BA] % 12, x - 1, y, z), u),
          mix(dot(perm[AB] % 12, x, y - 1, z), dot(perm[BB] % 12, x - 1, y - 1, z), u), v),
      mix(mix(dot(perm[AA + 1] % 12, x, y, z - 1), dot(perm[BA + 1] % 12, x - 1, y, z - 1), u),
          mix(dot(perm[AB + 1] % 12, x, y - 1, z - 1), dot(perm[BB + 1] % 12, x - 1, y - 1, z - 1), u), v),
      w
    )
  }
}

/* ---------------------------------------------------------- */
/*  Section morph configs                                      */
/* ---------------------------------------------------------- */

interface MorphConfig {
  frequency: number
  amplitude: number
  speed: number
  color: [number, number, number]
}

const MORPH_CONFIGS: MorphConfig[] = [
  { frequency: 1.5, amplitude: 0.15, speed: 0.3, color: [0, 0.9, 1] },        // Hero: cyan
  { frequency: 4.0, amplitude: 0.50, speed: 1.5, color: [1, 0.2, 0.2] },      // Problem: red
  { frequency: 1.0, amplitude: 0.08, speed: 0.2, color: [0.13, 0.77, 0.37] }, // Solution: green
  { frequency: 2.0, amplitude: 0.25, speed: 0.8, color: [0.2, 0.53, 1] },     // Features: blue
  { frequency: 2.5, amplitude: 0.20, speed: 0.4, color: [0.58, 0.2, 1] },     // Business: purple
  { frequency: 1.8, amplitude: 0.30, speed: 0.6, color: [1, 0.6, 0.1] },      // Roadmap: orange
  { frequency: 1.5, amplitude: 0.15, speed: 0.3, color: [1, 1, 1] },          // CTA: white
]

/* ---------------------------------------------------------- */
/*  Exported control interface                                  */
/* ---------------------------------------------------------- */

export interface MorphCtrl {
  targetSection: number
  entered: boolean
  burst: number // 0 = assembled, 1 = burst (CTA)
}

/* ---------------------------------------------------------- */
/*  Helpers                                                     */
/* ---------------------------------------------------------- */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - Math.min(1, t), 3) }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

/* ---------------------------------------------------------- */
/*  MorphSphere Component                                       */
/* ---------------------------------------------------------- */

export function MorphSphere({ ctrl, isDark }: { ctrl: React.MutableRefObject<MorphCtrl>; isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const { viewport } = useThree()

  const { geometry, origPos, burstDist } = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(1, 4)
    const pos = geo.getAttribute('position')
    const orig = new Float32Array(pos.array)
    const bd = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) bd[i] = 2 + Math.random() * 4
    return { geometry: geo, origPos: orig, burstDist: bd }
  }, [])

  const noise = useMemo(() => createNoise3D(), [])

  // Internal particles
  const particlePos = useMemo(() => {
    const count = 30
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = Math.cbrt(Math.random()) * 0.6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      a[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      a[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      a[i * 3 + 2] = r * Math.cos(phi)
    }
    return a
  }, [])
  const particlesRef = useRef<THREE.Points>(null)

  const cur = useRef({
    freq: 1.5, amp: 0.15, speed: 0.3,
    cr: 0, cg: 0.9, cb: 1,
    entryT: 0, scale: 0,
    burstP: 0,
  })

  useFrame((state, delta) => {
    const grp = groupRef.current
    const mesh = meshRef.current
    if (!grp || !mesh) return
    const c = ctrl.current
    const t = state.clock.elapsedTime
    const s = cur.current
    const baseScale = Math.min(3.5, Math.max(1.5, viewport.width * 0.35))

    /* ---- Entry animation ---- */
    if (!c.entered) {
      s.entryT = Math.min(1, s.entryT + delta * 0.6)
      const e = easeOutCubic(s.entryT)
      grp.position.z = lerp(-30, 0, e)
      grp.scale.setScalar(lerp(0.01, baseScale, e))
      grp.rotation.y = e * Math.PI * 2

      if (s.entryT >= 1) {
        c.entered = true
        s.scale = baseScale
      }
    } else {
      /* ---- Normal mode ---- */
      const target = MORPH_CONFIGS[c.targetSection] || MORPH_CONFIGS[0]
      const ls = 3.0 * delta
      s.freq = lerp(s.freq, target.frequency, ls)
      s.amp = lerp(s.amp, target.amplitude, ls)
      s.speed = lerp(s.speed, target.speed, ls)
      s.cr = lerp(s.cr, target.color[0], ls)
      s.cg = lerp(s.cg, target.color[1], ls)
      s.cb = lerp(s.cb, target.color[2], ls)
      s.burstP = lerp(s.burstP, c.burst, 2.0 * delta)

      s.scale = lerp(s.scale, baseScale, 0.05)
      grp.scale.setScalar(s.scale)
      grp.position.y = Math.sin(t * 0.5) * 0.04
      grp.position.z = 0
      grp.rotation.y = t * 0.08 + state.pointer.x * 0.05
      grp.rotation.x = Math.sin(t * 0.15) * 0.03 - state.pointer.y * 0.03
    }

    /* ---- Update light ---- */
    if (lightRef.current) {
      lightRef.current.color.setRGB(s.cr * 0.6, s.cg * 0.6, s.cb * 0.6)
      lightRef.current.intensity = 2 + s.burstP * 5
    }

    /* ---- Internal particles rotation ---- */
    if (particlesRef.current) {
      particlesRef.current.rotation.y = t * 0.15
      particlesRef.current.rotation.x = Math.sin(t * 0.1) * 0.2
    }

    /* ---- Vertex displacement ---- */
    const posAttr = mesh.geometry.getAttribute('position')
    const arr = posAttr.array as Float32Array
    const mx = state.pointer.x * 1.5
    const my = state.pointer.y * 1.5

    for (let i = 0; i < posAttr.count; i++) {
      const i3 = i * 3
      const ox = origPos[i3], oy = origPos[i3 + 1], oz = origPos[i3 + 2]
      const len = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1
      const nx = ox / len, ny = oy / len, nz = oz / len

      // Noise displacement along normal
      let d = noise(
        ox * s.freq + t * s.speed * 0.3,
        oy * s.freq + t * s.speed * 0.25,
        oz * s.freq + t * s.speed * 0.15
      ) * s.amp

      // Burst: push vertices outward
      if (s.burstP > 0.01) {
        d += burstDist[i] * easeInOutCubic(s.burstP)
      }

      // Mouse interaction: dent toward cursor
      const dx = ox - mx, dy = oy - my
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1.0) {
        d -= (1 - dist) * 0.12
      }

      arr[i3] = ox + nx * d
      arr[i3 + 1] = oy + ny * d
      arr[i3 + 2] = oz + nz * d
    }

    posAttr.needsUpdate = true
    mesh.geometry.computeVertexNormals()
  })

  return (
    <group ref={groupRef}>
      {/* Main morph sphere */}
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhysicalMaterial
          color="#ffffff"
          metalness={0.05}
          roughness={0.05}
          transmission={0.92}
          ior={1.33}
          thickness={0.5}
          transparent
          envMapIntensity={2}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Internal glow light */}
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={3} color="#00e5ff" distance={8} />

      {/* Internal particles (bubbles) */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={30} array={particlePos} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.02}
          color={isDark ? '#ffffff' : '#333333'}
          transparent
          opacity={0.5}
          sizeAttenuation
        />
      </points>
    </group>
  )
}
