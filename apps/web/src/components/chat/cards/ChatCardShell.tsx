'use client'

import type { CSSProperties, ReactNode } from 'react'

interface ChatCardShellProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

/**
 * Shared wrapper for all AI chat cards.
 * Constrains width to 320px and aligns left.
 */
export default function ChatCardShell({ children, className, style }: ChatCardShellProps) {
  return (
    <div className="flex justify-start">
      <div
        className={`glass-card rounded-2xl p-4 max-w-[320px] w-full ${className || ''}`}
        style={style}
      >
        {children}
      </div>
    </div>
  )
}
