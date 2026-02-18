'use client'

import type { ReactNode } from 'react'

interface PhoneFrameProps {
  children?: ReactNode
  className?: string
}

export function PhoneFrame({ children, className = '' }: PhoneFrameProps) {
  return (
    <div className={`relative mx-auto ${className}`} style={{ maxWidth: 280 }}>
      {/* Phone outer frame */}
      <div
        className="relative rounded-[40px] p-[8px]"
        style={{
          background: 'linear-gradient(180deg, #222 0%, #111 100%)',
          border: '2px solid rgba(255,255,255,0.1)',
          aspectRatio: '9 / 19.5',
        }}
      >
        {/* Screen area */}
        <div className="w-full h-full rounded-[32px] overflow-hidden relative bg-[#0a0a0a]">
          {/* Notch */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
            <div className="w-24 h-6 rounded-full bg-black flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-800" />
            </div>
          </div>

          {/* Screen content */}
          <div className="w-full h-full pt-10 overflow-hidden">
            {children}
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
            <div className="w-28 h-1 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Side buttons */}
      <div className="absolute -left-[2px] top-28 w-[3px] h-6 bg-gray-700 rounded-l-sm" />
      <div className="absolute -left-[2px] top-[9.5rem] w-[3px] h-6 bg-gray-700 rounded-l-sm" />
      <div className="absolute -right-[2px] top-36 w-[3px] h-12 bg-gray-700 rounded-r-sm" />

      {/* Reflection */}
      <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

      {/* Shadow */}
      <div className="absolute -inset-4 bg-blue-500/5 rounded-[50px] blur-2xl -z-10" />
    </div>
  )
}
