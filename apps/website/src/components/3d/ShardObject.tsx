'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFacetedDropGeometry, createFacetedDropEdges } from './FacetedDropGeometry'

/* ------------------------------------------------------------------ */
/*  Geometry options — shared between main mesh, inner glow, edges     */
/* ------------------------------------------------------------------ */

const SHARD_OPTS = {
  height: 2.5,
  maxRadius: 0.6,
  radialSegments: 24,
  heightSegments: 32,
} as const

/* ------------------------------------------------------------------ */
/*  Orbital Particles — elliptical orbits, two-tone, vertical drift    */
/* ------------------------------------------------------------------ */

function OrbitalParticles({ count = 100 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, speeds, offsets, orbitA, orbitB, yDrift, colors } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const off = new Float32Array(count)
    const oA = new Float32Array(count)   // semi-major axis
    const oB = new Float32Array(count)   // semi-minor axis
    const yD = new Float32Array(count)   // vertical drift speed

    const purple = new THREE.Color('#7c3aed')
    const blue = new THREE.Color('#3b82f6')

    for (let i = 0; i < count; i++) {
      // Two groups: near-surface (70%) and far-orbit (30%)
      const isNear = i < count * 0.7
      const baseRadius = isNear
        ? 0.7 + Math.random() * 0.3   // 0.7 - 1.0
        : 1.5 + Math.random() * 1.0   // 1.5 - 2.5

      // Elliptical: semi-major and semi-minor differ
      oA[i] = baseRadius
      oB[i] = baseRadius * (0.6 + Math.random() * 0.4)

      const angle = Math.random() * Math.PI * 2
      const ySpread = (Math.random() - 0.5) * 2.5
      pos[i * 3] = Math.cos(angle) * oA[i]
      pos[i * 3 + 1] = ySpread
      pos[i * 3 + 2] = Math.sin(angle) * oB[i]
      spd[i] = 0.15 + Math.random() * 0.4
      off[i] = Math.random() * Math.PI * 2
      yD[i] = (Math.random() - 0.5) * 0.3  // vertical drift speed

      // Alternate purple and blue
      const c = i % 2 === 0 ? purple : blue
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return { positions: pos, speeds: spd, offsets: off, orbitA: oA, orbitB: oB, yDrift: yD, colors: col }
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const posAttr = ref.current.geometry.getAttribute('position')
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const angle = t * speeds[i] + offsets[i]
      // Elliptical orbit
      const x = Math.cos(angle) * orbitA[i]
      const z = Math.sin(angle) * orbitB[i]
      // Vertical drift: slow oscillation + drift
      const yBase = Math.sin(t * 0.5 + offsets[i] * 2) * 1.0 + Math.sin(t * yDrift[i]) * 0.3
      posAttr.setXYZ(i, x, yBase, z)
    }
    posAttr.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  Inner Glow Mesh — smaller copy with pulsing emissive               */
/* ------------------------------------------------------------------ */

function InnerGlow({ geometry }: { geometry: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7c3aed'),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    material.opacity = 0.05 + Math.sin(t * 0.8) * 0.04
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} scale={0.6} />
  )
}

/* ------------------------------------------------------------------ */
/*  ShardObject: glass crystal with transmission + labradorescence     */
/* ------------------------------------------------------------------ */

interface ShardObjectProps {
  /** Scroll progress 0-1 used to drive camera externally */
  scrollProgress?: number
}

export function ShardObject({ scrollProgress = 0 }: ShardObjectProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const edgeMeshRef = useRef<THREE.LineSegments>(null)
  const { mouse } = useThree()

  // Create geometries once
  const geometry = useMemo(() => createFacetedDropGeometry(SHARD_OPTS), [])
  const edgesGeometry = useMemo(() => createFacetedDropEdges(SHARD_OPTS), [])

  // Glass crystal material with transmission for see-through effect
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0d0d0d'),
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.92,
      thickness: 1.5,
      ior: 1.45,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 3.0,
      attenuationColor: new THREE.Color('#1a0533'),
      attenuationDistance: 2.0,
      emissive: new THREE.Color('#1a0a3e'),
      emissiveIntensity: 0.3,
      flatShading: true,
      side: THREE.DoubleSide,
    })
  }, [])

  // Edge material: bright purple-blue wireframe with color animation
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#6366f1'),
      transparent: true,
      opacity: 0.25,
      linewidth: 2, // WebGL ignores this on most platforms but kept for docs
    })
  }, [])

  // Colors for edge animation
  const edgeColorA = useMemo(() => new THREE.Color('#6366f1'), [])
  const edgeColorB = useMemo(() => new THREE.Color('#8b5cf6'), [])

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return
    const t = state.clock.elapsedTime

    // Floating bob animation
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.1

    // Slow base rotation
    groupRef.current.rotation.y = t * 0.15

    // Mouse interaction: more responsive tilt toward cursor
    const targetRotX = -mouse.y * 0.25
    const targetRotZ = mouse.x * 0.15
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.05,
    )
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotZ,
      0.05,
    )

    // Scale breathing
    const breathScale = 1.0 + Math.sin(t * 0.5) * 0.02
    groupRef.current.scale.setScalar(breathScale)

    // Labradorescence: dramatic iridescent color shifts between purple, blue, cyan
    const shift1 = Math.sin(t * 0.5) * 0.5 + 0.5    // 0-1 oscillation
    const shift2 = Math.cos(t * 0.35) * 0.5 + 0.5   // offset oscillation
    const r = 0.08 + shift1 * 0.12                    // purple-red component
    const g = 0.03 + shift2 * 0.08                    // subtle green for cyan mix
    const b = 0.20 + shift1 * 0.20 + shift2 * 0.10   // strong blue-purple
    material.emissive.setRGB(r, g, b)
    material.emissiveIntensity = 0.15 + Math.sin(t * 0.6) * 0.15 + Math.cos(t * 0.4) * 0.15

    // Edge glow: color animation between indigo and violet
    if (edgeMeshRef.current) {
      const edgeMat = edgeMeshRef.current.material as THREE.LineBasicMaterial
      const edgeLerp = Math.sin(t * 0.7) * 0.5 + 0.5
      edgeMat.color.copy(edgeColorA).lerp(edgeColorB, edgeLerp)
      edgeMat.opacity = 0.2 + Math.sin(t * 0.5) * 0.08
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main shard mesh — glass crystal with transmission */}
      <mesh ref={meshRef} geometry={geometry} material={material} />

      {/* Inner glow mesh — smaller pulsing emissive copy */}
      <InnerGlow geometry={geometry} />

      {/* Edge wireframe overlay */}
      <lineSegments
        ref={edgeMeshRef}
        geometry={edgesGeometry}
        material={edgeMaterial}
      />

      {/* Orbital particles — elliptical, two-tone, with drift */}
      <OrbitalParticles count={100} />
    </group>
  )
}
