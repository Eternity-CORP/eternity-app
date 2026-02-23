'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createFacetedDropGeometry, createFacetedDropEdges } from './FacetedDropGeometry'

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
  const orbitLightRef = useRef<THREE.PointLight>(null)
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
      envMapIntensity: 3.0,
      attenuationColor: new THREE.Color('#1a0a2e'),
      attenuationDistance: 3.0,
      specularIntensity: 1.0,
      specularColor: new THREE.Color('#ffffff'),
      emissive: new THREE.Color('#08051a'),
      emissiveIntensity: 0.15,
      iridescence: 0.5,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 600],
      flatShading: true,
      side: THREE.DoubleSide,
    })
  }, [])

  // Pure white edge wireframe -- constant opacity, extremely subtle
  const edgeMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.06,
    })
  }, [])

  // Ground reflection plane material
  const groundMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#050505'),
      metalness: 0.8,
      roughness: 0.3,
      transparent: true,
      opacity: 0.4,
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

    // Orbiting point light -- one full orbit per ~12 seconds
    if (orbitLightRef.current) {
      const orbitSpeed = (Math.PI * 2) / 12 // full circle in 12s
      const angle = t * orbitSpeed
      const radius = 2.5
      orbitLightRef.current.position.x = Math.cos(angle) * radius
      orbitLightRef.current.position.z = Math.sin(angle) * radius
      orbitLightRef.current.position.y = Math.sin(angle * 0.5) * 0.5 // slight vertical bob
    }
  })

  return (
    <>
      <group ref={groupRef}>
        {/* Main shard mesh -- premium glass crystal */}
        <mesh ref={meshRef} geometry={geometry} material={material} />

        {/* Edge wireframe -- constant subtle facet definition */}
        <lineSegments
          ref={edgeMeshRef}
          geometry={edgesGeometry}
          material={edgeMaterial}
        />

        {/* Animated orbiting point light for dynamic reflections */}
        <pointLight
          ref={orbitLightRef}
          color="#fff8f0"
          intensity={0.3}
          distance={5}
        />
      </group>

      {/* Ground reflection plane -- dark mirror beneath the crystal */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.5, 0]}
        material={groundMaterial}
      >
        <circleGeometry args={[3, 64]} />
      </mesh>
    </>
  )
}
