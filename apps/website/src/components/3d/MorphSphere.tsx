// @ts-nocheck
'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'

/* ---------------------------------------------------------- */
/*  Section morph configs                                      */
/* ---------------------------------------------------------- */

interface MorphConfig {
  distort: number
  speed: number
  color: [number, number, number]
}

const MORPH_CONFIGS: MorphConfig[] = [
  { distort: 0.25, speed: 1.5, color: [0.2, 0.8, 1] },      // Hero: calm, cyan
  { distort: 0.70, speed: 4.0, color: [1, 0.25, 0.25] },     // Problem: chaotic, red
  { distort: 0.10, speed: 0.8, color: [0.2, 0.85, 0.45] },   // Solution: smooth, green
  { distort: 0.35, speed: 2.0, color: [0.3, 0.55, 1] },      // Features: pulse, blue
  { distort: 0.30, speed: 1.2, color: [0.6, 0.3, 1] },       // Business: structured, purple
  { distort: 0.40, speed: 1.8, color: [1, 0.6, 0.15] },      // Roadmap: flowing, orange
  { distort: 0.20, speed: 1.0, color: [1, 1, 1] },           // CTA: calm, white
]

/* ---------------------------------------------------------- */
/*  Exported control interface                                  */
/* ---------------------------------------------------------- */

export interface MorphCtrl {
  targetSection: number
  entered: boolean
  burst: number
}

/* ---------------------------------------------------------- */
/*  Helpers                                                     */
/* ---------------------------------------------------------- */

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function easeOutCubic(t: number) { return 1 - Math.pow(1 - Math.min(1, t), 3) }

/* ---------------------------------------------------------- */
/*  MorphSphere — GPU distort via drei                          */
/* ---------------------------------------------------------- */

export function MorphSphere({ ctrl, isDark }: { ctrl: React.MutableRefObject<MorphCtrl>; isDark: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const matRef = useRef<any>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const { viewport } = useThree()

  const cur = useRef({
    distort: 0.25, speed: 1.5,
    cr: 0.2, cg: 0.8, cb: 1,
    entryT: 0, scale: 0,
    burstP: 0,
  })

  useFrame((state, delta) => {
    const grp = groupRef.current
    const mat = matRef.current
    if (!grp) return
    const c = ctrl.current
    const t = state.clock.elapsedTime
    const s = cur.current
    const baseScale = Math.min(3.2, Math.max(1.4, viewport.width * 0.32))

    /* ---- Entry animation ---- */
    if (!c.entered) {
      s.entryT = Math.min(1, s.entryT + delta * 0.55)
      const e = easeOutCubic(s.entryT)
      grp.position.z = lerp(-25, 0, e)
      grp.scale.setScalar(lerp(0.01, baseScale, e))
      grp.rotation.y = e * Math.PI * 2

      if (s.entryT >= 1) {
        c.entered = true
        s.scale = baseScale
      }
    } else {
      /* ---- Interpolate to target config ---- */
      const target = MORPH_CONFIGS[c.targetSection] || MORPH_CONFIGS[0]
      const ls = 2.5 * delta
      s.distort = lerp(s.distort, target.distort, ls)
      s.speed = lerp(s.speed, target.speed, ls)
      s.cr = lerp(s.cr, target.color[0], ls)
      s.cg = lerp(s.cg, target.color[1], ls)
      s.cb = lerp(s.cb, target.color[2], ls)

      // Burst: crank distortion up
      s.burstP = lerp(s.burstP, c.burst, 1.5 * delta)
      const burstDistort = s.burstP * 1.5

      s.scale = lerp(s.scale, baseScale, 0.04)
      grp.scale.setScalar(s.scale + s.burstP * 0.3)
      grp.position.y = Math.sin(t * 0.5) * 0.05
      grp.position.z = 0
      grp.rotation.y = t * 0.06 + state.pointer.x * 0.08
      grp.rotation.x = Math.sin(t * 0.12) * 0.04 - state.pointer.y * 0.05

      /* ---- Update material ---- */
      if (mat) {
        mat.distort = s.distort + burstDistort
        mat.speed = s.speed
      }
    }

    /* ---- Update light ---- */
    if (lightRef.current) {
      lightRef.current.color.setRGB(s.cr * 0.5, s.cg * 0.5, s.cb * 0.5)
      lightRef.current.intensity = 2 + s.burstP * 6
    }
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[1, 64]} />
        <MeshDistortMaterial
          ref={matRef}
          color="#ffffff"
          emissive={new THREE.Color(0.2, 0.8, 1)}
          emissiveIntensity={0.08}
          metalness={0.1}
          roughness={0.05}
          transmission={0.95}
          ior={1.45}
          thickness={0.8}
          transparent
          envMapIntensity={2.5}
          side={THREE.FrontSide}
          distort={0.25}
          speed={1.5}
          radius={1}
        />
      </mesh>

      {/* Internal glow */}
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={2} color="#00ccff" distance={8} />

      {/* Inner particles */}
      <InnerParticles isDark={isDark} />
    </group>
  )
}

/* ---------------------------------------------------------- */
/*  Inner particles (floating bubbles inside sphere)            */
/* ---------------------------------------------------------- */

function InnerParticles({ isDark }: { isDark: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const count = 40
    const a = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = Math.cbrt(Math.random()) * 0.55
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      a[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      a[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      a[i * 3 + 2] = r * Math.cos(phi)
    }
    return a
  }, [])

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.12
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.15
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={40} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.018}
        color={isDark ? '#ffffff' : '#333333'}
        transparent
        opacity={0.45}
        sizeAttenuation
      />
    </points>
  )
}
