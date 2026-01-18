// @ts-nocheck
'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface ShardProps {
  position?: [number, number, number]
  scale?: number
  color?: string
  speed?: number
  floatIntensity?: number
}

// Classic Ethereum crystal geometry - exact shape from logo
function createEthereumCrystalGeometry() {
  // Ethereum diamond proportions: taller top pyramid, shorter bottom
  const topY = 1.6      // Top apex
  const midY = 0.1      // Middle ring (slightly above center)
  const bottomY = -1.2  // Bottom apex
  const width = 0.85    // Width at middle

  const vertices = new Float32Array([
    // 0: Top apex
    0, topY, 0,
    // 1-4: Middle ring (diamond shape when viewed from top)
    width, midY, 0,      // right
    0, midY, width,      // front
    -width, midY, 0,     // left
    0, midY, -width,     // back
    // 5: Bottom apex
    0, bottomY, 0,
  ])

  // Each face is a separate triangle for sharp edges
  const indices = new Uint16Array([
    // Top pyramid (4 faces)
    0, 2, 1,  // front-right
    0, 3, 2,  // front-left
    0, 4, 3,  // back-left
    0, 1, 4,  // back-right
    // Bottom pyramid (4 faces)
    5, 1, 2,  // front-right
    5, 2, 3,  // front-left
    5, 3, 4,  // back-left
    5, 4, 1,  // back-right
  ])

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
  geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()

  return geometry
}

// Main Ethereum crystal shard with glass/chrome material
export function Shard({
  position = [0, 0, 0],
  scale = 1,
  color = '#000000',
  speed = 1,
  floatIntensity = 0.5,
}: ShardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const initialY = position[1]

  // Create Ethereum crystal geometry
  const geometry = useMemo(() => createEthereumCrystalGeometry(), [])

  // Edge geometry for sharp crystal edges
  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 1)
  }, [geometry])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime * speed

    // Floating animation
    groupRef.current.position.y = initialY + Math.sin(time) * floatIntensity

    // Slow rotation
    groupRef.current.rotation.y = time * 0.15
    groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.05
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main crystal body - glass/chrome look */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.9}
          roughness={0.05}
          transparent
          opacity={0.85}
          reflectivity={1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
          envMapIntensity={1.5}
        />
      </mesh>

      {/* Crystal edges - sharp lines */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.8} linewidth={2} />
      </lineSegments>
    </group>
  )
}

// Simplified version for performance
export function ShardSimple({
  position = [0, 0, 0],
  scale = 1,
  color = '#000000',
  speed = 1,
  floatIntensity = 0.5,
}: ShardProps) {
  const groupRef = useRef<THREE.Group>(null)
  const initialY = position[1]

  // Create Ethereum crystal geometry
  const geometry = useMemo(() => createEthereumCrystalGeometry(), [])

  const edgesGeometry = useMemo(() => {
    return new THREE.EdgesGeometry(geometry, 1)
  }, [geometry])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime * speed

    groupRef.current.position.y = initialY + Math.sin(time) * floatIntensity
    groupRef.current.rotation.y = time * 0.12
    groupRef.current.rotation.x = Math.sin(time * 0.2) * 0.04
  })

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Crystal body - glass/chrome look */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          color={color}
          metalness={0.85}
          roughness={0.08}
          transparent
          opacity={0.8}
          reflectivity={1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Crystal edges */}
      <lineSegments geometry={edgesGeometry}>
        <lineBasicMaterial color={color} transparent opacity={0.7} />
      </lineSegments>
    </group>
  )
}
