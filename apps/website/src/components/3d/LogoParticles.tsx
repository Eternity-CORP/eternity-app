// @ts-nocheck
'use client'

import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTheme } from '@/context/ThemeContext'

const SCATTER_RADIUS = 10
const FORM_DURATION = 2
const CURSOR_RADIUS = 0.35
const CURSOR_FORCE = 0.4

// Detect mobile once at module level
const IS_MOBILE = typeof window !== 'undefined' && (
  'ontouchstart' in window ||
  window.matchMedia('(hover: none)').matches ||
  window.innerWidth < 768
)

const PARTICLE_COUNT = IS_MOBILE ? 2000 : 4000

function sampleLogoPoints(
  svgUrl: string,
  count: number
): Promise<Float32Array> {
  return new Promise((resolve) => {
    fetch(svgUrl)
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgText, 'image/svg+xml')
        const svg = doc.querySelector('svg')
        if (!svg) {
          resolve(fallbackPositions(count))
          return
        }

        const viewBox = svg.getAttribute('viewBox')?.split(' ').map(Number) || [0, 0, 730, 787]
        const vbW = viewBox[2]
        const vbH = viewBox[3]

        const paths = Array.from(doc.querySelectorAll('svg > path, svg > g > path'))
          .filter((p) => {
            let parent = p.parentElement
            while (parent && parent !== svg) {
              const tag = parent.tagName.toLowerCase()
              if (tag === 'defs' || tag === 'clippath' || tag === 'filter') return false
              parent = parent.parentElement
            }
            return true
          })

        if (paths.length === 0) {
          resolve(fallbackPositions(count))
          return
        }

        const pathLengths = paths.map((p) => (p as SVGPathElement).getTotalLength())
        const totalLength = pathLengths.reduce((a, b) => a + b, 0)

        const allPoints: { x: number; y: number }[] = []
        const samplesPerUnit = count * 2 / totalLength

        paths.forEach((path, idx) => {
          const pathEl = path as SVGPathElement
          const len = pathLengths[idx]
          const samples = Math.max(20, Math.floor(len * samplesPerUnit))

          for (let i = 0; i < samples; i++) {
            const t = (i / samples) * len
            const pt = pathEl.getPointAtLength(t)
            allPoints.push({ x: pt.x, y: pt.y })
          }
        })

        const worldScale = 8 / Math.max(vbW, vbH)
        const positions = new Float32Array(count * 3)

        for (let i = 0; i < count; i++) {
          const pt = allPoints[Math.floor(Math.random() * allPoints.length)]
          const jx = (Math.random() - 0.5) * 1.6
          const jy = (Math.random() - 0.5) * 1.6
          positions[i * 3] = (pt.x + jx - vbW / 2) * worldScale
          positions[i * 3 + 1] = -(pt.y + jy - vbH / 2) * worldScale
          positions[i * 3 + 2] = (Math.random() - 0.5) * 0.08
        }

        resolve(positions)
      })
      .catch(() => {
        resolve(fallbackPositions(count))
      })
  })
}

function fallbackPositions(count: number): Float32Array {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2
    const scale = 3.5
    const denom = 1 + Math.sin(t) * Math.sin(t)
    positions[i * 3] = (scale * Math.cos(t)) / denom + (Math.random() - 0.5) * 0.15
    positions[i * 3 + 1] = (scale * Math.sin(t) * Math.cos(t)) / denom + (Math.random() - 0.5) * 0.15
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.1
  }
  return positions
}

const fragmentShader = `
  uniform float uDarkMode;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;

    float coreEdge = mix(0.1, 0.12, uDarkMode);
    float glowEdge = mix(0.3, 0.45, uDarkMode);
    float glowPow = mix(2.0, 1.8, uDarkMode);
    float coreStr = mix(0.7, 0.9, uDarkMode);
    float glowStr = mix(0.5, 0.4, uDarkMode);

    float core = 1.0 - smoothstep(0.0, coreEdge, d);
    float glow = 1.0 - smoothstep(0.0, glowEdge, d);
    glow = pow(glow, glowPow);

    float strength = core * coreStr + glow * glowStr;

    vec3 lightColor = mix(vColor, vColor * 0.5, core * 0.3);
    vec3 darkColor = mix(vColor, vec3(1.0), core * 0.5);
    vec3 finalColor = mix(lightColor, darkColor, uDarkMode);

    gl_FragColor = vec4(finalColor, strength * vAlpha);
  }
`

const vertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const SIN_TABLE_SIZE = 1024
const sinTable = new Float32Array(SIN_TABLE_SIZE)
for (let i = 0; i < SIN_TABLE_SIZE; i++) {
  sinTable[i] = Math.sin((i / SIN_TABLE_SIZE) * Math.PI * 2)
}
function fastSin(x: number): number {
  const idx = ((x % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return sinTable[Math.floor((idx / (Math.PI * 2)) * SIN_TABLE_SIZE) & (SIN_TABLE_SIZE - 1)]
}

function ParticleSystem({
  isDark,
  mouseWorld,
  isVisible,
}: {
  isDark: boolean
  mouseWorld: React.MutableRefObject<{ x: number; y: number; active: boolean }>
  isVisible: boolean
}) {
  const pointsRef = useRef<THREE.Points>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)
  const startTimeRef = useRef<number>(-1)
  const settledRef = useRef(false)
  const { viewport } = useThree()

  const [darkTarget, setDarkTarget] = useState<Float32Array | null>(null)
  const [lightTarget, setLightTarget] = useState<Float32Array | null>(null)

  // Load current theme SVG first, defer the other to avoid blocking
  const isDarkInitial = useRef(isDark)
  useEffect(() => {
    const primary = isDarkInitial.current ? '/images/logo_white.svg' : '/images/logo_black.svg'
    const secondary = isDarkInitial.current ? '/images/logo_black.svg' : '/images/logo_white.svg'
    const setPrimary = isDarkInitial.current ? setDarkTarget : setLightTarget
    const setSecondary = isDarkInitial.current ? setLightTarget : setDarkTarget

    // Load primary first, then secondary after a delay
    sampleLogoPoints(primary, PARTICLE_COUNT).then((pts) => {
      setPrimary(pts)
      // Defer secondary to next idle period
      requestAnimationFrame(() => {
        sampleLogoPoints(secondary, PARTICLE_COUNT).then(setSecondary)
      })
    })
  }, [])

  const targetPositions = isDark ? darkTarget : lightTarget

  const { initialPositions, sizes } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3)
    const sz = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = SCATTER_RADIUS * (0.3 + Math.random() * 0.7)
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi) * 0.5

      sz[i] = IS_MOBILE ? 2.0 + Math.random() * 2.5 : 1.5 + Math.random() * 2.2
    }

    return { initialPositions: pos, sizes: sz }
  }, [])

  const colorSets = useMemo(() => {
    const darkPalette = [
      new THREE.Color('#3388FF'),
      new THREE.Color('#3388FF'),
      new THREE.Color('#00E5FF'),
      new THREE.Color('#00E5FF'),
      new THREE.Color('#8B5CF6'),
      new THREE.Color('#FFFFFF'),
    ]
    const lightPalette = [
      new THREE.Color('#1A1A2E'),
      new THREE.Color('#1A1A2E'),
      new THREE.Color('#16213E'),
      new THREE.Color('#0F0F23'),
      new THREE.Color('#1E1E3A'),
      new THREE.Color('#121228'),
    ]

    const darkColors = new Float32Array(PARTICLE_COUNT * 3)
    const lightColors = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const dc = darkPalette[Math.floor(Math.random() * darkPalette.length)]
      darkColors[i * 3] = dc.r
      darkColors[i * 3 + 1] = dc.g
      darkColors[i * 3 + 2] = dc.b

      const lc = lightPalette[Math.floor(Math.random() * lightPalette.length)]
      lightColors[i * 3] = lc.r
      lightColors[i * 3 + 1] = lc.g
      lightColors[i * 3 + 2] = lc.b
    }

    return { darkColors, lightColors }
  }, [])

  const initialColors = isDark ? colorSets.darkColors : colorSets.lightColors

  const scatterPositions = useRef(new Float32Array(PARTICLE_COUNT * 3))

  useEffect(() => {
    scatterPositions.current.set(initialPositions)
  }, [initialPositions])

  const prevTargetRef = useRef<Float32Array | null>(null)
  useEffect(() => {
    if (targetPositions && targetPositions !== prevTargetRef.current) {
      prevTargetRef.current = targetPositions
      settledRef.current = false
    }
  }, [targetPositions])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uDarkMode.value = isDark ? 1.0 : 0.0
      materialRef.current.blending = isDark ? THREE.AdditiveBlending : THREE.NormalBlending
    }

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry
      const colorAttr = geo.getAttribute('aColor') as THREE.BufferAttribute
      if (colorAttr) {
        const arr = colorAttr.array as Float32Array
        arr.set(isDark ? colorSets.darkColors : colorSets.lightColors)
        colorAttr.needsUpdate = true
      }
    }
  }, [isDark, colorSets])

  useFrame((state) => {
    if (!pointsRef.current || !targetPositions) return

    // Skip computation when hero is off-screen (settled phase only)
    if (!isVisible && settledRef.current) return

    const geo = pointsRef.current.geometry
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geo.getAttribute('aAlpha') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const alphasArr = alphaAttr.array as Float32Array
    const time = state.clock.getElapsedTime()

    const mouse = mouseWorld.current
    const mouseX = mouse.active ? (mouse.x * viewport.width) / 2 : -9999
    const mouseY = mouse.active ? (mouse.y * viewport.height) / 2 : -9999

    if (startTimeRef.current < 0) {
      startTimeRef.current = time
    }

    const elapsed = time - startTimeRef.current
    const assembleEnd = FORM_DURATION

    if (elapsed < assembleEnd) {
      // Phase 2: Assembly — simple lerp, no stagger, no cursor during assembly
      const rawProgress = Math.min(1, elapsed / FORM_DURATION)
      const eased = 1 - (1 - rawProgress) * (1 - rawProgress) * (1 - rawProgress)

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        positions[i3] = scatterPositions.current[i3] + (targetPositions[i3] - scatterPositions.current[i3]) * eased
        positions[i3 + 1] = scatterPositions.current[i3 + 1] + (targetPositions[i3 + 1] - scatterPositions.current[i3 + 1]) * eased
        positions[i3 + 2] = scatterPositions.current[i3 + 2] + (targetPositions[i3 + 2] - scatterPositions.current[i3 + 2]) * eased
        alphasArr[i] = 0.3 + eased * 0.5
      }
    } else {
      if (!settledRef.current) {
        settledRef.current = true
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const i3 = i * 3
          positions[i3] = targetPositions[i3]
          positions[i3 + 1] = targetPositions[i3 + 1]
          positions[i3 + 2] = targetPositions[i3 + 2]
        }
      }

      const cursorRadiusSq = CURSOR_RADIUS * CURSOR_RADIUS

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3
        const phase = i * 0.37

        let tx = targetPositions[i3] + fastSin(time * 0.3 + phase) * 0.02
        let ty = targetPositions[i3 + 1] + fastSin(time * 0.4 + phase + 2.0) * 0.02
        let tz = targetPositions[i3 + 2]

        const dx = tx - mouseX
        const dy = ty - mouseY
        const distSq = dx * dx + dy * dy
        if (distSq < cursorRadiusSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq)
          const force = (1 - dist / CURSOR_RADIUS) * CURSOR_FORCE
          const invDist = 1 / dist
          tx += dx * invDist * force
          ty += dy * invDist * force
          tz += force * 0.2
        }

        positions[i3] += (tx - positions[i3]) * 0.18
        positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.18
        positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.18

        alphasArr[i] = 0.55 + fastSin(time * 0.5 + phase * 0.4) * 0.15
      }
    }

    posAttr.needsUpdate = true
    alphaAttr.needsUpdate = true
  })

  const initialAlphas = useMemo(() => {
    const al = new Float32Array(PARTICLE_COUNT)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      al[i] = 0.4
    }
    return al
  }, [])

  const uniforms = useMemo(() => ({
    uDarkMode: { value: isDark ? 1.0 : 0.0 },
  }), [])

  if (!targetPositions) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={initialPositions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={PARTICLE_COUNT}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aColor"
          count={PARTICLE_COUNT}
          array={initialColors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aAlpha"
          count={PARTICLE_COUNT}
          array={initialAlphas}
          itemSize={1}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={isDark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  )
}

export function LogoParticles({ className = '' }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { isDark } = useTheme()
  const mouseWorld = useRef({ x: -9999, y: -9999, active: false })
  const [isVisible, setIsVisible] = useState(true)

  // IntersectionObserver to pause when hero is off-screen
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '200px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseWorld.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      active: true,
    }
  }, [])

  const handlePointerLeave = useCallback(() => {
    mouseWorld.current = { x: -9999, y: -9999, active: false }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: !IS_MOBILE, alpha: true }}
        dpr={IS_MOBILE ? [1, 1] : [1, 1.5]}
        style={{ background: 'transparent', pointerEvents: 'none' }}
        frameloop={isVisible ? 'always' : 'never'}
      >
        <ParticleSystem isDark={isDark} mouseWorld={mouseWorld} isVisible={isVisible} />
      </Canvas>
    </div>
  )
}
