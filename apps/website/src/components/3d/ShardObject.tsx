'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFacetedDropGeometry, createFacetedDropEdges } from './FacetedDropGeometry'

/* ------------------------------------------------------------------ */
/*  Ambient Particles -- refined, minimal, close to crystal surface    */
/* ------------------------------------------------------------------ */

function CrystalParticles({ count = 45 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)

  const { positions, speeds, offsets, radii, yOffsets } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const spd = new Float32Array(count)
    const off = new Float32Array(count)
    const rad = new Float32Array(count)
    const yOff = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      // Close to crystal surface only (radius 0.8 - 1.2)
      const r = 0.8 + Math.random() * 0.4
      rad[i] = r
      const angle = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 2.5

      pos[i * 3] = Math.cos(angle) * r
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.sin(angle) * r

      spd[i] = 0.06 + Math.random() * 0.12  // slow gentle movement
      off[i] = Math.random() * Math.PI * 2
      yOff[i] = (Math.random() - 0.5) * 0.15
    }

    return { positions: pos, speeds: spd, offsets: off, radii: rad, yOffsets: yOff }
  }, [count])

  useFrame((state) => {
    if (!ref.current) return
    const posAttr = ref.current.geometry.getAttribute('position')
    const t = state.clock.elapsedTime

    for (let i = 0; i < count; i++) {
      const angle = t * speeds[i] + offsets[i]
      const r = radii[i]
      const x = Math.cos(angle) * r
      const z = Math.sin(angle) * r
      const y = Math.sin(t * 0.3 + offsets[i]) * 0.8 + yOffsets[i]
      posAttr.setXYZ(i, x, y, z)
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
        size={0.01}
        color="#ffffff"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

/* ------------------------------------------------------------------ */
/*  Inner Glow -- subtle purple/blue core                              */
/* ------------------------------------------------------------------ */

function InnerGlow({ geometry }: { geometry: THREE.BufferGeometry }) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color('#4a1d8e'),
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide,
    })
  }, [])

  const colorA = useMemo(() => new THREE.Color('#4a1d8e'), [])
  const colorB = useMemo(() => new THREE.Color('#1a3a6e'), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    // Alternate between purple and blue
    const lerp = Math.sin(t * 0.4) * 0.5 + 0.5
    material.color.copy(colorA).lerp(colorB, lerp)
    material.opacity = 0.03 + Math.sin(t * 0.6) * 0.015
  })

  return (
    <mesh ref={meshRef} geometry={geometry} material={material} scale={0.4} />
  )
}

/* ------------------------------------------------------------------ */
/*  ShardObject: premium glass crystal                                 */
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
  const geometry = useMemo(() => createFacetedDropGeometry(), [])
  const edgesGeometry = useMemo(() => createFacetedDropEdges(), [])

  // Premium glass crystal material
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0a0a0a'),
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.95,
      thickness: 2.0,
      ior: 2.33,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      envMapIntensity: 2.5,
      attenuationColor: new THREE.Color('#1a0a2e'),
      attenuationDistance: 3.0,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#ffffff'),
      iridescence: 0.3,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
      emissive: new THREE.Color('#0a0515'),
      emissiveIntensity: 0.1,
      flatShading: true,
      side: THREE.FrontSide,
    })
  }, [])

  // Very subtle edge wireframe -- barely visible
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#c0c0ff'),
      transparent: true,
      opacity: 0.1,
    })
  }, [])

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return
    const t = state.clock.elapsedTime

    // Subtle floating bob -- small amplitude
    groupRef.current.position.y = Math.sin(t * 0.6) * 0.05

    // Very slow rotation
    groupRef.current.rotation.y = t * 0.08

    // Mouse tilt -- responsive but smooth
    const targetRotX = -mouse.y * 0.2
    const targetRotZ = mouse.x * 0.12
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      0.04,
    )
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotZ,
      0.04,
    )

    // Subtle emissive pulse -- barely noticeable, just enough for life
    const pulse = Math.sin(t * 0.5) * 0.5 + 0.5
    material.emissiveIntensity = 0.05 + pulse * 0.08

    // Edge opacity: very gentle breathing
    if (edgeMeshRef.current) {
      const edgeMat = edgeMeshRef.current.material as THREE.LineBasicMaterial
      edgeMat.opacity = 0.08 + Math.sin(t * 0.4) * 0.03
    }
  })

  return (
    <group ref={groupRef}>
      {/* Main shard mesh -- premium glass crystal */}
      <mesh ref={meshRef} geometry={geometry} material={material} />

      {/* Inner glow -- subtle purple/blue core */}
      <InnerGlow geometry={geometry} />

      {/* Edge wireframe -- very subtle facet definition */}
      <lineSegments
        ref={edgeMeshRef}
        geometry={edgesGeometry}
        material={edgeMaterial}
      />

      {/* Ambient particles -- refined, minimal */}
      <CrystalParticles count={45} />
    </group>
  )
}
