import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/*  FacetedDropGeometry                                                */
/*  Hand-crafted angular crystal built from vertex rings.              */
/*  ~60-70 triangles total -- intentionally low-poly.                 */
/*  The beauty comes from LARGE flat faces catching light differently. */
/*  Non-indexed geometry with per-face normals for flat shading.       */
/* ------------------------------------------------------------------ */

export interface FacetedDropOptions {
  /** Overall scale multiplier. Default: 1.0 */
  scale?: number
}

/* ------------------------------------------------------------------ */
/*  Vertex ring definitions                                            */
/* ------------------------------------------------------------------ */

interface Ring {
  y: number
  radius: number
  count: number
  /** Rotation offset in degrees -- creates the twisted facet look */
  offsetDeg: number
}

/**
 * Generate vertices for a single ring at height y with given radius,
 * vertex count, and angular offset.
 */
function buildRing(ring: Ring, scale: number): THREE.Vector3[] {
  const verts: THREE.Vector3[] = []
  const offsetRad = (ring.offsetDeg * Math.PI) / 180
  for (let i = 0; i < ring.count; i++) {
    const theta = (i / ring.count) * Math.PI * 2 + offsetRad
    const x = Math.cos(theta) * ring.radius * scale
    const z = Math.sin(theta) * ring.radius * scale
    const y = ring.y * scale
    verts.push(new THREE.Vector3(x, y, z))
  }
  return verts
}

/* ------------------------------------------------------------------ */
/*  Triangle assembly helpers                                          */
/* ------------------------------------------------------------------ */

const _cb = new THREE.Vector3()
const _ab = new THREE.Vector3()

function faceNormal(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): THREE.Vector3 | null {
  _cb.subVectors(c, b)
  _ab.subVectors(a, b)
  _cb.cross(_ab)
  const len = _cb.length()
  if (len < 1e-8) return null
  _cb.divideScalar(len)
  return _cb.clone()
}

function pushTriangle(
  positions: number[],
  normals: number[],
  a: THREE.Vector3,
  b: THREE.Vector3,
  c: THREE.Vector3,
) {
  const n = faceNormal(a, b, c)
  if (!n) return

  positions.push(a.x, a.y, a.z)
  positions.push(b.x, b.y, b.z)
  positions.push(c.x, c.y, c.z)

  normals.push(n.x, n.y, n.z)
  normals.push(n.x, n.y, n.z)
  normals.push(n.x, n.y, n.z)
}

/**
 * Connect two rings of EQUAL vertex count with optional rotation offset.
 * The offset between rings creates diagonal facets -- two triangles per
 * pair of adjacent vertices on each ring.
 */
function connectRings(
  positions: number[],
  normals: number[],
  lower: THREE.Vector3[],
  upper: THREE.Vector3[],
) {
  const count = lower.length // both rings have the same count
  for (let i = 0; i < count; i++) {
    const ni = (i + 1) % count

    const bl = lower[i]
    const br = lower[ni]
    const tl = upper[i]
    const tr = upper[ni]

    // Two triangles per quad
    pushTriangle(positions, normals, bl, br, tr)
    pushTriangle(positions, normals, bl, tr, tl)
  }
}

/**
 * Connect an apex point to a ring -- creates a fan of triangles.
 * @param topDown  true = apex is ABOVE the ring (fan points upward)
 *                 false = apex is BELOW the ring (fan points downward)
 */
function connectApex(
  positions: number[],
  normals: number[],
  ring: THREE.Vector3[],
  apex: THREE.Vector3,
  topDown: boolean,
) {
  const count = ring.length
  for (let i = 0; i < count; i++) {
    const ni = (i + 1) % count
    if (topDown) {
      // Winding: ring[i], ring[ni], apex -- normal faces outward
      pushTriangle(positions, normals, ring[i], ring[ni], apex)
    } else {
      // Winding: ring[ni], ring[i], apex -- normal faces outward
      pushTriangle(positions, normals, ring[ni], ring[i], apex)
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Main geometry builder                                              */
/* ------------------------------------------------------------------ */

/**
 * Create the faceted crystal BufferGeometry.
 *
 * Shape: elongated angular crystal with sharp top/bottom points,
 * wider "equator" below center, and 30-degree rotation offsets
 * between adjacent rings for the twisted faceted look.
 *
 * Total: ~72 triangles (6 per apex fan x2 + 12 per ring pair x4)
 */
export function createFacetedDropGeometry(opts: FacetedDropOptions = {}): THREE.BufferGeometry {
  const scale = opts.scale ?? 1.0

  // ---- Define the crystal shape via vertex rings ----
  // The 30-degree offset between adjacent rings is CRITICAL for the
  // asymmetric faceted crystal aesthetic.

  const rings: Ring[] = [
    { y: 1.0,   radius: 0.22, count: 6, offsetDeg: 0  },   // Upper -- narrow cone
    { y: 0.25,  radius: 0.55, count: 6, offsetDeg: 30 },   // Mid -- transitional, twisted
    { y: -0.15, radius: 0.65, count: 6, offsetDeg: 0  },   // Equator -- widest
    { y: -0.65, radius: 0.38, count: 6, offsetDeg: 30 },   // Lower -- narrowing
  ]

  const topApex = new THREE.Vector3(0, 2.0 * scale, 0)
  const bottomApex = new THREE.Vector3(0, -1.3 * scale, 0)

  // Build ring vertex arrays
  const ringVerts = rings.map((r) => buildRing(r, scale))

  // ---- Assemble triangle soup ----
  const positions: number[] = []
  const normals: number[] = []

  // Top apex -> uppermost ring
  connectApex(positions, normals, ringVerts[0], topApex, true)

  // Connect each adjacent pair of rings
  for (let i = 0; i < ringVerts.length - 1; i++) {
    connectRings(positions, normals, ringVerts[i], ringVerts[i + 1])
  }

  // Bottom ring -> bottom apex
  connectApex(positions, normals, ringVerts[ringVerts.length - 1], bottomApex, false)

  // ---- Build BufferGeometry ----
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()

  return geometry
}

/* ------------------------------------------------------------------ */
/*  Edge geometry for wireframe overlay                                */
/* ------------------------------------------------------------------ */

/**
 * Create an EdgesGeometry for wireframe overlay.
 * Threshold angle of 1 degree means every facet edge is included.
 */
export function createFacetedDropEdges(
  opts: FacetedDropOptions = {},
  thresholdAngle = 1,
): THREE.EdgesGeometry {
  const baseGeometry = createFacetedDropGeometry(opts)
  return new THREE.EdgesGeometry(baseGeometry, thresholdAngle)
}
