// @ts-nocheck
'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { CrystalGem } from './CrystalGem'
import { DotFloor } from './DotFloor'

export function ShardScene({ className = '' }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy load 3D scene — only render when in viewport
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
            <Environment preset="night" />

            {/* Lighting */}
            <ambientLight intensity={0.3} />
            <directionalLight
              position={[5, 8, 4]}
              intensity={0.9}
              color="#fff5e6"
            />

            {/* Crystal gem centered at origin */}
            <CrystalGem />

            {/* Cursor-reactive dot floor */}
            <DotFloor />
          </Suspense>
        </Canvas>
      )}
    </div>
  )
}
