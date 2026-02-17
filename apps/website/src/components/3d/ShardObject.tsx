'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFacetedDropGeometry, createFacetedDropEdges } from './FacetedDropGeometry'

/* ------------------------------------------------------------------ */
/*  Orbital Particles                                                   */
/* ------------------------------------------------------------------ */

function OrbitalParticles({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, speeds, offsets } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const off = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      // Random orbit parameters
      const radius = 1.0 + Math.random() * 1.5
      const angle = Math.random() * Math.PI * 2
      const ySpread = (Math.random() - 0.5) * 2.5
      pos[i * 3] = Math.cos(angle) * radius
      pos[i * 3 + 1] = ySpread
      pos[i * 3 + 2] = Math.sin(angle) * radius
      spd[i] = 0.2 + Math.random() * 0.5
      off[i] = Math.random() * Math.PI * 2
    }
    return { positions: pos, speeds: spd, offsets: off }
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const posAttr = ref.current.geometry.getAttribute('position')
    const t = state.clock.elapsedTime
    for (let i = 0; i < count; i++) {
      const radius = 1.0 + Math.sin(t * 0.3 + offsets[i]) * 0.5 + 1.0
      const angle = t * speeds[i] + offsets[i]
      const yBase = (Math.sin(t * 0.5 + offsets[i] * 2) - 0.5) * 2.0
      posAttr.setXYZ(
        i,
        Math.cos(angle) * radius,
        yBase,
        Math.sin(angle) * radius,
      )
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
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color="#7c3aed"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  ShardObject: dark obsidian with labradorescence                     */
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
  const geometry = useMemo(() => createFacetedDropGeometry({
    height: 2.5,
    maxRadius: 0.6,
    radialSegments: 10,
    heightSegments: 16,
  }), [])

  const edgesGeometry = useMemo(() => createFacetedDropEdges({
    height: 2.5,
    maxRadius: 0.6,
    radialSegments: 10,
    heightSegments: 16,
  }), [])

  // Obsidian material with labradorescence effect via emissive
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a0a0a'),
      metalness: 0.85,
      roughness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.5,
      emissive: new THREE.Color('#1a0a3e'),
      emissiveIntensity: 0.3,
      flatShading: true,
      side: THREE.DoubleSide,
    })
  }, [])

  // Edge material: subtle purple-blue wireframe
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#6366f1'),
      transparent: true,
      opacity: 0.15,
    })
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return
    const t = state.clock.elapsedTime

    // Floating bob animation
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.1

    // Slow base rotation
    groupRef.current.rotation.y = t * 0.15

    // Mouse interaction: subtle tilt toward cursor
    const targetRotX = -mouse.y * 0.15
    const targetRotZ = mouse.x * 0.1
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.03,
    )
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotZ,
      0.03,
    )

    // Labradorescence: shift emissive color based on viewing angle
    // Using time as a proxy for angle changes
    const hueShift = Math.sin(t * 0.4) * 0.5 + 0.5 // 0-1
    const r = 0.1 + hueShift * 0.1
    const g = 0.04 + (1 - hueShift) * 0.06
    const b = 0.24 + hueShift * 0.15
    material.emissive.setRGB(r, g, b)
    material.emissiveIntensity = 0.25 + Math.sin(t * 0.6) * 0.1

    // Edge glow pulse
    if (edgeMeshRef.current) {
      const edgeMat = edgeMeshRef.current.material as THREE.LineBasicMaterial
      edgeMat.opacity = 0.1 + Math.sin(t * 0.5) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main shard mesh */}
      <mesh ref={meshRef} geometry={geometry} material={material} />

      {/* Edge wireframe overlay */}
      <lineSegments
        ref={edgeMeshRef}
        geometry={edgesGeometry}
        material={edgeMaterial}
      />

      {/* Orbital particles */}
      <OrbitalParticles count={50} />
    </group>
  )
}
