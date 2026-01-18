/// <reference types="@react-three/fiber" />

import '@react-three/fiber'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any
      bufferGeometry: any
      bufferAttribute: any
      points: any
      pointsMaterial: any
      group: any
      ambientLight: any
      pointLight: any
      meshStandardMaterial: any
      meshTransmissionMaterial: any
    }
  }
}

export {}
