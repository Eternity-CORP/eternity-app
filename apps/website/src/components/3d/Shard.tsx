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

// 7-sided crystal geometry for landing page (non-indexed, flat normals)
export function createHeptagonalCrystal() {
  const topY = 1.8
  const midY = 0.0
  const bottomY = -1.4
  const radius = 1.0
  const sides = 7
  const angleOffset = -Math.PI / sides

  const top: [number, number, number] = [0, topY, 0]
  const bot: [number, number, number] = [0, bottomY, 0]
  const ring: [number, number, number][] = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 + angleOffset
    ring.push([Math.sin(a) * radius, midY, Math.cos(a) * radius])
  }

  const positions: number[] = []
  const normals: number[] = []

  for (let i = 0; i < sides; i++) {
    const c = ring[i]
    const n = ring[(i + 1) % sides]

    // Top face
    const tn = faceNormal(top, c, n)
    positions.push(...top, ...c, ...n)
    normals.push(...tn, ...tn, ...tn)

    // Bottom face
    const bn = faceNormal(bot, n, c)
    positions.push(...bot, ...n, ...c)
    normals.push(...bn, ...bn, ...bn)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  return geo
}

export interface ShardPiece {
  geometry: THREE.BufferGeometry
  edges: THREE.EdgesGeometry
  centroid: THREE.Vector3
  normal: THREE.Vector3
  shatterOffset: THREE.Vector3
  shatterRotation: THREE.Euler
}

export function createShardPieces(): ShardPiece[] {
  const geo = createHeptagonalCrystal()
  const posArr = geo.getAttribute('position').array as Float32Array
  const normArr = geo.getAttribute('normal').array as Float32Array
  const pieces: ShardPiece[] = []

  // Each triangle = 3 vertices × 3 components = 9 floats
  const triangleCount = posArr.length / 9

  for (let t = 0; t < triangleCount; t++) {
    const off = t * 9

    // Extract triangle vertices
    const v0 = new THREE.Vector3(posArr[off], posArr[off + 1], posArr[off + 2])
    const v1 = new THREE.Vector3(posArr[off + 3], posArr[off + 4], posArr[off + 5])
    const v2 = new THREE.Vector3(posArr[off + 6], posArr[off + 7], posArr[off + 8])

    // Centroid
    const centroid = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3)

    // Face normal (all 3 vertex normals are the same for flat shading)
    const normal = new THREE.Vector3(normArr[off], normArr[off + 1], normArr[off + 2]).normalize()

    // Create geometry centered at centroid
    const triGeo = new THREE.BufferGeometry()
    const localPos = new Float32Array([
      v0.x - centroid.x, v0.y - centroid.y, v0.z - centroid.z,
      v1.x - centroid.x, v1.y - centroid.y, v1.z - centroid.z,
      v2.x - centroid.x, v2.y - centroid.y, v2.z - centroid.z,
    ])
    const localNorm = new Float32Array([
      normArr[off], normArr[off + 1], normArr[off + 2],
      normArr[off + 3], normArr[off + 4], normArr[off + 5],
      normArr[off + 6], normArr[off + 7], normArr[off + 8],
    ])
    triGeo.setAttribute('position', new THREE.BufferAttribute(localPos, 3))
    triGeo.setAttribute('normal', new THREE.BufferAttribute(localNorm, 3))

    const edges = new THREE.EdgesGeometry(triGeo, 1)

    // Random shatter parameters
    const shatterDist = 2.5 + Math.random() * 3.5
    const shatterOffset = new THREE.Vector3(
      normal.x * shatterDist + (Math.random() - 0.5) * 2.5,
      normal.y * shatterDist + (Math.random() - 0.5) * 2.5,
      normal.z * shatterDist + (Math.random() - 0.5) * 1.5,
    )
    const shatterRotation = new THREE.Euler(
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 2,
      (Math.random() - 0.5) * Math.PI * 1.5,
    )

    pieces.push({ geometry: triGeo, edges, centroid, normal, shatterOffset, shatterRotation })
  }

  return pieces
}

function faceNormal(
  a: [number, number, number],
  b: [number, number, number],
  c: [number, number, number],
): [number, number, number] {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const nx = ab[1] * ac[2] - ab[2] * ac[1]
  const ny = ab[2] * ac[0] - ab[0] * ac[2]
  const nz = ab[0] * ac[1] - ab[1] * ac[0]
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
  return [nx / len, ny / len, nz / len]
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
