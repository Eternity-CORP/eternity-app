/// <reference types="@react-three/fiber" />

import '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      bufferGeometry: any
      bufferAttribute: any
      points: any
    }
  }
}

export {}
