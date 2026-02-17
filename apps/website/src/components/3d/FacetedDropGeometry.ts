import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  FacetedDropGeometry                                                */
/*  A teardrop / faceted-drop shape:                                   */
/*    - Wide, rounded top with a slight concave dip (infinity ref)     */
/*    - Tapers to a sharp point at the bottom                          */
/*    - Low radial segments give a gem-cut / crystal facet look         */
/*    - Non-indexed geometry with per-face normals for flat shading     */
/* ------------------------------------------------------------------ */

/**
 * Evaluate the teardrop profile radius at a given height parameter t.
 *
 *   t = 0  -> bottom tip  (radius = 0)
 *   t = 1  -> top cap      (radius ~0 with concave dip)
 *
 * The curve combines a sine-based teardrop envelope with a concave
 * indent near the top to reference the infinity symbol.
 */
function profileRadius(t: number, maxRadius: number): number {
  // Base teardrop: sine envelope that peaks around t=0.65
  // and tapers to zero at t=0 (bottom tip) and t=1 (top)
  const base = Math.sin(Math.PI * Math.pow(t, 0.55))

  // Concave dip near the top (t > 0.85)
  // This pulls the surface inward creating the infinity-loop reference
  const dipCenter = 0.93
  const dipWidth = 0.07
  const dipDepth = 0.35
  const dipDist = (t - dipCenter) / dipWidth
  const dip = dipDepth * Math.exp(-dipDist * dipDist * 2)

  return Math.max(0, (base - dip)) * maxRadius
}

/**
 * Evaluate the Y coordinate for a given height parameter t.
 *
 *   t = 0  -> bottom point  (y = -bottomExtent)
 *   t = 1  -> top            (y = +topExtent)
 *
 * Non-linear mapping so the bottom tapers faster while the top
 * is more gently rounded.
 */
function profileY(t: number, height: number): number {
  // Place the widest part slightly above center
  const bottomExtent = height * 0.45
  const topExtent = height * 0.55
  return -bottomExtent + (bottomExtent + topExtent) * t
}

/* ------------------------------------------------------------------ */
/*  Main geometry builder                                              */
/* ------------------------------------------------------------------ */

export interface FacetedDropOptions {
  /** Total height of the drop. Default: 2.5 */
  height?: number
  /** Maximum radius at the widest point. Default: 0.6 */
  maxRadius?: number
  /** Number of radial segments (facet count around Y). Default: 10 */
  radialSegments?: number
  /** Number of height rings (profile samples). Default: 16 */
  heightSegments?: number
}

/**
 * Create a faceted-drop BufferGeometry.
 *
 * The geometry is non-indexed: every triangle has its own set of three
 * vertices with a single face normal, producing crisp flat-shaded facets
 * that look like a cut gemstone.
 *
 * Approximate triangle count with defaults: ~320 triangles.
 */
