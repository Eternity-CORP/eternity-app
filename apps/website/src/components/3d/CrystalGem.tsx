// @ts-nocheck
'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Cathedral-cut gemstone crystal with MeshPhysicalMaterial.
 * Elongated vertical form (~1:1.6), flat-shaded facets,
 * transmission + iridescence for premium glass look.
 */
export function CrystalGem() {
  const meshRef = useRef<THREE.Mesh>(null)
  const orbitLightRef = useRef<THREE.PointLight>(null)
  const targetRotation = useRef({ x: 0, z: 0 })
  const { mouse } = useThree()

  // Build cathedral-cut geometry with manually defined vertices and faces
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    // Proportions: width ~1.0, total height ~1.6
    // Girdle at 40% from bottom => y = -0.8 + 0.4*1.6 = -0.16
    // Bottom tip at y = -0.8, top tip at y = 0.8
    const topTip = 0.8
    const bottomTip = -0.8
    const girdleY = -0.16 // 40% from bottom
    const upperMidY = 0.38 // mid-crown facet ring
    const lowerMidY = -0.52 // mid-pavilion facet ring

    // Girdle vertices (8 points, octagonal cross-section)
    const girdleRadius = 0.5
    const girdlePoints: THREE.Vector3[] = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      girdlePoints.push(
        new THREE.Vector3(
          Math.cos(angle) * girdleRadius,
          girdleY,
          Math.sin(angle) * girdleRadius
        )
      )
    }

    // Upper crown ring (8 points, smaller radius, alternating offsets for facet variety)
    const crownRadius = 0.32
    const crownPoints: THREE.Vector3[] = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8 // offset by half-step
      crownPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * crownRadius,
          upperMidY,
          Math.sin(angle) * crownRadius
        )
      )
    }

    // Lower pavilion ring (8 points, smaller radius)
    const pavilionRadius = 0.3
    const pavilionPoints: THREE.Vector3[] = []
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + Math.PI / 8
      pavilionPoints.push(
        new THREE.Vector3(
          Math.cos(angle) * pavilionRadius,
          lowerMidY,
          Math.sin(angle) * pavilionRadius
        )
      )
    }

    const top = new THREE.Vector3(0, topTip, 0)
    const bottom = new THREE.Vector3(0, bottomTip, 0)

    // Collect all triangles
    const triangles: THREE.Vector3[][] = []

    for (let i = 0; i < 8; i++) {
      const next = (i + 1) % 8

      // --- Crown (top half) ---
      // Top tip to crown ring
      triangles.push([top, crownPoints[i], crownPoints[next]])

      // Crown ring to girdle (two triangles per segment, interleaved)
      triangles.push([crownPoints[i], girdlePoints[i], girdlePoints[next]])
      triangles.push([crownPoints[i], girdlePoints[next], crownPoints[next]])

      // --- Pavilion (bottom half) ---
      // Girdle to pavilion ring
      triangles.push([girdlePoints[i], pavilionPoints[i], girdlePoints[next]])
      triangles.push([pavilionPoints[i], pavilionPoints[next], girdlePoints[next]])

      // Pavilion ring to bottom tip
      triangles.push([pavilionPoints[i], bottom, pavilionPoints[next]])
    }

    // Convert triangles to buffer (non-indexed for flat shading)
    const positions = new Float32Array(triangles.length * 9)
    for (let i = 0; i < triangles.length; i++) {
      const [a, b, c] = triangles[i]
      positions[i * 9 + 0] = a.x
      positions[i * 9 + 1] = a.y
      positions[i * 9 + 2] = a.z
      positions[i * 9 + 3] = b.x
      positions[i * 9 + 4] = b.y
      positions[i * 9 + 5] = b.z
      positions[i * 9 + 6] = c.x
      positions[i * 9 + 7] = c.y
      positions[i * 9 + 8] = c.z
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.computeVertexNormals()

    return geo
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return

    const t = state.clock.elapsedTime

    // Slow Y rotation
    meshRef.current.rotation.y += 0.05 * state.clock.getDelta()

    // Subtle float bob
    meshRef.current.position.y = Math.sin(t * 0.6) * 0.05

    // Cursor tilt (lerped)
    targetRotation.current.z = mouse.x * 0.12
    targetRotation.current.x = -mouse.y * 0.2

    meshRef.current.rotation.z = THREE.MathUtils.lerp(
      meshRef.current.rotation.z,
      targetRotation.current.z,
      0.04
    )
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetRotation.current.x,
      0.04
    )

    // Orbiting point light (12s period)
    if (orbitLightRef.current) {
      const orbitAngle = (t / 12) * Math.PI * 2
      const orbitRadius = 3
      orbitLightRef.current.position.set(
        Math.cos(orbitAngle) * orbitRadius,
        1.0 + Math.sin(orbitAngle * 0.5) * 0.5,
        Math.sin(orbitAngle) * orbitRadius
      )
    }
  })

  return (
    <group>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhysicalMaterial
          color="#0a0a0a"
          metalness={0.0}
          roughness={0.02}
          transmission={0.95}
          thickness={2.5}
          ior={2.33}
          clearcoat={1.0}
          clearcoatRoughness={0.0}
          envMapIntensity={3.0}
          attenuationColor="#1a0a2e"
          attenuationDistance={3.0}
          iridescence={0.5}
          iridescenceIOR={1.3}
          iridescenceThicknessRange={[100, 600]}
          flatShading={true}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Orbiting light for moving reflections */}
      <pointLight
        ref={orbitLightRef}
        intensity={0.8}
        color="#ffffff"
        distance={10}
        decay={2}
      />
    </group>
  )
}
