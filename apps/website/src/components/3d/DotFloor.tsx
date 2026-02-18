// @ts-nocheck
'use client'

import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const GRID_SIZE = 50
const POINT_COUNT = GRID_SIZE * GRID_SIZE
const SPREAD = 14
const FLOOR_Y = -2.2
const CURSOR_RADIUS = 2.5
const PUSH_STRENGTH = 0.6
const LIFT_STRENGTH = 0.4
const LERP_FACTOR = 0.15

/**
 * 50x50 cursor-reactive dot floor.
 * Points are displaced outward and lifted near the cursor,
 * with a calm ambient breathing wave.
 */
export function DotFloor() {
  const pointsRef = useRef<THREE.Points>(null)
  const { camera, mouse } = useThree()

  // Smoothed cursor world position
  const cursorWorld = useRef(new THREE.Vector3(0, FLOOR_Y, 0))

  // Raycaster and floor plane for projecting mouse onto floor
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR_Y), [])

  // Base grid positions (computed once)
  const basePositions = useMemo(() => {
    const positions = new Float32Array(POINT_COUNT * 3)
    const halfSpread = SPREAD / 2

    for (let ix = 0; ix < GRID_SIZE; ix++) {
      for (let iz = 0; iz < GRID_SIZE; iz++) {
        const idx = (ix * GRID_SIZE + iz) * 3
        positions[idx] = (ix / (GRID_SIZE - 1)) * SPREAD - halfSpread
        positions[idx + 1] = FLOOR_Y
        positions[idx + 2] = (iz / (GRID_SIZE - 1)) * SPREAD - halfSpread
      }
    }

    return positions
  }, [])

  // Current animated positions (mutated each frame)
  const animatedPositions = useMemo(() => new Float32Array(basePositions), [basePositions])

  useFrame((state) => {
    if (!pointsRef.current) return

    const t = state.clock.elapsedTime

    // Project mouse onto floor plane via raycaster
    raycaster.setFromCamera(mouse, camera)
    const intersection = new THREE.Vector3()
    const hit = raycaster.ray.intersectPlane(floorPlane, intersection)

    if (hit) {
      // Smooth lerp cursor position
      cursorWorld.current.x = THREE.MathUtils.lerp(cursorWorld.current.x, intersection.x, LERP_FACTOR)
      cursorWorld.current.z = THREE.MathUtils.lerp(cursorWorld.current.z, intersection.z, LERP_FACTOR)
    }

    const cx = cursorWorld.current.x
    const cz = cursorWorld.current.z

    // Update each point
    for (let i = 0; i < POINT_COUNT; i++) {
      const idx = i * 3
      const baseX = basePositions[idx]
      const baseZ = basePositions[idx + 2]

      // Ambient breathing wave
      const breathe = Math.sin(baseX * 0.3 + t * 0.3) * 0.04

      // Distance from cursor (XZ plane)
      const dx = baseX - cx
      const dz = baseZ - cz
      const dist = Math.sqrt(dx * dx + dz * dz)

      let pushX = 0
      let pushZ = 0
      let liftY = 0

      if (dist < CURSOR_RADIUS && dist > 0.001) {
        // Quadratic falloff: strongest at center, zero at radius edge
        const falloff = 1.0 - dist / CURSOR_RADIUS
        const quadFalloff = falloff * falloff

        // Normalize direction and push outward
        const invDist = 1 / dist
        pushX = dx * invDist * quadFalloff * PUSH_STRENGTH
        pushZ = dz * invDist * quadFalloff * PUSH_STRENGTH

        // Lift upward
        liftY = quadFalloff * LIFT_STRENGTH
      }

      animatedPositions[idx] = baseX + pushX
      animatedPositions[idx + 1] = FLOOR_Y + breathe + liftY
      animatedPositions[idx + 2] = baseZ + pushZ
    }

    // Flag buffer for GPU update
    const posAttr = pointsRef.current.geometry.attributes.position
    posAttr.array = animatedPositions
    posAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={POINT_COUNT}
          array={animatedPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#ffffff"
        transparent
        opacity={0.08}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}
