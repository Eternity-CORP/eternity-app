// @ts-nocheck
'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Float, Environment } from '@react-three/drei'
import { ShardSimple } from './Shard'
import * as THREE from 'three'

function Particles({ count = 100 }) {
  const ref = useRef<THREE.Points>(null)

  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 25
    positions[i * 3 + 1] = (Math.random() - 0.5) * 25
    positions[i * 3 + 2] = (Math.random() - 0.5) * 15
  }

  useFrame((state) => {
    if (!ref.current) return
    ref.current.rotation.y = state.clock.elapsedTime * 0.01
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
        size={0.015}
        color="#000000"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  )
}

function MouseParallax({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const { viewport } = useThree()

  useFrame((state) => {
    if (!groupRef.current) return
    const x = (state.mouse.x * viewport.width) / 60
    const y = (state.mouse.y * viewport.height) / 60
    groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, x * 0.08, 0.03)
    groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, -y * 0.08, 0.03)
  })

  return <group ref={groupRef}>{children}</group>
}

function ShardsGroup() {
  // Ethereum-style crystals around the edges (no center crystal)
  const shards = [
    { position: [-3.5, 1.5, -2] as [number, number, number], scale: 0.7, color: '#0066FF', speed: 0.9 },
    { position: [3.5, -0.5, -1.5] as [number, number, number], scale: 0.9, color: '#000000', speed: 0.75 },
    { position: [-2.5, -1.5, 1] as [number, number, number], scale: 0.55, color: '#00D4FF', speed: 1.1 },
    { position: [2.5, 2, 0.5] as [number, number, number], scale: 0.8, color: '#000000', speed: 0.7 },
    { position: [-1.5, 2.5, -1.5] as [number, number, number], scale: 0.45, color: '#0066FF', speed: 0.85 },
    { position: [1.5, -2, 1.5] as [number, number, number], scale: 0.6, color: '#000000', speed: 1 },
    { position: [4, 0.5, -0.5] as [number, number, number], scale: 0.5, color: '#00D4FF', speed: 0.95 },
    { position: [-4, -0.5, 0] as [number, number, number], scale: 0.65, color: '#000000', speed: 0.8 },
  ]

  return (
    <MouseParallax>
      {shards.map((shard, i) => (
        <Float
          key={i}
          speed={1.5}
          rotationIntensity={0.3}
          floatIntensity={0.4}
        >
          <ShardSimple
            position={shard.position}
            scale={shard.scale}
            color={shard.color}
            speed={shard.speed}
            floatIntensity={0.2}
          />
        </Float>
      ))}
    </MouseParallax>
  )
}

export function ShardScene({ className = '' }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy load 3D scene - only render when in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {isVisible && (
        <Canvas
          camera={{ position: [0, 0, 10], fov: 40 }}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            {/* Environment for reflections */}
            <Environment preset="city" />

            {/* Lighting for glass/chrome effect */}
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <directionalLight position={[-10, -10, -5]} intensity={0.5} />
            <directionalLight position={[0, -10, 0]} intensity={0.3} />
            <pointLight position={[0, 5, 0]} intensity={0.5} />

            <ShardsGroup />
            <Particles count={80} />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
