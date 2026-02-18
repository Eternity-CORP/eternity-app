// @ts-nocheck
'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { CrystalGem } from './CrystalGem'
import { DotFloor } from './DotFloor'

export function ShardScene({ className = '' }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [canRender3D, setCanRender3D] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  // Hardware detection — skip 3D on low-end devices
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4) {
      setCanRender3D(false)
    }
  }, [])

  // Lazy load 3D scene — only render when in viewport
  useEffect(() => {
    if (!canRender3D) return
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
  }, [canRender3D])

  // Static fallback for low-end devices
  if (!canRender3D) {
    return (
      <div className={`w-full h-full flex items-center justify-center ${className}`}>
        <div
          className="w-32 h-48 opacity-20"
          style={{
            background: 'linear-gradient(135deg, rgba(51,136,255,0.3), rgba(0,229,255,0.2))',
            clipPath: 'polygon(50% 0%, 85% 25%, 85% 75%, 50% 100%, 15% 75%, 15% 25%)',
          }}
        />
      </div>
    )
  }

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