export function createFacetedDropGeometry(opts: FacetedDropOptions = {}): THREE.BufferGeometry {
  const {
    height = 2.5,
    maxRadius = 0.6,
    radialSegments = 10,
    heightSegments = 16,
  } = opts

  // ------------------------------------------------------------------
  // Step 1: Build the ring vertices (parametric revolve)
  // ------------------------------------------------------------------
  // rings[row][col] = THREE.Vector3
  // row 0 = bottom tip, row heightSegments = top
  // col 0..radialSegments-1 around the Y axis

  const rings: THREE.Vector3[][] = []

  for (let row = 0; row <= heightSegments; row++) {
    const t = row / heightSegments
    const y = profileY(t, height)
    const r = profileRadius(t, maxRadius)

    const ring: THREE.Vector3[] = []
    for (let col = 0; col < radialSegments; col++) {
      const theta = (col / radialSegments) * Math.PI * 2
      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r
      ring.push(new THREE.Vector3(x, y, z))
    }
    rings.push(ring)
  }

  // ------------------------------------------------------------------
  // Step 2: Build non-indexed triangle soup
  // ------------------------------------------------------------------
  // For each quad on the surface, emit two triangles.
  // Each triangle gets its own copy of vertices so we can assign a
  // unique face normal -> flat shading.

  const positions: number[] = []
  const normals: number[] = []

  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const vC = new THREE.Vector3()
  const cb = new THREE.Vector3()
  const ab = new THREE.Vector3()

  function pushTriangle(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) {
    // Compute face normal
    vA.copy(a)
    vB.copy(b)
    vC.copy(c)
    cb.subVectors(vC, vB)
    ab.subVectors(vA, vB)
    cb.cross(ab)

    // Skip degenerate triangles (e.g. at the tip where radius = 0)
    const len = cb.length()
    if (len < 1e-8) return

    cb.divideScalar(len)

    positions.push(a.x, a.y, a.z)
    positions.push(b.x, b.y, b.z)
    positions.push(c.x, c.y, c.z)

    normals.push(cb.x, cb.y, cb.z)
    normals.push(cb.x, cb.y, cb.z)
    normals.push(cb.x, cb.y, cb.z)
  }

  for (let row = 0; row < heightSegments; row++) {
    for (let col = 0; col < radialSegments; col++) {
      const nextCol = (col + 1) % radialSegments

      const bl = rings[row][col]       // bottom-left
      const br = rings[row][nextCol]   // bottom-right
      const tl = rings[row + 1][col]   // top-left
      const tr = rings[row + 1][nextCol] // top-right

      // Two triangles per quad
      pushTriangle(bl, br, tr)
      pushTriangle(bl, tr, tl)
    }
  }

  // ------------------------------------------------------------------
  // Step 3: Cap the very top with a concave polygon
  // ------------------------------------------------------------------
  // The top ring (row = heightSegments) may collapse to near-zero radius
  // but we also want an explicit cap center point at the concave dip.

  const topCenterT = 1.0
  const topCenterY = profileY(topCenterT, height)
  // Pull the center slightly downward to enhance the concave look
  const topCenter = new THREE.Vector3(0, topCenterY - 0.04, 0)
  const topRing = rings[heightSegments]

  for (let col = 0; col < radialSegments; col++) {
    const nextCol = (col + 1) % radialSegments
    pushTriangle(topRing[col], topRing[nextCol], topCenter)
  }

  // ------------------------------------------------------------------
  // Step 4: Cap the bottom tip (in case bottom row has nonzero radius)
  // ------------------------------------------------------------------
  const bottomCenterT = 0.0
  const bottomCenterY = profileY(bottomCenterT, height)
  const bottomCenter = new THREE.Vector3(0, bottomCenterY, 0)
  const bottomRing = rings[0]

  for (let col = 0; col < radialSegments; col++) {
    const nextCol = (col + 1) % radialSegments
    pushTriangle(bottomRing[nextCol], bottomRing[col], bottomCenter)
  }

  // ------------------------------------------------------------------
  // Step 5: Assemble BufferGeometry
  // ------------------------------------------------------------------
  const geometry = new THREE.BufferGeometry()
  const posArray = new Float32Array(positions)
  const normArray = new Float32Array(normals)

  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(normArray, 3))

  // Recompute bounding volumes for frustum culling
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  return geometry
}

/* ------------------------------------------------------------------ */
/*  Edge geometry for wireframe overlay                                */
/* ------------------------------------------------------------------ */

/**
 * Create an EdgesGeometry suitable for wireframe overlay.
 *
 * The threshold angle (default 1 degree) means only edges where
 * adjacent faces form a sharp angle are included -- i.e., every
 * facet edge on our flat-shaded geometry.
 */
export function createFacetedDropEdges(
  opts: FacetedDropOptions = {},
  thresholdAngle = 1,
): THREE.EdgesGeometry {
  const baseGeometry = createFacetedDropGeometry(opts)
  return new THREE.EdgesGeometry(baseGeometry, thresholdAngle)
}
